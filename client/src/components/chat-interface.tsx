import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Bot, User, Send, Copy, ThumbsUp } from 'lucide-react';
import { type ChatMessage, type Conversation } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatInterfaceProps {
  sessionId: string;
  conversation: Conversation | null;
  messages: ChatMessage[];
  onMessagesUpdate: (messages: ChatMessage[]) => void;
}

export function ChatInterface({ 
  sessionId, 
  conversation, 
  messages, 
  onMessagesUpdate 
}: ChatInterfaceProps) {
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "Message copied successfully",
      });
    });
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
                    ? 'bg-primary text-white max-w-xs lg:max-w-md' 
                    : 'bg-slate-50'
                }`}>
                  <div className={`prose prose-sm max-w-none ${
                    message.role === 'user' ? 'prose-invert' : ''
                  }`}>
                    {message.role === 'ai' ? (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        className="whitespace-pre-wrap"
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
                
                {message.role === 'ai' && (
                  <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                    <span>{formatTimestamp(message.createdAt)}</span>
                    <button 
                      onClick={() => copyToClipboard(message.content)}
                      className="hover:text-slate-700 transition-colors flex items-center"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </button>
                    <button className="hover:text-slate-700 transition-colors flex items-center">
                      <ThumbsUp className="w-3 h-3 mr-1" />
                      Helpful
                    </button>
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
