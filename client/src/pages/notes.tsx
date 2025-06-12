import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, Plus, ExternalLink, Edit, Trash2, BookOpen, Lightbulb, Palette, Globe, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface Note {
  id: number;
  userId: string;
  conversationId?: number;
  title: string;
  content: string;
  link?: string;
  type: 'ai_extracted' | 'manual';
  category?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  sessionId?: string;
}

const categoryIcons = {
  resource: <Globe className="w-4 h-4" />,
  advice: <Lightbulb className="w-4 h-4" />,
  technique: <Palette className="w-4 h-4" />,
  general: <BookOpen className="w-4 h-4" />
};

export default function Notes() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  // Form state for creating notes
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteLink, setNoteLink] = useState("");
  const [noteCategory, setNoteCategory] = useState("general");

  // Check for conversation filter in URL params
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const conversationFilter = urlParams.get('conversation');

  // Fetch notes (either all notes or conversation-specific)
  const { data: notesData, isLoading } = useQuery<{ notes: Note[] }>({
    queryKey: conversationFilter ? ['/api/notes/conversation', conversationFilter] : ['/api/notes'],
    queryFn: async () => {
      const endpoint = conversationFilter 
        ? `/api/notes/conversation/${conversationFilter}`
        : '/api/notes';
      const response = await apiRequest('GET', endpoint);
      return response.json();
    }
  });

  // Search notes
  const { data: searchResults, isLoading: isSearching } = useQuery<{ notes: Note[] }>({
    queryKey: ['/api/notes/search', searchQuery],
    enabled: searchQuery.length > 0,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/notes/search?q=${encodeURIComponent(searchQuery)}`);
      return response.json();
    }
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (noteData: any) => {
      const response = await apiRequest('POST', '/api/notes', noteData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      setIsCreateDialogOpen(false);
      setNoteTitle("");
      setNoteContent("");
      setNoteLink("");
      setNoteCategory("general");
      toast({
        title: "Note Created",
        description: "Your note has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create note. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      await apiRequest('DELETE', `/api/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      toast({
        title: "Note Deleted",
        description: "Note has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete note. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleCreateNote = () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide both title and content for the note.",
        variant: "destructive",
      });
      return;
    }

    createNoteMutation.mutate({
      title: noteTitle.trim(),
      content: noteContent.trim(),
      link: noteLink.trim() || undefined,
      category: noteCategory,
      type: 'manual',
      tags: []
    });
  };

  const notesToDisplay = searchQuery.length > 0 
    ? searchResults?.notes || []
    : notesData?.notes || [];

  const filteredNotes = selectedCategory === "all" 
    ? notesToDisplay
    : notesToDisplay.filter((note: Note) => note.category === selectedCategory);

  const categoryColors = {
    resource: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    advice: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    technique: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    general: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 p-2 -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {conversationFilter ? "Conversation Notes" : "Notes"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {conversationFilter 
                ? "Notes extracted from this conversation"
                : "Resources and insights from your feedback conversations"}
            </p>
            {conversationFilter && (
              <Button
                variant="link"
                onClick={() => setLocation('/notes')}
                className="p-0 h-auto text-sm text-blue-600 hover:text-blue-800"
              >
                ← View all notes
              </Button>
            )}
          </div>
          
          <div className="hidden sm:block">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="shrink-0">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Note
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Note</DialogTitle>
              <DialogDescription>
                Add a new note with resources or insights for future reference.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Enter note title..."
                />
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Enter your note content..."
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="link">Link (optional)</Label>
                <Input
                  id="link"
                  type="url"
                  value={noteLink}
                  onChange={(e) => setNoteLink(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={noteCategory} onValueChange={setNoteCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="resource">Resource</SelectItem>
                    <SelectItem value="advice">Advice</SelectItem>
                    <SelectItem value="technique">Technique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCreateNote}
                  disabled={createNoteMutation.isPending}
                  className="flex-1"
                >
                  {createNoteMutation.isPending ? "Creating..." : "Create Note"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="resource">Resources</SelectItem>
            <SelectItem value="advice">Advice</SelectItem>
            <SelectItem value="technique">Techniques</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notes Grid */}
      {isLoading || isSearching ? (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading notes...</p>
        </div>
      ) : filteredNotes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((note: Note) => (
            <Card key={note.id} className="h-fit">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg leading-tight mb-2">
                      {note.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${categoryColors[note.category as keyof typeof categoryColors] || categoryColors.general}`}
                      >
                        {categoryIcons[note.category as keyof typeof categoryIcons] || categoryIcons.general}
                        <span className="ml-1 capitalize">{note.category}</span>
                      </Badge>
                      {note.type === 'ai_extracted' && (
                        <Badge variant="outline" className="text-xs">
                          AI Extracted
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {note.link && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(note.link, '_blank')}
                        className="text-muted-foreground hover:text-blue-500"
                        title="Open link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNoteMutation.mutate(note.id)}
                      className="text-muted-foreground hover:text-red-500"
                      title="Delete note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-3">
                  {note.content}
                </p>
                {note.link && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 break-all">
                    <ExternalLink className="w-3 h-3 inline mr-1" />
                    {note.link}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-3">
                  {new Date(note.createdAt).toLocaleDateString()}
                  {note.conversationId && note.sessionId && (
                    <span className="ml-2">• 
                      <button
                        onClick={() => {
                          // Navigate to home with session parameter to load specific conversation
                          setLocation(`/?session=${note.sessionId}`);
                        }}
                        className="text-blue-600 hover:text-blue-800 hover:underline ml-1"
                      >
                        From conversation
                      </button>
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">No Notes Found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "No notes match your search criteria." : "Start creating notes to capture insights from your feedback conversations."}
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Note
          </Button>
        </div>
      )}

      {/* Mobile Floating Action Button */}
      <div className="sm:hidden fixed bottom-6 right-6 z-50">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="h-14 w-14 rounded-full shadow-lg">
              <Plus className="w-6 h-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Note</DialogTitle>
              <DialogDescription>
                Add a new note with resources or insights for future reference.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Enter note title..."
                />
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Enter your note content..."
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="link">Link (optional)</Label>
                <Input
                  id="link"
                  type="url"
                  value={noteLink}
                  onChange={(e) => setNoteLink(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={noteCategory} onValueChange={setNoteCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="resource">Resource</SelectItem>
                    <SelectItem value="advice">Advice</SelectItem>
                    <SelectItem value="technique">Technique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCreateNote}
                  disabled={createNoteMutation.isPending}
                  className="flex-1"
                >
                  {createNoteMutation.isPending ? "Creating..." : "Create Note"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}