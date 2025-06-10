import { Card } from '@/components/ui/card';
import { FileText, Music, Video, Image } from 'lucide-react';
import { type UploadedFile } from '@/lib/types';

interface FilePreviewProps {
  files: UploadedFile[];
}

export function FilePreview({ files }: FilePreviewProps) {
  if (files.length === 0) return null;

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-8 h-8 text-blue-500" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-8 h-8 text-purple-500" />;
    if (mimeType.startsWith('video/')) return <Video className="w-8 h-8 text-green-500" />;
    if (mimeType === 'application/pdf') return <FileText className="w-8 h-8 text-red-500" />;
    return <FileText className="w-8 h-8 text-gray-500" />;
  };

  const isImageFile = (mimeType: string) => {
    return mimeType.startsWith('image/') && (mimeType.includes('jpeg') || mimeType.includes('jpg') || mimeType.includes('png'));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium text-slate-700 mb-3">
        Files Ready for Feedback ({files.length})
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {files.map((file) => (
          <div key={file.id} className="flex flex-col items-center p-3 bg-slate-50 rounded-lg">
            {isImageFile(file.mimeType) ? (
              <div className="w-20 h-20 mb-2">
                <img 
                  src={`/api/files/${file.id}/content`}
                  alt={file.originalName}
                  className="w-full h-full object-cover rounded border border-slate-200"
                />
              </div>
            ) : (
              <div className="mb-2">
                {getFileIcon(file.mimeType)}
              </div>
            )}
            <div className="text-center w-full">
              {file.title && (
                <p className="text-xs font-medium text-slate-900 truncate w-full mb-1">
                  {file.title}
                </p>
              )}
              <p className="text-xs text-slate-500 truncate w-full">
                {file.originalName}
              </p>
            </div>
            <p className="text-xs text-slate-500">
              {formatFileSize(file.size)}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
