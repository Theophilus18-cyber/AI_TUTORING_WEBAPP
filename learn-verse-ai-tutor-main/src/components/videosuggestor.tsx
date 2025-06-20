// VideoSuggestions.tsx - React component for YouTube video suggestions
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, ExternalLink, Clock, Eye, ThumbsUp, Loader2, Video, X } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  url: string;
  viewCount: string;
  likeCount: string;
  duration: string;
}

interface VideoSuggestionsProps {
  lastUserMessage?: string;
  agent?: string;
  isVisible?: boolean;
  onClose?: () => void;
  conversationHistory?: Array<{
    id: string;
    content: string;
    sender: 'user' | 'agent';
    timestamp: Date;
    agent?: string;
  }>;
}

const VideoSuggestions: React.FC<VideoSuggestionsProps> = ({
  lastUserMessage = '',
  agent = 'tutor',
  isVisible = false,
  onClose,
  conversationHistory = []
}) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Backend API URL - adjust this to match your backend server
  const API_BASE_URL = 'http://localhost:3001';

  const formatViewCount = (count: string): string => {
    const num = parseInt(count);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return count;
  };

  const formatDuration = (duration: string): string => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return '0:00';
    
    const hours = parseInt(match[1]?.replace('H', '') || '0');
    const minutes = parseInt(match[2]?.replace('M', '') || '0');
    const seconds = parseInt(match[3]?.replace('S', '') || '0');
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const fetchVideoSuggestions = async (message: string) => {
    if (!message.trim()) {
      setError('No message to analyze for video suggestions');
      return;
    }

    setIsLoading(true);
    setError('');
    setVideos([]);

    try {
      // Use the actual conversation history passed from parent
      const recentHistory = conversationHistory
        .slice(-6) // Get last 6 messages for context
        .map(msg => ({
          sender: msg.sender,
          content: msg.content
        }));

      const response = await fetch(`${API_BASE_URL}/api/suggest-videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          subject: getSubjectFromMessage(message, agent),
          conversationHistory: recentHistory,
          agentType: agent
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setVideos(data.videos);
        setSearchQuery(data.extractedKeywords || data.query);
        console.log('AI-powered video suggestions:', {
          originalMessage: data.originalMessage,
          extractedKeywords: data.extractedKeywords,
          finalQuery: data.query,
          videosFound: data.videos.length
        });
      } else {
        throw new Error(data.error || 'Failed to fetch videos');
      }
    } catch (err) {
      console.error('Error fetching video suggestions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load video suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Helper function to determine subject from message and agent type
  const getSubjectFromMessage = (message: string, agentType: string): string => {
    const messageLower = message.toLowerCase();
    
    // Define subject keywords mapping
    const subjectKeywords = {
      'cell biology': ['cell biology', 'cell', 'biology', 'organism', 'dna', 'gene', 'evolution'],
      'physics': ['newton', 'laws', 'physics', 'physical', 'gravity', 'motion', 'force', 'energy', 'velocity', 'acceleration', 'mass', 'weight'],
      'chemistry': ['chemistry', 'chemical', 'atoms', 'molecules', 'reaction', 'element', 'compound', 'bond', 'acid', 'base'],
      'mathematics': ['math', 'mathematics', 'algebra', 'calculus', 'derivatives', 'equations', 'geometry', 'trigonometry', 'statistics'],
      'programming': ['programming', 'coding', 'python', 'javascript', 'code', 'algorithm', 'function', 'variable', 'software'],
      'history': ['history', 'historical', 'war', 'battle', 'ancient', 'medieval', 'civilization', 'empire', 'kingdom'],
      'geography': ['geography', 'geographic', 'country', 'continent', 'ocean', 'mountain', 'climate', 'weather'],
      'literature': ['literature', 'english', 'writing', 'poetry', 'novel', 'story', 'author', 'book'],
      'biology': ['photosynthesis', 'plants', 'ecosystem', 'species', 'habitat', 'environment']
    };
    
    // Check for subject matches
    for (const [subject, keywords] of Object.entries(subjectKeywords)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        return subject;
      }
    }
    
    // Fallback based on agent type
    switch (agentType) {
      case 'coding':
        return 'programming';
      case 'quiz':
        return 'educational';
      case 'study':
        return 'academic';
      case 'tutor':
      default:
        return 'learning';
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="mt-4 border-t pt-4">
      <Card className="bg-gradient-to-r from-red-50 to-pink-50 border-red-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Video className="w-5 h-5 text-red-600" />
              <CardTitle className="text-lg text-red-800">Video Learning Resources</CardTitle>
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <p className="text-sm text-red-600">
            Get visual explanations and tutorials related to your question
          </p>
        </CardHeader>
        
        <CardContent>
          {!videos.length && !isLoading && !error && (
            <div className="text-center py-6">
              <Button 
                onClick={() => fetchVideoSuggestions(lastUserMessage)}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={!lastUserMessage.trim()}
              >
                <Play className="w-4 h-4 mr-2" />
                Find Learning Videos
              </Button>
              {!lastUserMessage.trim() && (
                <p className="text-sm text-gray-500 mt-2">
                  Ask a question first to get relevant video suggestions
                </p>
              )}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-red-600 mr-2" />
              <span className="text-red-700">Finding the best videos for you...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => fetchVideoSuggestions(lastUserMessage)}
              >
                Try Again
              </Button>
            </div>
          )}

          {videos.length > 0 && (
            <div className="space-y-4">
              {searchQuery && (
                <div className="flex items-center space-x-2 mb-4">
                  <Badge variant="outline" className="text-red-700 bg-red-50">
                    Search: {searchQuery}
                  </Badge>
                </div>
              )}
              
              <div className="grid gap-4">
                {videos.map((video) => (
                  <div 
                    key={video.id}
                    className="flex bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleVideoClick(video.url)}
                  >
                    <div className="relative flex-shrink-0">
                      <img 
                        src={video.thumbnail} 
                        alt={video.title}
                        className="w-32 h-24 object-cover"
                      />
                      <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {formatDuration(video.duration)}
                      </div>
                    </div>
                    
                    <div className="flex-1 p-3 min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 line-clamp-2 leading-tight mb-1">
                        {video.title}
                      </h4>
                      
                      <p className="text-xs text-gray-600 mb-2">
                        {video.channelTitle} • {formatTimeAgo(video.publishedAt)}
                      </p>
                      
                      <div className="flex items-center space-x-3 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Eye className="w-3 h-3 mr-1" />
                          {formatViewCount(video.viewCount)} views
                        </div>
                        <div className="flex items-center">
                          <ThumbsUp className="w-3 h-3 mr-1" />
                          {formatViewCount(video.likeCount)}
                        </div>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="text-center pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => fetchVideoSuggestions(lastUserMessage)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Refresh Videos
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoSuggestions;