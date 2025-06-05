
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

  const GROQ_API_KEY = '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';

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

      // Generate questions using Groq API
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: 'You are a quiz generator. Create multiple choice questions based on study materials. Return exactly 5 questions in JSON format.'
            },
            {
              role: 'user',
              content: `Based on these study materials, create 5 multiple choice questions with 4 options each. Format as JSON array with structure: [{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "..."}]\n\nMaterials:\n${combinedContent}`
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || '';
      
      // Parse the JSON response
      const parsedQuestions = parseQuestions(aiResponse);
      setQuestions(parsedQuestions);
      setCurrentQuestionIndex(0);
      setSelectedAnswers({});
      setShowResults(false);
      setQuizCompleted(false);
      
      toast.success('Quiz generated successfully!');
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast.error('Failed to generate quiz. Using sample questions.');
      // Fallback to sample questions
      setQuestions([
        {
          id: '1',
          question: 'Based on your uploaded materials, what is the main topic?',
          options: ['Topic A', 'Topic B', 'Topic C', 'Topic D'],
          correctAnswer: 0,
          explanation: 'This question is based on your uploaded study materials.',
          difficulty: 'medium'
        }
      ]);
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
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((q: any, index: number) => ({
          id: (index + 1).toString(),
          question: q.question || 'Sample question',
          options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: q.correctAnswer || 0,
          explanation: q.explanation || 'Explanation not provided',
          difficulty: 'medium' as const
        }));
      }
    } catch (error) {
      console.error('Error parsing questions:', error);
    }
    
    // Fallback questions
    return [
      {
        id: '1',
        question: 'Based on your study materials, what would be a key concept to remember?',
        options: ['Concept A', 'Concept B', 'Concept C', 'Concept D'],
        correctAnswer: 0,
        explanation: 'This is based on your uploaded materials.',
        difficulty: 'medium'
      }
    ];
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
            <p className="text-lg text-gray-600">
              You got {Object.values(selectedAnswers).filter((answer, index) => answer === questions[index].correctAnswer).length} out of {totalQuestions} questions correct!
            </p>
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
