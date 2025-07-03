import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Music, Video, Image, ChevronLeft, ChevronRight } from 'lucide-react';
import { type UploadedFile } from '@/lib/types';
import { useState, useEffect } from 'react';

interface FilePreviewProps {
  files: UploadedFile[];
}

export function FilePreview({ files }: FilePreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (files.length === 0) return null;

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-16 h-16 text-blue-500" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-16 h-16 text-purple-500" />;
    if (mimeType.startsWith('video/')) return <Video className="w-16 h-16 text-green-500" />;
    if (mimeType === 'application/pdf') return <FileText className="w-16 h-16 text-red-500" />;
    return <FileText className="w-16 h-16 text-gray-500" />;
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

  const currentFile = files[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : files.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < files.length - 1 ? prev + 1 : 0));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (files.length <= 1) return;
      
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPrevious();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [files.length]);

  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium text-slate-700 mb-3">
        Files Ready for Feedback ({files.length})
      </h3>
      
      {/* Main slideshow area */}
      <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '16/9', minHeight: '300px' }}>
        {/* Navigation arrows */}
        {files.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white border-none"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={goToNext}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white border-none"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </>
        )}

        {/* Current file display */}
        <div className="w-full h-full flex items-center justify-center">
          {isImageFile(currentFile.mimeType) ? (
            <img 
              src={`/api/files/${currentFile.id}/content`}
              alt={currentFile.originalName}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center text-white">
              {getFileIcon(currentFile.mimeType)}
              <p className="mt-4 text-sm text-center max-w-xs">
                {currentFile.originalName}
              </p>
            </div>
          )}
        </div>

        {/* File info overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="text-white">
            {currentFile.title && (
              <p className="font-medium text-sm mb-1">
                {currentFile.title}
              </p>
            )}
            <p className="text-xs text-gray-300">
              {currentFile.originalName}
            </p>
            <p className="text-xs text-gray-400">
              {formatFileSize(currentFile.size)}
            </p>
          </div>
        </div>
      </div>

      {/* Thumbnail navigation */}
      {files.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {files.map((file, index) => (
            <button
              key={file.id}
              onClick={() => goToSlide(index)}
              className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-colors ${
                index === currentIndex ? 'border-primary' : 'border-gray-300'
              }`}
            >
              {isImageFile(file.mimeType) ? (
                <img 
                  src={`/api/files/${file.id}/content`}
                  alt={file.originalName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  {getFileIcon(file.mimeType)}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
