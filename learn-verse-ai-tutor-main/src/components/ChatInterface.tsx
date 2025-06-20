import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, User, Mic, MicOff, Volume2, VolumeX, Video, VideoOff } from 'lucide-react';
import VideoSuggestions from './videosuggestor';
import TaskInput from './TaskInput';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  agent?: string;
}

interface ChatInterfaceProps {
  agent: string;
  isSpeaking: boolean;
  onProgressUpdate: (progress: number) => void;
  uploadedFiles?: File[];
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ agent, isSpeaking, onProgressUpdate, uploadedFiles = [] }): JSX.Element => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(isSpeaking);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [speechError, setSpeechError] = useState<string>('');
  const [microphonePermission, setMicrophonePermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  
  // Video suggestions state
  const [showVideoSuggestions, setShowVideoSuggestions] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const [taskResults, setTaskResults] = useState<any[]>([]);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const userStopped = useRef(false);
  const [showWelcomeButton, setShowWelcomeButton] = useState(true);
  const welcomeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Remove hardcoded API keys
  const GEMINI_API_KEY = 'AIzaSyB0L2GbAOkUYixMxmE-vhYcx4Gc5bpo5y8';

  // Add welcome message effect
  useEffect(() => {
    const welcomeMessage = `Welcome to LearnVerse AI Tutor! I'm your personal learning assistant. I can help you with:
    - Answering questions about your study materials
    - Creating quizzes to test your knowledge
    - Breaking down complex concepts
    - Providing detailed explanations
    - Suggesting helpful learning resources
    
    Feel free to ask me anything, and don't forget you can use voice commands by clicking the microphone button. Let's make learning fun and effective together!`;

    // Add welcome message to chat
    const welcomeMsg: Message = {
      id: 'welcome',
      content: welcomeMessage,
      sender: 'agent',
      timestamp: new Date(),
      agent
    };

    setMessages([welcomeMsg]);

    // Initialize welcome audio
    welcomeAudioRef.current = new Audio('/speech.mp3');
    welcomeAudioRef.current.onended = () => {
      setIsPlayingAudio(false);
      welcomeAudioRef.current = null;
      setShowWelcomeButton(false);
      // Set speech enabled after welcome message
      setSpeechEnabled(true);
    };
  }, []); // Empty dependency array means this runs once when component mounts

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const checkMicrophonePermissions = async () => {
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setMicrophonePermission(permission.state);
          
          permission.onchange = () => {
            setMicrophonePermission(permission.state);
          };
        } catch (error) {
          console.error('Error checking microphone permissions:', error);
        }
      }
    };

    checkMicrophonePermissions();
  }, []);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;
      
      recognitionRef.current.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
        setSpeechError('');
        setInput('Listening...');
        userStopped.current = false;
      };

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join('');
        
        if (event.results[0].isFinal) {
          setInput(transcript);
          setIsListening(false);
        } else {
          setInput(transcript + '...');
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        if (event.error !== 'no-speech' || !userStopped.current) {
          handleSpeechError(event.error);
        }
        
        if (event.error === 'no-speech') {
          setInput('');
        }
      };

      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
        if (input === 'Listening...') {
          setInput('');
        }
      };

      recognitionRef.current.onspeechend = () => {
        console.log('Speech ended');
        recognitionRef.current.stop();
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
    };
  }, []);

  const handleSpeechError = (error: string) => {
    let errorMessage = '';
    switch (error) {
      case 'no-speech':
        errorMessage = 'No speech detected. Try speaking louder or closer to the microphone.';
        break;
      case 'audio-capture':
        errorMessage = 'No microphone found. Ensure a microphone is connected.';
        break;
      case 'not-allowed':
        errorMessage = 'Microphone access blocked. Please allow microphone access in your browser settings.';
        setMicrophonePermission('denied');
        break;
      default:
        errorMessage = `Error: ${error}. Please try again.`;
    }
    
    setSpeechError(errorMessage);
    setTimeout(() => setSpeechError(''), 5000);
  };

  const getAgentPrompt = (agentType: string) => {
    const basePrompts = {
      tutor: "You are an AI Tutor for students aged 6-18. Provide comprehensive explanations.",
      study: "You are a Study Agent specialized in breaking down complex concepts.",
      coding: "You are a Coding Agent helping students learn programming.",
      quiz: "You are a Quiz Agent that creates engaging educational quizzes."
    };
    
    let prompt = basePrompts[agentType] || basePrompts.tutor;
    
    if (uploadedFiles.length > 0) {
      prompt += `\n\nReference these materials: ${uploadedFiles.map(f => f.name).join(', ')}`;
    }
    
    return prompt;
  };

  const speakWithGeminiTTS = async (text: string): Promise<void> => {
    if (!speechEnabled) return;

    try {
      setIsPlayingAudio(true);
      
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: 'en-US',
            name: 'en-US-Neural2-F',
            ssmlGender: 'FEMALE'
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 1.0,
            pitch: 0.0,
            volumeGainDb: 0.0,
            effectsProfileId: ['large-home-entertainment-class-device']
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'TTS API error');
      }

      const data = await response.json();
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
      };
      
      await audio.play();
    } catch (error) {
      console.error('TTS failed:', error);
      setIsPlayingAudio(false);
      // Fallback to browser's speech synthesis with better voice settings
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Try to get a better voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google') || 
        voice.name.includes('Microsoft') || 
        voice.name.includes('Samantha')
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const startListening = async () => {
    if (!recognitionRef.current || isListening) return;

    try {
      if (microphonePermission === 'denied') {
        setSpeechError('Microphone access denied. Please update browser settings.');
        return;
      }

      if (navigator.mediaDevices) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          setMicrophonePermission('granted');
        } catch (err) {
          setMicrophonePermission('denied');
          setSpeechError('Microphone access denied');
          return;
        }
      }

      setSpeechError('');
      userStopped.current = false;
      recognitionRef.current.start();
      
      setTimeout(() => {
        if (isListening) {
          stopListening();
        }
      }, 10000);
      
    } catch (error) {
      console.error('Error starting recognition:', error);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      userStopped.current = true;
      recognitionRef.current.stop();
    }
  };

  const toggleSpeech = () => {
    setSpeechEnabled(!speechEnabled);
    if (isPlayingAudio && currentAudioRef.current) {
      currentAudioRef.current.pause();
      setIsPlayingAudio(false);
    }
  };

  const toggleVideoSuggestions = () => {
    setShowVideoSuggestions(!showVideoSuggestions);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setLastUserMessage(input);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newMessage.content,
          agent,
          conversationHistory: messages
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

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        sender: 'agent',
        timestamp: new Date(),
        agent
      };

      setMessages(prev => [...prev, aiResponse]);
      
      if (speechEnabled) {
        speakWithGeminiTTS(aiResponse.content);
      }

      const newProgress = Math.min(currentProgress + 10, 100);
      setCurrentProgress(newProgress);
      onProgressUpdate(newProgress);

    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Error: ${error.message}. Please try again.`,
        sender: 'agent',
        timestamp: new Date(),
        agent
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getAgentColor = (agentType: string) => {
    const colors = {
      tutor: 'bg-blue-500',
      study: 'bg-green-500',
      coding: 'bg-purple-500',
      quiz: 'bg-orange-500'
    };
    return colors[agentType] || 'bg-blue-500';
  };

  const getAgentInitial = (agentType: string) => {
    const initials = {
      tutor: 'AT',
      study: 'SA',
      coding: 'CA',
      quiz: 'QA'
    };
    return initials[agentType] || 'AI';
  };

  const playWelcomeMessage = () => {
    if (welcomeAudioRef.current) {
      setIsPlayingAudio(true);
      welcomeAudioRef.current.play().catch(error => {
        console.error('Welcome message audio failed:', error);
        setIsPlayingAudio(false);
        // Fallback to browser's speech synthesis
        const utterance = new SpeechSynthesisUtterance(welcomeMessage);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
        setSpeechEnabled(true);
      });
    }
  };

  const handleTaskResult = (result: any) => {
    setTaskResults(prev => [...prev, result]);
    
    // Add task result to chat messages
    const taskMessage: Message = {
      id: Date.now().toString(),
      content: `Task completed: ${result.message}`,
      sender: 'agent',
      timestamp: new Date(),
      agent
    };
    setMessages(prev => [...prev, taskMessage]);
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`flex items-start space-x-2 max-w-[80%] ${
                  message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <Avatar className={`${message.sender === 'user' ? 'bg-gray-200' : getAgentColor(message.agent || agent)}`}>
                  <AvatarFallback>
                    {message.sender === 'user' ? 'U' : getAgentInitial(message.agent || agent)}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`rounded-lg p-3 ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.id === 'welcome' && showWelcomeButton && (
                    <Button
                      onClick={playWelcomeMessage}
                      className="mt-2 bg-blue-500 hover:bg-blue-600 text-white"
                      size="sm"
                    >
                      {isPlayingAudio ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                      <span className="ml-2">Play Welcome Message</span>
                    </Button>
                  )}
                  <span className="text-xs opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {showVideoSuggestions && (
        <VideoSuggestions
          lastUserMessage={lastUserMessage}
          agent={agent}
          isVisible={showVideoSuggestions}
          onClose={() => setShowVideoSuggestions(false)}
          conversationHistory={messages}
        />
      )}

      <div className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSpeech}
            className={speechEnabled ? 'text-blue-500' : 'text-gray-500'}
          >
            {speechEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={startListening}
            disabled={isListening || microphonePermission === 'denied'}
            className={isListening ? 'text-red-500' : 'text-gray-500'}
          >
            {isListening ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleVideoSuggestions}
            className={showVideoSuggestions ? 'text-blue-500' : 'text-gray-500'}
          >
            {showVideoSuggestions ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>

          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1"
            disabled={isLoading}
          />

          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>

        {speechError && (
          <p className="text-red-500 text-sm mt-2">{speechError}</p>
        )}
        
        {/* Task Input Section - Backup option for text-based task input */}
        <div className="mt-12 pt-12 border-t border-gray-200 bg-gray-50 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <p className="text-sm font-medium text-gray-700">Task Automation (Backup)</p>
          </div>
          <p className="text-xs text-gray-500 mb-6">
            Type task instructions here as an alternative to voice commands. Examples: "Download past papers for grade 12 mathematics" or "Search for physics resources"
          </p>
          <TaskInput onTaskResult={handleTaskResult} />
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;