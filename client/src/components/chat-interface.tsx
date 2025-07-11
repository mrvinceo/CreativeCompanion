import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Bot, User, Send, Copy, ThumbsUp, BookOpen } from 'lucide-react';
import { type ChatMessage, type Conversation, type UploadedFile } from '@/lib/types';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { FileComparisonUpload } from './file-comparison-upload';
import { ComparisonImages } from './comparison-images';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLocation } from 'wouter';

interface ChatInterfaceProps {
  sessionId: string;
  conversation: Conversation | null;
  messages: ChatMessage[];
  originalFiles: UploadedFile[];
  onMessagesUpdate: (messages: ChatMessage[]) => void;
}

export function ChatInterface({ 
  sessionId, 
  conversation, 
  messages, 
  originalFiles,
  onMessagesUpdate 
}: ChatInterfaceProps) {
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [extractingNotes, setExtractingNotes] = useState<number | null>(null);
  const [conversationHasNotes, setConversationHasNotes] = useState<Set<number>>(new Set());
  const [messagesWithNotes, setMessagesWithNotes] = useState<Set<number>>(new Set());
  const [, setLocation] = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch user subscription status
  const { data: subscription } = useQuery<{
    subscriptionPlan: 'free' | 'standard' | 'premium' | 'academic';
    subscriptionStatus?: string;
    conversationsThisMonth: number;
    conversationLimit: number;
    isAcademic: boolean;
  }>({
    queryKey: ['/api/subscription'],
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check for existing notes when conversation loads
  useEffect(() => {
    const checkExistingNotes = async () => {
      if (!conversation) return;
      
      try {
        const response = await fetch(`/api/notes/conversation/${conversation.id}`);
        const data = await response.json();
        
        if (data.notes && data.notes.length > 0) {
          setConversationHasNotes(prev => new Set(prev).add(conversation.id));
          
          // Check which messages have notes by looking at the extracted notes
          // Mark all AI messages as having notes if any AI-extracted notes exist
          // This is a simplified approach since we don't track specific message-note relationships
          const aiMessages = messages.filter(m => m.role === 'ai');
          if (aiMessages.length > 0 && data.notes.some((note: any) => note.type === 'ai_extracted')) {
            // Mark all AI messages as having notes to show "Show Notes" button
            const aiMessageIds = aiMessages.map(m => m.id);
            setMessagesWithNotes(prev => {
              const newSet = new Set(prev);
              aiMessageIds.forEach(id => newSet.add(id));
              return newSet;
            });
          }
        }
      } catch (error) {
        console.error('Failed to check existing notes:', error);
      }
    };

    checkExistingNotes();
  }, [conversation, messages]);

  const sendMessage = async () => {
    if (!followUpMessage.trim() || sending || !conversation) return;

    setSending(true);

    try {
      const response = await apiRequest('POST', '/api/chat', {
        sessionId,
        message: followUpMessage.trim(),
      });
      
      const data = await response.json();
      
      // Fetch updated messages
      const messagesResponse = await fetch(`/api/conversation/${sessionId}`);
      const messagesData = await messagesResponse.json();
      
      onMessagesUpdate(messagesData.messages);
      setFollowUpMessage('');
    } catch (error) {
      console.error('Send message error:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileComparison = async (originalFile: UploadedFile, newFile: UploadedFile) => {
    setSending(true);

    try {
      const response = await apiRequest('POST', '/api/compare-files', {
        sessionId,
        originalFileId: originalFile.id,
        newFileId: newFile.id,
      });
      
      const data = await response.json();
      
      // Fetch updated messages
      const messagesResponse = await fetch(`/api/conversation/${sessionId}`);
      const messagesData = await messagesResponse.json();
      
      onMessagesUpdate(messagesData.messages);
      toast({
        title: "Comparison complete",
        description: "AI has analyzed your improved version and provided feedback.",
      });
    } catch (error) {
      console.error('File comparison error:', error);
      toast({
        title: "Comparison failed",
        description: "Failed to compare files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "Message copied successfully",
      });
    });
  };

  const extractNotes = async (messageId: number, messageContent: string) => {
    if (!conversation) return;

    // Check if user is allowed to extract notes
    const isEligible = subscription?.subscriptionPlan !== 'free' || subscription?.isAcademic;
    
    if (!isEligible) {
      toast({
        title: "Upgrade Required",
        description: "Note extraction is available for students and paying users only.",
        variant: "destructive",
      });
      return;
    }

    setExtractingNotes(messageId);

    try {
      const response = await apiRequest('POST', '/api/extract-notes', {
        conversationId: conversation.id,
        messageContent,
        messageId,
      });

      const data = await response.json();
      
      if (data.notes && data.notes.length > 0) {
        // Update the notes cache to trigger real-time updates
        queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
        
        // Mark this conversation as having notes
        setConversationHasNotes(prev => new Set(prev).add(conversation.id));
        
        // Mark this specific message as having notes extracted
        setMessagesWithNotes(prev => new Set(prev).add(messageId));
        
        toast({
          title: "Notes Created",
          description: `Generated ${data.notes.length} notes from this feedback.`,
        });
      } else {
        toast({
          title: "No Notes Found",
          description: "No extractable notes were found in this feedback.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Note extraction error:', error);
      toast({
        title: "Note Extraction Failed",
        description: error.message || "Failed to extract notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExtractingNotes(null);
    }
  };

  const showNotesForConversation = () => {
    if (conversation) {
      window.location.href = `/notes?conversation=${conversation.id}`;
    }
  };

  const canExtractNotes = () => {
    return subscription?.subscriptionPlan !== 'free' || subscription?.isAcademic;
  };

  const formatTimestamp = (date: Date | string) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return messageDate.toLocaleDateString();
  };

  const parseComparisonMessage = (content: string) => {
    const comparisonStart = content.indexOf('COMPARISON_IMAGES:');
    if (comparisonStart === -1) {
      return { hasComparison: false, cleanContent: content };
    }
    
    // Find the end of the JSON by looking for the next double newline
    const jsonStart = comparisonStart + 'COMPARISON_IMAGES:'.length;
    const nextSection = content.indexOf('\n\n', jsonStart);
    
    if (nextSection === -1) {
      return { hasComparison: false, cleanContent: content };
    }
    
    try {
      const jsonString = content.substring(jsonStart, nextSection);
      const comparisonData = JSON.parse(jsonString);
      
      // Split content at the JSON section and take everything after
      const cleanContent = content.substring(nextSection + 2);
      
      return {
        hasComparison: true,
        comparisonData,
        cleanContent
      };
    } catch (e) {
      console.error('Failed to parse comparison data:', e);
      return { hasComparison: false, cleanContent: content };
    }
  };

  return (
    <Card className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center">
          <Bot className="w-5 h-5 text-secondary mr-2" />
          AI Creative Feedback
        </h2>
        <p className="text-sm text-slate-500 mt-1">Powered by Google Gemini 2.0</p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">
              Upload files and provide context to start getting AI feedback
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex items-start space-x-3 ${
              message.role === 'user' ? 'justify-end' : ''
            }`}>
              {message.role === 'ai' && (
                <div className="w-8 h-8 bg-gradient-to-br from-secondary to-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div className={`flex-1 min-w-0 ${message.role === 'user' ? 'flex justify-end' : ''}`}>
                <div className={`rounded-lg p-4 ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-br from-primary to-yellow-400 text-black max-w-xs lg:max-w-md font-medium' 
                    : 'bg-gradient-to-br from-green-500 to-emerald-400 text-white'
                }`}>
                  {message.role === 'ai' ? (
                    (() => {
                      const { hasComparison, comparisonData, cleanContent } = parseComparisonMessage(message.content);
                      return (
                        <div>
                          {hasComparison && (
                            <ComparisonImages
                              originalFile={comparisonData.originalFile}
                              newFile={comparisonData.newFile}
                            />
                          )}
                          <div className="prose prose-sm max-w-none prose-invert">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ children }) => <p className="whitespace-pre-wrap text-white">{children}</p>,
                                h1: ({ children }) => <h1 className="text-lg font-bold mb-2 text-white">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-base font-bold mb-2 text-white">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm font-bold mb-1 text-white">{children}</h3>,
                                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 text-white">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 text-white">{children}</ol>,
                                li: ({ children }) => <li className="mb-1 text-white">{children}</li>,
                                strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                                em: ({ children }) => <em className="italic text-white">{children}</em>,
                              }}
                            >
                              {cleanContent}
                            </ReactMarkdown>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="prose prose-sm max-w-none prose-invert">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  )}
                </div>
                
                {message.role === 'ai' && (
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mt-2 text-xs text-white/80">
                    <span>{formatTimestamp(message.createdAt)}</span>
                    <button 
                      onClick={() => copyToClipboard(message.content)}
                      className="hover:text-white transition-colors flex items-center"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </button>
                    <button className="hover:text-white transition-colors flex items-center">
                      <ThumbsUp className="w-3 h-3 mr-1" />
                      Helpful
                    </button>
                    <Button
                      size="sm"
                      variant={canExtractNotes() ? "outline" : "secondary"}
                      onClick={() => {
                        if (messagesWithNotes.has(message.id)) {
                          showNotesForConversation();
                        } else {
                          extractNotes(message.id, message.content);
                        }
                      }}
                      disabled={extractingNotes === message.id || !canExtractNotes()}
                      className="h-6 px-2 text-xs"
                    >
                      <BookOpen className="w-3 h-3 mr-1" />
                      {extractingNotes === message.id 
                        ? 'Creating...' 
                        : messagesWithNotes.has(message.id)
                          ? 'Show Notes'
                          : 'Create Notes'}
                    </Button>
                    {!canExtractNotes() && (
                      <span className="text-orange-600 text-xs">
                        Upgrade required for note extraction
                      </span>
                    )}
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      {conversation && (
        <div className="p-6 border-t border-slate-200">
          {/* File Comparison Upload */}
          <div className="mb-4">
            <FileComparisonUpload
              sessionId={sessionId}
              originalFiles={originalFiles}
              onComparisonComplete={handleFileComparison}
            />
          </div>
          
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <Textarea
                value={followUpMessage}
                onChange={(e) => setFollowUpMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a follow-up question about your creative work..."
                className="resize-none"
                rows={3}
                disabled={sending}
              />
            </div>
            <Button 
              onClick={sendMessage}
              disabled={!followUpMessage.trim() || sending}
              size="lg"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
            <span>Press Shift+Enter for new line, Enter to send</span>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${sending ? 'bg-yellow-500' : 'bg-green-500'}`} />
              <span>{sending ? 'AI Thinking...' : 'AI Ready'}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
