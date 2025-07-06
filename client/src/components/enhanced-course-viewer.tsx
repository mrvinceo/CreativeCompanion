import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Award, BookOpen, Target, Upload, MessageSquare } from 'lucide-react';

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
  const [showAssignmentSubmission, setShowAssignmentSubmission] = useState(false);

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

  const submitQuiz = (partIndex: number) => {
    const part = course.parts![partIndex];
    const answers = quizAnswers[partIndex] || {};
    let correct = 0;
    
    part.quiz.forEach((question, qIndex) => {
      if (answers[qIndex] === question.correctAnswer) {
        correct++;
      }
    });

    const score = Math.round((correct / part.quiz.length) * 100);
    setQuizScores(prev => ({ ...prev, [partIndex]: score }));
    setShowQuizResults(prev => ({ ...prev, [partIndex]: true }));
  };

  const calculateTotalScore = () => {
    if (!hasStructuredContent) return 0;
    
    const completedQuizzes = Object.keys(quizScores).length;
    if (completedQuizzes === 0) return 0;
    
    const totalScore = Object.values(quizScores).reduce((sum, score) => sum + score, 0);
    return Math.round(totalScore / completedQuizzes);
  };

  const allQuizzesCompleted = () => {
    if (!hasStructuredContent) return false;
    return course.parts!.every((_, index) => showQuizResults[index]);
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 md:p-4 z-[60]">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col">
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
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="mb-2">
                          <span className={`text-2xl font-bold ${getScoreColor(quizScores[currentPart])}`}>
                            {quizScores[currentPart]}%
                          </span>
                        </div>
                        {getScoreBadge(quizScores[currentPart])}
                      </div>
                    ) : (
                      <div className="text-center">
                        <Button 
                          onClick={() => submitQuiz(currentPart)}
                          disabled={!course.parts![currentPart].quiz.every((_, qIndex) => 
                            quizAnswers[currentPart]?.[qIndex] !== undefined
                          )}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          Submit Quiz
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Final Assignment (show on last part if all quizzes completed) */}
              {currentPart === totalParts - 1 && allQuizzesCompleted() && course.finalAssignment && (
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
                        
                        <div className="mt-4">
                          <Button 
                            onClick={() => setShowAssignmentSubmission(true)}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Submit Assignment
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Navigation Footer - Added padding for mobile navigation */}
        <div className="p-4 pb-20 md:pb-4 border-t bg-gray-50 flex justify-between items-center">
          <Button 
            variant="outline"
            onClick={() => setCurrentPart(prev => Math.max(0, prev - 1))}
            disabled={currentPart === 0}
            className="flex-shrink-0"
          >
            Previous Part
          </Button>
          
          <div className="flex gap-2 mx-4">
            {Array.from({ length: totalParts }, (_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPart(index)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  index === currentPart
                    ? 'bg-blue-600 text-white'
                    : showQuizResults[index]
                      ? 'bg-green-100 text-green-700 border border-green-300'
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
            className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
          >
            Next Part
          </Button>
        </div>

        {/* Assignment Submission Modal - Coming Soon */}
        {showAssignmentSubmission && course.finalAssignment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70]">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Assignment Submission</h2>
              <p className="text-gray-600 mb-4">
                Assignment submission feature is being set up. You'll soon be able to upload your work for personalized feedback!
              </p>
              <Button onClick={() => setShowAssignmentSubmission(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}