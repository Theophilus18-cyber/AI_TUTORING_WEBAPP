import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Loader2, 
  BookOpen, 
  Lightbulb, 
  Target, 
  CheckCircle,
  Brain,
  Download,
  Share2
} from 'lucide-react';
import { toast } from 'sonner';

interface StudyMaterialSummaryProps {
  materials: File[];
}

interface Summary {
  id: string;
  title: string;
  content: string;
  keyPoints: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedReadTime: number;
  topics: string[];
}

const StudyMaterialSummary: React.FC<StudyMaterialSummaryProps> = ({ materials }) => {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [customPrompt, setCustomPrompt] = useState('');

  const generateSummary = async () => {
    if (materials.length === 0) {
      toast.error('Please upload study materials first');
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      const newSummaries: Summary[] = [];

      for (let i = 0; i < materials.length; i++) {
        const file = materials[i];
        setProgress(((i + 1) / materials.length) * 100);

        // Read file content
        const fileContent = await readFileContent(file);
        
        // Generate summary using Groq API
        const summary = await generateSummaryWithAI(fileContent, file.name);
        newSummaries.push(summary);
      }

      setSummaries(newSummaries);
      toast.success('Summaries generated successfully!');
    } catch (error) {
      console.error('Error generating summaries:', error);
      toast.error('Failed to generate summaries. Please try again.');
    } finally {
      setIsGenerating(false);
      setProgress(0);
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
        // For other file types, we'll use a placeholder
        resolve(`Content from ${file.name} (${file.type})`);
      }
    });
  };

  const generateSummaryWithAI = async (content: string, fileName: string): Promise<Summary> => {
    const prompt = customPrompt || `
      Please analyze the following study material and create a comprehensive summary. Follow these guidelines:
      1. Create a clear, concise title that reflects the main topic
      2. Write a detailed summary (2-3 paragraphs) covering the key concepts
      3. Extract 5-7 key points that are essential for understanding
      4. Determine the difficulty level (Beginner/Intermediate/Advanced)
      5. Estimate reading time in minutes
      6. Identify 3-5 relevant topics/tags
      7. Include any important formulas, definitions, or examples
      8. Highlight any practical applications or real-world connections

      Study Material:
      ${content.substring(0, 3000)}...
    `;

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          agent: 'study',
          conversationHistory: []
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to get response from server');
      }

      const data = await response.json();
      
      if (!data.success || !data.response) {
        throw new Error('Invalid response format from server');
      }

      const aiResponse = data.response;

      // Parse AI response and create summary object
      return {
        id: Date.now().toString() + Math.random(),
        title: fileName.replace(/\.[^/.]+$/, ''),
        content: aiResponse,
        keyPoints: extractKeyPoints(aiResponse),
        difficulty: extractDifficulty(aiResponse),
        estimatedReadTime: Math.ceil(content.length / 200),
        topics: extractTopics(aiResponse)
      };
    } catch (error) {
      console.error('Error calling API:', error);
      return {
        id: Date.now().toString() + Math.random(),
        title: fileName.replace(/\.[^/.]+$/, ''),
        content: 'Summary could not be generated automatically. Please review the material manually.',
        keyPoints: ['Review material manually', 'Extract key concepts', 'Practice exercises'],
        difficulty: 'Intermediate' as const,
        estimatedReadTime: 5,
        topics: ['General Study']
      };
    }
  };

  const extractKeyPoints = (text: string): string[] => {
    // Simple extraction logic - look for numbered or bulleted lists
    const keyPointPatterns = [
      /(?:Key [Pp]oints?|Main [Pp]oints?|Important [Pp]oints?)[\s\S]*?(?:\n\n|\n[A-Z]|$)/gi,
      /(?:\d+\.|[-•*])\s+([^\n]+)/g
    ];
    
    let points: string[] = [];
    keyPointPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        points = points.concat(matches.map(match => match.replace(/^\d+\.|^[-•*]\s*/, '').trim()));
      }
    });
    
    return points.slice(0, 7).length > 0 ? points.slice(0, 7) : [
      'Review main concepts',
      'Practice key exercises',
      'Understand core principles'
    ];
  };

  const extractDifficulty = (text: string): 'Beginner' | 'Intermediate' | 'Advanced' => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('beginner') || lowerText.includes('basic') || lowerText.includes('introduction')) {
      return 'Beginner';
    } else if (lowerText.includes('advanced') || lowerText.includes('complex') || lowerText.includes('expert')) {
      return 'Advanced';
    }
    return 'Intermediate';
  };

  const extractTopics = (text: string): string[] => {
    // Simple topic extraction - look for common educational terms
    const commonTopics = [
      'Mathematics', 'Science', 'History', 'Literature', 'Physics', 'Chemistry', 
      'Biology', 'Programming', 'Computer Science', 'Geography', 'Economics'
    ];
    
    const foundTopics = commonTopics.filter(topic => 
      text.toLowerCase().includes(topic.toLowerCase())
    );
    
    return foundTopics.length > 0 ? foundTopics.slice(0, 5) : ['General Study'];
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const exportSummary = (summary: Summary) => {
    const content = `# ${summary.title}\n\n${summary.content}\n\n## Key Points\n${summary.keyPoints.map(point => `- ${point}`).join('\n')}\n\n## Topics\n${summary.topics.join(', ')}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${summary.title}_summary.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Summary exported successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Generate Summary Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="w-5 h-5 mr-2 text-blue-600" />
            AI Summary Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Custom Instructions (Optional)
            </label>
            <Textarea
              placeholder="Add specific instructions for the AI summary generator..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {materials.length} file(s) ready to summarize
            </div>
            <Button 
              onClick={generateSummary}
              disabled={isGenerating || materials.length === 0}
              className="flex items-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Lightbulb className="w-4 h-4" />
                  <span>Generate Summaries</span>
                </>
              )}
            </Button>
          </div>
          
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Summaries */}
      {summaries.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            Generated Summaries ({summaries.length})
          </h3>
          
          {summaries.map((summary) => (
            <Card key={summary.id} className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-lg">{summary.title}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge className={getDifficultyColor(summary.difficulty)}>
                        {summary.difficulty}
                      </Badge>
                      <Badge variant="outline">
                        <BookOpen className="w-3 h-3 mr-1" />
                        {summary.estimatedReadTime} min read
                      </Badge>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportSummary(summary)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(summary.content);
                        toast.success('Summary copied to clipboard!');
                      }}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{summary.content}</p>
                </div>
                
                {summary.keyPoints.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center">
                      <Target className="w-4 h-4 mr-1 text-orange-600" />
                      Key Points
                    </h4>
                    <ul className="space-y-1">
                      {summary.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {summary.topics.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Topics</h4>
                    <div className="flex flex-wrap gap-2">
                      {summary.topics.map((topic, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {summaries.length === 0 && !isGenerating && (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Summaries Yet</h3>
            <p className="text-gray-600 mb-4">
              Upload study materials and generate AI-powered summaries to get started.
            </p>
            <Button 
              onClick={generateSummary}
              disabled={materials.length === 0}
              variant="outline"
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              Generate Your First Summary
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudyMaterialSummary;
