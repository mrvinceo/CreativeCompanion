import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Palette, Lightbulb, LogOut, User, Plus, MapPin, BookOpen } from 'lucide-react';
import { FileUpload } from '@/components/file-upload';
import { FilePreview } from '@/components/file-preview';
import { ChatInterface } from '@/components/chat-interface';
import { ConversationHistory } from '@/components/conversation-history';
import { SubscriptionStatus } from '@/components/subscription-status';
import { ProfileDialog } from '@/components/profile-dialog';
import { RefynLogo } from '@/components/refyn-logo';
import { type UploadedFile, type ChatMessage, type Conversation } from '@/lib/types';
import { MEDIA_TYPES, type MediaType } from '@/lib/media-types';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

export default function Home() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Session state that updates based on URL parameters
  const [sessionId, setSessionId] = useState(() => {
    const param = new URLSearchParams(window.location.search).get('session');
    return param || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  });
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [contextPrompt, setContextPrompt] = useState('');
  const [mediaType, setMediaType] = useState<MediaType | ''>('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const { toast } = useToast();

  // Handle session parameter changes - this effect should run when location changes
  useEffect(() => {
    const currentSessionParam = new URLSearchParams(window.location.search).get('session');
    console.log('Home page - detected session param:', currentSessionParam, 'current sessionId:', sessionId);
    
    if (currentSessionParam && currentSessionParam !== sessionId) {
      console.log('Home page - updating sessionId to:', currentSessionParam);
      setSessionId(currentSessionParam);
      // Clear URL parameter after setting session
      if (window.history.replaceState) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [location]);

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
          setMediaType((data.conversation.mediaType as MediaType) || '');
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

  const handleSelectConversation = async (selectedSessionId: string) => {
    // Load the selected conversation
    try {
      const response = await fetch(`/api/conversation/${selectedSessionId}`);
      const data = await response.json();
      
      if (data.conversation) {
        setSessionId(selectedSessionId);
        setConversation(data.conversation);
        setMessages(data.messages);
        setContextPrompt(data.conversation.contextPrompt || '');
        setMediaType((data.conversation.mediaType as MediaType) || '');
        
        // Load files for this session
        const filesResponse = await fetch(`/api/files/${selectedSessionId}`);
        const filesData = await filesResponse.json();
        setFiles(filesData.files);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      toast({
        title: "Failed to load conversation",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const startNewConversation = () => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    setFiles([]);
    setContextPrompt('');
    setMediaType('');
    setConversation(null);
    setMessages([]);
  };

  const submitForAnalysis = async () => {
    if (!contextPrompt.trim()) {
      toast({
        title: "Context required",
        description: "Please provide context for your creative work",
        variant: "destructive",
      });
      return;
    }

    if (!mediaType) {
      toast({
        title: "Media type required",
        description: "Please select a media type for specialized feedback",
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
        mediaType,
      });

      const data = await response.json();
      setConversation(data.conversation);
      setMessages([data.message]);

      // Refresh file data to include AI-generated titles
      const updatedFilesResponse = await fetch(`/api/files/${sessionId}`);
      const updatedFilesData = await updatedFilesResponse.json();
      if (updatedFilesData.files) {
        setFiles(updatedFilesData.files);
      }

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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-3 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <RefynLogo size={32} showTitle={false} className="sm:hidden" />
          <RefynLogo size={36} showTitle={true} className="hidden sm:flex" />
          <div className="flex items-center space-x-1 sm:space-x-3">
            {user && (
              <>
                <ConversationHistory onSelectConversation={handleSelectConversation} />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLocation('/cultural-discovery')}
                  className="px-2 sm:px-3"
                >
                  <MapPin className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Discover</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLocation('/notes')}
                  className="px-2 sm:px-3"
                >
                  <BookOpen className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Notes</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={startNewConversation}
                  className="px-2 sm:px-3"
                >
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">New</span>
                </Button>
                <ProfileDialog>
                  <Button variant="ghost" size="sm" className="px-2 sm:px-3 flex items-center gap-1 sm:gap-2">
                    {user.profileImageUrl ? (
                      <img 
                        src={user.profileImageUrl} 
                        alt="Profile" 
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-slate-300 rounded-full flex items-center justify-center">
                        <User className="w-3 h-3 sm:w-4 sm:h-4 text-slate-600" />
                      </div>
                    )}
                    <span className="hidden sm:inline text-xs sm:text-sm">
                      {user.firstName || user.email?.split('@')[0] || 'Profile'}
                    </span>
                  </Button>
                </ProfileDialog>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => window.location.href = '/api/logout'}
                  className="px-2 sm:px-3"
                >
                  <LogOut className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-6 gap-6">
        {/* Upload Panel */}
        <div className="lg:w-1/2 space-y-6">
          <SubscriptionStatus />
          
          <FileUpload 
            sessionId={sessionId}
            files={files}
            onFilesChange={setFiles}
          />

          {files.length > 0 && <FilePreview files={files} />}

          {/* Media Type & Context Section */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Lightbulb className="w-5 h-5 text-warning mr-2" />
              Creative Medium & Context
            </h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="media-type" className="text-sm font-medium text-slate-700">
                  Select Your Creative Medium
                </Label>
                <Select 
                  value={mediaType} 
                  onValueChange={(value: MediaType) => setMediaType(value)}
                  disabled={analyzing || !!conversation}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose the type of creative work..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MEDIA_TYPES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="context-prompt" className="text-sm font-medium text-slate-700">
                  Additional Context & Instructions
                </Label>
                <Textarea
                  id="context-prompt"
                  value={contextPrompt}
                  onChange={(e) => setContextPrompt(e.target.value)}
                  placeholder="Provide specific details about what you'd like feedback on...

Examples:
• 'Focus on color harmony and composition'
• 'I'm particularly interested in emotional impact'
• 'Please evaluate technical execution and style'"
                  className="mt-1"
                  rows={6}
                  disabled={analyzing || !!conversation}
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center space-x-4 text-sm text-slate-500">
                <span>{files.length} files ready</span>
                {mediaType && <span>{MEDIA_TYPES[mediaType].label}</span>}
                <span>Gemini 2.0</span>
              </div>
              
              {!conversation && (
                <Button 
                  onClick={submitForAnalysis}
                  disabled={analyzing || !contextPrompt.trim() || !mediaType || files.length === 0}
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
            originalFiles={files}
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
