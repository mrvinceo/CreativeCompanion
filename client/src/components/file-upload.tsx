import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, X, FileText, Music, Video, Image } from 'lucide-react';
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE, getMaxFileSize, getMaxFilesPerConversation, type UploadedFile } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface FileUploadProps {
  sessionId: string;
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
}

interface SubscriptionData {
  subscriptionPlan: 'free' | 'standard' | 'premium' | 'academic';
  subscriptionStatus?: string;
  conversationsThisMonth: number;
  conversationLimit: number;
  isAcademic: boolean;
}

export function FileUpload({ sessionId, files, onFilesChange }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const { data: subscription } = useQuery<SubscriptionData>({
    queryKey: ['/api/subscription'],
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    // Check subscription limits before upload
    if (subscription) {
      const maxFiles = getMaxFilesPerConversation(subscription.subscriptionPlan, subscription.isAcademic);
      const maxFileSize = getMaxFileSize(subscription.subscriptionPlan, subscription.isAcademic);

      // Check file count limit
      if (files.length + acceptedFiles.length > maxFiles) {
        toast({
          title: "File limit exceeded",
          description: `Maximum ${maxFiles} files allowed per conversation`,
          variant: "destructive",
        });
        return;
      }

      // Check individual file sizes
      for (const file of acceptedFiles) {
        if (file.size > maxFileSize) {
          const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));
          toast({
            title: "File size too large",
            description: `"${file.name}" exceeds maximum size of ${maxSizeMB}MB`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      
      acceptedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await apiRequest('POST', '/api/upload', formData);
      const data = await response.json();
      
      onFilesChange([...files, ...data.files]);
      
      toast({
        title: "Files uploaded successfully",
        description: `${acceptedFiles.length} file(s) uploaded`,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      
      // Handle specific error messages from backend
      if (error.message?.includes('Maximum') || error.message?.includes('exceeds')) {
        toast({
          title: "Upload failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Upload failed",
          description: "Failed to upload files. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setUploading(false);
    }
  }, [sessionId, files, onFilesChange, toast, subscription]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.aac'],
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
      'application/pdf': ['.pdf']
    },
    maxSize: MAX_FILE_SIZE,
    disabled: uploading,
    preventDropOnDocument: true,
    noClick: false,
    noKeyboard: true,
  });

  const removeFile = async (fileId: number) => {
    try {
      await apiRequest('DELETE', `/api/files/${fileId}`);
      onFilesChange(files.filter(f => f.id !== fileId));
      
      toast({
        title: "File removed",
        description: "File deleted successfully",
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-5 h-5" />;
    if (mimeType.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (mimeType === 'application/pdf') return <FileText className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
        <Upload className="w-5 h-5 text-primary mr-2" />
        Upload Your Creative Work
      </h2>
      
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-slate-300 hover:border-primary'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
            <Upload className="w-8 h-8 text-slate-400" />
          </div>
          <div>
            <p className="text-lg font-medium text-slate-900">
              {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Support: Images, Audio, Video, PDF (Max 100MB each)
            </p>
          </div>
          {!uploading && (
            <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              Choose Files
            </div>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-medium text-slate-700">
            Uploaded Files ({files.length})
          </h3>
          
          {files.map((file) => (
            <div key={file.id} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
              <div className="flex-shrink-0">
                {getFileIcon(file.mimeType)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {file.originalName}
                </p>
                <p className="text-xs text-slate-500">
                  {formatFileSize(file.size)} • {SUPPORTED_FILE_TYPES[file.mimeType as keyof typeof SUPPORTED_FILE_TYPES]}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(file.id)}
                className="text-slate-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
