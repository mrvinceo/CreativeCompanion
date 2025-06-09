import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { insertFileSchema, insertConversationSchema, insertMessageSchema } from "@shared/schema";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

  // Start conversation with AI analysis
  app.post("/api/analyze", async (req, res) => {
    try {
      const { sessionId, contextPrompt, mediaType } = req.body;

      if (!sessionId || !contextPrompt || !mediaType) {
        return res.status(400).json({ message: "Session ID, context prompt, and media type are required" });
      }

      // Get files for this session
      const files = await storage.getFilesBySession(sessionId);
      
      if (files.length === 0) {
        return res.status(400).json({ message: "No files found for analysis" });
      }

      // Create or get conversation
      let conversation = await storage.getConversationBySession(sessionId);
      if (!conversation) {
        const userId = req.user?.claims?.sub || null;
        const conversationData = insertConversationSchema.parse({
          sessionId,
          contextPrompt,
          mediaType,
          userId,
        });
        conversation = await storage.createConversation(conversationData);
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

  const httpServer = createServer(app);
  return httpServer;
}
