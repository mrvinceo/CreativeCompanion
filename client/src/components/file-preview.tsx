import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Music, Video, Image, ChevronLeft, ChevronRight, Play, Pause, Volume2 } from 'lucide-react';
import { type UploadedFile } from '@/lib/types';
import { useState, useEffect, useRef } from 'react';

interface FilePreviewProps {
  files: UploadedFile[];
}

export function FilePreview({ files }: FilePreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (files.length === 0) return null;

  const getFileIcon = (mimeType: string, size: 'small' | 'large' = 'large') => {
    const sizeClass = size === 'small' ? 'w-6 h-6 sm:w-8 sm:h-8' : 'w-16 h-16';
    if (mimeType.startsWith('image/')) return <Image className={`${sizeClass} text-blue-500`} />;
    if (mimeType.startsWith('audio/')) return <Music className={`${sizeClass} text-purple-500`} />;
    if (mimeType.startsWith('video/')) return <Video className={`${sizeClass} text-green-500`} />;
    if (mimeType === 'application/pdf') return <FileText className={`${sizeClass} text-red-500`} />;
    return <FileText className={`${sizeClass} text-gray-500`} />;
  };

  const isImageFile = (mimeType: string) => {
    return mimeType.startsWith('image/') && (mimeType.includes('jpeg') || mimeType.includes('jpg') || mimeType.includes('png'));
  };

  const isAudioFile = (mimeType: string) => {
    return mimeType.startsWith('audio/');
  };

  const isVideoFile = (mimeType: string) => {
    return mimeType.startsWith('video/');
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
    // Pause any playing media when switching slides
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setCurrentIndex(index);
  };

  // Keyboard navigation and media controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't interfere with media controls when media elements are focused
      const activeElement = document.activeElement;
      if (activeElement?.tagName === 'VIDEO' || activeElement?.tagName === 'AUDIO') {
        return;
      }

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
    <Card className="p-2 sm:p-4">
      <h3 className="text-sm font-medium text-slate-700 mb-3 px-2 sm:px-0">
        Files Ready for Feedback ({files.length})
      </h3>
      
      {/* Main slideshow area */}
      <div className="relative bg-black rounded-lg overflow-hidden mb-4 w-full" style={{ aspectRatio: '16/9', minHeight: '200px' }}>
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
          ) : isVideoFile(currentFile.mimeType) ? (
            <video 
              ref={videoRef}
              src={`/api/files/${currentFile.id}/content`}
              controls
              className="max-w-full max-h-full object-contain"
              preload="metadata"
              controlsList="nodownload"
            >
              Your browser does not support the video tag.
            </video>
          ) : isAudioFile(currentFile.mimeType) ? (
            <div className="flex flex-col items-center text-white w-full max-w-md px-4">
              <div className="mb-6">
                <div className="relative">
                  {getFileIcon(currentFile.mimeType)}
                  <div className="absolute -bottom-2 -right-2 bg-purple-500 rounded-full p-1">
                    <Volume2 className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>
              <audio 
                ref={audioRef}
                src={`/api/files/${currentFile.id}/content`}
                controls
                className="w-full mb-4"
                preload="metadata"
                controlsList="nodownload"
              >
                Your browser does not support the audio tag.
              </audio>
              <p className="text-sm text-center">
                {currentFile.originalName}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Audio File
              </p>
            </div>
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
        <div className="flex gap-2 overflow-x-auto pb-2 px-2 sm:px-0">
          {files.map((file, index) => (
            <button
              key={file.id}
              onClick={() => goToSlide(index)}
              className={`flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded border-2 overflow-hidden transition-colors ${
                index === currentIndex ? 'border-primary' : 'border-gray-300'
              }`}
            >
              {isImageFile(file.mimeType) ? (
                <img 
                  src={`/api/files/${file.id}/content`}
                  alt={file.originalName}
                  className="w-full h-full object-cover"
                />
              ) : isVideoFile(file.mimeType) ? (
                <video 
                  src={`/api/files/${file.id}/content`}
                  className="w-full h-full object-cover"
                  muted
                  preload="metadata"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  {getFileIcon(file.mimeType, 'small')}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
