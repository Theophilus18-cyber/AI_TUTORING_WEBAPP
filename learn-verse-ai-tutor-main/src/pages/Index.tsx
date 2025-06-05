import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  Code, 
  Brain, 
  Upload, 
  Volume2, 
  VolumeX, 
  Send, 
  Download,
  GraduationCap,
  Lightbulb,
  Target,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import ChatInterface from '@/components/ChatInterface';
import FileUploader from '@/components/FileUploader';
import QuizGenerator from '@/components/QuizGenerator';
import StudyMaterialSummary from '@/components/StudyMaterialSummary';

const Index = () => {
  const [activeAgent, setActiveAgent] = useState('tutor');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [studyProgress, setStudyProgress] = useState(0);
  const [showQuizGenerator, setShowQuizGenerator] = useState(false);
  const [showSummaryGenerator, setShowSummaryGenerator] = useState(false);

  // Force set the document title when component mounts
  useEffect(() => {
    document.title = "LearnVerse AI Tutor - Your Personal Learning Assistant";
    
    // Also update favicon if needed
    const favicon = document.querySelector("link[rel*='icon']") || document.createElement('link');
    favicon.type = 'image/x-icon';
    favicon.rel = 'shortcut icon';
    favicon.href = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%234F46E5" d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/></svg>';
    document.getElementsByTagName('head')[0].appendChild(favicon);
  }, []);

  const agents = [
    {
      id: 'tutor',
      name: 'AI Tutor',
      description: 'Your comprehensive learning assistant for all subjects',
      icon: GraduationCap,
      color: 'bg-blue-500',
      subjects: ['Math', 'Science', 'History', 'Literature', 'Geography']
    },
    {
      id: 'study',
      name: 'Study Agent',
      description: 'Detailed explanations and concept breakdowns',
      icon: BookOpen,
      color: 'bg-green-500',
      subjects: ['Concept Explanation', 'Study Plans', 'Note Taking']
    },
    {
      id: 'coding',
      name: 'Coding Agent',
      description: 'Programming tutorials and coding assistance',
      icon: Code,
      color: 'bg-purple-500',
      subjects: ['Python', 'JavaScript', 'HTML/CSS', 'Algorithms']
    },
    {
      id: 'quiz',
      name: 'Quiz Agent',
      description: 'Interactive quizzes and assessments',
      icon: Brain,
      color: 'bg-orange-500',
      subjects: ['Multiple Choice', 'True/False', 'Fill in Blanks']
    }
  ];

  const handleFileUpload = (files) => {
    setUploadedFiles(prev => [...prev, ...files]);
    toast.success(`${files.length} file(s) uploaded successfully!`);
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(!isSpeaking);
    }
  };

  const handleGenerateQuiz = () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please upload study materials first to generate quizzes');
      return;
    }
    setShowQuizGenerator(true);
  };

  const handleSummarizeMaterial = () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please upload study materials first to generate summaries');
      return;
    }
    setShowSummaryGenerator(true);
  };

  const currentAgent = agents.find(agent => agent.id === activeAgent);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  LearnVerse AI Tutor
                </h1>
                <p className="text-sm text-gray-600">Your Personal Learning Assistant</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                <Star className="w-3 h-3 mr-1" />
                Premium Learning
              </Badge>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Progress:</span>
                <Progress value={studyProgress} className="w-20" />
                <span className="text-sm font-medium text-blue-600">{studyProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Agent Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2 text-blue-600" />
            Choose Your Learning Assistant
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {agents.map((agent) => (
              <Card 
                key={agent.id}
                className={`cursor-pointer transition-all duration-300 hover:scale-105 border-2 ${
                  activeAgent === agent.id 
                    ? 'border-blue-500 bg-blue-50 shadow-lg' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => setActiveAgent(agent.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`w-10 h-10 ${agent.color} rounded-lg flex items-center justify-center`}>
                      <agent.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{agent.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {agent.subjects.slice(0, 3).map((subject, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {subject}
                      </Badge>
                    ))}
                    {agent.subjects.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{agent.subjects.length - 3}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            {!showQuizGenerator && !showSummaryGenerator ? (
              <Card className="h-[600px] shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <currentAgent.icon className="w-6 h-6" />
                      <div>
                        <CardTitle className="text-lg">{currentAgent.name}</CardTitle>
                        <p className="text-blue-100 text-sm">{currentAgent.description}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleSpeech}
                      className="text-white hover:bg-white/20"
                    >
                      {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 h-full">
                  <ChatInterface 
                    agent={activeAgent}
                    isSpeaking={isSpeaking}
                    onProgressUpdate={setStudyProgress}
                    uploadedFiles={uploadedFiles}
                  />
                </CardContent>
              </Card>
            ) : showQuizGenerator ? (
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Quiz Generator</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowQuizGenerator(false)}
                      className="text-white hover:bg-white/20"
                    >
                      ← Back to Chat
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <QuizGenerator uploadedFiles={uploadedFiles} />
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Study Material Summary</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSummaryGenerator(false)}
                      className="text-white hover:bg-white/20"
                    >
                      ← Back to Chat
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <StudyMaterialSummary materials={uploadedFiles} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* File Upload */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Upload className="w-5 h-5 mr-2 text-blue-600" />
                  Upload Study Materials
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileUploader onUpload={handleFileUpload} />
                {uploadedFiles.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-sm mb-2">Uploaded Files:</h4>
                    <div className="space-y-2">
                      {uploadedFiles.slice(-3).map((file, index) => (
                        <div key={index} className="text-xs bg-blue-50 p-2 rounded border">
                          {file.name}
                        </div>
                      ))}
                      {uploadedFiles.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{uploadedFiles.length - 3} more files
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Lightbulb className="w-5 h-5 mr-2 text-orange-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={handleGenerateQuiz}
                  disabled={uploadedFiles.length === 0}
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Generate Quiz from Files
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={handleSummarizeMaterial}
                  disabled={uploadedFiles.length === 0}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Summarize Materials
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export Notes
                </Button>
              </CardContent>
            </Card>

            {/* Study Statistics */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Study Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Questions Answered</span>
                  <Badge variant="outline">127</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Study Time</span>
                  <Badge variant="outline">2h 34m</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Topics Mastered</span>
                  <Badge variant="outline">8</Badge>
                </div>
                <Separator />
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">85%</div>
                  <div className="text-sm text-gray-600">Overall Progress</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;