import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(),
  password: varchar("password"), // For email/password auth
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  googleId: varchar("google_id"), // For Google OAuth
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status"), // active, canceled, past_due, etc.
  subscriptionPlan: varchar("subscription_plan"), // free, standard, premium
  conversationsThisMonth: integer("conversations_this_month").default(0),
  billingPeriodStart: timestamp("billing_period_start"),
  artistStatement: text("artist_statement"),
  interests: text("interests").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  title: text("title"), // AI-generated descriptive title
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  sessionId: text("session_id").notNull(),
  userId: varchar("user_id").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: varchar("user_id").references(() => users.id),
  contextPrompt: text("context_prompt"),
  mediaType: text("media_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  role: text("role").notNull(), // 'user' or 'ai'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Cultural discovery tables
export const discoveryLocations = pgTable("discovery_locations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  address: text("address"),
  category: varchar("category"), // museum, gallery, theater, historical_site, etc.
  website: varchar("website"),
  phone: varchar("phone"),
  openingHours: text("opening_hours"),
  culturalSignificance: text("cultural_significance"),
  aiGenerated: boolean("ai_generated").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const favoriteLocations = pgTable("favorite_locations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  locationId: integer("location_id").references(() => discoveryLocations.id).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const savedDiscoveries = pgTable("saved_discoveries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  centerLatitude: text("center_latitude").notNull(),
  centerLongitude: text("center_longitude").notNull(),
  locationIds: integer("location_ids").array(),
  searchQuery: text("search_query"),
  userInterests: text("user_interests").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  link: varchar("link", { length: 500 }),
  type: varchar("type", { length: 50 }).notNull().default("manual"), // 'ai_extracted' | 'manual'
  category: varchar("category", { length: 100 }), // 'technique' | 'advice' | 'resource' | 'general'
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const microCourses = pgTable("micro_courses", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("generating"), // 'generating' | 'ready' | 'failed'
  sourceNotes: jsonb("source_notes").$type<Array<{ title: string; content: string }>>().notNull(),
  parts: jsonb("parts").$type<Array<{
    title: string;
    content: string;
    imagePrompt: string;
    imageUrl?: string;
    quiz: Array<{
      question: string;
      options: string[];
      correctAnswer: number;
    }>;
  }>>(),
  finalAssignment: jsonb("final_assignment").$type<{
    title: string;
    description: string;
    artworkPrompt: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const courseQuizProgress = pgTable("course_quiz_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  courseId: integer("course_id").references(() => microCourses.id).notNull(),
  partIndex: integer("part_index").notNull(),
  score: integer("score").notNull(), // Percentage score (0-100)
  answers: jsonb("answers").$type<{ [questionIndex: number]: number }>().notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const courseAssignments = pgTable("course_assignments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  courseId: integer("course_id").references(() => microCourses.id).notNull(),
  conversationId: integer("conversation_id").references(() => conversations.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  artworkPrompt: text("artwork_prompt").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // 'pending' | 'submitted' | 'completed'
  submissionNotes: text("submission_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  submittedAt: timestamp("submitted_at"),
});

export const insertNoteSchema = createInsertSchema(notes);
export const insertMicroCourseSchema = createInsertSchema(microCourses);
export const insertCourseQuizProgressSchema = createInsertSchema(courseQuizProgress);
export const insertCourseAssignmentSchema = createInsertSchema(courseAssignments);

// Auth schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  uploadedAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertDiscoveryLocationSchema = createInsertSchema(discoveryLocations).omit({
  id: true,
  createdAt: true,
});

export const insertFavoriteLocationSchema = createInsertSchema(favoriteLocations).omit({
  id: true,
  createdAt: true,
});

export const insertSavedDiscoverySchema = createInsertSchema(savedDiscoveries).omit({
  id: true,
  createdAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertFile = z.infer<typeof insertFileSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertDiscoveryLocation = z.infer<typeof insertDiscoveryLocationSchema>;
export type InsertFavoriteLocation = z.infer<typeof insertFavoriteLocationSchema>;
export type InsertSavedDiscovery = z.infer<typeof insertSavedDiscoverySchema>;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type InsertCourseQuizProgress = z.infer<typeof insertCourseQuizProgressSchema>;
export type InsertCourseAssignment = z.infer<typeof insertCourseAssignmentSchema>;
export type File = typeof files.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type DiscoveryLocation = typeof discoveryLocations.$inferSelect;
export type FavoriteLocation = typeof favoriteLocations.$inferSelect;
export type SavedDiscovery = typeof savedDiscoveries.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type MicroCourse = typeof microCourses.$inferSelect;
export type CourseQuizProgress = typeof courseQuizProgress.$inferSelect;
export type CourseAssignment = typeof courseAssignments.$inferSelect;