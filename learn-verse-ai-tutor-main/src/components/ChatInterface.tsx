import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, User, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

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

const ChatInterface: React.FC<ChatInterfaceProps> = ({ agent, isSpeaking, onProgressUpdate, uploadedFiles = [] }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `Hello! I'm your ${agent === 'tutor' ? 'AI Tutor' : agent === 'study' ? 'Study Agent' : agent === 'coding' ? 'Coding Agent' : 'Quiz Agent'}. How can I help you learn today?`,
      sender: 'agent',
      timestamp: new Date(),
      agent
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(isSpeaking);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [speechError, setSpeechError] = useState<string>('');
  const [microphonePermission, setMicrophonePermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const userStopped = useRef(false);

  const GROQ_API_KEY = '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';
  const GEMINI_API_KEY = 'AIzaSyB0L2GbAOkUYixMxmE-vhYcx4Gc5bpo5y8';

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

  const speakWithGoogleTTS = async (text: string): Promise<void> => {
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
          voice: { languageCode: 'en-US', name: 'en-US-Standard-D' },
          audioConfig: { audioEncoding: 'MP3' }
        }),
      });

      if (!response.ok) throw new Error('TTS API error');

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

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
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
              content: getAgentPrompt(agent)
            },
            ...messages.slice(-10).map(msg => ({
              role: msg.sender === 'user' ? 'user' : 'assistant',
              content: msg.content
            })),
            {
              role: 'user',
              content: input
            }
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) throw new Error('API error');

      const data = await response.json();
      const agentResponse = data.choices[0]?.message?.content || 'Sorry, I could not process your request.';

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: agentResponse,
        sender: 'agent',
        timestamp: new Date(),
        agent
      };

      setMessages(prev => [...prev, agentMessage]);
      
      if (speechEnabled) {
        speakWithGoogleTTS(agentResponse);
      }

      const newProgress = Math.min(currentProgress + 10, 100);
      setCurrentProgress(newProgress);
      onProgressUpdate(newProgress);

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        sender: 'agent',
        timestamp: new Date(),
        agent
      }]);
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

  const isSpeechSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  return (
    <div className="flex flex-col h-[500px]">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2`}>
                <Avatar className="w-8 h-8 mt-1">
                  <AvatarFallback className={`text-white text-xs ${message.sender === 'user' ? 'bg-gray-500' : getAgentColor(message.agent || agent)}`}>
                    {message.sender === 'user' ? <User className="w-4 h-4" /> : getAgentInitial(message.agent || agent)}
                  </AvatarFallback>
                </Avatar>
                <div className={`rounded-lg px-4 py-3 ${message.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'}`}>
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  <div className={`text-xs mt-1 ${message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2">
                <Avatar className="w-8 h-8 mt-1">
                  <AvatarFallback className={`text-white text-xs ${getAgentColor(agent)}`}>
                    {getAgentInitial(agent)}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-gray-100 rounded-lg px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-gray-600">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <div className="border-t p-4 bg-white">
        <div className="flex items-center space-x-2 mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSpeech}
            className={`${speechEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100'} ${isPlayingAudio ? 'animate-pulse' : ''}`}
          >
            {speechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {isPlayingAudio && <span className="ml-1 text-xs">Speaking...</span>}
          </Button>
          
          {isSpeechSupported && (
            <Button
              variant="outline"
              size="sm"
              onClick={isListening ? stopListening : startListening}
              className={`${isListening ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100'} ${microphonePermission === 'denied' ? 'cursor-not-allowed' : ''}`}
              disabled={microphonePermission === 'denied'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isListening && <span className="ml-1 text-xs">Listening</span>}
            </Button>
          )}
        </div>
        
        {speechError && (
          <div className="mb-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800">
            {speechError}
          </div>
        )}
        
        {microphonePermission === 'denied' && (
          <div className="mb-2 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-800">
            Microphone access is blocked. Please update your browser settings to use voice input.
          </div>
        )}
        
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Type your message... ${isSpeechSupported ? '(or press mic to speak)' : ''}`}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={sendMessage} 
            disabled={isLoading || !input.trim()}
            className="shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;