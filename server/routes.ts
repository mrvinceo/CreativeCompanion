import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import multer from "multer";
import path from "path";
import { Client } from "@replit/object-storage";
import { fileURLToPath } from 'url';
import { insertFileSchema, insertConversationSchema, insertMessageSchema, insertNoteSchema } from "@shared/schema";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Stripe from "stripe";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Replit Object Storage client
const objectStorage = new Client();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Function to extract notes from AI responses
async function extractNotesFromAIResponse(aiResponse: string, conversationId: number, userId: string) {
  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const extractionPrompt = `Analyze this AI feedback and extract any valuable insights that could be saved as reference notes. Look for specific techniques, artistic principles, resources, or actionable advice mentioned in the feedback.

Feedback content:
"${aiResponse}"

Extract any of the following types of insights:
- TECHNIQUES: Specific artistic methods, composition rules, technical approaches
- ADVICE: General principles, best practices, or improvement suggestions
- RESOURCES: Mentions of books, websites, artists, galleries, tools, or references

Create a JSON response with an "items" array containing up to 5 extracted notes. Each note should have:
- title: Concise descriptive title (under 60 chars)
- content: Detailed explanation (under 300 chars)  
- category: One of "technique", "advice", or "resource"
- link: URL if mentioned, otherwise null

Example response:
{
  "items": [
    {
      "title": "Leading Lines Composition",
      "content": "Use natural or architectural elements to create lines that guide the viewer's eye toward your main subject. Roads, fences, or shadows work well as leading lines.",
      "category": "technique",
      "link": null
    }
  ]
}

If no valuable insights are found, return: {"items": []}`;

    const result = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing creative feedback and extracting valuable resources, techniques, and advice. Always respond with valid JSON format."
        },
        {
          role: "user",
          content: extractionPrompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500
    });

    const extractedText = result.choices[0].message.content;

    // Parse the JSON response
    let extractedNotes;
    try {
      if (extractedText && extractedText.trim()) {
        const parsed = JSON.parse(extractedText);
        // Handle both direct array and object with array property
        extractedNotes = Array.isArray(parsed) ? parsed : (parsed.notes || parsed.items || []);
      } else {
        extractedNotes = [];
      }
    } catch (parseError) {
      console.log("Failed to parse extraction response, skipping note creation");
      return;
    }

    // Create notes for each extracted item
    for (const noteData of extractedNotes) {
      if (noteData.title && noteData.content && noteData.category) {
        await storage.createNote({
          userId,
          conversationId,
          title: noteData.title,
          content: noteData.content,
          link: noteData.link || undefined,
          type: 'ai_extracted',
          category: noteData.category,
          tags: []
        });
      }
    }
  } catch (error) {
    console.error("Note extraction error:", error);
    // Don't throw - note extraction is optional and shouldn't break the main flow
  }
}

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

// Configure multer for file uploads (using memory storage for Object Storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req: any, file: any, cb: any) => {
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
      const userId = (req.user as any).claims.sub;
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
        // Generate unique filename for Object Storage
        const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}-${file.originalname}`;
        
        // Upload to Object Storage
        await objectStorage.uploadFromBytes(uniqueFilename, file.buffer);

        const userId = (req.user as any)?.claims?.sub || null;
        const fileData = insertFileSchema.parse({
          filename: uniqueFilename,
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

      // Try Object Storage first, fallback to local filesystem for existing files
      let fileBuffer: Buffer;
      
      try {
        const fileResult = await objectStorage.downloadAsBytes(file.filename);
        if (fileResult.error) {
          // Fallback to local filesystem for existing files
          const fs = await import('fs/promises');
          const filePath = path.join(process.cwd(), 'uploads', file.filename);
          try {
            fileBuffer = await fs.readFile(filePath);
          } catch (localError) {
            console.error(`File not found in storage or locally: ${file.filename}`, localError);
            return res.status(404).json({ message: "File content not found" });
          }
        } else {
          // Object Storage returns a Result with value as array containing Buffer
          fileBuffer = Array.isArray(fileResult.value) ? fileResult.value[0] : fileResult.value;
        }
      } catch (error) {
        console.error("File retrieval error:", error);
        return res.status(500).json({ message: "Failed to retrieve file" });
      }
      
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
      res.setHeader('Content-Length', fileBuffer.length.toString());
      
      // Send the file buffer
      res.send(fileBuffer);
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

      // Delete file from Object Storage
      try {
        await objectStorage.delete(file.filename);
      } catch (err) {
        console.warn("Could not delete file from Object Storage:", err);
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
      
      const parts: any[] = [
        {
          text: `${systemPrompt}\n\nUser Context: ${contextPrompt}\n\nPlease analyze the uploaded files and provide detailed creative feedback based on your expertise in ${mediaType}.`
        }
      ];

      // Generate descriptive titles for uploaded files first
      for (const file of files) {
        if (file.mimeType.startsWith('image/') && !file.title) {
          try {
            // Try Object Storage first, fallback to local filesystem
            let fileBuffer: Buffer;
            const fileResult = await objectStorage.downloadAsBytes(file.filename);
            if (fileResult.error) {
              // Fallback to local filesystem for existing files
              const fs = await import('fs/promises');
              const filePath = path.join(process.cwd(), 'uploads', file.filename);
              try {
                fileBuffer = await fs.readFile(filePath);
              } catch (localError) {
                console.warn(`Could not find file ${file.filename} in storage or locally:`, localError);
                continue;
              }
            } else {
              fileBuffer = Array.isArray(fileResult.value) ? fileResult.value[0] : fileResult.value;
            }
            
            const titlePrompt = `Analyze this image and create a short, descriptive title (maximum 5-8 words) that captures the main subject and essence of the work. Focus on what makes this image unique or interesting. Be specific but concise.

Examples:
- "Coffee cup with dramatic shadows"
- "Portrait with soft natural lighting" 
- "Urban street scene at sunset"
- "Abstract geometric composition"
- "Landscape with morning mist"

Provide only the title, no additional text.`;

            // Validate image data before sending to API
            if (!fileBuffer || fileBuffer.length === 0) {
              console.warn(`Empty file buffer for ${file.filename}`);
              continue;
            }

            const titleResult = await model.generateContent([
              { text: titlePrompt },
              {
                inlineData: {
                  mimeType: file.mimeType,
                  data: fileBuffer.toString('base64')
                }
              }
            ]);
            
            const generatedTitle = titleResult.response.text().trim();
            await storage.updateFileTitle(file.id, generatedTitle);
          } catch (error) {
            console.error(`Failed to generate title for file ${file.id}:`, error);
            // Continue without title if generation fails
          }
        }
      }

      // Refresh file records to include generated titles
      const updatedFiles = await storage.getFilesBySession(sessionId);

      // Add file data to the request
      for (const file of updatedFiles) {
        try {
          // Try Object Storage first, fallback to local filesystem
          let fileBuffer: Buffer;
          const fileResult = await objectStorage.downloadAsBytes(file.filename);
          if (fileResult.error) {
            // Fallback to local filesystem for existing files
            const fs = await import('fs/promises');
            const filePath = path.join(process.cwd(), 'uploads', file.filename);
            try {
              fileBuffer = await fs.readFile(filePath);
            } catch (localError) {
              console.warn(`Could not find file ${file.filename} in storage or locally:`, localError);
              continue;
            }
          } else {
            fileBuffer = Array.isArray(fileResult.value) ? fileResult.value[0] : fileResult.value;
          }
          
          if (file.mimeType.startsWith("image/")) {
            // Validate image data before sending to API
            if (!fileBuffer || fileBuffer.length === 0) {
              console.warn(`Empty file buffer for analysis ${file.filename}`);
              continue;
            }

            console.log(`Adding image to analysis: ${file.filename}, size: ${fileBuffer.length} bytes, mime: ${file.mimeType}`);
            
            parts.push({
              inlineData: {
                mimeType: file.mimeType,
                data: fileBuffer.toString("base64")
              }
            });
          }
          // For PDFs, send directly to Gemini 2.0 which can process them natively
          else if (file.mimeType === "application/pdf") {
            console.log(`Adding PDF to analysis: ${file.filename}, size: ${fileBuffer.length} bytes`);
            
            parts.push({
              inlineData: {
                mimeType: file.mimeType,
                data: fileBuffer.toString("base64")
              }
            });
          }
          // For other file types, include basic file info
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

      // Extract notes from AI response
      if (conversation.userId) {
        await extractNotesFromAIResponse(aiMessage, conversation.id, conversation.userId);
      }

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

      // Extract notes from AI response
      await extractNotesFromAIResponse(aiMessage, conversation.id, conversation.userId || "");

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
      const userId = (req.user as any).claims.sub;
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
      const userId = (req.user as any).claims.sub;
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
      const userId = (req.user as any).claims.sub;
      const { firstName, lastName, artistStatement, interests, profileImageUrl } = req.body;

      console.log('Profile update request:', { userId, firstName, lastName, artistStatement, interests: interests?.length, profileImageUrl });

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

      console.log('Profile updated successfully:', user.id);
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

      const userId = (req.user as any).claims.sub;
      const fileExtension = path.extname(req.file.originalname);
      const fileName = `profile_${userId}_${Date.now()}${fileExtension}`;
      
      // Use local file storage for profile images
      const fs = await import('fs/promises');
      const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
      await fs.mkdir(uploadsDir, { recursive: true });
      const filePath = path.join(uploadsDir, fileName);
      await fs.writeFile(filePath, req.file.buffer);
      const imageUrl = `/uploads/profiles/${fileName}`;
      res.json({ url: imageUrl });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Serve profile images from local storage
  app.get("/api/files/profile/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const fs = await import('fs/promises');
      const filePath = path.join(process.cwd(), 'uploads', 'profiles', filename);
      const fileBuffer = await fs.readFile(filePath);
      
      const ext = path.extname(filename).toLowerCase();
      const contentType = ext === '.png' ? 'image/png' : 
                         ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                         ext === '.gif' ? 'image/gif' : 'image/jpeg';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.send(fileBuffer);
    } catch (error) {
      console.error("Profile image serve error:", error);
      res.status(404).json({ message: "Profile image not found" });
    }
  });



  // Compare files endpoint
  app.post("/api/compare-files", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
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
      
      // Get files from Object Storage with fallback to local filesystem
      let originalFileBuffer: Buffer;
      let newFileBuffer: Buffer;

      // Get original file
      const originalFileResult = await objectStorage.downloadAsBytes(originalFile.filename);
      if (originalFileResult.error) {
        const fs = await import('fs/promises');
        const originalFilePath = path.join(process.cwd(), 'uploads', originalFile.filename);
        try {
          originalFileBuffer = await fs.readFile(originalFilePath);
        } catch (error) {
          return res.status(404).json({ message: "Original file not found" });
        }
      } else {
        originalFileBuffer = Array.isArray(originalFileResult.value) ? originalFileResult.value[0] : originalFileResult.value;
      }

      // Get new file
      const newFileResult = await objectStorage.downloadAsBytes(newFile.filename);
      if (newFileResult.error) {
        const fs = await import('fs/promises');
        const newFilePath = path.join(process.cwd(), 'uploads', newFile.filename);
        try {
          newFileBuffer = await fs.readFile(newFilePath);
        } catch (error) {
          return res.status(404).json({ message: "New file not found" });
        }
      } else {
        newFileBuffer = Array.isArray(newFileResult.value) ? newFileResult.value[0] : newFileResult.value;
      }

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
      const userId = (req.user as any).claims.sub;
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

  // Cancel subscription
  app.post("/api/cancel-subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.stripeSubscriptionId) {
        return res.status(404).json({ message: "No active subscription found" });
      }

      // Cancel the subscription at period end
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      // Update user subscription status
      await storage.updateUserSubscription(userId, {
        subscriptionStatus: 'cancelling',
      });

      res.json({ 
        success: true,
        message: "Subscription will be cancelled at the end of the current billing period"
      });
    } catch (error) {
      console.error("Subscription cancellation error:", error);
      res.status(500).json({ 
        message: "Failed to cancel subscription", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
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

  // Cultural Discovery API routes
  app.post("/api/discover-locations", isAuthenticated, async (req: any, res) => {
    try {
      const { latitude, longitude, searchQuery, radius = 10 } = req.body;
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get user's interests for personalized discovery
      const user = await storage.getUser(userId);
      const userInterests = user?.interests || [];

      // Use AI to discover cultural points of interest
      const discoveryPrompt = `You are a cultural discovery expert. Based on the location ${latitude ? `(${latitude}, ${longitude})` : searchQuery} and user interests: ${userInterests.join(', ')}, identify 8-12 cultural and creative points of interest in the area.

Include diverse locations such as:
- Museums and galleries
- Historic sites with artistic/cultural significance
- Venues associated with famous artists, photographers, writers, filmmakers
- Creative districts and cultural neighborhoods
- Independent theaters, music venues, and performance spaces
- Artist studios, workshops, and creative spaces
- Cultural landmarks and architectural significance
- Libraries, bookshops with cultural importance

For each location, provide:
1. Name
2. Brief description (2-3 sentences)
3. Address or general location
4. Category (museum, gallery, historic_site, performance_venue, artist_studio, etc.)
5. Cultural significance (why it's important to creative people)
6. Approximate coordinates if possible

Format as JSON array with this structure:
[{
  "name": "Location Name",
  "description": "Brief description...",
  "address": "Full address or area description",
  "category": "museum",
  "culturalSignificance": "Why this matters to artists/creatives...",
  "latitude": "approximate_lat",
  "longitude": "approximate_lng"
}]

Focus on authentic, real locations that exist. If exact coordinates aren't available, provide best estimates.`;

      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      const result = await model.generateContent(discoveryPrompt);
      const response = await result.response;
      const aiResponse = response.text();

      // Parse AI response to extract locations
      let discoveredLocations;
      try {
        console.log("AI Response:", aiResponse);
        
        // Try multiple JSON extraction methods
        let jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          // Try extracting JSON between ```json and ``` blocks
          jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            jsonMatch[0] = jsonMatch[1];
          }
        }
        if (!jsonMatch) {
          // Try finding JSON object array pattern
          jsonMatch = aiResponse.match(/(\[[\s\S]*?\}[\s\S]*?\])/);
        }
        
        if (jsonMatch) {
          discoveredLocations = JSON.parse(jsonMatch[0]);
          console.log("Parsed locations:", discoveredLocations.length);
        } else {
          console.error("No JSON found in AI response");
          throw new Error("No valid JSON found in AI response");
        }
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError);
        console.error("Raw AI response:", aiResponse.substring(0, 500));
        return res.status(500).json({ message: "Failed to parse discovery results" });
      }

      // Save discovered locations to database
      const savedLocations = [];
      if (!discoveredLocations || !Array.isArray(discoveredLocations)) {
        console.error("discoveredLocations is not an array:", discoveredLocations);
        return res.status(500).json({ message: "Invalid locations data from AI" });
      }
      
      console.log("Processing", discoveredLocations.length, "locations");
      for (const location of discoveredLocations) {
        try {
          if (!location.name || !location.description) {
            console.error("Invalid location data:", location);
            continue;
          }
          
          const locationData = {
            userId,
            name: location.name,
            description: location.description,
            latitude: location.latitude || "0",
            longitude: location.longitude || "0",
            address: location.address || "Address not provided",
            category: location.category || "cultural_site",
            culturalSignificance: location.culturalSignificance || location.significance || "Cultural significance not specified",
            aiGenerated: true
          };
          
          const savedLocation = await storage.createDiscoveryLocation(locationData);
          savedLocations.push(savedLocation);
          console.log("Saved location:", savedLocation.name);
        } catch (error) {
          console.error("Failed to save location:", location.name, error);
        }
      }

      res.json({ 
        locations: savedLocations,
        searchCenter: { latitude, longitude, searchQuery }
      });
    } catch (error) {
      console.error("Discovery error:", error);
      res.status(500).json({ message: "Failed to discover locations" });
    }
  });

  // Get user's discovered locations
  app.get("/api/discovered-locations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const locations = await storage.getDiscoveryLocationsByUser(userId);
      res.json({ locations });
    } catch (error) {
      console.error("Get locations error:", error);
      res.status(500).json({ message: "Failed to get locations" });
    }
  });

  // Add location to favorites
  app.post("/api/favorite-location", isAuthenticated, async (req: any, res) => {
    try {
      const { locationId, notes } = req.body;
      const userId = req.user?.claims?.sub;

      const favorite = await storage.createFavoriteLocation({
        userId,
        locationId,
        notes
      });

      res.json({ favorite });
    } catch (error) {
      console.error("Favorite location error:", error);
      res.status(500).json({ message: "Failed to favorite location" });
    }
  });

  // Remove location from favorites
  app.delete("/api/favorite-location/:locationId", isAuthenticated, async (req: any, res) => {
    try {
      const { locationId } = req.params;
      const userId = req.user?.claims?.sub;

      await storage.removeFavoriteLocation(userId, parseInt(locationId));
      res.json({ message: "Location removed from favorites" });
    } catch (error) {
      console.error("Remove favorite error:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  // Get user's favorite locations
  app.get("/api/favorite-locations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const favorites = await storage.getFavoriteLocationsByUser(userId);
      res.json({ favorites });
    } catch (error) {
      console.error("Get favorites error:", error);
      res.status(500).json({ message: "Failed to get favorites" });
    }
  });

  // Save discovery session
  app.post("/api/save-discovery", isAuthenticated, async (req: any, res) => {
    try {
      const { name, description, centerLatitude, centerLongitude, locationIds, searchQuery } = req.body;
      const userId = req.user?.claims?.sub;

      const user = await storage.getUser(userId);
      const discovery = await storage.createSavedDiscovery({
        userId,
        name,
        description,
        centerLatitude,
        centerLongitude,
        locationIds,
        searchQuery,
        userInterests: user?.interests || []
      });

      res.json({ discovery });
    } catch (error) {
      console.error("Save discovery error:", error);
      res.status(500).json({ message: "Failed to save discovery" });
    }
  });

  // Get saved discoveries
  app.get("/api/saved-discoveries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const discoveries = await storage.getSavedDiscoveriesByUser(userId);
      res.json({ discoveries });
    } catch (error) {
      console.error("Get discoveries error:", error);
      res.status(500).json({ message: "Failed to get discoveries" });
    }
  });

  // Notes API routes
  // Create a new note
  app.post("/api/notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const noteData = insertNoteSchema.parse({ ...req.body, userId });
      
      const note = await storage.createNote(noteData);
      res.json({ note });
    } catch (error) {
      console.error("Create note error:", error);
      res.status(500).json({ message: "Failed to create note" });
    }
  });

  // Get all notes for a user
  app.get("/api/notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const notes = await storage.getNotesByUser(userId);
      res.json({ notes });
    } catch (error) {
      console.error("Get notes error:", error);
      res.status(500).json({ message: "Failed to get notes" });
    }
  });

  // Get notes for a specific conversation
  app.get("/api/notes/conversation/:conversationId", isAuthenticated, async (req: any, res) => {
    try {
      const { conversationId } = req.params;
      const notes = await storage.getNotesByConversation(parseInt(conversationId));
      res.json({ notes });
    } catch (error) {
      console.error("Get conversation notes error:", error);
      res.status(500).json({ message: "Failed to get conversation notes" });
    }
  });

  // Search notes
  app.get("/api/notes/search", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query required" });
      }
      
      const notes = await storage.searchNotes(userId, q);
      res.json({ notes });
    } catch (error) {
      console.error("Search notes error:", error);
      res.status(500).json({ message: "Failed to search notes" });
    }
  });

  // Update a note
  app.put("/api/notes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const note = await storage.updateNote(parseInt(id), updateData);
      res.json({ note });
    } catch (error) {
      console.error("Update note error:", error);
      res.status(500).json({ message: "Failed to update note" });
    }
  });

  // Delete a note
  app.delete("/api/notes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteNote(parseInt(id));
      res.json({ message: "Note deleted successfully" });
    } catch (error) {
      console.error("Delete note error:", error);
      res.status(500).json({ message: "Failed to delete note" });
    }
  });

  // Extract notes from AI feedback message
  app.post("/api/extract-notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { conversationId, messageContent, messageId } = req.body;

      if (!conversationId || !messageContent) {
        return res.status(400).json({ message: "Conversation ID and message content are required" });
      }

      // Get user to check subscription eligibility
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user is eligible (not free plan unless academic)
      const isEligible = user.subscriptionPlan !== 'free' || user.email?.endsWith('oca.ac.uk');
      if (!isEligible) {
        return res.status(403).json({ 
          message: "Note extraction is available for students and paying users only",
          needsUpgrade: true
        });
      }

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const extractionPrompt = `Analyze this AI feedback and extract any valuable insights that could be saved as reference notes. Look for specific techniques, artistic principles, resources, or actionable advice mentioned in the feedback.

Feedback content:
"${messageContent}"

Extract any of the following types of insights:
- TECHNIQUES: Specific artistic methods, composition rules, technical approaches
- ADVICE: General principles, best practices, or improvement suggestions
- RESOURCES: Mentions of books, websites, artists, galleries, tools, or references

Create a JSON response with an "items" array containing up to 5 extracted notes. Each note should have:
- title: Concise descriptive title (under 60 chars)
- content: Detailed explanation (under 300 chars)  
- category: One of "technique", "advice", or "resource"
- link: URL if mentioned, otherwise null

Example response:
{
  "items": [
    {
      "title": "Leading Lines Composition",
      "content": "Use natural or architectural elements to create lines that guide the viewer's eye toward your main subject. Roads, fences, or shadows work well as leading lines.",
      "category": "technique",
      "link": null
    }
  ]
}

If no valuable insights are found, return: {"items": []}`;

      const result = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing creative feedback and extracting valuable resources, techniques, and advice. Always respond with valid JSON format."
          },
          {
            role: "user",
            content: extractionPrompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500
      });

      const extractedText = result.choices[0].message.content;

      // Parse the JSON response
      let extractedNotes;
      try {
        if (extractedText && extractedText.trim()) {
          const parsed = JSON.parse(extractedText);
          // Handle both direct array and object with array property
          extractedNotes = Array.isArray(parsed) ? parsed : (parsed.notes || parsed.items || []);
        } else {
          extractedNotes = [];
        }
      } catch (parseError) {
        console.error("Failed to parse extraction response:", parseError);
        return res.status(500).json({ message: "Failed to parse AI response" });
      }

      // Limit to maximum 5 notes
      const limitedNotes = extractedNotes.slice(0, 5);

      // Create notes for each extracted item
      const createdNotes = [];
      for (const noteData of limitedNotes) {
        if (noteData.title && noteData.content && noteData.category) {
          try {
            const note = await storage.createNote({
              userId,
              conversationId: parseInt(conversationId),
              title: noteData.title,
              content: noteData.content,
              link: noteData.link || undefined,
              type: 'ai_extracted',
              category: noteData.category,
              tags: []
            });
            createdNotes.push(note);
          } catch (error) {
            console.error("Failed to create note:", error);
          }
        }
      }

      res.json({ 
        success: true,
        notes: createdNotes,
        extracted: createdNotes.length
      });
    } catch (error) {
      console.error("Note extraction error:", error);
      res.status(500).json({ 
        message: "Failed to extract notes",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
