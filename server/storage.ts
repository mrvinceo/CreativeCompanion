import { users, files, conversations, messages, discoveryLocations, favoriteLocations, savedDiscoveries, notes, type User, type UpsertUser, type File, type Conversation, type Message, type DiscoveryLocation, type FavoriteLocation, type SavedDiscovery, type Note, type InsertFile, type InsertConversation, type InsertMessage, type InsertDiscoveryLocation, type InsertFavoriteLocation, type InsertSavedDiscovery, type InsertNote } from "@shared/schema";
import { microCourses } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, ilike, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, userData: Partial<UpsertUser>): Promise<User>;
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
  deleteConversation(conversationId: number): Promise<void>;

  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;

  // Cultural discovery operations
  createDiscoveryLocation(location: InsertDiscoveryLocation): Promise<DiscoveryLocation>;
  getDiscoveryLocationsByUser(userId: string): Promise<DiscoveryLocation[]>;
  getDiscoveryLocationsByArea(centerLat: string, centerLng: string, radius: number): Promise<DiscoveryLocation[]>;

  createFavoriteLocation(favorite: InsertFavoriteLocation): Promise<FavoriteLocation>;
  getFavoriteLocationsByUser(userId: string): Promise<FavoriteLocation[]>;
  removeFavoriteLocation(userId: string, locationId: number): Promise<void>;

  createSavedDiscovery(discovery: InsertSavedDiscovery): Promise<SavedDiscovery>;
  getSavedDiscoveriesByUser(userId: string): Promise<SavedDiscovery[]>;
  deleteSavedDiscovery(id: number): Promise<void>;

  // Notes operations
  createNote(note: InsertNote): Promise<Note>;
  getNotesByUser(userId: string): Promise<Note[]>;
  getNotesByConversation(conversationId: number): Promise<Note[]>;
  searchNotes(userId: string, searchTerm: string): Promise<Note[]>;
  updateNote(id: number, updateData: Partial<InsertNote>): Promise<Note>;
  deleteNote(id: number): Promise<void>;

  // Micro Courses methods
  createMicroCourse(data: {
    userId: string;
    title: string;
    content: string;
    status: 'generating' | 'ready' | 'failed';
    sourceNotes: Array<{ title: string; content: string }>;
  }): Promise<any>; // Replace any with the correct type

  getMicroCoursesByUser(userId: string): Promise<any[]>; // Replace any with the correct type
  getMicroCourse(id: number): Promise<any>; // Replace any with the correct type
  updateMicroCourse(id: number, data: {
    content?: string;
    status?: 'generating' | 'ready' | 'failed';
    completedAt?: Date;
  }): Promise<any>; // Replace any with the correct type

  deleteMicroCourse(id: number): Promise<void>;

  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | null>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db.update(users).set(userData).where(eq(users.id, id)).returning();
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

  async deleteConversation(conversationId: number): Promise<void> {
    // Delete related notes first
    await db.delete(notes).where(eq(notes.conversationId, conversationId));

    // Delete related messages
    await db.delete(messages).where(eq(messages.conversationId, conversationId));

    // Delete the conversation
    await db.delete(conversations).where(eq(conversations.id, conversationId));
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

  // Cultural discovery operations
  async createDiscoveryLocation(insertLocation: InsertDiscoveryLocation): Promise<DiscoveryLocation> {
    const [location] = await db
      .insert(discoveryLocations)
      .values(insertLocation)
      .returning();
    return location;
  }

  async getDiscoveryLocationsByUser(userId: string): Promise<DiscoveryLocation[]> {
    return await db.select().from(discoveryLocations).where(eq(discoveryLocations.userId, userId));
  }

  async getDiscoveryLocationsByArea(centerLat: string, centerLng: string, radius: number): Promise<DiscoveryLocation[]> {
    // Simple proximity search - in production would use PostGIS or similar
    return await db.select().from(discoveryLocations);
  }

  async createFavoriteLocation(insertFavorite: InsertFavoriteLocation): Promise<FavoriteLocation> {
    const [favorite] = await db
      .insert(favoriteLocations)
      .values(insertFavorite)
      .returning();
    return favorite;
  }

  async getFavoriteLocationsByUser(userId: string): Promise<FavoriteLocation[]> {
    return await db.select().from(favoriteLocations).where(eq(favoriteLocations.userId, userId));
  }

  async removeFavoriteLocation(userId: string, locationId: number): Promise<void> {
    await db.delete(favoriteLocations)
      .where(and(eq(favoriteLocations.userId, userId), eq(favoriteLocations.locationId, locationId)));
  }

  async createSavedDiscovery(insertDiscovery: InsertSavedDiscovery): Promise<SavedDiscovery> {
    const [discovery] = await db
      .insert(savedDiscoveries)
      .values(insertDiscovery)
      .returning();
    return discovery;
  }

  async getSavedDiscoveriesByUser(userId: string): Promise<SavedDiscovery[]> {
    return await db.select().from(savedDiscoveries).where(eq(savedDiscoveries.userId, userId));
  }

  async deleteSavedDiscovery(id: number): Promise<void> {
    await db.delete(savedDiscoveries).where(eq(savedDiscoveries.id, id));
  }

  // Notes operations
  async createNote(insertNote: InsertNote): Promise<Note> {
    const [note] = await db
      .insert(notes)
      .values(insertNote)
      .returning();
    return note;
  }

  async getNotesByUser(userId: string): Promise<any[]> {
    return await db.select({
      id: notes.id,
      userId: notes.userId,
      conversationId: notes.conversationId,
      title: notes.title,
      content: notes.content,
      link: notes.link,
      type: notes.type,
      category: notes.category,
      tags: notes.tags,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
      sessionId: conversations.sessionId
    })
      .from(notes)
      .leftJoin(conversations, eq(notes.conversationId, conversations.id))
      .where(eq(notes.userId, userId))
      .orderBy(notes.createdAt);
  }

  async getNotesByConversation(conversationId: number): Promise<any[]> {
    return await db.select({
      id: notes.id,
      userId: notes.userId,
      conversationId: notes.conversationId,
      title: notes.title,
      content: notes.content,
      link: notes.link,
      type: notes.type,
      category: notes.category,
      tags: notes.tags,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
      sessionId: conversations.sessionId
    })
      .from(notes)
      .leftJoin(conversations, eq(notes.conversationId, conversations.id))
      .where(eq(notes.conversationId, conversationId))
      .orderBy(notes.createdAt);
  }

  async searchNotes(userId: string, searchTerm: string): Promise<any[]> {
    return await db.select({
      id: notes.id,
      userId: notes.userId,
      conversationId: notes.conversationId,
      title: notes.title,
      content: notes.content,
      link: notes.link,
      type: notes.type,
      category: notes.category,
      tags: notes.tags,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
      sessionId: conversations.sessionId
    })
      .from(notes)
      .leftJoin(conversations, eq(notes.conversationId, conversations.id))
      .where(
        and(
          eq(notes.userId, userId),
          or(
            ilike(notes.title, `%${searchTerm}%`),
            ilike(notes.content, `%${searchTerm}%`),
            ilike(notes.category, `%${searchTerm}%`)
          )
        )
      )
      .orderBy(notes.createdAt);
  }

  async updateNote(id: number, updateData: Partial<InsertNote>): Promise<Note> {
    const [note] = await db
      .update(notes)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(notes.id, id))
      .returning();
    return note;
  }

  async deleteNote(id: number): Promise<void> {
    await db.delete(notes).where(eq(notes.id, id));
  }

  // Micro Courses methods
  async createMicroCourse(data: {
    userId: string;
    title: string;
    content: string;
    status: 'generating' | 'ready' | 'failed';
    sourceNotes: Array<{ title: string; content: string }>;
  }) {
    const [course] = await db.insert(microCourses).values({
      userId: data.userId,
      title: data.title,
      content: data.content,
      status: data.status,
      sourceNotes: data.sourceNotes,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return course;
  }

  async getMicroCoursesByUser(userId: string) {
    return await db.select().from(microCourses)
      .where(eq(microCourses.userId, userId))
      .orderBy(desc(microCourses.createdAt));
  }

  async getMicroCourse(id: number) {
    const [course] = await db.select().from(microCourses)
      .where(eq(microCourses.id, id));
    return course;
  }

  async updateMicroCourse(id: number, data: {
    content?: string;
    status?: 'generating' | 'ready' | 'failed';
    completedAt?: Date;
  }) {
    const [course] = await db.update(microCourses)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(microCourses.id, id))
      .returning();
    return course;
  }

  async deleteMicroCourse(id: number): Promise<void> {
    await db.delete(microCourses).where(eq(microCourses.id, id));
  }

  async getUserByStripeCustomerId(stripeCustomerId: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, stripeCustomerId));

    return user ? user[0] : null;
  }
}

export const storage = new DatabaseStorage();