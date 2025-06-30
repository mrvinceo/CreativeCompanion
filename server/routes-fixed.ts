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

// Function to safely get file buffer from Object Storage
async function getFileBuffer(filename: string): Promise<Buffer | null> {
  try {
    const fileResult = await objectStorage.downloadAsBytes(filename);
    if (fileResult.error) {
      // Fallback to local filesystem for existing files
      const fs = await import('fs/promises');
      const filePath = path.join(process.cwd(), 'uploads', filename);
      try {
        return await fs.readFile(filePath);
      } catch (localError) {
        console.warn(`Could not find file ${filename} in storage or locally:`, localError);
        return null;
      }
    } else {
      // Object Storage returns a Uint8Array, convert to Buffer
      return Buffer.from(fileResult.value);
    }
  } catch (error) {
    console.error(`Error retrieving file ${filename}:`, error);
    return null;
  }
}

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
  dance: "You are a professional dancer instructor with expertise in various forms of dance styles and techniques. Analyze the submitted video of a dancer routine for technical development, visual storytelling, technical execution, and stylistic choices. Provide feedback on both artistic merit and technical ability.",
  creativeWriting: "You are an experienced creative writing instructor and published author with expertise across various literary forms. Review the submitted text for narrative structure, character development, prose style, dialogue, and overall literary merit. Provide constructive feedback on both craft and creative expression."
} as const;

// Configure multer for file uploads (using memory storage for Object Storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for video files
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/m4a",
      "audio/aac",
      "video/mp4",
      "video/mov",
      "video/avi",
      "video/quicktime",
      "video/webm",
      "application/pdf"
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Supported formats: JPEG, PNG, GIF, WebP, MP3, WAV, M4A, AAC, MP4, MOV, AVI, WebM, and PDF."));
    }
  }
});

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || ""
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

      const fileBuffer = await getFileBuffer(file.filename);
      if (!fileBuffer) {
        return res.status(404).json({ message: "File content not found" });
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

  // Rest of the routes would continue here...
  const server = createServer(app);
  return server;
}