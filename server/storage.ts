import { files, conversations, messages, type File, type Conversation, type Message, type InsertFile, type InsertConversation, type InsertMessage } from "@shared/schema";

export interface IStorage {
  // File operations
  createFile(file: InsertFile): Promise<File>;
  getFilesBySession(sessionId: string): Promise<File[]>;
  getFile(id: number): Promise<File | undefined>;
  deleteFile(id: number): Promise<void>;

  // Conversation operations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversationBySession(sessionId: string): Promise<Conversation | undefined>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
}

export class MemStorage implements IStorage {
  private files: Map<number, File>;
  private conversations: Map<number, Conversation>;
  private messages: Map<number, Message>;
  private currentFileId: number;
  private currentConversationId: number;
  private currentMessageId: number;

  constructor() {
    this.files = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.currentFileId = 1;
    this.currentConversationId = 1;
    this.currentMessageId = 1;
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = this.currentFileId++;
    const file: File = {
      ...insertFile,
      id,
      uploadedAt: new Date(),
    };
    this.files.set(id, file);
    return file;
  }

  async getFilesBySession(sessionId: string): Promise<File[]> {
    return Array.from(this.files.values()).filter(
      (file) => file.sessionId === sessionId,
    );
  }

  async getFile(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }

  async deleteFile(id: number): Promise<void> {
    this.files.delete(id);
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.currentConversationId++;
    const conversation: Conversation = {
      ...insertConversation,
      id,
      createdAt: new Date(),
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async getConversationBySession(sessionId: string): Promise<Conversation | undefined> {
    return Array.from(this.conversations.values()).find(
      (conversation) => conversation.sessionId === sessionId,
    );
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((message) => message.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}

export const storage = new MemStorage();
