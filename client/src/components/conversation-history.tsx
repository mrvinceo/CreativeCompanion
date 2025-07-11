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
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete conversation');
      }
      
      return response.json();
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

  const getFileTypeIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-3 h-3 text-blue-500" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-3 h-3 text-purple-500" />;
    if (mimeType.startsWith('video/')) return <Video className="w-3 h-3 text-green-500" />;
    if (mimeType === 'application/pdf') return <FileType className="w-3 h-3 text-red-500" />;
    return <FileType className="w-3 h-3 text-gray-500" />;
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
                  <div className="flex items-start justify-between gap-3">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      {conversation.files.length > 0 && isImageFile(conversation.files[0].mimeType) ? (
                        <img 
                          src={`/api/files/${conversation.files[0].id}/content`}
                          alt={conversation.files[0].originalName}
                          className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                          <FileText className="w-8 h-8 text-slate-400" />
                        </div>
                      )}
                    </div>

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
                      
                      {conversation.files.length > 1 && (
                        <div className="mt-3">
                          {/* Additional file indicators */}
                          <div className="flex flex-wrap gap-1">
                            {conversation.files
                              .slice(1, 5)
                              .map((file) => (
                                <div key={file.id} className="w-6 h-6 rounded border border-slate-200 overflow-hidden">
                                  {isImageFile(file.mimeType) ? (
                                    <img 
                                      src={`/api/files/${file.id}/content`}
                                      alt={file.originalName}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                                      {getFileTypeIcon(file.mimeType)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            {conversation.files.length > 5 && (
                              <div className="w-6 h-6 rounded border border-slate-200 bg-slate-100 flex items-center justify-center text-xs text-slate-500">
                                +{conversation.files.length - 5}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this conversation? This will permanently remove all messages and associated files. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => handleDeleteConversation(conversation.id, e)}
                              className="bg-red-600 hover:bg-red-700"
                              disabled={deleteConversationMutation.isPending}
                            >
                              {deleteConversationMutation.isPending ? "Deleting..." : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
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