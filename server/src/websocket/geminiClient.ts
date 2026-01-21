import WebSocket from 'ws';
import { config } from '../config';
import { getToolsForGemini } from '../tools/toolDefinitions';
import { executeToolCall } from '../mcp/toolExecutor';

export interface GeminiMessage {
  setup?: {
    model: string;
    generationConfig?: {
      responseModalities: string[];
    };
    systemInstruction?: { parts: { text: string }[] };
    system_instruction?: { parts: { text: string }[] };
    tools?: unknown[];
  };
  clientContent?: {
    turns?: Array<{
      role: string;
      parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
    }>;
    turnComplete?: boolean;
  };
  // Snake case variants for Gemini API
  client_content?: {
    turns?: Array<{
      role: string;
      parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
    }>;
    turn_complete?: boolean;
  };
  realtimeInput?: {
    mediaChunks: Array<{
      mimeType: string;
      data: string;
    }>;
  };
  realtime_input?: {
    media_chunks: Array<{
      mime_type: string;
      data: string;
    }>;
  };
  toolResponse?: {
    functionResponses: Array<{
      id: string;
      name: string;
      response: unknown;
    }>;
  };
  tool_response?: {
    function_responses: Array<{
      id: string;
      name: string;
      response: unknown;
    }>;
  };
}

export interface GeminiClientCallbacks {
  onSetupComplete: () => void;
  onTextResponse: (text: string, isPartial: boolean) => void;
  onAudioResponse: (audioData: string) => void;
  onToolCall: (toolCall: { id: string; name: string; args: unknown; result?: unknown }) => void;
  onError: (error: Error) => void;
  onClose: () => void;
}

export class GeminiClient {
  private ws: WebSocket | null = null;
  private callbacks: GeminiClientCallbacks;
  private systemInstruction: string;
  private isConnected = false;
  private isDisconnecting = false;
  private pendingToolCalls: Map<string, { name: string; args: unknown }> = new Map();

  constructor(systemInstruction: string, callbacks: GeminiClientCallbacks) {
    this.systemInstruction = systemInstruction;
    this.callbacks = callbacks;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${config.gemini.wsUrl}?key=${config.googleApiKey}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('Connected to Gemini Multimodal Live API');
        this.sendSetupMessage();
      });

      this.ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('Received from Gemini:', JSON.stringify(message).slice(0, 500));
          await this.handleGeminiMessage(message);

          // Resolve on setup complete
          if (message.setupComplete) {
            this.isConnected = true;
            this.callbacks.onSetupComplete();
            resolve();
          }
        } catch (error) {
          console.error('Error parsing Gemini message:', error);
        }
      });

      this.ws.on('error', (error: Error & { code?: string }) => {
        // Don't log or propagate errors during intentional disconnection
        if (!this.isDisconnecting) {
          console.error('Gemini WebSocket error:', error.message, error.code);
          this.callbacks.onError(error as Error);
          reject(error);
        }
      });

      this.ws.on('close', (code, reason) => {
        // Only log and callback if not intentionally disconnecting
        if (!this.isDisconnecting) {
          const reasonStr = reason?.toString() || 'none';
          console.log(`Gemini WebSocket closed - code: ${code}, reason: ${reasonStr}`);
          this.callbacks.onClose();

          // If closed before connection was established, reject the promise
          if (!this.isConnected) {
            reject(new Error(`WebSocket closed before setup complete: ${code} - ${reasonStr}`));
          }
        }
        this.isConnected = false;
      });

      // Timeout for connection
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('Connection timeout'));
        }
      }, 30000);
    });
  }

  private sendSetupMessage(): void {
    const tools = getToolsForGemini();
    const setupMessage: any = {
      setup: {
        model: config.gemini.model,
        system_instruction: {
          parts: [{ text: this.systemInstruction }],
        },
        tools: [tools],
      },
    };

    console.log('Setup message model:', config.gemini.model);
    console.log('Tools registered:', tools.functionDeclarations?.map((f: { name: string }) => f.name).join(', '));
    this.send(setupMessage);
  }

  private async handleGeminiMessage(message: unknown): Promise<void> {
    const msg = message as Record<string, unknown>;

    // Handle setup complete
    if (msg.setupComplete) {
      console.log('Gemini setup complete');
      return;
    }

    // Handle server content (responses)
    if (msg.serverContent) {
      const content = msg.serverContent as Record<string, unknown>;

      // Handle model turn
      if (content.modelTurn) {
        const turn = content.modelTurn as { parts?: Array<Record<string, unknown>> };
        if (turn.parts) {
          for (const part of turn.parts) {
            // Text response
            if (part.text) {
              this.callbacks.onTextResponse(part.text as string, !content.turnComplete);
            }

            // Audio response
            if (part.inlineData) {
              const inlineData = part.inlineData as { mimeType: string; data: string };
              if (inlineData.mimeType.startsWith('audio/')) {
                this.callbacks.onAudioResponse(inlineData.data);
              }
            }
          }
        }
      }

      // Handle turn complete
      if (content.turnComplete) {
        console.log('Turn complete');
      }
    }

    // Handle tool calls
    if (msg.toolCall) {
      const toolCall = msg.toolCall as {
        functionCalls?: Array<{ id: string; name: string; args: unknown }>;
      };

      if (toolCall.functionCalls) {
        for (const fc of toolCall.functionCalls) {
          console.log(`Tool call: ${fc.name}`, fc.args);

          // Execute the tool and send response
          try {
            const result = await executeToolCall(fc.name, fc.args);
            this.sendToolResponse(fc.id, fc.name, result);
            // Notify after execution with result included
            this.callbacks.onToolCall({ ...fc, result });
          } catch (error) {
            console.error(`Tool execution error for ${fc.name}:`, error);
            this.sendToolResponse(fc.id, fc.name, {
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            // Notify even on error
            this.callbacks.onToolCall({ ...fc, result: null });
          }
        }
      }
    }
  }

  sendAudio(audioData: string): void {
    if (!this.isConnected || !this.ws) return;

    const message: GeminiMessage = {
      realtime_input: {
        media_chunks: [
          {
            mime_type: 'audio/pcm;rate=16000',
            data: audioData,
          },
        ],
      },
    };

    this.send(message);
  }

  sendText(text: string): void {
    if (!this.isConnected || !this.ws) return;

    const message: GeminiMessage = {
      client_content: {
        turns: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        turn_complete: true,
      },
    };

    this.send(message);
  }

  sendToolResponse(id: string, name: string, response: unknown): void {
    if (!this.ws) return;

    const message: GeminiMessage = {
      tool_response: {
        function_responses: [
          {
            id,
            name,
            response,
          },
        ],
      },
    };

    this.send(message);
  }

  /**
   * Send an interrupt signal to Gemini to stop the current model response.
   * Per Gemini Multimodal Live API, we send a client_content message with
   * turn_complete: true to signal the user is taking over.
   */
  sendInterrupt(): void {
    if (!this.isConnected || !this.ws) return;

    console.log('Sending interrupt to Gemini');

    // Send a client turn with turn_complete to signal interruption
    // Using a minimal valid message structure
    const message: GeminiMessage = {
      client_content: {
        turn_complete: true,
      },
    };

    this.send(message);
  }

  private send(message: GeminiMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect(): void {
    this.isDisconnecting = true;
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;

      // Remove all listeners first to prevent stale callbacks
      ws.removeAllListeners();

      // Add a no-op error handler to prevent unhandled error events
      ws.on('error', () => {});

      // Only close if the WebSocket is open or connecting
      const readyState = ws.readyState;
      try {
        if (readyState === WebSocket.OPEN) {
          ws.close();
        } else if (readyState === WebSocket.CONNECTING) {
          // If still connecting, terminate immediately instead of close()
          ws.terminate();
        }
      } catch {
        // Ignore errors during disconnect - connection may already be closed
      }
    }
    this.isConnected = false;
  }

  get connected(): boolean {
    return this.isConnected;
  }
}

export default GeminiClient;
