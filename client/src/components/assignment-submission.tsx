import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Upload, File, Send, Bot, User, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';

interface AssignmentSubmissionProps {
  courseId: number;
  assignment: {
    title: string;
    description: string;
    artworkPrompt: string;
  };
  onClose: () => void;
}

interface AssignmentFile {
  id: number;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
}

interface AssignmentMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface AssignmentConversation {
  id: number;
  sessionId: string;
  courseId: number;
  userId: string;
  assignmentText: string;
  createdAt: string;
  updatedAt: string;
  messages: AssignmentMessage[];
  files: AssignmentFile[];
}

export function AssignmentSubmission({ courseId, assignment, onClose }: AssignmentSubmissionProps) {
  const [sessionId] = useState(() => nanoid());
  const [message, setMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Query to get existing conversation
  const { data: conversation, isLoading: isLoadingConversation } = useQuery<AssignmentConversation>({
    queryKey: ['assignment-conversation', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/assignment-conversations/${sessionId}`);
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }
      return response.json();
    },
    retry: false
  });

  // Mutation to submit assignment
  const submitAssignmentMutation = useMutation({
    mutationFn: async (data: { message: string; files?: FileList }) => {
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('courseId', courseId.toString());
      formData.append('assignmentText', assignment.description);
      formData.append('message', data.message);
      
      if (data.files) {
        for (let i = 0; i < data.files.length; i++) {
          formData.append('files', data.files[i]);
        }
      }

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
      queryClient.invalidateQueries({ queryKey: ['assignment-conversation', sessionId] });
      setMessage('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const files = fileInputRef.current?.files || undefined;
    submitAssignmentMutation.mutate({ message, files });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (fileInputRef.current) {
        fileInputRef.current.files = e.dataTransfer.files;
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70]">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{assignment.title}</h2>
            <p className="text-gray-600 mt-1">Submit your work for personalized feedback</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Assignment Details */}
          <div className="w-1/3 border-r p-6 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Assignment Brief</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{assignment.description}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Artwork Prompt</h3>
                <p className="text-gray-700 text-sm leading-relaxed italic">{assignment.artworkPrompt}</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Tips for Success</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Upload images of your work from multiple angles</li>
                  <li>• Describe your creative process and challenges</li>
                  <li>• Ask specific questions about techniques</li>
                  <li>• Share what you learned during creation</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Conversation Area */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoadingConversation ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : conversation?.messages && conversation.messages.length > 0 ? (
                conversation.messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-4 ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {msg.role === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                        <span className="text-sm font-medium">
                          {msg.role === 'user' ? 'You' : 'AI Tutor'}
                        </span>
                        <span className="text-xs opacity-70">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Submit your work to get personalized feedback!</p>
                </div>
              )}

              {/* Files */}
              {conversation?.files && conversation.files.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Uploaded Files</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {conversation.files.map((file) => (
                        <div key={file.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                          <File className="h-4 w-4 text-gray-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{file.originalname}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(file.size)} • {formatDate(file.uploadedAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Submission Form */}
            <div className="border-t p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* File Upload */}
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx"
                    className="hidden"
                    onChange={() => {}} // Files are handled on submit
                  />
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drop files here or{' '}
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-700 font-medium"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-xs text-gray-500">
                    Images, videos, audio, PDFs, and documents
                  </p>
                </div>

                {/* Message Input */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Describe your work, ask questions, or share your creative process..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[100px]"
                    required
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!message.trim() || submitAssignmentMutation.isPending}
                >
                  {submitAssignmentMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Getting Feedback...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit for Feedback
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}