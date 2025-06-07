export interface UploadedFile {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  sessionId: string;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  role: 'user' | 'ai';
  content: string;
  createdAt: Date;
}

export interface Conversation {
  id: number;
  sessionId: string;
  contextPrompt: string | null;
  mediaType: string | null;
  createdAt: Date;
}

export const SUPPORTED_FILE_TYPES = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG', 
  'audio/mpeg': 'MP3',
  'video/mp4': 'MP4',
  'application/pdf': 'PDF'
};

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
