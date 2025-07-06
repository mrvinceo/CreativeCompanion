import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, MessageSquare, FileText, X, Send, Bot } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface FinalAssignment {
  title: string;
  description: string;
  artworkPrompt: string;
}

interface AssignmentSubmissionProps {
  courseId: number;
  assignment: FinalAssignment;
  onClose: () => void;
}

interface UploadedFile {
  id: number;
  filename: string;
  mimetype: string;
  size: number;
  url?: string;
}

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface AssignmentConversation {
  id: number;
  sessionId: string;
  courseId: number;
  messages: Message[];
  files: UploadedFile[];
}

export function AssignmentSubmission({ courseId, assignment, onClose }: AssignmentSubmissionProps) {
  const [userMessage, setUserMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generate session ID for this assignment conversation
  const [sessionId] = useState(() => `assignment-${courseId}-${Date.now()}`);

  // Query for existing conversation
  const { data: conversation, isLoading } = useQuery({
    queryKey: ['/api/assignment-conversations', sessionId],
    queryFn: () => fetch(`/api/assignment-conversations/${sessionId}`).then(res => {
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to fetch conversation');
      return res.json();
    })
  });

  // File upload handling
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      setUploadedFiles(prev => [...prev, ...acceptedFiles]);
    },
    multiple: true,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'audio/*': ['.mp3', '.wav', '.aac', '.m4a'],
      'video/*': ['.mp4', '.mov', '.avi', '.mkv'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.md']
    }
  });

  // Submit assignment mutation
  const submitAssignmentMutation = useMutation({
    mutationFn: async (data: { files: File[], message: string, sessionId: string }) => {
      setIsSubmitting(true);
      
      const formData = new FormData();
      data.files.forEach(file => formData.append('files', file));
      formData.append('message', data.message);
      formData.append('sessionId', data.sessionId);
      formData.append('courseId', courseId.toString());
      formData.append('assignmentText', `${assignment.title}\n\n${assignment.description}\n\nTask: ${assignment.artworkPrompt}`);

      const response = await fetch('/api/assignment-conversations', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to submit assignment');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assignment-conversations', sessionId] });
      setUserMessage('');
      setUploadedFiles([]);
      setIsSubmitting(false);
      toast({
        title: "Assignment Submitted",
        description: "Your work has been submitted for feedback."
      });
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit assignment",
        variant: "destructive"
      });
    }
  });

  const removeFile = (index: number) => {
    setUploadedFiles(files => files.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (uploadedFiles.length === 0 && !userMessage.trim()) {
      toast({
        title: "Nothing to Submit",
        description: "Please add files or a message before submitting.",
        variant: "destructive"
      });
      return;
    }

    submitAssignmentMutation.mutate({
      files: uploadedFiles,
      message: userMessage.trim() || "Here is my assignment submission.",
      sessionId
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 md:p-4 z-[70]">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-purple-600" />
                Assignment Submission
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Submit your work for personalized feedback
              </p>
            </div>
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Assignment Details */}
        <div className="p-6 border-b bg-gray-50">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{assignment.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-3">{assignment.description}</p>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm font-medium text-purple-800 mb-1">Your Task:</p>
                <p className="text-purple-700 italic">{assignment.artworkPrompt}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Existing Conversation */}
          {conversation && conversation.messages && conversation.messages.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Previous Submissions & Feedback</h3>
              {conversation.messages.map((message: Message) => (
                <Card key={message.id} className={message.role === 'assistant' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {message.role === 'assistant' ? (
                        <Bot className="w-4 h-4 text-blue-600" />
                      ) : (
                        <FileText className="w-4 h-4 text-gray-600" />
                      )}
                      <span className="text-sm font-medium">
                        {message.role === 'assistant' ? 'AI Feedback' : 'Your Submission'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(message.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      {message.content.split('\n').map((paragraph, i) => (
                        <p key={i} className="mb-2">{paragraph}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* File Upload Area */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">
              {conversation?.messages?.length > 0 ? 'Submit Improved Version' : 'Submit Your Work'}
            </h3>
            
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400 bg-gray-50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                {isDragActive ? 'Drop files here' : 'Upload your assignment files'}
              </p>
              <p className="text-sm text-gray-500">
                Drag & drop files or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Supports images, audio, video, PDFs, and text files
              </p>
            </div>

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700">Files to Submit:</h4>
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Message Input */}
            <div className="space-y-2">
              <Label htmlFor="message">Add a message (optional)</Label>
              <Textarea
                id="message"
                placeholder="Describe your work, ask specific questions, or provide context..."
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || (uploadedFiles.length === 0 && !userMessage.trim())}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSubmitting ? (
              <>Submitting...</>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit for Feedback
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}