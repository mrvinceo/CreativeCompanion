
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, BookOpen, Calendar, Clock, ExternalLink, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { RefynLogo } from "@/components/refyn-logo";
import { MicroCourseGenerator } from "@/components/micro-course-generator";
import { MobileLayout } from "@/components/mobile-layout";
import { useIsMobile } from "@/hooks/use-mobile";
import ReactMarkdown from "react-markdown";

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
  const isMobile = useIsMobile();
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  
  // Parse URL to get course ID
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const courseId = urlParams.get('course');
  const isViewingCourse = !!courseId;

  // Fetch user's micro courses
  const { data: coursesData, isLoading } = useQuery<{ courses: MicroCourse[] }>({
    queryKey: ['/api/micro-courses'],
    refetchInterval: 30000, // Refetch every 30 seconds to check for completed courses
  });

  // Fetch individual course if viewing one
  const { data: courseData, isLoading: isCourseLoading } = useQuery<{ course: MicroCourse }>({
    queryKey: ['/api/micro-courses', courseId],
    enabled: !!courseId,
  });

  const courses = coursesData?.courses || [];
  const selectedCourse = courseData?.course;

  const openCourseViewer = (course: MicroCourse) => {
    if (course.status === 'ready') {
      setLocation(`/micro-courses?course=${course.id}`);
    }
  };

  // If viewing a course, show the course content
  if (isViewingCourse && selectedCourse) {
    const coursePageContent = (
      <div className="min-h-screen bg-background">
        {/* Header - only show on desktop */}
        {!isMobile && (
          <header className="bg-card border-b border-border px-3 sm:px-6 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <RefynLogo size={36} showTitle={true} />
              <Button
                variant="ghost"
                onClick={() => setLocation('/micro-courses')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Courses
              </Button>
            </div>
          </header>
        )}

        <div className="container mx-auto p-6 max-w-4xl">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <Badge variant="secondary" className="text-xs">
                Micro Course
              </Badge>
            </div>
            <h1 className="text-3xl font-bold mb-2">{selectedCourse.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(selectedCourse.createdAt).toLocaleDateString()}
              </div>
              {selectedCourse.completedAt && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Completed {new Date(selectedCourse.completedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <div className="prose prose-lg max-w-none dark:prose-invert">
            <ReactMarkdown>{selectedCourse.content}</ReactMarkdown>
          </div>

          {selectedCourse.sourceNotes && selectedCourse.sourceNotes.length > 0 && (
            <div className="mt-8 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Source Notes</h3>
              <div className="space-y-2">
                {selectedCourse.sourceNotes.map((note, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium">{note.title}</span>
                    {note.content && (
                      <p className="text-muted-foreground mt-1">{note.content.substring(0, 100)}...</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );

    if (isMobile) {
      return <MobileLayout>{coursePageContent}</MobileLayout>;
    }
    return coursePageContent;
  }

  // Course list view
  const pageContent = (
    <div className="min-h-screen bg-background">
      {/* Header - only show on desktop */}
      {!isMobile && (
        <header className="bg-card border-b border-border px-3 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <RefynLogo size={64} showTitle={true} />
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
      )}

      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        {/* Page Header */}
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold">Micro Courses</h1>
            <p className="text-muted-foreground">
              AI-generated courses based on your notes and insights
            </p>
          </div>
          <Button onClick={() => setIsGeneratorOpen(true)} className="w-full sm:w-auto">
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


    </div>
  );

  if (isMobile) {
    return <MobileLayout>{pageContent}</MobileLayout>;
  }

  return pageContent;
}
