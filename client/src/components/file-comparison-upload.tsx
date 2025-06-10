import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileImage, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { type UploadedFile } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface FileComparisonUploadProps {
  sessionId: string;
  originalFiles: UploadedFile[];
  onComparisonComplete: (originalFile: UploadedFile, newFile: UploadedFile) => void;
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
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

  // Filter to only show image files for comparison
  const imageFiles = originalFiles.filter(file => 
    file.mimeType.startsWith('image/')
  );

  if (imageFiles.length === 0) {
    return null;
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
                {imageFiles.map((file) => (
                  <SelectItem key={file.id} value={file.id.toString()}>
                    <div className="flex items-center gap-2">
                      <FileImage className="w-4 h-4" />
                      <span className="truncate">{file.originalName}</span>
                    </div>
                  </SelectItem>
                ))}
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
                    ? 'Drop your improved image here'
                    : 'Drop an image here, or click to select'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports JPEG, PNG formats
                </p>
              </div>
            ) : (
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileImage className="w-4 h-4 text-blue-600" />
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