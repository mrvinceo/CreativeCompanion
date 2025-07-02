import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { X, MessageSquare, Calendar, FileText } from 'lucide-react';

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

interface ConversationHistoryDrawerProps {
  children: React.ReactNode;
  onSelectConversation: (sessionId: string) => void;
}

export function ConversationHistoryDrawer({ children, onSelectConversation }: ConversationHistoryDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: conversationsData, isLoading } = useQuery<{ conversations: ConversationHistoryItem[] }>({
    queryKey: ['/api/conversations'],
    enabled: isOpen, // Only fetch when drawer is opened
  });

  const conversations = conversationsData?.conversations || [];

  const handleSelectConversation = (sessionId: string) => {
    onSelectConversation(sessionId);
    setIsOpen(false); // Close drawer after selection
  };

  const getMediaTypeIcon = (mediaType: string | null) => {
    if (!mediaType) return <MessageSquare className="w-4 h-4" />;
    
    if (mediaType.startsWith('image/')) return '🖼️';
    if (mediaType.startsWith('audio/')) return '🎵';
    if (mediaType.startsWith('video/')) return '🎬';
    if (mediaType === 'application/pdf') return '📄';
    return <FileText className="w-4 h-4" />;
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="left" className="w-[400px] sm:w-[540px] p-0">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Conversation History
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="flex-1 p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-3 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No conversations yet</h3>
              <p className="text-sm text-muted-foreground">
                Start a new conversation to see your history here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conversation) => (
                <Card 
                  key={conversation.sessionId}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSelectConversation(conversation.sessionId)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 mb-2">
                        {getMediaTypeIcon(conversation.mediaType)}
                        <Badge variant="outline" className="text-xs">
                          {conversation.mediaType?.split('/')[0] || 'text'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(conversation.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <CardTitle className="text-sm line-clamp-2">
                      {conversation.contextPrompt || 'New Creative Feedback'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span>{conversation.messageCount} messages</span>
                        {conversation.fileCount > 0 && (
                          <span>{conversation.fileCount} files</span>
                        )}
                      </div>
                    </div>
                    {conversation.files.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {conversation.files.slice(0, 3).map((file) => (
                          <Badge key={file.id} variant="secondary" className="text-xs">
                            {file.originalName.length > 20 
                              ? `${file.originalName.substring(0, 20)}...` 
                              : file.originalName
                            }
                          </Badge>
                        ))}
                        {conversation.files.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{conversation.files.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}