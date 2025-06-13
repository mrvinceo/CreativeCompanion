import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileImage, FileText, Music, Video, Crown, Lock, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { type UploadedFile } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface FileComparisonUploadProps {
  sessionId: string;
  originalFiles: UploadedFile[];
  onComparisonComplete: (originalFile: UploadedFile, newFile: UploadedFile) => void;
}

interface SubscriptionData {
  subscriptionPlan: 'free' | 'standard' | 'premium' | 'academic';
  subscriptionStatus?: string;
  conversationsThisMonth: number;
  conversationLimit: number;
  isAcademic: boolean;
}

export function FileComparisonUpload({ 
  sessionId, 
  originalFiles, 
  onComparisonComplete 
}: FileComparisonUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOriginalFile, setSelectedOriginalFile] = useState<string>('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const { data: subscription } = useQuery<SubscriptionData>({
    queryKey: ['/api/subscription'],
  });

  // Get file icon based on mime type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return FileImage;
    if (mimeType.startsWith('audio/')) return Music;
    if (mimeType.startsWith('video/')) return Video;
    return FileText;
  };

  // Check improved version count for the conversation
  const getImprovedVersionCount = () => {
    // Count files that are improvements based on original filename pattern
    return originalFiles.filter(file => 
      file.originalName.includes('_improved') || 
      file.originalName.includes('_version')
    ).length;
  };

  const improvedVersionCount = getImprovedVersionCount();
  const canUploadMore = () => {
    if (!subscription) return false;
    if (subscription.subscriptionPlan === 'free') return false;
    if (subscription.subscriptionPlan === 'standard' || subscription.isAcademic) return improvedVersionCount < 2;
    if (subscription.subscriptionPlan === 'premium') return improvedVersionCount < 5;
    return false;
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.bmp', '.tiff'],
      'audio/*': ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'],
      'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.md', '.doc', '.docx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setNewFile(acceptedFiles[0]);
      }
    }
  });

  const handleUpload = async () => {
    if (!selectedOriginalFile || !newFile) {
      toast({
        title: "Missing selection",
        description: "Please select an original file and upload a new version.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload the new file
      const formData = new FormData();
      formData.append('files', newFile);
      formData.append('sessionId', sessionId);

      const uploadResponse = await apiRequest('POST', '/api/upload', formData);
      const uploadData = await uploadResponse.json();
      
      if (uploadData.files && uploadData.files.length > 0) {
        const originalFile = originalFiles.find(f => f.id.toString() === selectedOriginalFile);
        if (originalFile) {
          onComparisonComplete(originalFile, uploadData.files[0]);
          setIsOpen(false);
          setSelectedOriginalFile('');
          setNewFile(null);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload the comparison file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeNewFile = () => {
    setNewFile(null);
  };

  if (originalFiles.length === 0) {
    return null;
  }

  // Show upgrade notice for free users
  if (subscription?.subscriptionPlan === 'free') {
    return (
      <Card className="p-3 border-orange-200 bg-orange-50">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-orange-600" />
          <span className="text-sm text-orange-800">
            Upgrade to Standard to Upload Improved Version for re-evaluation
          </span>
          <Crown className="w-4 h-4 text-orange-600" />
        </div>
      </Card>
    );
  }

  // Show limit reached notice
  if (!canUploadMore()) {
    const limit = subscription?.subscriptionPlan === 'standard' || subscription?.isAcademic ? 2 : 5;
    return (
      <Card className="p-3 border-yellow-200 bg-yellow-50">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-yellow-600" />
          <span className="text-sm text-yellow-800">
            You've reached your limit of {limit} improved versions per conversation
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="w-4 h-4" />
          Upload Improved Version
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compare Your Improvement</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Select original file */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Select original file to compare against:
            </label>
            <Select value={selectedOriginalFile} onValueChange={setSelectedOriginalFile}>
              <SelectTrigger>
                <SelectValue placeholder="Choose original file..." />
              </SelectTrigger>
              <SelectContent>
                {originalFiles.map((file) => {
                  const IconComponent = getFileIcon(file.mimeType);
                  return (
                    <SelectItem key={file.id} value={file.id.toString()}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4" />
                        <div className="flex flex-col text-left">
                          {file.title && (
                            <span className="font-medium text-sm">{file.title}</span>
                          )}
                          <span className="text-xs text-slate-500 truncate">{file.originalName}</span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Upload new file */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Upload your improved version:
            </label>
            
            {!newFile ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-600">
                  {isDragActive
                    ? 'Drop your improved file here'
                    : 'Drop your improved file here, or click to select'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports images, audio, video, documents, and more
                </p>
              </div>
            ) : (
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const IconComponent = getFileIcon(newFile.type);
                      return <IconComponent className="w-4 h-4 text-blue-600" />;
                    })()}
                    <span className="text-sm font-medium truncate">
                      {newFile.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeNewFile}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Upload button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedOriginalFile || !newFile || uploading}
            className="w-full"
          >
            {uploading ? 'Uploading...' : 'Compare Files'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}