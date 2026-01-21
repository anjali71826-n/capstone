import { WebSocket } from 'ws';
import { GeminiClient } from './geminiClient';
import { GeminiTextClient } from './geminiTextClient';
import { getSystemInstruction } from '../rag/wikivoyage';

interface ClientMessage {
  type: 'audio' | 'text' | 'control';
  data?: string;
  action?: 'start' | 'stop' | 'reset' | 'interrupt';
}

interface ServerMessage {
  type: 'status' | 'transcript' | 'audio' | 'itinerary' | 'tool_call' | 'error' | 'sources';
  data?: unknown;
  text?: string;
  isPartial?: boolean;
}

export async function handleClientConnection(
  clientWs: WebSocket,
  clientId: string
): Promise<void> {
  let geminiClient: GeminiClient | null = null;
  let geminiTextClient: GeminiTextClient | null = null;
  let isSessionActive = false;
  let isClientConnected = true;
  let isInitializing = false;
  let useTextFallback = false;

  // Send message to client
  const sendToClient = (message: ServerMessage): void => {
    if (isClientConnected && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify(message));
    }
  };

  // Initialize Gemini connection
  const initializeGemini = async (): Promise<void> => {
    // Don't initialize if client already disconnected or already initializing
    if (!isClientConnected || isInitializing) return;

    isInitializing = true;

    try {
      sendToClient({ type: 'status', data: { status: 'connecting', message: 'Connecting to AI...' } });

      const systemInstruction = await getSystemInstruction();

      // Check again after async operation
      if (!isClientConnected) return;

      geminiClient = new GeminiClient(systemInstruction, {
        onSetupComplete: () => {
          isSessionActive = true;
          sendToClient({ type: 'status', data: { status: 'ready', message: 'AI assistant ready' } });
        },

        onTextResponse: (text, isPartial) => {
          sendToClient({ type: 'transcript', text, isPartial, data: { role: 'assistant' } });
        },

        onAudioResponse: (audioData) => {
          sendToClient({ type: 'audio', data: audioData });
        },

        onToolCall: (toolCall) => {
          console.log(`Tool called: ${toolCall.name}`, toolCall.result ? 'with result' : 'no result');
          sendToClient({
            type: 'tool_call',
            data: {
              name: toolCall.name,
              args: toolCall.args,
            },
          });

          // If it's an itinerary update, send the actual itinerary from the result
          if (toolCall.name === 'update_itinerary') {
            console.log('update_itinerary result:', JSON.stringify(toolCall.result).slice(0, 500));
            if (toolCall.result) {
              const result = toolCall.result as { itinerary?: unknown; success?: boolean };
              if (result.itinerary) {
                const itinerary = result.itinerary as { destination?: string; days?: unknown[] };
                console.log(`Sending itinerary to client: ${itinerary.destination}, ${itinerary.days?.length || 0} days`);
                sendToClient({
                  type: 'itinerary',
                  data: { full_itinerary: result.itinerary },
                });
              } else {
                console.log('No itinerary in result');
              }
            }
          }

          // If it's a data-fetching tool, send sources
          if (toolCall.name === 'poi_search' || toolCall.name === 'get_city_info' || toolCall.name === 'search_destination_info') {
            sendToClient({
              type: 'sources',
              data: {
                tool: toolCall.name,
                timestamp: new Date().toISOString(),
              },
            });
          }
        },

        onError: (error) => {
          console.error(`Gemini error for ${clientId}:`, error);
          sendToClient({
            type: 'error',
            data: { message: error.message },
          });
        },

        onClose: () => {
          isSessionActive = false;
          sendToClient({
            type: 'status',
            data: { status: 'disconnected', message: 'AI connection closed' },
          });
        },
      });

      await geminiClient.connect();
      isInitializing = false;
    } catch (error) {
      isInitializing = false;
      // Only log and notify if client is still connected (not a normal disconnection)
      if (isClientConnected) {
        console.error('Failed to initialize Gemini Live API, falling back to text API:', error);

        // Fall back to text-based API
        try {
          useTextFallback = true;
          const systemInstruction = await getSystemInstruction();

          geminiTextClient = new GeminiTextClient(systemInstruction, {
            onTextResponse: (text) => {
              sendToClient({ type: 'transcript', text, isPartial: false, data: { role: 'assistant' } });
            },

            onToolCall: (toolCall) => {
              console.log(`Tool called (text fallback): ${toolCall.name}`, toolCall.result ? 'with result' : 'no result');
              sendToClient({
                type: 'tool_call',
                data: {
                  name: toolCall.name,
                  args: toolCall.args,
                },
              });

              // If it's an itinerary update, send the actual itinerary from the result
              if (toolCall.name === 'update_itinerary') {
                console.log('update_itinerary result (text fallback):', JSON.stringify(toolCall.result).slice(0, 500));
                if (toolCall.result) {
                  const result = toolCall.result as { itinerary?: unknown; success?: boolean };
                  if (result.itinerary) {
                    const itinerary = result.itinerary as { destination?: string; days?: unknown[] };
                    console.log(`Sending itinerary to client (text fallback): ${itinerary.destination}, ${itinerary.days?.length || 0} days`);
                    sendToClient({
                      type: 'itinerary',
                      data: { full_itinerary: result.itinerary },
                    });
                  } else {
                    console.log('No itinerary in result (text fallback)');
                  }
                }
              }

              if (toolCall.name === 'poi_search' || toolCall.name === 'get_city_info' || toolCall.name === 'search_destination_info') {
                sendToClient({
                  type: 'sources',
                  data: {
                    tool: toolCall.name,
                    timestamp: new Date().toISOString(),
                  },
                });
              }
            },

            onError: (err) => {
              console.error('Text API error:', err);
              sendToClient({
                type: 'error',
                data: { message: err.message },
              });
            },
          });

          isSessionActive = true;
          sendToClient({ type: 'status', data: { status: 'ready', message: 'AI assistant ready (text mode)' } });
          console.log('Switched to text fallback API');
        } catch (fallbackError) {
          console.error('Failed to initialize text fallback:', fallbackError);
          sendToClient({
            type: 'error',
            data: {
              message: 'Failed to connect to AI service',
              details: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
            },
          });
        }
      }
    }
  };

  // Handle messages from client
  clientWs.on('message', async (data: Buffer) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'control':
          if (message.action === 'start') {
            if (!geminiClient && !isSessionActive && !isInitializing) {
              await initializeGemini();
            }
          } else if (message.action === 'stop') {
            if (geminiClient) {
              geminiClient.disconnect();
              geminiClient = null;
              isSessionActive = false;
            }
          } else if (message.action === 'reset') {
            if (geminiClient) {
              geminiClient.disconnect();
              geminiClient = null;
            }
            isSessionActive = false;
            isInitializing = false;
            await initializeGemini();
          } else if (message.action === 'interrupt') {
            // Handle user interruption - signal Gemini to stop current response
            console.log(`User interrupted agent for ${clientId}`);
            if (geminiClient && isSessionActive) {
              geminiClient.sendInterrupt();
            }
            // For text fallback, there's no streaming to interrupt
            // The next user message will simply start a new turn
          }
          break;

        case 'audio':
          if (geminiClient && isSessionActive && message.data) {
            geminiClient.sendAudio(message.data);
          }
          break;

        case 'text':
          if (isSessionActive && message.data) {
            // Log user text for transcript
            sendToClient({
              type: 'transcript',
              text: message.data,
              isPartial: false,
              data: { role: 'user' },
            });

            // Use text fallback or live client
            if (useTextFallback && geminiTextClient) {
              await geminiTextClient.sendText(message.data);
            } else if (geminiClient) {
              geminiClient.sendText(message.data);
            }
          }
          break;

        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling client message:', error);
      sendToClient({
        type: 'error',
        data: { message: 'Invalid message format' },
      });
    }
  });

  // Clean up on disconnect
  clientWs.on('close', () => {
    isClientConnected = false;
    if (geminiClient) {
      geminiClient.disconnect();
      geminiClient = null;
    }
    isSessionActive = false;
  });

  // Initialize connection automatically
  await initializeGemini();
}

export default handleClientConnection;
