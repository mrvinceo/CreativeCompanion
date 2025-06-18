
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Check, Clock, Sparkles } from "lucide-react";

interface Note {
  id: number;
  title: string;
  content: string;
  category?: string;
  createdAt: string;
}

interface MicroCourseGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MicroCourseGenerator({ isOpen, onClose }: MicroCourseGeneratorProps) {
  const { toast } = useToast();
  const [courseTitle, setCourseTitle] = useState("");
  const [selectedNotes, setSelectedNotes] = useState<Note[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch user's notes
  const { data: notesData, isLoading } = useQuery<{ notes: Note[] }>({
    queryKey: ['/api/notes'],
    enabled: isOpen,
  });

  // Generate course mutation
  const generateCourseMutation = useMutation({
    mutationFn: async (data: { courseTitle: string; selectedNotes: Note[] }) => {
      const response = await apiRequest('POST', '/api/generate-micro-course', data);
      return response.json();
    },
    onSuccess: () => {
      setIsGenerating(true);
      setCourseTitle("");
      setSelectedNotes([]);
      toast({
        title: "Course Generation Started",
        description: "Your micro course is being generated. This will take several minutes. Check back soon!",
      });
      onClose();
      
      // Set a timeout to stop the generating state after a reasonable time
      setTimeout(() => {
        setIsGenerating(false);
        queryClient.invalidateQueries({ queryKey: ['/api/micro-courses'] });
        toast({
          title: "Course Ready",
          description: "Your micro course should be ready. Check the Micro Courses section!",
        });
      }, 5 * 60 * 1000); // 5 minutes
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate course. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleNoteSelection = (note: Note, checked: boolean) => {
    if (checked && selectedNotes.length < 3) {
      setSelectedNotes([...selectedNotes, note]);
    } else if (!checked) {
      setSelectedNotes(selectedNotes.filter(n => n.id !== note.id));
    } else {
      toast({
        title: "Selection Limit",
        description: "You can select up to 3 notes for course generation.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateCourse = () => {
    if (!courseTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please provide a title for your micro course.",
        variant: "destructive",
      });
      return;
    }

    if (selectedNotes.length === 0) {
      toast({
        title: "Notes Required",
        description: "Please select at least one note for your micro course.",
        variant: "destructive",
      });
      return;
    }

    generateCourseMutation.mutate({ courseTitle: courseTitle.trim(), selectedNotes });
  };

  const notes = notesData?.notes || [];
  const availableNotes = notes.filter(note => !selectedNotes.find(selected => selected.id === note.id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Generate Micro Course
          </DialogTitle>
          <DialogDescription>
            Select 1-3 notes from your collection to create a personalized micro course.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-6 min-h-0">
          {/* Course Title Input */}
          <div className="space-y-2">
            <Label htmlFor="course-title">Course Title</Label>
            <Input
              id="course-title"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              placeholder="Enter a title for your micro course..."
              disabled={generateCourseMutation.isPending}
            />
          </div>

          {/* Selected Notes */}
          {selectedNotes.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Notes ({selectedNotes.length}/3)</Label>
              <div className="space-y-2">
                {selectedNotes.map((note) => (
                  <Card key={note.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{note.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {note.content}
                        </p>
                        {note.category && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {note.category}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleNoteSelection(note, false)}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        Remove
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Available Notes - Flexible height */}
          <div className="flex-1 flex flex-col min-h-0">
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading notes...</p>
              </div>
            ) : availableNotes.length > 0 ? (
              <div className="flex flex-col space-y-2 flex-1 min-h-0">
                <Label>Available Notes (select up to {3 - selectedNotes.length} more)</Label>
                <ScrollArea className="flex-1 border rounded-md min-h-[200px]">
                  <div className="p-3 space-y-2">
                    {availableNotes.map((note) => (
                      <Card key={note.id} className="p-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={false}
                            onCheckedChange={(checked) => handleNoteSelection(note, checked as boolean)}
                            disabled={selectedNotes.length >= 3}
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{note.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {note.content}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {note.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {note.category}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {new Date(note.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No notes available. Create some notes first to generate a micro course.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons - Always visible at bottom */}
          <div className="flex gap-2 pt-4 border-t bg-background">
            <Button
              onClick={handleGenerateCourse}
              disabled={generateCourseMutation.isPending || !courseTitle.trim() || selectedNotes.length === 0}
              className="flex-1"
            >
              {generateCourseMutation.isPending ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Generating Course...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Micro Course
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
