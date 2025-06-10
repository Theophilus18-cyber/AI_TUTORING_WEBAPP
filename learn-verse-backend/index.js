// youtube-service.js - Node.js backend service
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Your YouTube Data API v3 key
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error('GROQ_API_KEY is not set in environment variables');
  process.exit(1);
}

if (!YOUTUBE_API_KEY) {
  console.error('YOUTUBE_API_KEY is not set in environment variables');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// Function to extract keywords using AI with conversation context
async function extractKeywords(message, conversationHistory = [], agentType = 'tutor') {
  try {
    // Build context from recent conversation
    const contextMessages = conversationHistory.slice(-5).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    // Create dynamic system prompt based on agent type and conversation
    const agentContext = {
      tutor: 'educational content for students, focusing on clear explanations and learning materials',
      study: 'study materials, academic concepts, and learning resources',
      coding: 'programming tutorials, coding concepts, and software development',
      quiz: 'educational quizzes, test preparation, and assessment materials'
    };

    const systemPrompt = `You are an AI assistant helping to find relevant YouTube videos for ${agentContext[agentType] || agentContext.tutor}. 

    Based on the conversation context and the user's latest message, extract 2-4 specific keywords that would be perfect for finding educational YouTube videos. 

    Guidelines:
    - Focus on the core educational concept or topic
    - Include relevant subject area if applicable (math, science, history, etc.)
    - Add learning-focused terms when appropriate (tutorial, explained, guide)
    - Consider the conversation context to understand what the user is trying to learn
    - Return ONLY the keywords separated by spaces, no extra text or punctuation

    Examples:
    - User asks about photosynthesis → "photosynthesis biology plants tutorial"
    - User asks about Python loops → "python loops programming tutorial"
    - User asks about calculus → "calculus derivatives mathematics explained"
    - User asks about history → "world war history documentary"`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...contextMessages,
      { role: 'user', content: `Latest message: "${message}"\n\nExtract YouTube search keywords:` }
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: messages,
        temperature: 0.2,
        max_tokens: 30,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    const keywords = data.choices[0]?.message?.content?.trim() || '';
    
    console.log('AI extracted keywords:', keywords);
    return keywords;
  } catch (error) {
    console.error('Error extracting keywords:', error);
    // Fallback: extract basic keywords from the message
    const fallbackKeywords = message
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 3)
      .join(' ');
    return fallbackKeywords || 'education tutorial';
  }
}

// Function to search YouTube videos
async function searchYouTubeVideos(query, maxResults = 3) {
  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?` +
      `part=snippet&` +
      `q=${encodeURIComponent(query)}&` +
      `type=video&` +
      `order=relevance&` +
      `videoDefinition=high&` +
      `videoDuration=medium&` +
      `maxResults=${maxResults}&` +
      `key=${YOUTUBE_API_KEY}`;

    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Get video statistics for rating information
    const videoIds = data.items.map(item => item.id.videoId).join(',');
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?` +
      `part=statistics,contentDetails&` +
      `id=${videoIds}&` +
      `key=${YOUTUBE_API_KEY}`;

    const statsResponse = await fetch(statsUrl);
    const statsData = await statsResponse.json();

    // Combine search results with statistics
    const videosWithStats = data.items.map((item, index) => {
      const stats = statsData.items[index];
      return {
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium.url,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        viewCount: stats?.statistics?.viewCount || '0',
        likeCount: stats?.statistics?.likeCount || '0',
        duration: stats?.contentDetails?.duration || 'PT0S'
      };
    });

    return videosWithStats;
  } catch (error) {
    console.error('Error searching YouTube:', error);
    throw error;
  }
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, agent, conversationHistory } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!GROQ_API_KEY) {
      console.error('GROQ_API_KEY is not set');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'API key not configured'
      });
    }

    console.log('Received chat request:', {
      message,
      agent,
      historyLength: conversationHistory?.length
    });

    const basePrompts = {
      tutor: "You are an AI Tutor for students aged 6-18. Provide comprehensive explanations.",
      study: "You are a Study Agent specialized in breaking down complex concepts.",
      coding: "You are a Coding Agent helping students learn programming.",
      quiz: "You are a Quiz Agent that creates engaging educational quizzes."
    };
    
    const systemPrompt = basePrompts[agent] || basePrompts.tutor;

    // Format conversation history
    const formattedHistory = conversationHistory
      ?.slice(-10)
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      })) || [];

    console.log('Sending request to Groq API with:', {
      systemPrompt,
      historyLength: formattedHistory.length,
      message
    });

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
            content: systemPrompt
          },
          ...formattedHistory,
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Groq API error:', errorData);
      
      if (response.status === 401) {
        return res.status(401).json({ 
          error: 'Authentication failed',
          details: 'Invalid API key'
        });
      }
      
      throw new Error(errorData.error?.message || `Groq API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Received response from Groq API');

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from Groq API');
    }

    const agentResponse = data.choices[0].message.content;

    res.json({
      success: true,
      response: agentResponse
    });

  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// API endpoint to get video suggestions based on user message
app.post('/api/suggest-videos', async (req, res) => {
  try {
    const { message, subject, conversationHistory, agentType } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('Processing video suggestion request:', {
      message,
      agentType,
      hasConversationHistory: !!conversationHistory?.length
    });

    // Extract keywords using AI with full context
    let searchQuery = await extractKeywords(
      message, 
      conversationHistory || [], 
      agentType || 'tutor'
    );
    
    // Add subject context if provided
    if (subject && !searchQuery.toLowerCase().includes(subject.toLowerCase())) {
      searchQuery = `${searchQuery} ${subject}`;
    }

    // Enhance search query based on agent type
    const agentEnhancements = {
      tutor: 'education explained tutorial',
      study: 'study guide academic',
      coding: 'programming tutorial code',
      quiz: 'quiz test preparation'
    };

    const enhancement = agentEnhancements[agentType] || agentEnhancements.tutor;
    
    // Only add enhancement if not already present
    const queryWords = searchQuery.toLowerCase().split(' ');
    const enhancementWords = enhancement.split(' ');
    const missingWords = enhancementWords.filter(word => 
      !queryWords.some(qWord => qWord.includes(word) || word.includes(qWord))
    );
    
    if (missingWords.length > 0) {
      searchQuery = `${searchQuery} ${missingWords.join(' ')}`;
    }

    console.log('Final search query:', searchQuery);

    // Search YouTube videos
    const videos = await searchYouTubeVideos(searchQuery, 3);

    res.json({
      success: true,
      query: searchQuery,
      originalMessage: message,
      extractedKeywords: searchQuery.split(' ').slice(0, 4).join(' '),
      videos: videos
    });

  } catch (error) {
    console.error('Error in suggest-videos endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to fetch video suggestions',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'YouTube API service is running' });
});

app.listen(PORT, () => {
  console.log(`YouTube API service running on port ${PORT}`);
  console.log('Make sure to set your YOUTUBE_API_KEY in the environment or directly in the code');
});

export default app;