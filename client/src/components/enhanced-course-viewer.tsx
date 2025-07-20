import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Award, BookOpen, Target, Upload, ExternalLink } from 'lucide-react';
import { useLocation } from 'wouter';
import { nanoid } from 'nanoid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface CoursePart {
  title: string;
  content: string;
  imagePrompt: string;
  imageUrl?: string;
  quiz: QuizQuestion[];
}

interface FinalAssignment {
  title: string;
  description: string;
  artworkPrompt: string;
}

interface EnhancedCourse {
  id: number;
  userId: string;
  title: string;
  content: string;
  status: 'generating' | 'ready' | 'failed';
  parts?: CoursePart[];
  finalAssignment?: FinalAssignment;
  createdAt: string;
  completedAt?: string;
  sourceNotes: Array<{
    title: string;
    content: string;
  }>;
}

interface EnhancedCourseViewerProps {
  course: EnhancedCourse;
  onClose: () => void;
}

export function EnhancedCourseViewer({ course, onClose }: EnhancedCourseViewerProps) {
  const [currentPart, setCurrentPart] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<{ [partIndex: number]: { [questionIndex: number]: number } }>({});
  const [quizScores, setQuizScores] = useState<{ [partIndex: number]: number }>({});
  const [showQuizResults, setShowQuizResults] = useState<{ [partIndex: number]: boolean }>({});
  const [courseCompleted, setCourseCompleted] = useState(false);
  const [submittingQuiz, setSubmittingQuiz] = useState<{ [partIndex: number]: boolean }>({});
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Fetch quiz progress from database
  const { data: quizProgress, isLoading: loadingProgress } = useQuery({
    queryKey: ['/api/courses', course.id, 'quiz-progress'],
    queryFn: () => fetch(`/api/courses/${course.id}/quiz-progress`).then(res => res.json()),
    enabled: !!course.id
  });

  // Fetch assignment status
  const { data: assignment } = useQuery({
    queryKey: ['/api/courses', course.id, 'assignment'],
    queryFn: () => fetch(`/api/courses/${course.id}/assignment`, { method: 'POST' }).then(res => res.json()),
    enabled: !!course.id && course.status === 'ready'
  });

  // Save quiz progress mutation
  const saveQuizProgress = useMutation({
    mutationFn: ({ partIndex, score, answers }: { partIndex: number; score: number; answers: { [key: number]: number } }) =>
      apiRequest(`/api/courses/${course.id}/quiz-progress`, 'POST', { partIndex, score, answers }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', course.id, 'quiz-progress'] });
    }
  });

  // Load quiz progress data when available
  useEffect(() => {
    if (quizProgress?.progress) {
      const scores: { [partIndex: number]: number } = {};
      const results: { [partIndex: number]: boolean } = {};

      // Get highest score for each part
      quizProgress.progress.forEach((p: any) => {
        if (!scores[p.partIndex] || p.score > scores[p.partIndex]) {
          scores[p.partIndex] = p.score;
          results[p.partIndex] = true;
        }
      });

      setQuizScores(scores);
      setShowQuizResults(results);
    }
  }, [quizProgress]);

  const hasStructuredContent = course.parts && course.parts.length > 0;
  const totalParts = hasStructuredContent ? course.parts!.length : 0;

  const handleQuizAnswer = (partIndex: number, questionIndex: number, answerIndex: number) => {
    setQuizAnswers(prev => ({
      ...prev,
      [partIndex]: {
        ...prev[partIndex],
        [questionIndex]: answerIndex
      }
    }));
  };

  const submitQuiz = async (partIndex: number) => {
    console.log('submitQuiz called for part:', partIndex);
    const part = course.parts![partIndex];
    const answers = quizAnswers[partIndex] || {};
    let correct = 0;
    
    console.log('Quiz answers:', answers);
    
    // Set submitting state
    setSubmittingQuiz(prev => ({ ...prev, [partIndex]: true }));
    
    part.quiz.forEach((question, qIndex) => {
      if (answers[qIndex] === question.correctAnswer) {
        correct++;
      }
    });

    const score = Math.round((correct / part.quiz.length) * 100);
    console.log('Calculated score:', score);
    
    // Save to database
    try {
      console.log('Saving quiz progress...');
      await saveQuizProgress.mutateAsync({ partIndex, score, answers });
      console.log('Quiz progress saved successfully');
      
      // Update local state for immediate feedback
      setQuizScores(prev => ({ ...prev, [partIndex]: score }));
      setShowQuizResults(prev => ({ ...prev, [partIndex]: true }));
    } catch (error) {
      console.error('Failed to save quiz progress:', error);
      alert('Failed to save quiz progress. Please try again.');
    } finally {
      // Clear submitting state
      setSubmittingQuiz(prev => ({ ...prev, [partIndex]: false }));
    }
  };

  const retakeQuiz = (partIndex: number) => {
    // Clear answers for this part
    setQuizAnswers(prev => {
      const newAnswers = { ...prev };
      delete newAnswers[partIndex];
      return newAnswers;
    });
    
    // Hide results for this part temporarily (score will still be stored in DB)
    setShowQuizResults(prev => {
      const newResults = { ...prev };
      delete newResults[partIndex];
      return newResults;
    });
  };

  const calculateTotalScore = () => {
    if (!hasStructuredContent) return 0;
    
    const completedQuizzes = Object.keys(quizScores).length;
    if (completedQuizzes === 0) return 0;
    
    const totalScore = Object.values(quizScores).reduce((sum, score) => sum + score, 0);
    return Math.round(totalScore / completedQuizzes);
  };

  const allQuizzesPassed = () => {
    if (!hasStructuredContent) return false;
    return course.parts!.every((_, index) => {
      const hasResult = showQuizResults[index];
      const score = quizScores[index];
      return hasResult && score >= 50; // 50% pass rate
    });
  };

  const getQuizStatus = (partIndex: number) => {
    if (!showQuizResults[partIndex]) return 'not-taken';
    const score = quizScores[partIndex];
    return score >= 50 ? 'passed' : 'failed';
  };

  const handleAssignmentSubmission = async () => {
    if (!course.finalAssignment) return;
    
    try {
      // Create a new session for the assignment submission
      const sessionId = nanoid();
      
      // Create assignment-specific conversation with a system prompt based on the assignment
      const assignmentPrompt = `Provide the user with critical and constructive feedback on the work they have submitted in response to this assignment brief: "${course.finalAssignment.title} - ${course.finalAssignment.description}. ${course.finalAssignment.artworkPrompt}"`;
      
      // Navigate to home page with assignment context
      setLocation(`/?sessionId=${sessionId}&assignment=true&courseId=${course.id}&prompt=${encodeURIComponent(assignmentPrompt)}`);
      
    } catch (error) {
      console.error('Error creating assignment submission:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-500">Excellent</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-500">Good</Badge>;
    return <Badge className="bg-red-500">Needs Review</Badge>;
  };

  if (!hasStructuredContent) {
    // Fallback to original HTML content display
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold">{course.title}</h2>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div dangerouslySetInnerHTML={{ __html: course.content }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between bg-gradient-to-r from-yellow-50 to-pink-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{course.title}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {totalParts} parts • Interactive quizzes • Final assignment
            </p>
          </div>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>

        {/* Progress Bar */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Course Progress</span>
            <span className="text-sm text-gray-600">
              Part {currentPart + 1} of {totalParts}
            </span>
          </div>
          <Progress value={((currentPart + 1) / totalParts) * 100} className="h-2" />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {course.parts![currentPart] && (
            <div className="space-y-6">
              {/* Part Header */}
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Part {currentPart + 1}: {course.parts![currentPart].title}
                </h3>
              </div>

              {/* Part Image */}
              {course.parts![currentPart].imageUrl && (
                <div className="flex justify-center">
                  <img 
                    src={course.parts![currentPart].imageUrl}
                    alt={course.parts![currentPart].title}
                    className="max-w-md rounded-lg shadow-md"
                  />
                </div>
              )}

              {/* Part Content */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    Learning Content
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    {course.parts![currentPart].content.split('\n').map((paragraph, index) => (
                      <p key={index} className="mb-4 text-gray-700 leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quiz Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    Knowledge Check
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {course.parts![currentPart].quiz.map((question, questionIndex) => (
                      <div key={questionIndex} className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-3">
                          Question {questionIndex + 1}: {question.question}
                        </h4>
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <label 
                              key={optionIndex}
                              className={`flex items-center p-3 rounded-md border cursor-pointer transition-colors ${
                                showQuizResults[currentPart] 
                                  ? optionIndex === question.correctAnswer
                                    ? 'bg-green-50 border-green-300'
                                    : quizAnswers[currentPart]?.[questionIndex] === optionIndex
                                      ? 'bg-red-50 border-red-300'
                                      : 'bg-gray-50 border-gray-200'
                                  : quizAnswers[currentPart]?.[questionIndex] === optionIndex
                                    ? 'bg-blue-50 border-blue-300'
                                    : 'hover:bg-gray-50 border-gray-200'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question-${currentPart}-${questionIndex}`}
                                value={optionIndex}
                                checked={quizAnswers[currentPart]?.[questionIndex] === optionIndex}
                                onChange={() => handleQuizAnswer(currentPart, questionIndex, optionIndex)}
                                disabled={showQuizResults[currentPart]}
                                className="mr-3"
                              />
                              <span className="flex-1">{option}</span>
                              {showQuizResults[currentPart] && optionIndex === question.correctAnswer && (
                                <CheckCircle className="w-5 h-5 text-green-600 ml-2" />
                              )}
                              {showQuizResults[currentPart] && 
                               quizAnswers[currentPart]?.[questionIndex] === optionIndex && 
                               optionIndex !== question.correctAnswer && (
                                <XCircle className="w-5 h-5 text-red-600 ml-2" />
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Quiz Results */}
                    {showQuizResults[currentPart] ? (
                      <div className="text-center p-4 bg-gray-50 rounded-lg space-y-3">
                        <div className="mb-2">
                          <span className={`text-2xl font-bold ${getScoreColor(quizScores[currentPart])}`}>
                            {quizScores[currentPart]}%
                          </span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          {getScoreBadge(quizScores[currentPart])}
                          {quizScores[currentPart] >= 50 ? (
                            <Badge variant="default" className="bg-green-100 text-green-700">
                              PASSED
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-red-100 text-red-700">
                              FAILED
                            </Badge>
                          )}
                        </div>
                        {quizScores[currentPart] < 50 && (
                          <p className="text-sm text-gray-600">
                            You need 50% or higher to pass this quiz.
                          </p>
                        )}
                        <Button 
                          onClick={() => retakeQuiz(currentPart)}
                          variant="outline"
                          size="sm"
                          className="mt-2"
                        >
                          Retake Quiz
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Button 
                          onClick={() => submitQuiz(currentPart)}
                          disabled={
                            !course.parts![currentPart].quiz.every((_, qIndex) => 
                              quizAnswers[currentPart]?.[qIndex] !== undefined
                            ) || submittingQuiz[currentPart] || saveQuizProgress.isPending
                          }
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {submittingQuiz[currentPart] || saveQuizProgress.isPending ? 'Submitting...' : 'Submit Quiz'}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Final Assignment (show on last part if all quizzes passed) */}
              {currentPart === totalParts - 1 && course.finalAssignment && (
                <Card className="border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-yellow-600" />
                      Final Assignment: {course.finalAssignment.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-gray-700">{course.finalAssignment.description}</p>
                      <div className="p-4 bg-white rounded-lg border border-yellow-200">
                        <h4 className="font-semibold mb-2 text-yellow-800">Artwork Creation Task:</h4>
                        <p className="text-gray-700 italic">{course.finalAssignment.artworkPrompt}</p>
                      </div>
                      <div className="text-center p-4 bg-white rounded-lg">
                        <p className="text-lg font-semibold mb-2">Course Complete!</p>
                        <p className="text-gray-600 mb-3">
                          Final Score: <span className={`font-bold ${getScoreColor(calculateTotalScore())}`}>
                            {calculateTotalScore()}%
                          </span>
                        </p>
                        {getScoreBadge(calculateTotalScore())}
                      </div>
                      
                      {/* Assignment Submission */}
                      {allQuizzesPassed() ? (
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                          <h4 className="font-semibold mb-3 text-blue-800">Submit Your Assignment</h4>
                          <p className="text-gray-700 mb-4">
                            Upload your artwork and get personalized feedback from our AI tutor based on the assignment brief.
                          </p>
                          
                          {assignment?.assignment && (
                            <div className="mb-4 p-3 bg-blue-50 rounded border">
                              <p className="text-sm text-blue-700 mb-2">
                                Assignment already created. Status: <span className="font-semibold">{assignment.assignment.status}</span>
                              </p>
                              {assignment.assignment.conversationId && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setLocation(`/?conversation=${assignment.assignment.conversationId}`)}
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  View Submission
                                </Button>
                              )}
                            </div>
                          )}
                          
                          <Button 
                            onClick={() => handleAssignmentSubmission()}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {assignment?.assignment ? 'Create New Submission' : 'Submit Assignment for Feedback'}
                          </Button>
                        </div>
                      ) : (
                        <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                          <h4 className="font-semibold mb-3 text-orange-800">Assignment Locked</h4>
                          <p className="text-gray-700 mb-4">
                            You need to pass all quizzes with 50% or higher to unlock the assignment submission.
                          </p>
                          <div className="text-sm text-gray-600">
                            <p className="mb-2">Quiz Progress:</p>
                            <ul className="space-y-1">
                              {course.parts!.map((part, index) => (
                                <li key={index} className="flex items-center gap-2">
                                  <span className="font-medium">Part {index + 1}:</span>
                                  {getQuizStatus(index) === 'passed' ? (
                                    <Badge variant="default" className="bg-green-100 text-green-700 text-xs">
                                      PASSED
                                    </Badge>
                                  ) : getQuizStatus(index) === 'failed' ? (
                                    <Badge variant="destructive" className="bg-red-100 text-red-700 text-xs">
                                      FAILED
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-xs">
                                      NOT TAKEN
                                    </Badge>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Navigation Footer - with mobile padding to avoid navigation bar */}
        <div className="p-4 pb-20 md:pb-4 border-t bg-gray-50 flex justify-between items-center">
          <Button 
            variant="outline"
            onClick={() => setCurrentPart(prev => Math.max(0, prev - 1))}
            disabled={currentPart === 0}
          >
            Previous Part
          </Button>
          
          <div className="flex gap-2">
            {Array.from({ length: totalParts }, (_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPart(index)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  index === currentPart
                    ? 'bg-blue-600 text-white'
                    : getQuizStatus(index) === 'passed'
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : getQuizStatus(index) === 'failed'
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <Button 
            onClick={() => setCurrentPart(prev => Math.min(totalParts - 1, prev + 1))}
            disabled={currentPart === totalParts - 1}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Next Part
          </Button>
        </div>
      </div>
    </div>
  );
}