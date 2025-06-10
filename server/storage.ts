import { users, files, conversations, messages, type User, type UpsertUser, type File, type Conversation, type Message, type InsertFile, type InsertConversation, type InsertMessage } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSubscription(userId: string, subscriptionData: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionPlan?: string;
    billingPeriodStart?: Date;
  }): Promise<User>;
  updateUserProfile(userId: string, profileData: {
    firstName?: string;
    lastName?: string;
    artistStatement?: string;
    interests?: string[];
    profileImageUrl?: string;
  }): Promise<User>;
  incrementUserConversations(userId: string): Promise<User>;
  resetMonthlyConversations(userId: string): Promise<User>;

  // File operations
  createFile(file: InsertFile): Promise<File>;
  getFilesBySession(sessionId: string): Promise<File[]>;
  getFilesByUser(userId: string): Promise<File[]>;
  getFile(id: number): Promise<File | undefined>;
  deleteFile(id: number): Promise<void>;
  updateFileTitle(fileId: number, title: string): Promise<File>;

  // Conversation operations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversationBySession(sessionId: string): Promise<Conversation | undefined>;
  getConversationsByUser(userId: string): Promise<Conversation[]>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        subscriptionPlan: userData.email?.endsWith('oca.ac.uk') ? 'academic' : 'free',
        conversationsThisMonth: 0,
        billingPeriodStart: new Date(),
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserSubscription(userId: string, subscriptionData: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionPlan?: string;
    billingPeriodStart?: Date;
  }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...subscriptionData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async incrementUserConversations(userId: string): Promise<User> {
    const currentUser = await this.getUser(userId);
    if (!currentUser) throw new Error('User not found');
    
    const [user] = await db
      .update(users)
      .set({
        conversationsThisMonth: (currentUser.conversationsThisMonth || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async resetMonthlyConversations(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        conversationsThisMonth: 0,
        billingPeriodStart: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserProfile(userId: string, profileData: {
    firstName?: string;
    lastName?: string;
    artistStatement?: string;
    interests?: string[];
    profileImageUrl?: string;
  }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...profileData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // File operations
  async createFile(insertFile: InsertFile): Promise<File> {
    const [file] = await db
      .insert(files)
      .values(insertFile)
      .returning();
    return file;
  }

  async getFilesBySession(sessionId: string): Promise<File[]> {
    return await db.select().from(files).where(eq(files.sessionId, sessionId));
  }

  async getFilesByUser(userId: string): Promise<File[]> {
    return await db.select().from(files).where(eq(files.userId, userId));
  }

  async getFile(id: number): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file || undefined;
  }

  async deleteFile(id: number): Promise<void> {
    await db.delete(files).where(eq(files.id, id));
  }

  async updateFileTitle(fileId: number, title: string): Promise<File> {
    const [file] = await db
      .update(files)
      .set({ title })
      .where(eq(files.id, fileId))
      .returning();
    return file;
  }

  // Conversation operations
  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(insertConversation)
      .returning();
    return conversation;
  }

  async getConversationBySession(sessionId: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.sessionId, sessionId));
    return conversation || undefined;
  }

  async getConversationsByUser(userId: string): Promise<Conversation[]> {
    return await db.select().from(conversations).where(eq(conversations.userId, userId));
  }

  // Message operations
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return await db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }
}

export const storage = new DatabaseStorage();
