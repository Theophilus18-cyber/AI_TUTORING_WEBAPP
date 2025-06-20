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
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error('OPENROUTER_API_KEY is not set in environment variables');
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

    // Extract key terms from the AI's response to understand what was actually taught
    const aiResponse = conversationHistory
      .filter(msg => msg.sender === 'agent')
      .slice(-2) // Get last 2 AI responses
      .map(msg => msg.content)
      .join(' ');

    // Create dynamic system prompt based on agent type and conversation
    const agentContext = {
      tutor: 'educational content for students, focusing on clear explanations and learning materials',
      study: 'study materials, academic concepts, and learning resources',
      coding: 'programming tutorials, coding concepts, and software development',
      quiz: 'educational quizzes, test preparation, and assessment materials'
    };

    const systemPrompt = `You are an AI assistant helping to find highly relevant YouTube videos for ${agentContext[agentType] || agentContext.tutor}. 

    Based on the conversation context and the user's latest message, extract 3-5 specific, targeted keywords that would find the most relevant educational YouTube videos.

    CRITICAL GUIDELINES:
    - Focus on the EXACT topic/concept being discussed in the conversation
    - If the AI has provided a detailed explanation, extract keywords from that content
    - Use specific terminology and subject names (e.g., "cell membrane", "mitochondria", "DNA replication")
    - Include the specific subject area (biology, chemistry, physics, programming, history, etc.)
    - Add ONE relevant educational term like "tutorial", "explained", "lesson", or "guide" ONLY if it makes the search more specific
    - Consider both the user's question AND the AI's response to understand the full context
    - Avoid generic terms like "education", "learning", "study" unless they're part of a specific concept
    - Return ONLY the keywords separated by spaces, no extra text or punctuation

    EXAMPLES:
    - User asks "teach me cell biology" and AI explains about cell structure → "cell biology cell membrane mitochondria tutorial"
    - User asks "Explain Newton's laws" → "newton laws physics motion explained"
    - User asks "How does photosynthesis work?" → "photosynthesis biology plants process"
    - User asks "Explain Python for loops" → "python for loops programming tutorial"
    - User asks "What are calculus derivatives?" → "calculus derivatives mathematics explained"
    - User asks "Tell me about World War 2" → "world war 2 history documentary"
    - User asks "How to solve quadratic equations" → "quadratic equations algebra math tutorial"
    - User asks "Explain the water cycle" → "water cycle science geography explained"
    - User asks "What is gravity?" → "gravity physics force explained"
    - User asks "Teach me about atoms" → "atoms chemistry structure tutorial"`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...contextMessages,
      { role: 'user', content: `User's latest message: "${message}"\n\nAI's recent response content: "${aiResponse.substring(0, 500)}..."\n\nExtract specific YouTube search keywords based on what was actually discussed:` }
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1-0528:free',
        messages: messages,
        temperature: 0.1, // Lower temperature for more consistent, focused keywords
        max_tokens: 60,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    const keywords = data.choices[0]?.message?.content?.trim() || '';
    
    console.log('AI extracted keywords:', keywords);
    console.log('Based on user message:', message);
    console.log('And AI response context:', aiResponse.substring(0, 200) + '...');
    
    return keywords;
  } catch (error) {
    console.error('Error extracting keywords:', error);
    // Improved fallback: extract more specific keywords from the message and AI response
    const aiResponse = conversationHistory
      .filter(msg => msg.sender === 'agent')
      .slice(-1)
      .map(msg => msg.content)
      .join(' ');
    
    const combinedText = `${message} ${aiResponse}`.toLowerCase();
    
    // Improved fallback logic with better word filtering
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'what', 'how', 'why', 'when', 'where', 'who', 'which', 'that', 'this', 'these', 'those', 'teach', 'me', 'about', 'explain', 'tell'];
    
    // Extract meaningful words from the user's message
    const messageWords = message.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1 && !stopWords.includes(word))
      .slice(0, 3); // Take top 3 meaningful words from user message
    
    // Extract meaningful words from AI response
    const aiWords = aiResponse.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 2); // Take top 2 meaningful words from AI response
    
    // Combine and deduplicate
    const allWords = [...new Set([...messageWords, ...aiWords])];
    
    // Add subject area if we can detect it from the words
    const subjectAreas = {
      'physics': ['newton', 'laws', 'gravity', 'motion', 'force', 'energy', 'velocity', 'acceleration', 'mass', 'weight'],
      'chemistry': ['atoms', 'molecules', 'chemical', 'reaction', 'element', 'compound', 'bond', 'acid', 'base'],
      'biology': ['cell', 'biology', 'organism', 'photosynthesis', 'ecosystem', 'dna', 'gene', 'evolution'],
      'mathematics': ['math', 'mathematics', 'algebra', 'calculus', 'derivatives', 'equations', 'geometry', 'trigonometry'],
      'programming': ['programming', 'coding', 'python', 'javascript', 'code', 'algorithm', 'function', 'variable'],
      'history': ['history', 'historical', 'war', 'battle', 'ancient', 'medieval', 'civilization'],
      'geography': ['geography', 'geographic', 'country', 'continent', 'ocean', 'mountain', 'climate']
    };
    
    // Detect subject area from the words
    let detectedSubject = '';
    for (const [subject, keywords] of Object.entries(subjectAreas)) {
      if (allWords.some(word => keywords.includes(word))) {
        detectedSubject = subject;
        break;
      }
    }
    
    // Build the final keyword string
    let fallbackKeywords = allWords.join(' ');
    
    // Add detected subject if not already present
    if (detectedSubject && !fallbackKeywords.includes(detectedSubject)) {
      fallbackKeywords = `${detectedSubject} ${fallbackKeywords}`;
    }
    
    // Add educational term if the query seems too short
    if (fallbackKeywords.split(' ').length < 3) {
      fallbackKeywords += ' tutorial';
    }
    
    console.log('Fallback keywords generated:', {
      messageWords,
      aiWords,
      detectedSubject,
      finalKeywords: fallbackKeywords
    });
    
    return fallbackKeywords || 'educational content';
  }
}

// Function to search YouTube videos
async function searchYouTubeVideos(query, maxResults = 3) {
  try {
    // Enhanced search parameters for educational content
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?` +
      `part=snippet&` +
      `q=${encodeURIComponent(query)}&` +
      `type=video&` +
      `order=relevance&` +
      `videoDefinition=high&` +
      `videoDuration=medium&` +
      `relevanceLanguage=en&` +
      `regionCode=US&` +
      `maxResults=${maxResults}&` +
      `key=${YOUTUBE_API_KEY}`;

    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.log('No videos found for query:', query);
      return [];
    }
    
    // Get video statistics for rating information
    const videoIds = data.items.map(item => item.id.videoId).join(',');
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?` +
      `part=statistics,contentDetails&` +
      `id=${videoIds}&` +
      `key=${YOUTUBE_API_KEY}`;

    const statsResponse = await fetch(statsUrl);
    const statsData = await statsResponse.json();

    // Combine search results with statistics and filter for quality
    const videosWithStats = data.items.map((item, index) => {
      const stats = statsData.items[index];
      const viewCount = parseInt(stats?.statistics?.viewCount || '0');
      const likeCount = parseInt(stats?.statistics?.likeCount || '0');
      
      return {
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium.url,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        viewCount: viewCount.toLocaleString(),
        likeCount: likeCount.toLocaleString(),
        duration: stats?.contentDetails?.duration || 'PT0S',
        // Add relevance score based on title and description
        relevanceScore: calculateRelevanceScore(item.snippet.title, item.snippet.description, query)
      };
    });

    // Sort by relevance score and return top results
    const sortedVideos = videosWithStats
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);

    console.log(`Found ${sortedVideos.length} relevant videos for query: "${query}"`);
    return sortedVideos;
  } catch (error) {
    console.error('Error searching YouTube:', error);
    throw error;
  }
}

// Helper function to calculate relevance score
function calculateRelevanceScore(title, description, query) {
  const queryWords = query.toLowerCase().split(' ');
  const titleLower = title.toLowerCase();
  const descriptionLower = description.toLowerCase();
  
  let score = 0;
  
  // Check for exact matches in title (highest weight)
  queryWords.forEach(word => {
    if (titleLower.includes(word)) {
      score += 15; // Increased weight for title matches
    }
  });
  
  // Check for exact matches in description
  queryWords.forEach(word => {
    if (descriptionLower.includes(word)) {
      score += 8; // Increased weight for description matches
    }
  });
  
  // Bonus for educational keywords in title
  const educationalKeywords = ['tutorial', 'explained', 'lesson', 'guide', 'how to', 'learn', 'education', 'course', 'introduction', 'basics', 'fundamentals'];
  educationalKeywords.forEach(keyword => {
    if (titleLower.includes(keyword)) {
      score += 5;
    }
  });
  
  // Bonus for scientific/educational channels
  const educationalChannels = ['khan academy', 'crash course', 'ted-ed', 'sci show', 'veritasium', 'vsauce', 'minute physics', 'minute earth', 'asap science', 'it\'s okay to be smart'];
  educationalChannels.forEach(channel => {
    if (descriptionLower.includes(channel) || titleLower.includes(channel)) {
      score += 10;
    }
  });
  
  // Bonus for specific scientific terms that match the query
  const scientificTerms = ['cell', 'biology', 'chemistry', 'physics', 'math', 'mathematics', 'programming', 'computer science', 'history', 'geography', 'literature'];
  scientificTerms.forEach(term => {
    if (query.toLowerCase().includes(term) && (titleLower.includes(term) || descriptionLower.includes(term))) {
      score += 12;
    }
  });
  
  // Penalty for clickbait or irrelevant terms
  const clickbaitTerms = ['clickbait', 'shocking', 'amazing', 'incredible', 'you won\'t believe', 'mind blowing', 'crazy', 'insane'];
  clickbaitTerms.forEach(term => {
    if (titleLower.includes(term)) {
      score -= 8;
    }
  });
  
  // Penalty for very short titles (likely low quality)
  if (title.length < 20) {
    score -= 5;
  }
  
  // Bonus for longer, more descriptive titles
  if (title.length > 50) {
    score += 3;
  }
  
  return score;
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, agent, conversationHistory } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY is not set');
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

    console.log('Sending request to OpenRouter API with:', {
      systemPrompt,
      historyLength: formattedHistory.length,
      message
    });

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1-0528:free',
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
      console.error('OpenRouter API error:', errorData);
      
      if (response.status === 401) {
        return res.status(401).json({ 
          error: 'Authentication failed',
          details: 'Invalid API key'
        });
      }
      
      throw new Error(errorData.error?.message || `OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Received response from OpenRouter API');

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from OpenRouter API');
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
      hasConversationHistory: !!conversationHistory?.length,
      conversationLength: conversationHistory?.length || 0
    });

    // Extract keywords using AI with full context including AI responses
    let searchQuery = await extractKeywords(
      message, 
      conversationHistory || [], 
      agentType || 'tutor'
    );
    
    // Add subject context if provided and not already included
    if (subject && !searchQuery.toLowerCase().includes(subject.toLowerCase())) {
      searchQuery = `${searchQuery} ${subject}`;
    }

    // Only add minimal, specific enhancements based on agent type
    const agentSpecificTerms = {
      tutor: 'tutorial',
      study: 'study guide',
      coding: 'programming tutorial',
      quiz: 'practice test'
    };

    const specificTerm = agentSpecificTerms[agentType] || agentSpecificTerms.tutor;
    
    // Only add the specific term if it's not already present and the query is too short
    if (searchQuery.split(' ').length < 3 && !searchQuery.toLowerCase().includes(specificTerm.split(' ')[0])) {
      searchQuery = `${searchQuery} ${specificTerm}`;
    }

    console.log('Final search query:', searchQuery);
    console.log('Original message:', message);
    console.log('Conversation context used:', conversationHistory?.slice(-3).map(msg => `${msg.sender}: ${msg.content.substring(0, 50)}...`));
    console.log('Subject detected:', subject);
    console.log('Agent type:', agentType);

    // Search YouTube videos with more results to allow for better filtering
    const videos = await searchYouTubeVideos(searchQuery, 8);

    res.json({
      success: true,
      query: searchQuery,
      originalMessage: message,
      extractedKeywords: searchQuery,
      videos: videos.slice(0, 3) // Return top 3 most relevant
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