import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Palette, Lightbulb } from 'lucide-react';
import { FileUpload } from '@/components/file-upload';
import { FilePreview } from '@/components/file-preview';
import { ChatInterface } from '@/components/chat-interface';
import { type UploadedFile, type ChatMessage, type Conversation } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [contextPrompt, setContextPrompt] = useState('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const { toast } = useToast();

  // Load existing conversation on mount
  useEffect(() => {
    const loadConversation = async () => {
      try {
        const response = await fetch(`/api/conversation/${sessionId}`);
        const data = await response.json();
        
        if (data.conversation) {
          setConversation(data.conversation);
          setMessages(data.messages);
          setContextPrompt(data.conversation.contextPrompt || '');
        }
      } catch (error) {
        console.error('Failed to load conversation:', error);
      }
    };

    loadConversation();
  }, [sessionId]);

  // Load files for session
  useEffect(() => {
    const loadFiles = async () => {
      try {
        const response = await fetch(`/api/files/${sessionId}`);
        const data = await response.json();
        setFiles(data.files);
      } catch (error) {
        console.error('Failed to load files:', error);
      }
    };

    loadFiles();
  }, [sessionId]);

  const submitForAnalysis = async () => {
    if (!contextPrompt.trim()) {
      toast({
        title: "Context required",
        description: "Please provide context for your creative work",
        variant: "destructive",
      });
      return;
    }

    if (files.length === 0) {
      toast({
        title: "Files required", 
        description: "Please upload at least one file for analysis",
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);

    try {
      const response = await apiRequest('POST', '/api/analyze', {
        sessionId,
        contextPrompt,
      });

      const data = await response.json();
      setConversation(data.conversation);
      setMessages([data.message]);

      toast({
        title: "Analysis complete",
        description: "Your creative work has been analyzed",
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis failed",
        description: "Failed to analyze your work. Please check your API key and try again.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">CreativeAI</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-600">Session: {sessionId.slice(-8)}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-6 gap-6">
        {/* Upload Panel */}
        <div className="lg:w-1/2 space-y-6">
          <FileUpload 
            sessionId={sessionId}
            files={files}
            onFilesChange={setFiles}
          />

          {files.length > 0 && <FilePreview files={files} />}

          {/* Context Prompt Section */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Lightbulb className="w-5 h-5 text-warning mr-2" />
              Context & Instructions
            </h2>
            
            <Textarea
              value={contextPrompt}
              onChange={(e) => setContextPrompt(e.target.value)}
              placeholder="Describe what you'd like feedback on...

Examples:
• 'Please review this interior design concept for a modern apartment. Focus on color harmony and spatial flow.'
• 'Analyze the composition and emotional impact of this artwork.'
• 'Evaluate the user experience flow in these app mockups.'"
              className="mb-4"
              rows={8}
              disabled={analyzing || !!conversation}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm text-slate-500">
                <span>{files.length} files ready</span>
                <span>Gemini 2.0</span>
              </div>
              
              {!conversation && (
                <Button 
                  onClick={submitForAnalysis}
                  disabled={analyzing || !contextPrompt.trim() || files.length === 0}
                  className="bg-gradient-to-r from-primary to-secondary"
                >
                  {analyzing ? 'Analyzing...' : 'Get AI Feedback'}
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Conversation Panel */}
        <div className="lg:w-1/2 flex flex-col">
          <ChatInterface
            sessionId={sessionId}
            conversation={conversation}
            messages={messages}
            onMessagesUpdate={setMessages}
          />
        </div>
      </main>

      {/* Loading Overlay */}
      {analyzing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-8 max-w-sm mx-4 text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Analyzing Your Creative Work
            </h3>
            <p className="text-slate-600 text-sm">
              Gemini AI is reviewing your files and generating personalized feedback...
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
