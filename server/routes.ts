import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { fileURLToPath } from 'url';
import { insertFileSchema, insertConversationSchema, insertMessageSchema } from "@shared/schema";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Stripe from "stripe";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Media type system prompts
const MEDIA_SYSTEM_PROMPTS = {
  photography: "You are an expert photography tutor, with a broad background in photography practice and theory. Your job is to provide professional feedback on the work submitted, including how it can be improved and aspects that show promise. If more than one image file is submitted, try to determine any connection between the images, and if a file containing text is provided, treat that as additional context when providing your feedback.",
  painting: "You are an expert painting instructor with extensive knowledge of various painting techniques, color theory, and art history. Analyze the submitted artwork focusing on composition, brushwork, color harmony, and overall artistic expression. Provide constructive feedback on areas for improvement and highlight successful elements.",
  drawing: "You are a professional drawing instructor with expertise in various drawing media and techniques. Evaluate the submitted work for line quality, proportions, shading, perspective, and overall composition. Offer specific guidance on technical skills and artistic development.",
  music: "You are an experienced music educator and composer with knowledge across multiple genres and instruments. Analyze the submitted audio for musicality, composition, arrangement, production quality, and performance. Provide feedback on both technical and creative aspects.",
  film: "You are a film studies professor and industry professional with expertise in cinematography, editing, storytelling, and visual narrative. Review the submitted video content for visual composition, narrative structure, pacing, and technical execution. Focus on both artistic vision and technical craft.",
  graphicDesign: "You are a senior graphic designer with extensive experience in visual communication, typography, layout, and brand design. Evaluate the submitted work for visual hierarchy, typography choices, color usage, and overall design effectiveness. Consider both aesthetic appeal and functional communication.",
  illustration: "You are a professional illustrator with expertise in various illustration styles and techniques. Analyze the submitted artwork for concept development, visual storytelling, technical execution, and stylistic choices. Provide feedback on both artistic merit and commercial viability.",
  creativeWriting: "You are an experienced creative writing instructor and published author with expertise across various literary forms. Review the submitted text for narrative structure, character development, prose style, dialogue, and overall literary merit. Provide constructive feedback on both craft and creative expression."
} as const;

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/png", 
      "audio/mpeg",
      "video/mp4",
      "application/pdf"
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, MP3, MP4, and PDF files are allowed."));
    }
  }
});

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_API_KEY || 
  process.env.GEMINI_API_KEY || 
  process.env.GOOGLE_GEMINI_API_KEY || 
  ""
);

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Upload files endpoint
  app.post("/api/upload", upload.array("files", 10), async (req, res) => {
    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const uploadedFiles = [];

      for (const file of req.files) {
        const userId = req.user?.claims?.sub || null;
        const fileData = insertFileSchema.parse({
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          sessionId,
          userId,
        });

        const savedFile = await storage.createFile(fileData);
        uploadedFiles.push(savedFile);
      }

      res.json({ files: uploadedFiles });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload files" });
    }
  });

  // Get files by session
  app.get("/api/files/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const files = await storage.getFilesBySession(sessionId);
      res.json({ files });
    } catch (error) {
      console.error("Get files error:", error);
      res.status(500).json({ message: "Failed to get files" });
    }
  });

  // Serve file content
  app.get("/api/files/:fileId/content", async (req, res) => {
    try {
      const { fileId } = req.params;
      const file = await storage.getFile(parseInt(fileId));
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'uploads', file.filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File content not found" });
      }

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Serve file error:", error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  // Delete file
  app.delete("/api/files/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const file = await storage.getFile(id);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Delete physical file
      try {
        await fs.unlink(path.join("uploads", file.filename));
      } catch (err) {
        console.warn("Could not delete physical file:", err);
      }

      await storage.deleteFile(id);
      res.json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Delete file error:", error);
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // Helper function to get usage limits
  const getUsageLimit = (user: any) => {
    if (user.email?.endsWith('oca.ac.uk')) return 50; // Academic users
    if (user.subscriptionPlan === 'premium') return 50; // £15/month
    if (user.subscriptionPlan === 'standard') return 30; // £10/month
    return 5; // Free users
  };

  // Helper function to check if user has exceeded limits
  const checkUsageLimit = async (userId: string) => {
    const user = await storage.getUser(userId);
    if (!user) throw new Error('User not found');

    // Check if billing period needs reset (monthly)
    const now = new Date();
    const billingStart = user.billingPeriodStart ? new Date(user.billingPeriodStart) : new Date();
    const monthsSince = (now.getFullYear() - billingStart.getFullYear()) * 12 + (now.getMonth() - billingStart.getMonth());
    
    if (monthsSince >= 1) {
      // Reset monthly usage
      await storage.resetMonthlyConversations(userId);
      return { canUse: true, user: await storage.getUser(userId) };
    }

    const limit = getUsageLimit(user);
    const used = user.conversationsThisMonth || 0;
    
    return { canUse: used < limit, user, used, limit };
  };

  // Start conversation with AI analysis
  app.post("/api/analyze", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId, contextPrompt, mediaType } = req.body;

      if (!sessionId || !contextPrompt || !mediaType) {
        return res.status(400).json({ message: "Session ID, context prompt, and media type are required" });
      }

      // Check usage limits
      const usageCheck = await checkUsageLimit(userId);
      if (!usageCheck.canUse) {
        return res.status(403).json({ 
          message: "Monthly conversation limit reached", 
          used: usageCheck.used,
          limit: usageCheck.limit,
          needsUpgrade: true
        });
      }

      // Get files for this session
      const files = await storage.getFilesBySession(sessionId);
      
      if (files.length === 0) {
        return res.status(400).json({ message: "No files found for analysis" });
      }

      // Create or get conversation
      let conversation = await storage.getConversationBySession(sessionId);
      if (!conversation) {
        const conversationData = insertConversationSchema.parse({
          sessionId,
          contextPrompt,
          mediaType,
          userId,
        });
        conversation = await storage.createConversation(conversationData);
        
        // Increment user's conversation count for new conversations
        await storage.incrementUserConversations(userId);
      }

      // Prepare content for Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      
      const systemPrompt = MEDIA_SYSTEM_PROMPTS[mediaType as keyof typeof MEDIA_SYSTEM_PROMPTS] || MEDIA_SYSTEM_PROMPTS.photography;
      
      const parts = [
        {
          text: `${systemPrompt}\n\nUser Context: ${contextPrompt}\n\nPlease analyze the uploaded files and provide detailed creative feedback based on your expertise in ${mediaType}.`
        }
      ];

      // Add file data to the request
      for (const file of files) {
        try {
          const filePath = path.join("uploads", file.filename);
          const fileBuffer = await fs.readFile(filePath);
          
          if (file.mimeType.startsWith("image/")) {
            parts.push({
              inlineData: {
                mimeType: file.mimeType,
                data: fileBuffer.toString("base64")
              }
            });
          }
          // For other file types, we'll include file info in text
          else {
            parts.push({
              text: `File: ${file.originalName} (${file.mimeType}, ${Math.round(file.size / 1024)}KB)`
            });
          }
        } catch (err) {
          console.warn(`Could not read file ${file.filename}:`, err);
        }
      }

      const result = await model.generateContent(parts);
      const response = await result.response;
      const aiMessage = response.text();

      // Save AI response as message
      const messageData = insertMessageSchema.parse({
        conversationId: conversation.id,
        role: "ai",
        content: aiMessage,
      });

      const savedMessage = await storage.createMessage(messageData);

      res.json({ 
        conversation,
        message: savedMessage 
      });
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ 
        message: "Failed to analyze files. Please check your API key and try again." 
      });
    }
  });

  // Send follow-up message
  app.post("/api/chat", async (req, res) => {
    try {
      const { sessionId, message } = req.body;

      if (!sessionId || !message) {
        return res.status(400).json({ message: "Session ID and message are required" });
      }

      const conversation = await storage.getConversationBySession(sessionId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Save user message
      const userMessageData = insertMessageSchema.parse({
        conversationId: conversation.id,
        role: "user",
        content: message,
      });
      await storage.createMessage(userMessageData);

      // Get conversation history
      const messages = await storage.getMessagesByConversation(conversation.id);
      const files = await storage.getFilesBySession(sessionId);

      // Prepare context for Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      
      const conversationHistory = messages.map(msg => 
        `${msg.role === "user" ? "User" : "AI"}: ${msg.content}`
      ).join("\n\n");

      const prompt = `Previous conversation about uploaded creative files:\n\n${conversationHistory}\n\nUser's new question: ${message}\n\nPlease provide a helpful response based on the previous analysis and files discussed.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const aiMessage = response.text();

      // Save AI response
      const aiMessageData = insertMessageSchema.parse({
        conversationId: conversation.id,
        role: "ai",
        content: aiMessage,
      });

      const savedMessage = await storage.createMessage(aiMessageData);

      res.json({ message: savedMessage });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  // Get conversation messages
  app.get("/api/conversation/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const conversation = await storage.getConversationBySession(sessionId);
      if (!conversation) {
        return res.json({ conversation: null, messages: [] });
      }

      const messages = await storage.getMessagesByConversation(conversation.id);
      res.json({ conversation, messages });
    } catch (error) {
      console.error("Get conversation error:", error);
      res.status(500).json({ message: "Failed to get conversation" });
    }
  });

  // Get user's conversation history
  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversationsByUser(userId);
      
      // Get file counts for each conversation
      const conversationsWithFiles = await Promise.all(
        conversations.map(async (conversation) => {
          const files = await storage.getFilesBySession(conversation.sessionId);
          const messages = await storage.getMessagesByConversation(conversation.id);
          return {
            ...conversation,
            fileCount: files.length,
            messageCount: messages.length,
            files
          };
        })
      );
      
      res.json({ conversations: conversationsWithFiles });
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ message: "Failed to get conversations" });
    }
  });

  // Get user subscription info and usage
  app.get("/api/subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const limit = getUsageLimit(user);
      const used = user.conversationsThisMonth || 0;
      
      res.json({
        subscriptionPlan: user.subscriptionPlan || 'free',
        subscriptionStatus: user.subscriptionStatus,
        conversationsThisMonth: used,
        conversationLimit: limit,
        isAcademic: user.email?.endsWith('oca.ac.uk') || false,
      });
    } catch (error) {
      console.error("Get subscription error:", error);
      res.status(500).json({ message: "Failed to get subscription info" });
    }
  });

  // Update user profile
  app.put("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName, artistStatement, interests, profileImageUrl } = req.body;

      // Validate artist statement length
      if (artistStatement && artistStatement.length > 2500) { // ~500 words
        return res.status(400).json({ message: "Artist statement too long (max 500 words)" });
      }

      const user = await storage.updateUserProfile(userId, {
        firstName,
        lastName,
        artistStatement,
        interests,
        profileImageUrl,
      });

      res.json(user);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Upload profile image
  app.post("/api/upload-profile-image", isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      // In a real app, you'd upload to a cloud storage service like AWS S3, Cloudinary, etc.
      // For now, we'll store locally and return a URL
      const imageUrl = `/uploads/${req.file.filename}`;
      
      res.json({ url: imageUrl });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Compare files endpoint
  app.post("/api/compare-files", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId, originalFileId, newFileId } = req.body;

      console.log('File comparison request:', { userId, sessionId, originalFileId, newFileId });

      // Check conversation limit
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isAcademic = user.email?.endsWith('.ac.uk') || user.email?.endsWith('.edu');
      const limit = isAcademic ? 50 : (user.subscriptionPlan === 'premium' ? 50 : user.subscriptionPlan === 'standard' ? 30 : 10);
      
      if ((user.conversationsThisMonth || 0) >= limit) {
        return res.status(403).json({ 
          message: "Monthly conversation limit reached",
          limit,
          used: user.conversationsThisMonth
        });
      }

      // Get both files
      const originalFile = await storage.getFile(parseInt(originalFileId));
      const newFile = await storage.getFile(parseInt(newFileId));

      console.log('Files found:', { originalFile: !!originalFile, newFile: !!newFile });

      if (!originalFile || !newFile) {
        return res.status(404).json({ message: "Files not found" });
      }

      // Get existing conversation
      const conversation = await storage.getConversationBySession(sessionId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Get conversation history for context
      const existingMessages = await storage.getMessagesByConversation(conversation.id);
      
      // Prepare files for AI analysis
      const originalFilePath = path.join(process.cwd(), 'uploads', originalFile.filename);
      const newFilePath = path.join(process.cwd(), 'uploads', newFile.filename);

      console.log('File paths:', { originalFilePath, newFilePath });

      // Check if files exist
      if (!fsSync.existsSync(originalFilePath) || !fsSync.existsSync(newFilePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      const originalFileBuffer = fsSync.readFileSync(originalFilePath);
      const newFileBuffer = fsSync.readFileSync(newFilePath);

      // Build conversation context
      const conversationContext = existingMessages
        .map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`)
        .join('\n\n');

      // Create comparison prompt
      const comparisonPrompt = `You are analyzing an improved version of a creative work based on previous feedback. 

ORIGINAL CONVERSATION CONTEXT:
${conversationContext}

TASK: Compare the original file (${originalFile.originalName}) with the new improved version (${newFile.originalName}) and provide detailed feedback.

Please analyze:
1. **Improvements Made**: What specific changes were implemented based on the previous feedback?
2. **Progress Assessment**: How well do the changes address the original suggestions?
3. **Technical Quality**: Are there improvements in technical execution, composition, or craft?
4. **Creative Development**: How has the creative vision evolved or been refined?
5. **Further Recommendations**: What additional improvements could be made?

Format your response with clear sections and be specific about what you observe in both versions. Acknowledge the effort put into the improvements and provide constructive guidance for continued development.`;

      // Initialize Gemini AI
      if (!process.env.GOOGLE_API_KEY) {
        throw new Error("Google API key not provided");
      }
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      // Prepare content for Gemini with proper structure
      const parts = [
        { text: comparisonPrompt },
        {
          inlineData: {
            mimeType: originalFile.mimeType,
            data: originalFileBuffer.toString('base64')
          }
        },
        { text: "ORIGINAL FILE ABOVE ↑\n\nIMPROVED VERSION BELOW ↓" },
        {
          inlineData: {
            mimeType: newFile.mimeType,
            data: newFileBuffer.toString('base64')
          }
        }
      ];

      const result = await model.generateContent(parts);
      const aiResponse = result.response.text();

      // Save user message about comparison with image metadata
      const comparisonMessage = `**File Comparison Analysis**

Original file: ${originalFile.originalName}
Improved file: ${newFile.originalName}

COMPARISON_IMAGES:${JSON.stringify({
  originalFile: {
    id: originalFile.id,
    originalName: originalFile.originalName,
    mimeType: originalFile.mimeType
  },
  newFile: {
    id: newFile.id,
    originalName: newFile.originalName,
    mimeType: newFile.mimeType
  }
})}

${aiResponse}`;

      await storage.createMessage({
        conversationId: conversation.id,
        role: 'user',
        content: `Uploaded improved version of ${originalFile.originalName} for comparison.`
      });

      // Save AI response with comparison images
      await storage.createMessage({
        conversationId: conversation.id,
        role: 'ai',
        content: comparisonMessage
      });

      // Increment conversation count
      await storage.incrementUserConversations(userId);

      res.json({ 
        success: true,
        message: "File comparison completed"
      });
    } catch (error) {
      console.error("File comparison error:", error);
      res.status(500).json({ 
        message: "Failed to compare files", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Create Stripe checkout session for subscription
  app.post("/api/create-subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { plan } = req.body; // 'standard' or 'premium'
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't allow academic users to subscribe
      if (user.email?.endsWith('oca.ac.uk')) {
        return res.status(400).json({ message: "Academic users already have premium access" });
      }

      // Check if Stripe price IDs are configured
      let priceId;
      if (plan === 'standard') {
        priceId = process.env.STRIPE_STANDARD_PRICE_ID;
        if (!priceId) {
          console.error('STRIPE_STANDARD_PRICE_ID not configured');
          return res.status(503).json({ message: "Payment system configuration incomplete. Please contact support." });
        }
      } else if (plan === 'premium') {
        priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
        if (!priceId) {
          console.error('STRIPE_PREMIUM_PRICE_ID not configured');
          return res.status(503).json({ message: "Payment system configuration incomplete. Please contact support." });
        }
      } else {
        return res.status(400).json({ message: "Invalid plan" });
      }

      console.log(`Creating subscription for plan ${plan} with price ID: ${priceId.substring(0, 10)}...`);

      // Create or get Stripe customer
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: { userId },
        });
        stripeCustomerId = customer.id;
        await storage.updateUserSubscription(userId, { stripeCustomerId });
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [{
          price: priceId,
          quantity: 1,
        }],
        success_url: `${req.headers.origin}/success`,
        cancel_url: `${req.headers.origin}/?canceled=true`,
        metadata: { userId, plan },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Create subscription error:", error);
      
      // Handle specific Stripe errors
      if (error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
        return res.status(503).json({ message: "Payment system configuration incomplete. Please contact support." });
      }
      
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  // Handle Stripe webhooks
  app.post("/api/stripe-webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err: any) {
      console.log(`Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`Received webhook: ${event.type}`);

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as any;
          const userId = session.metadata?.userId;
          const plan = session.metadata?.plan;
          
          console.log(`Checkout completed for user ${userId}, plan ${plan}`);
          
          if (userId && plan) {
            await storage.updateUserSubscription(userId, {
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              subscriptionStatus: 'active',
              subscriptionPlan: plan,
              billingPeriodStart: new Date(),
            });
            console.log(`Updated subscription for user ${userId}`);
          } else {
            console.error('Missing userId or plan in session metadata');
          }
          break;
        }
        case 'customer.subscription.updated': {
          const subscription = event.data.object as any;
          console.log(`Subscription updated: ${subscription.id}, status: ${subscription.status}`);
          // Would need getUserByStripeCustomerId method to implement this
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as any;
          console.log(`Subscription deleted: ${subscription.id}`);
          // Would need getUserByStripeCustomerId method to implement this
          break;
        }
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
    } catch (error) {
      console.error('Webhook processing error:', error);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }

    res.json({ received: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}
