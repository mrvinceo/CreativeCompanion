import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, MessageSquare, FileText, Calendar, ChevronRight } from 'lucide-react';
import { MEDIA_TYPES } from '@/lib/media-types';

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

  const { data: conversationsData, isLoading } = useQuery<{ conversations: ConversationHistoryItem[] }>({
    queryKey: ['/api/conversations'],
    enabled: isOpen,
  });

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
                          <Badge variant="secondary" className="text-xs">
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
                        <div className="flex flex-wrap gap-1 mt-2">
                          {conversation.files.slice(0, 3).map((file) => (
                            <Badge key={file.id} variant="outline" className="text-xs">
                              {file.originalName.length > 15 
                                ? `${file.originalName.substring(0, 15)}...` 
                                : file.originalName}
                            </Badge>
                          ))}
                          {conversation.files.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{conversation.files.length - 3} more
                            </Badge>
                          )}
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