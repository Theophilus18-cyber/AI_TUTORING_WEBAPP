import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2, MessageCircle, X, Volume2 } from 'lucide-react';
import  Vapi from '@vapi-ai/web';

interface VapiVoiceAssistantProps {
  className?: string;
}

const VapiVoiceAssistant: React.FC<VapiVoiceAssistantProps> = ({ className }) => {
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [showRecentMessage, setShowRecentMessage] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  
  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    // Initialize Vapi with API key
    vapiRef.current = new Vapi('623628f0-14da-49cf-9a00-86fc770f4483');
    
    // Set up event listeners with correct event names
    vapiRef.current.on('call-start', () => setIsListening(true));
    vapiRef.current.on('call-end', () => setIsListening(false));
    vapiRef.current.on('speech-start', () => setTranscript(''));
    vapiRef.current.on('speech-end', () => setTranscript(''));
    vapiRef.current.on('volume-level', () => {});
    vapiRef.current.on('message', (message) => setMessages(prev => [...prev, message]));
    vapiRef.current.on('error', (error) => setError(error.message));

    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    // Show recent message when conversation ends
    if (!isListening && messages && messages.length > 0) {
      setShowRecentMessage(true);
      setTimeout(() => setShowRecentMessage(false), 5000);
    }
  }, [isListening, messages]);

  const handleStartListening = async () => {
    try {
      setError('');
      setIsLoading(true);
      await vapiRef.current?.start('d6c7804f-8b00-4a0a-b5d7-759e8b6e3baf');
    } catch (err) {
      console.error('Error starting Vapi:', err);
      setError('Failed to start voice assistant. Please check your microphone permissions and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopListening = async () => {
    try {
      await vapiRef.current?.stop();
    } catch (err) {
      console.error('Error stopping Vapi:', err);
      setError('Failed to stop voice assistant.');
    }
  };

  const toggleListening = () => {
    if (isListening) {
      handleStopListening();
    } else {
      handleStartListening();
    }
  };

  const dismissError = () => setError('');
  const dismissRecentMessage = () => setShowRecentMessage(false);

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      {/* Main voice assistant button */}
      <Button
        onClick={toggleListening}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        disabled={isLoading}
        className={`w-16 h-16 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
          isListening 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
        size="icon"
      >
        {isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin text-white" />
        ) : isListening ? (
          <MicOff className="w-6 h-6 text-white" />
        ) : (
          <Mic className="w-6 h-6 text-white" />
        )}
      </Button>

      {/* Status indicator */}
      {isListening && (
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
      )}

      {/* Tooltip */}
      {showTooltip && !isListening && !error && (
        <div className="absolute bottom-20 right-0 bg-gray-800 text-white text-xs rounded-lg p-2 transition-all duration-300">
          <div className="flex items-center gap-2">
            <Volume2 className="w-3 h-3" />
            <span>Ask Riley about LearnVerse features</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute bottom-20 right-0 bg-red-100 border border-red-300 rounded-lg p-3 max-w-xs shadow-lg">
          <div className="flex items-start justify-between">
            <p className="text-red-700 text-sm flex-1">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissError}
              className="ml-2 text-red-600 hover:text-red-800 p-1 h-auto"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Live transcript */}
      {isListening && transcript && (
        <div className="absolute bottom-20 right-0 bg-white border border-gray-200 rounded-lg p-3 max-w-xs shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-gray-600">Listening...</p>
          </div>
          <p className="text-sm font-medium text-gray-800">{transcript}</p>
        </div>
      )}

      {/* Recent messages */}
      {showRecentMessage && messages && messages.length > 0 && (
        <div className="absolute bottom-20 right-0 bg-white border border-gray-200 rounded-lg p-3 max-w-xs shadow-lg">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-blue-500" />
              <p className="text-sm font-medium text-gray-700">Riley's Response</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissRecentMessage}
              className="p-1 h-auto text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            {messages[messages.length - 1]?.content || 'No recent messages'}
          </p>
        </div>
      )}

      {/* Welcome message for first-time users */}
      {!isListening && !error && !showRecentMessage && messages && messages.length === 0 && (
        <div className="absolute bottom-20 right-0 bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-xs shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-blue-500" />
            <p className="text-sm font-medium text-blue-700">Welcome!</p>
          </div>
          <p className="text-sm text-blue-600">
            Click the microphone to ask Riley about LearnVerse AI Tutor features
          </p>
        </div>
      )}
    </div>
  );
};

export default VapiVoiceAssistant; 