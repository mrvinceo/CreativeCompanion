export interface UploadedFile {
  id: number;
  filename: string;
  originalName: string;
  title?: string; // AI-generated descriptive title
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
  userId?: string | null;
  createdAt: Date;
}

export const SUPPORTED_FILE_TYPES = {
  'image/jpeg': 'JPEG',
  'image/jpg': 'JPEG',
  'image/png': 'PNG',
  'image/gif': 'GIF',
  'image/webp': 'WebP',
  'audio/mpeg': 'MP3',
  'audio/mp3': 'MP3',
  'audio/wav': 'WAV',
  'audio/m4a': 'M4A',
  'audio/aac': 'AAC',
  'video/mp4': 'MP4',
  'video/mov': 'MOV',
  'video/avi': 'AVI',
  'video/quicktime': 'QuickTime',
  'video/webm': 'WebM',
  'application/pdf': 'PDF'
};

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
