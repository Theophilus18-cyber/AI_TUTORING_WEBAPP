import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Brain, RotateCcw, Trophy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface QuizGeneratorProps {
  uploadedFiles?: File[];
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

const QuizGenerator: React.FC<QuizGeneratorProps> = ({ uploadedFiles = [], topic = 'General Knowledge', difficulty = 'medium' }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: number }>({});
  const [showResults, setShowResults] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Generate quiz questions from uploaded files
  const generateQuizFromFiles = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please upload study materials first');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Read file contents
      const fileContents = await Promise.all(
        uploadedFiles.map(async (file) => {
          const content = await readFileContent(file);
          return `File: ${file.name}\nContent: ${content.substring(0, 2000)}...`;
        })
      );

      const combinedContent = fileContents.join('\n\n');
      console.log('Sending content to API:', combinedContent.substring(0, 200));

      let allQuestions: Question[] = [];
      let attempts = 0;
      const maxAttempts = 3;

      while (allQuestions.length < 10 && attempts < maxAttempts) {
        attempts++;
        console.log(`Attempt ${attempts} to generate questions...`);

        // Use the backend API endpoint for quiz generation
        const response = await fetch('http://localhost:3001/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Create a quiz with ${10 - allQuestions.length} multiple choice questions based on these study materials. Each question must have 4 options (A, B, C, D), include a clear explanation for the correct answer, and specify difficulty level (easy/medium/hard). Format the response as a JSON array with this exact structure: [{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "...", "difficulty": "easy|medium|hard"}]. Do not include any additional text before or after the JSON array. Make sure the JSON is complete and properly formatted. Focus on different aspects of the material than previous questions.\n\nMaterials:\n${combinedContent}`,
            agent: 'quiz',
            conversationHistory: []
          }),
        });

        console.log('API Response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('API Error Response:', errorData);
          throw new Error(errorData.details || errorData.error || 'Failed to get response from server');
        }

        const data = await response.json();
        console.log('API Response data:', data);
        
        if (!data.success || !data.response) {
          console.error('Invalid API Response:', data);
          throw new Error('Invalid response format from server');
        }

        // Parse the JSON response from the quiz
        const parsedQuestions = parseQuestions(data.response);
        console.log('Parsed Questions:', parsedQuestions);
        
        if (parsedQuestions.length === 0) {
          console.error('No questions parsed from response:', data.response);
          if (attempts === maxAttempts) {
            throw new Error('No valid questions were generated after multiple attempts');
          }
          continue;
        }

        // Add new questions to our collection, avoiding duplicates
        const newQuestions = parsedQuestions.filter(newQ => 
          !allQuestions.some(existingQ => 
            existingQ.question.toLowerCase() === newQ.question.toLowerCase()
          )
        );

        allQuestions = [...allQuestions, ...newQuestions];
        console.log(`Total questions collected: ${allQuestions.length}`);
      }

      if (allQuestions.length < 10) {
        console.warn(`Generated only ${allQuestions.length} questions after ${maxAttempts} attempts`);
        toast.warning(`Generated ${allQuestions.length} questions instead of 10. Please try again.`);
        throw new Error('Insufficient number of questions generated');
      }

      // Take exactly 10 questions
      const finalQuestions = allQuestions.slice(0, 10);
      
      setQuestions(finalQuestions);
      setCurrentQuestionIndex(0);
      setSelectedAnswers({});
      setShowResults(false);
      setQuizCompleted(false);
      
      toast.success('Quiz generated successfully!');
    } catch (error) {
      console.error('Error generating quiz:', error);
      // Show more specific error message
      if (error.message.includes('Failed to get response from server')) {
        toast.error('Server error. Please check if the backend is running.');
      } else if (error.message.includes('Invalid response format')) {
        toast.error('Invalid response from server. Please try again.');
      } else if (error.message.includes('No valid questions')) {
        toast.error('Could not generate valid questions. Please try again.');
      } else if (error.message.includes('Insufficient number of questions')) {
        toast.error('Generated fewer questions than expected. Please try again.');
      } else {
        toast.error(`Error: ${error.message}. Please try again.`);
      }
      setQuestions([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content || '');
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      if (file.type === 'text/plain' || file.name.endsWith('.md')) {
        reader.readAsText(file);
      } else {
        resolve(`Content from ${file.name} (${file.type})`);
      }
    });
  };

  const parseQuestions = (aiResponse: string): Question[] => {
    try {
      console.log('Parsing AI Response:', aiResponse);
      
      // First try to find JSON array in the response
      let jsonStr = aiResponse;
      
      // If the response contains markdown code block, extract the JSON from it
      const codeBlockMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      } else {
        // If no code block, try to find JSON array directly
        const jsonMatch = aiResponse.match(/\[\s*\{[\s\S]*?\}\s*\]/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
      }

      if (!jsonStr) {
        console.error('No JSON array found in response');
        return [];
      }

      // Try to fix common JSON formatting issues
      jsonStr = jsonStr
        .replace(/\n/g, ' ') // Remove newlines
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/([^\\])"/g, '$1\\"') // Escape unescaped quotes
        .replace(/\\"/g, '"'); // Fix double-escaped quotes

      console.log('Cleaned JSON string:', jsonStr);
      
      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        // Try to extract valid questions from partial JSON
        const questionMatches = jsonStr.match(/\{[^}]+\}/g);
        if (questionMatches) {
          parsed = questionMatches
            .map(match => {
              try {
                return JSON.parse(match);
              } catch (e) {
                return null;
              }
            })
            .filter(Boolean);
        } else {
          return [];
        }
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        console.error('Invalid question format - not an array or empty array');
        return [];
      }

      const questions = parsed.map((q: any, index: number) => {
        // Validate each question
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
          console.error(`Invalid question format at index ${index}:`, q);
          return null;
        }

        // Clean up options (remove A., B., etc. if present)
        const cleanOptions = q.options.map((opt: string) => {
          return opt.replace(/^[A-D]\.\s*/, '').trim();
        });

        return {
          id: (index + 1).toString(),
          question: q.question.trim(),
          options: cleanOptions,
          correctAnswer: q.correctAnswer || 0,
          explanation: q.explanation || 'Explanation not provided',
          difficulty: q.difficulty || 'medium'
        };
      }).filter(Boolean); // Remove any null questions

      console.log('Successfully parsed questions:', questions);
      return questions;
    } catch (error) {
      console.error('Error parsing questions:', error);
      return [];
    }
  };

  if (questions.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center">
            <Brain className="w-6 h-6 mr-2 text-blue-600" />
            Quiz Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div>
            <p className="text-lg text-gray-600 mb-4">
              {uploadedFiles.length > 0 
                ? `Generate a quiz based on your ${uploadedFiles.length} uploaded file(s)`
                : 'Upload study materials first to generate a personalized quiz'
              }
            </p>
            {uploadedFiles.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium mb-2">Files to use for quiz:</h4>
                <div className="space-y-1">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="text-sm text-blue-700">
                      📄 {file.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <Button 
            onClick={generateQuizFromFiles}
            disabled={isGenerating || uploadedFiles.length === 0}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Quiz...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Generate Quiz from Files
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answerIndex
    }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowResults(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const showAnswer = () => {
    if (selectedAnswers[currentQuestion.id] === undefined) {
      toast.error('Please select an answer first!');
      return;
    }
    setShowResults(true);
  };

  const restartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
    setQuizCompleted(false);
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach(question => {
      if (selectedAnswers[question.id] === question.correctAnswer) {
        correct++;
      }
    });
    return Math.round((correct / totalQuestions) * 100);
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (quizCompleted) {
    const score = calculateScore();
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Quiz Completed!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div>
            <div className="text-4xl font-bold text-blue-600 mb-2">{score}%</div>
         
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium mb-3">Performance Breakdown:</h3>
            <div className="space-y-2">
              {questions.map((question, index) => {
                const isCorrect = selectedAnswers[question.id] === question.correctAnswer;
                return (
                  <div key={question.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center">
                      {isCorrect ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 mr-2" />
                      )}
                      Question {index + 1}
                    </span>
                    <Badge variant="outline" className={getDifficultyColor(question.difficulty)}>
                      {question.difficulty}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          <Button onClick={restartQuiz} className="w-full">
            <RotateCcw className="w-4 h-4 mr-2" />
            Take Quiz Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-blue-600" />
            <CardTitle>Quiz: {topic}</CardTitle>
          </div>
          <Badge variant="outline" className={getDifficultyColor(currentQuestion.difficulty)}>
            {currentQuestion.difficulty}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
          <h3 className="font-medium text-lg mb-4">{currentQuestion.question}</h3>
          
          <RadioGroup
            value={selectedAnswers[currentQuestion.id]?.toString()}
            onValueChange={(value) => handleAnswerSelect(parseInt(value))}
            disabled={showResults}
          >
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswers[currentQuestion.id] === index;
              const isCorrect = index === currentQuestion.correctAnswer;
              const showCorrectAnswer = showResults && isCorrect;
              const showIncorrectAnswer = showResults && isSelected && !isCorrect;
              
              return (
                <div
                  key={index}
                  className={`flex items-center space-x-2 p-3 rounded border transition-colors ${
                    showCorrectAnswer
                      ? 'bg-green-100 border-green-300'
                      : showIncorrectAnswer
                      ? 'bg-red-100 border-red-300'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                  {showCorrectAnswer && <CheckCircle className="w-4 h-4 text-green-600" />}
                  {showIncorrectAnswer && <XCircle className="w-4 h-4 text-red-600" />}
                </div>
              );
            })}
          </RadioGroup>
        </div>

        {showResults && (
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-800 mb-2">Explanation:</h4>
            <p className="text-yellow-700">{currentQuestion.explanation}</p>
          </div>
        )}

        <div className="flex space-x-3">
          {!showResults ? (
            <Button 
              onClick={showAnswer} 
              className="flex-1"
              disabled={selectedAnswers[currentQuestion.id] === undefined}
            >
              Show Answer
            </Button>
          ) : (
            <Button onClick={nextQuestion} className="flex-1">
              {currentQuestionIndex < totalQuestions - 1 ? 'Next Question' : 'Finish Quiz'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuizGenerator;
