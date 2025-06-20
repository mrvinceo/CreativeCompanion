import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { History, MessageSquare, FileText, Calendar, ChevronRight, Image, Music, Video, FileType, Trash2 } from 'lucide-react';
import { MEDIA_TYPES } from '@/lib/media-types';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ConversationHistoryItem {
  id: number;
  sessionId: string;
  contextPrompt: string | null;
  mediaType: string | null;
  createdAt: string;
  fileCount: number;
  messageCount: number;
  files: Array<{
    id: number;
    originalName: string;
    mimeType: string;
  }>;
}

interface ConversationHistoryProps {
  onSelectConversation: (sessionId: string) => void;
}

export function ConversationHistory({ onSelectConversation }: ConversationHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: conversationsData, isLoading } = useQuery<{ conversations: ConversationHistoryItem[] }>({
    queryKey: ['/api/conversations'],
    enabled: isOpen,
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      return await apiRequest(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      toast({
        title: "Conversation deleted",
        description: "The conversation and all associated files have been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete conversation",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleDeleteConversation = (conversationId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversationMutation.mutate(conversationId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSelectConversation = (sessionId: string) => {
    onSelectConversation(sessionId);
    setIsOpen(false);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('audio/')) return Music;
    if (mimeType.startsWith('video/')) return Video;
    return FileType;
  };

  const isImageFile = (mimeType: string) => {
    return mimeType.startsWith('image/') && (mimeType.includes('jpeg') || mimeType.includes('jpg') || mimeType.includes('png'));
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="px-2 sm:px-3">
          <History className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">History</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[320px] sm:w-[400px] lg:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center">
            <History className="w-5 h-5 mr-2" />
            Conversation History
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversationsData?.conversations?.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <History className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No conversations yet</p>
              <p className="text-sm">Start by uploading files and getting AI feedback</p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversationsData?.conversations?.map((conversation: ConversationHistoryItem) => (
                <Card 
                  key={conversation.id} 
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary/20 hover:border-l-primary"
                  onClick={() => handleSelectConversation(conversation.sessionId)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        {conversation.mediaType && (
                          <Badge variant="secondary" className="text-xs text-[#ffffff]">
                            {MEDIA_TYPES[conversation.mediaType as keyof typeof MEDIA_TYPES]?.label || conversation.mediaType}
                          </Badge>
                        )}
                        <div className="flex items-center text-xs text-slate-500">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(conversation.createdAt)}
                        </div>
                      </div>
                      
                      <p className="text-sm text-slate-900 font-medium line-clamp-2 mb-2">
                        {conversation.contextPrompt || 'No description provided'}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-slate-500">
                        <div className="flex items-center">
                          <FileText className="w-3 h-3 mr-1" />
                          {conversation.fileCount} files
                        </div>
                        <div className="flex items-center">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          {conversation.messageCount} messages
                        </div>
                      </div>
                      
                      {conversation.files.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {/* Image previews */}
                          <div className="flex flex-wrap gap-2">
                            {conversation.files
                              .filter(file => isImageFile(file.mimeType))
                              .slice(0, 4)
                              .map((file) => (
                                <div key={file.id} className="relative">
                                  <img 
                                    src={`/api/files/${file.id}/content`}
                                    alt={file.originalName}
                                    className="w-12 h-12 rounded object-cover border border-slate-200"
                                  />
                                </div>
                              ))}
                          </div>
                          
                          {/* Non-image files */}
                          <div className="flex flex-wrap gap-1">
                            {conversation.files
                              .filter(file => !isImageFile(file.mimeType))
                              .slice(0, 3)
                              .map((file) => {
                                const IconComponent = getFileIcon(file.mimeType);
                                return (
                                  <div key={file.id} className="flex items-center space-x-1 bg-slate-100 rounded px-2 py-1">
                                    <IconComponent className="w-3 h-3 text-slate-500" />
                                    <span className="text-xs text-slate-600">
                                      {file.originalName.length > 12 
                                        ? `${file.originalName.substring(0, 12)}...` 
                                        : file.originalName}
                                    </span>
                                  </div>
                                );
                              })}
                            {conversation.files.filter(file => !isImageFile(file.mimeType)).length > 3 && (
                              <div className="flex items-center space-x-1 bg-slate-100 rounded px-2 py-1">
                                <span className="text-xs text-slate-600">
                                  +{conversation.files.filter(file => !isImageFile(file.mimeType)).length - 3} more
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}