import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListRestart, Clock, MessageSquare, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

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

interface ConversationsData {
  conversations: ConversationHistoryItem[];
}

interface MobileConversationHistoryProps {
  children: React.ReactNode;
  onSelectConversation: (sessionId: string) => void;
}

export function MobileConversationHistory({ children, onSelectConversation }: MobileConversationHistoryProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conversationsData, isLoading } = useQuery<ConversationsData>({
    queryKey: ['/api/conversations'],
    enabled: open,
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      const response = await apiRequest('DELETE', `/api/conversations/${conversationId}`);
      if (!response.ok) {
        throw new Error('Failed to delete conversation');
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
    onError: (error) => {
      console.error('Delete conversation error:', error);
      toast({
        title: "Failed to delete conversation",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSelectConversation = (sessionId: string) => {
    setOpen(false);
    onSelectConversation(sessionId);
  };

  const handleDeleteConversation = (e: React.MouseEvent, conversationId: number) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      deleteConversationMutation.mutate(conversationId);
    }
  };

  const getMediaTypeDisplay = (mediaType: string | null) => {
    if (!mediaType) return null;
    
    const mediaTypes: Record<string, string> = {
      photography: 'Photography',
      painting: 'Painting',
      music: 'Music',
      film: 'Film',
      writing: 'Writing',
      sculpture: 'Sculpture',
      digital_art: 'Digital Art',
      mixed_media: 'Mixed Media',
      other: 'Other'
    };
    
    return mediaTypes[mediaType] || mediaType;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md mx-auto h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListRestart className="w-5 h-5" />
            Conversation History
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : conversationsData && conversationsData.conversations && conversationsData.conversations.length > 0 ? (
              conversationsData.conversations.map((conversation: ConversationHistoryItem) => (
                <Card 
                  key={conversation.id}
                  className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => handleSelectConversation(conversation.sessionId)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(conversation.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      
                      {conversation.contextPrompt && (
                        <p className="text-sm text-foreground mb-2 line-clamp-2">
                          {conversation.contextPrompt}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        {conversation.mediaType && (
                          <Badge variant="secondary" className="text-xs">
                            {getMediaTypeDisplay(conversation.mediaType)}
                          </Badge>
                        )}
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageSquare className="w-3 h-3" />
                          <span>{conversation.messageCount}</span>
                        </div>
                        
                        {conversation.fileCount > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>📎</span>
                            <span>{conversation.fileCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteConversation(e, conversation.id)}
                      className="ml-2 p-1 h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={deleteConversationMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-sm">Start by uploading creative work for feedback</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}