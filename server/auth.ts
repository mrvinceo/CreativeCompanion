import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";
import { nanoid } from "nanoid";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      profileImageUrl?: string | null;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  console.log("isAuthenticated check - authenticated:", req.isAuthenticated(), "user:", req.user?.id);
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "User not authenticated" });
  }
  next();
};

export function setupAuth(app: Express) {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    pool: pool,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  const sessionSecret = process.env.SESSION_SECRET || 'development-session-secret-12345';

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    store: sessionStore,
    resave: true,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Local strategy for email/password authentication
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !user.password) {
            return done(null, false);
          }
          
          const isValid = await comparePasswords(password, user.password);
          if (!isValid) {
            return done(null, false);
          }
          
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Google OAuth strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      "google",
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("No email found in Google profile"));
            }

            let user = await storage.getUserByEmail(email);
            
            if (!user) {
              // Create new user
              user = await storage.createUser({
                id: nanoid(),
                email,
                googleId: profile.id,
                firstName: profile.name?.givenName || "",
                lastName: profile.name?.familyName || "",
                profileImageUrl: profile.photos?.[0]?.value || "",
                subscriptionPlan: "free",
                conversationsThisMonth: 0,
              });
            } else if (!user.googleId) {
              // Link existing user to Google account
              user = await storage.updateUser(user.id, {
                googleId: profile.id,
                profileImageUrl: user.profileImageUrl || profile.photos?.[0]?.value || "",
              });
            }

            // Update last login time
            await storage.updateUserLastLogin(user.id);
            
            return done(null, user);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser(async (id: string, done) => {
    try {
      console.log("Deserializing user with ID:", id);
      const user = await storage.getUser(id);
      if (!user) {
        console.log("User not found during deserialization:", id);
        return done(null, false);
      }
      console.log("User deserialized successfully:", user.id);
      done(null, user);
    } catch (error) {
      console.log("Error during user deserialization:", error);
      done(error);
    }
  });

  // Auth routes
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        id: nanoid(),
        email,
        password: hashedPassword,
        firstName: firstName || "",
        lastName: lastName || "",
        subscriptionPlan: "free",
        conversationsThisMonth: 0,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({ user });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/login", passport.authenticate("local"), async (req, res) => {
    if (req.user) {
      // Update last login time
      await storage.updateUserLastLogin(req.user.id);
    }
    res.json({ user: req.user });
  });

  app.get("/api/auth/google", passport.authenticate("google", { 
    scope: ["profile", "email"] 
  }));

  app.get("/api/auth/google/callback", 
    passport.authenticate("google", { failureRedirect: "/auth?error=google" }),
    (req, res) => {
      console.log("OAuth callback - user authenticated:", req.user?.id);
      console.log("OAuth callback - session ID:", req.sessionID);
      console.log("OAuth callback - isAuthenticated:", req.isAuthenticated());
      
      if (!req.isAuthenticated() || !req.user) {
        console.log("OAuth callback failed - not authenticated");
        return res.redirect("/auth?error=authentication_failed");
      }
      
      // Force save session and wait for it to complete
      req.session.save((err) => {
        if (err) {
          console.log("Session save error:", err);
          return res.redirect("/auth?error=session_save_failed");
        }
        
        console.log("Session saved successfully");
        
        // Add a small delay to ensure session is properly saved
        setTimeout(() => {
          res.redirect("/?auth=success");
        }, 100);
      });
    }
  );

  app.post("/api/logout", (req, res, next) => {
    console.log("Logout request received");
    req.logout((err) => {
      if (err) {
        console.log("Logout error:", err);
        return next(err);
      }
      
      // Destroy the session completely
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.log("Session destroy error:", destroyErr);
          return next(destroyErr);
        }
        
        console.log("Session destroyed successfully");
        res.clearCookie('connect.sid'); // Clear session cookie
        res.json({ success: true });
      });
    });
  });

  app.get("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.redirect("/auth");
    });
  });



  // Session debugging endpoint
  app.get("/api/session-debug", (req, res) => {
    console.log("=== SESSION DEBUG ===");
    console.log("Session ID:", req.sessionID);
    console.log("Session keys:", Object.keys(req.session));
    console.log("Session:", req.session);
    console.log("Is authenticated:", req.isAuthenticated());
    console.log("User:", req.user);
    console.log("=== END DEBUG ===");
    
    res.json({
      sessionID: req.sessionID,
      sessionKeys: Object.keys(req.session),
      isAuthenticated: req.isAuthenticated(),
      user: req.user
    });
  });

  // Test authentication endpoint - create a logged in session for testing
  app.post("/api/test-login", async (req, res) => {
    console.log("=== TEST LOGIN ENDPOINT HIT ===");
    try {
      console.log("Creating test session...");
      const testUser = await storage.getUserByEmail("mrvinceo@gmail.com");
      if (testUser) {
        req.login(testUser, (err) => {
          if (err) {
            console.log("Login error:", err);
            return res.status(500).json({ error: "Login failed" });
          }
          console.log("Test login successful for user:", testUser.id);
          return res.json({ success: true, user: testUser });
        });
      } else {
        return res.status(404).json({ error: "Test user not found" });
      }
    } catch (error) {
      console.log("Test login error:", error);
      return res.status(500).json({ error: "Test login failed" });
    }
  });

  app.get("/api/auth/user", (req, res) => {
    console.log("=== AUTH USER ENDPOINT ===");
    console.log("Is authenticated:", req.isAuthenticated());
    console.log("User:", req.user);
    console.log("Session ID:", req.sessionID);
    console.log("=== END AUTH USER ===");
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });
}

