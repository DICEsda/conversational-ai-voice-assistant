import { useState, useEffect, useRef } from 'react';
import { BarChart3, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { wsClient } from '../../services/websocket';
import type { AssistantState, EventType } from '../../types/assistant';

export default function SplashScreen() {
  const navigate = useNavigate();
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [statusMessage, setStatusMessage] = useState('Connecting to backend...');
  const [streamingText, setStreamingText] = useState('');
  const [lastUserQuery, setLastUserQuery] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [circleOpacity, setCircleOpacity] = useState(0);
  const [canStart, setCanStart] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const connectionAttempted = useRef(false);

  // Connect to backend on mount
  useEffect(() => {
    if (connectionAttempted.current) return;
    connectionAttempted.current = true;

    const connectToBackend = async () => {
      try {
        // Setup event handlers BEFORE connecting
        setupEventHandlers();
        
        // Check if backend is available
        await api.getHealth();
        
        // Connect WebSocket
        await wsClient.connect();
        
        setConnected(true);
        setConnecting(false);
        setStatusMessage('Backend connected');
        setCanStart(true);
        
        // Fade in circle
        setTimeout(() => setCircleOpacity(1), 100);
        
      } catch (error) {
        console.error('Failed to connect to backend:', error);
        setConnected(false);
        setConnecting(false);
        setStatusMessage('Backend not running');
        setCircleOpacity(1);
      }
    };

    connectToBackend();

    // Cleanup on unmount
    return () => {
      wsClient.clearHandlers();
      wsClient.disconnect();
    };
  }, []);

  const setupEventHandlers = () => {
    console.log('🔧 Setting up event handlers...');
    
    // Clear any existing handlers first
    wsClient.clearHandlers();
    
    // State change events
    wsClient.on('state_change', (data: any) => {
      console.log('🔄 State change:', data);
      setAssistantState(data.state);
      setStatusMessage(data.message || '');
    });

    // Hotword detected
    wsClient.on('hotword_detected', () => {
      setStatusMessage('Hotword detected!');
    });

    // Recording events
    wsClient.on('recording_start', () => {
      setStatusMessage('Recording...');
    });

    wsClient.on('recording_complete', () => {
      setStatusMessage('Recording complete');
    });

    // Transcription
    wsClient.on('transcription', (data: any) => {
      console.log('🎤 Transcription received:', data);
      setLastUserQuery(data.text);
      setLastResponse(''); // Clear previous response
      setStreamingText('');
    });

    // LLM streaming tokens
    wsClient.on('llm_token', (data: any) => {
      console.log('🎯 LLM Token received:', data);
      setIsStreaming(true);
      setStreamingText(prev => {
        const newText = prev + data.token;
        console.log('📝 Streaming text updated:', newText);
        return newText;
      });
    });

    // LLM complete
    wsClient.on('llm_complete', (data: any) => {
      setIsStreaming(false);
      setLastResponse(data.text);
      setStreamingText('');
    });

    // TTS events
    wsClient.on('tts_start', () => {
      setStatusMessage('Speaking...');
    });

    wsClient.on('tts_complete', () => {
      setStatusMessage('Done speaking');
    });

    // Error events
    wsClient.on('error', (data: any) => {
      setStatusMessage(`Error: ${data.message}`);
    });

    // Debug: Show registered handlers
    wsClient.debugHandlers();
    console.log('✅ Event handlers setup complete');
  };

  const handleStartAssistant = async () => {
    if (!connected || isStarting) return;
    
    setIsStarting(true);
    try {
      await api.startAssistant();
      setCanStart(false);
    } catch (error) {
      console.error('Failed to start assistant:', error);
      setStatusMessage('Failed to start assistant');
      setIsStarting(false);
    }
  };

  const handleRetryConnection = async () => {
    setConnecting(true);
    setStatusMessage('Connecting to backend...');
    connectionAttempted.current = false;
    
    try {
      setupEventHandlers();
      await api.getHealth();
      await wsClient.connect();
      setConnected(true);
      setConnecting(false);
      setStatusMessage('Backend connected');
      setCanStart(true);
    } catch (error) {
      setConnected(false);
      setConnecting(false);
      setStatusMessage('Backend not running');
    }
  };

  // Get display content based on state
  const getStateDisplay = () => {
    if (isStreaming || streamingText) {
      return {
        showCircle: false,
        centerText: streamingText,
        animation: 'none'
      };
    }

    switch (assistantState) {
      case 'listening':
        return {
          showCircle: true,
          centerText: null,
          animation: 'spin'
        };
      case 'recording':
        return {
          showCircle: true,
          centerText: null,
          animation: 'pulse'
        };
      case 'transcribing':
      case 'thinking':
        return {
          showCircle: true,
          centerText: null,
          animation: 'spin'
        };
      case 'responding':
        return {
          showCircle: false,
          centerText: streamingText || 'Responding...',
          animation: 'none'
        };
      case 'speaking':
        return {
          showCircle: true,
          centerText: null,
          animation: 'pulse'
        };
      default:
        return {
          showCircle: true,
          centerText: null,
          animation: 'spin'
        };
    }
  };

  const display = getStateDisplay();

  return (
    <>
      {/* Settings button - top left */}
      <button 
        className="absolute top-2 left-2 p-1.5 opacity-20 hover:opacity-30 transition-opacity z-10"
        aria-label="Settings"
        onClick={() => navigate('/settings')}
      >
        <SlidersHorizontal className="w-4 h-4 text-gray-700" />
      </button>

      {/* Graphs button - top right */}
      <button 
        className="absolute top-2 right-2 p-1.5 opacity-20 hover:opacity-30 transition-opacity z-10"
        aria-label="View graphs"
        onClick={() => navigate('/graphs')}
      >
        <BarChart3 className="w-4 h-4 text-gray-700" />
      </button>

      {/* Connection error overlay */}
      {!connected && !connecting && (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-20 rounded-2xl">
          <div className="bg-white rounded-lg p-4 max-w-[160px] text-center">
            <p className="text-xs text-gray-700 mb-3">Backend not running</p>
            <button
              onClick={handleRetryConnection}
              className="w-full py-1.5 px-3 text-xs bg-orange-400 text-white rounded hover:bg-orange-500 transition-colors"
            >
              Retry Connection
            </button>
            <p className="text-[10px] text-gray-500 mt-2">
              Start backend first:
              <br />
              python start_backend.py
            </p>
          </div>
        </div>
      )}

      {/* Center area - animation circle or streaming text */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center transition-opacity duration-300"
        style={{ top: '52px', opacity: circleOpacity }}
      >
        {display.showCircle ? (
          <div className="relative w-20 h-20">
            {/* Spinning or pulsing circle */}
            <div className={`absolute inset-0 rounded-full border-4 border-gray-300 border-t-orange-400 ${
              display.animation === 'spin' ? 'animate-spin' : 
              display.animation === 'pulse' ? 'animate-pulse border-t-red-400' : ''
            }`} />
            {/* Inner circle */}
            <div className="absolute inset-2 rounded-full bg-white/40" />
          </div>
        ) : (
          <div className="w-40 text-center">
            <p className="text-sm text-gray-700 font-medium leading-tight">
              {display.centerText}
            </p>
          </div>
        )}
      </div>

      {/* Bottom text area */}
      <div className="absolute bottom-3 left-0 right-0 px-4">
        {/* Status message */}
        <p className="text-[11px] text-gray-600 text-center mb-2 opacity-60">
          {statusMessage}
        </p>

        {/* Last user query */}
        {lastUserQuery && (
          <div className="mb-2">
            <p className="text-[10px] text-gray-500 mb-0.5">You:</p>
            <p className="text-xs text-gray-700 line-clamp-2">{lastUserQuery}</p>
          </div>
        )}

        {/* Last response (only show if not streaming) */}
        {lastResponse && !isStreaming && (
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Assistant:</p>
            <p className="text-xs text-gray-700 line-clamp-3">{lastResponse}</p>
          </div>
        )}

        {/* Start button (only show when idle and connected) */}
        {canStart && assistantState === 'idle' && connected && (
          <div className="flex justify-center mt-3">
            <button
              onClick={handleStartAssistant}
              disabled={isStarting}
              className="py-1.5 px-4 text-xs bg-orange-400 text-white rounded-full hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStarting ? 'Starting...' : 'Start Assistant'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
