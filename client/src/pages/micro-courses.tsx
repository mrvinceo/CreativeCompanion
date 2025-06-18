
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Calendar, Clock, ExternalLink, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { RefynLogo } from "@/components/refyn-logo";
import { MicroCourseGenerator } from "@/components/micro-course-generator";

interface MicroCourse {
  id: number;
  userId: string;
  title: string;
  content: string;
  status: 'generating' | 'ready' | 'failed';
  createdAt: string;
  completedAt?: string;
  sourceNotes: Array<{
    title: string;
    content: string;
  }>;
}

export default function MicroCourses() {
  const [location, setLocation] = useLocation();
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<MicroCourse | null>(null);

  // Fetch user's micro courses
  const { data: coursesData, isLoading } = useQuery<{ courses: MicroCourse[] }>({
    queryKey: ['/api/micro-courses'],
    refetchInterval: 30000, // Refetch every 30 seconds to check for completed courses
  });

  const courses = coursesData?.courses || [];

  const openCourseViewer = (course: MicroCourse) => {
    if (course.status === 'ready') {
      setSelectedCourse(course);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-3 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <RefynLogo size={32} showTitle={false} className="sm:hidden" />
          <RefynLogo size={36} showTitle={true} className="hidden sm:flex" />
          <Button
            variant="ghost"
            onClick={() => setLocation('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </div>
      </header>

      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Micro Courses</h1>
            <p className="text-muted-foreground mt-1">
              AI-generated courses based on your notes and insights
            </p>
          </div>
          <Button onClick={() => setIsGeneratorOpen(true)} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Generate Course
          </Button>
        </div>

        {/* Courses List */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading courses...</p>
          </div>
        ) : courses.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card 
                key={course.id} 
                className={`h-fit cursor-pointer transition-colors ${
                  course.status === 'ready' ? 'hover:bg-muted/50' : ''
                }`}
                onClick={() => openCourseViewer(course)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg leading-tight mb-2">
                        {course.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant={course.status === 'ready' ? 'default' : course.status === 'generating' ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {course.status === 'ready' && <BookOpen className="w-3 h-3 mr-1" />}
                          {course.status === 'generating' && <Clock className="w-3 h-3 mr-1 animate-spin" />}
                          {course.status === 'ready' ? 'Ready' : course.status === 'generating' ? 'Generating...' : 'Failed'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {course.sourceNotes.length} notes
                        </Badge>
                      </div>
                    </div>
                    {course.status === 'ready' && (
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Created {new Date(course.createdAt).toLocaleDateString()}
                    </div>
                    {course.completedAt && (
                      <div className="text-sm text-muted-foreground">
                        Completed {new Date(course.completedAt).toLocaleDateString()}
                      </div>
                    )}
                    {course.status === 'generating' && (
                      <div className="text-sm text-yellow-600 dark:text-yellow-400">
                        Course is being generated. Check back in a few minutes.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No Micro Courses Yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first micro course by selecting notes from your collection.
            </p>
            <Button onClick={() => setIsGeneratorOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Generate Your First Course
            </Button>
          </div>
        )}
      </div>

      {/* Course Generator Dialog */}
      <MicroCourseGenerator 
        isOpen={isGeneratorOpen} 
        onClose={() => setIsGeneratorOpen(false)} 
      />

      {/* Course Viewer Dialog */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">{selectedCourse.title}</h2>
              <Button variant="ghost" onClick={() => setSelectedCourse(null)}>
                ×
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div 
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: selectedCourse.content }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
