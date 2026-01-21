import { useRef, useCallback, useEffect } from 'react';
import { useAppStore } from './useItinerary';
import { AudioPlayer } from './useAudioRecorder';
import type { Itinerary } from '../types/itinerary';

interface ServerMessage {
  type: 'status' | 'transcript' | 'audio' | 'itinerary' | 'tool_call' | 'error' | 'sources';
  data?: unknown;
  text?: string;
  isPartial?: boolean;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

// Helper to convert tool name to user-friendly text
function getToolDisplayText(toolName: string, args?: Record<string, unknown>): string {
  const destination = args?.destination as string;
  const destText = destination ? ` for ${destination}` : '';
  
  switch (toolName) {
    case 'poi_search':
      const category = args?.category as string;
      return category 
        ? `Searching for ${category}s${destText}...`
        : `Searching for places${destText}...`;
    case 'update_itinerary':
      const action = args?.action as string;
      if (action === 'set') return 'Building your itinerary...';
      if (action === 'add_activity') return 'Adding activity to itinerary...';
      if (action === 'remove_activity') return 'Removing activity from itinerary...';
      return 'Updating your itinerary...';
    case 'get_city_info':
      const topic = args?.topic as string;
      return topic 
        ? `Getting ${topic} info${destText}...`
        : `Getting city information${destText}...`;
    case 'get_weather':
      return `Checking weather${destText}...`;
    case 'calculate_travel_time':
      const from = args?.from_poi as string;
      const to = args?.to_poi as string;
      return from && to 
        ? `Calculating travel time from ${from} to ${to}...`
        : 'Calculating travel time...';
    case 'search_destination_info':
      return `Researching${destText}...`;
    default:
      return `Processing${destText}...`;
  }
}

// Browser TTS helper
function speakText(text: string) {
  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to use a nice voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.lang.startsWith('en') && v.name.includes('Female')
    ) || voices.find((v) => v.lang.startsWith('en'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  }
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const {
    setConnectionStatus,
    setIsSpeaking,
    setToolStatus,
    setItinerary,
    addTranscriptMessage,
    updateLastMessage,
    addSource,
    setError,
  } = useAppStore();

  // Initialize audio player
  useEffect(() => {
    audioPlayerRef.current = new AudioPlayer();
    return () => {
      audioPlayerRef.current?.stop();
    };
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: ServerMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'status': {
          const statusData = message.data as { status: string; message: string };
          if (statusData.status === 'ready') {
            setConnectionStatus('ready');
            setError(null);
          } else if (statusData.status === 'connecting') {
            setConnectionStatus('connecting');
          } else if (statusData.status === 'disconnected') {
            setConnectionStatus('disconnected');
          }
          break;
        }

        case 'transcript': {
          const data = message.data as { role: 'user' | 'assistant' };
          if (message.text) {
            if (message.isPartial && data.role === 'assistant') {
              // Clear tool status when assistant starts responding
              setToolStatus(null);
              
              // Update last partial message or create new one
              const { transcript } = useAppStore.getState();
              const last = transcript[transcript.length - 1];
              if (last?.role === 'assistant' && last.isPartial) {
                updateLastMessage(message.text);
              } else {
                addTranscriptMessage({
                  role: 'assistant',
                  text: message.text,
                  isPartial: true,
                });
              }
            } else {
              // Clear tool status on complete response
              setToolStatus(null);
              
              addTranscriptMessage({
                role: data.role,
                text: message.text,
                isPartial: false,
              });
              // Use browser TTS for complete assistant messages (fallback)
              // But not if user is currently recording
              const { isListening: isUserRecording } = useAppStore.getState();
              if (data.role === 'assistant' && message.text && !isUserRecording) {
                setIsSpeaking(true);
                speakText(message.text);
                setTimeout(() => setIsSpeaking(false), 3000);
              }
            }
          }
          break;
        }

        case 'audio': {
          if (message.data && typeof message.data === 'string') {
            setIsSpeaking(true);
            audioPlayerRef.current?.playAudio(message.data);
            // Reset speaking state after audio plays
            setTimeout(() => setIsSpeaking(false), 500);
          }
          break;
        }

        case 'itinerary': {
          const itineraryData = message.data as {
            action?: string;
            full_itinerary?: Itinerary;
            itinerary?: Itinerary;
          };

          if (itineraryData.full_itinerary) {
            setItinerary(itineraryData.full_itinerary);
          } else if (itineraryData.itinerary) {
            setItinerary(itineraryData.itinerary);
          }
          break;
        }

        case 'tool_call': {
          const toolData = message.data as { name: string; args: Record<string, unknown> };
          console.log('Tool called:', toolData.name, toolData.args);
          
          // Set tool status for UI display
          setToolStatus({
            name: toolData.name,
            displayText: getToolDisplayText(toolData.name, toolData.args),
            timestamp: Date.now(),
          });
          
          // Clear tool status after 5 seconds (in case no completion message)
          setTimeout(() => {
            const { toolStatus } = useAppStore.getState();
            if (toolStatus?.name === toolData.name) {
              setToolStatus(null);
            }
          }, 5000);
          break;
        }

        case 'sources': {
          const sourceData = message.data as { tool: string; timestamp: string };
          // Add a generic source entry for tool calls
          let sourceType: 'osm' | 'wikivoyage' | 'google' = 'wikivoyage';
          let sourceTitle = 'Wikivoyage';
          let sourceUrl = 'https://en.wikivoyage.org/';

          if (sourceData.tool === 'poi_search') {
            sourceType = 'osm';
            sourceTitle = 'OpenStreetMap';
            sourceUrl = 'https://www.openstreetmap.org/';
          } else if (sourceData.tool === 'search_destination_info') {
            sourceType = 'google';
            sourceTitle = 'Web Search (Wikipedia/Wikivoyage)';
            sourceUrl = 'https://en.wikipedia.org/';
          }

          addSource({
            id: `source_${Date.now()}`,
            type: sourceType,
            title: sourceTitle,
            url: sourceUrl,
          });
          break;
        }

        case 'error': {
          const errorData = message.data as { message: string };
          setError(errorData.message);
          break;
        }
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }, [
    setConnectionStatus,
    setIsSpeaking,
    setToolStatus,
    setItinerary,
    addTranscriptMessage,
    updateLastMessage,
    addSource,
    setError,
  ]);

  const isDisconnectingRef = useRef(false);
  const isMountedRef = useRef(false);

  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    isDisconnectingRef.current = false;
    isMountedRef.current = true;
    setConnectionStatus('connecting');

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      // Check if we disconnected while connecting
      if (isDisconnectingRef.current || !isMountedRef.current) {
        ws.close();
        return;
      }
      console.log('WebSocket connected');
      // Send start control message
      ws.send(JSON.stringify({ type: 'control', action: 'start' }));
    };

    ws.onmessage = handleMessage;

    ws.onerror = (error) => {
      // Ignore errors if we're intentionally disconnecting or unmounted
      if (isDisconnectingRef.current || !isMountedRef.current) return;
      console.error('WebSocket error:', error);
      setError('Connection error');
      setConnectionStatus('error');
    };

    ws.onclose = () => {
      // Ignore close events if we're intentionally disconnecting or unmounted
      if (isDisconnectingRef.current || !isMountedRef.current) return;
      
      console.log('WebSocket closed');
      setConnectionStatus('disconnected');

      // Attempt reconnection after 3 seconds
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = window.setTimeout(() => {
        if (!isDisconnectingRef.current && isMountedRef.current) {
          connect();
        }
      }, 3000);
    };
  }, [handleMessage, setConnectionStatus, setError]);

  const disconnect = useCallback(() => {
    isDisconnectingRef.current = true;
    isMountedRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      // Remove event handlers to prevent spurious callbacks
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;

      // Only close if open or connecting
      if (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    setConnectionStatus('disconnected');
  }, [setConnectionStatus]);

  const sendAudio = useCallback((base64Data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'audio',
          data: base64Data,
        })
      );
    }
  }, []);

  const sendText = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'text',
          data: text,
        })
      );
    }
  }, []);

  // Send text with interrupt - stops current speech and sends new message immediately
  const sendTextWithInterrupt = useCallback((text: string) => {
    // Stop local speech output
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    audioPlayerRef.current?.stop();
    setIsSpeaking(false);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Send interrupt signal to stop server-side response
      wsRef.current.send(
        JSON.stringify({
          type: 'control',
          action: 'interrupt',
        })
      );

      // Immediately send the new text message
      wsRef.current.send(
        JSON.stringify({
          type: 'text',
          data: text,
        })
      );
    }
  }, [setIsSpeaking]);

  // Stop all speech output (browser TTS and audio player)
  const stopSpeech = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    audioPlayerRef.current?.stop();
    setIsSpeaking(false);
  }, [setIsSpeaking]);

  // Send interrupt signal to server to stop current response
  const sendInterrupt = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'control',
          action: 'interrupt',
        })
      );
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendAudio,
    sendText,
    sendTextWithInterrupt,
    stopSpeech,
    sendInterrupt,
  };
}

export default useWebSocket;
