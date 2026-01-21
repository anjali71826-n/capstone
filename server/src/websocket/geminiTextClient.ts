import { config } from '../config';
import { getToolsForGemini } from '../tools/toolDefinitions';
import { executeToolCall } from '../mcp/toolExecutor';

interface GeminiTextClientCallbacks {
  onTextResponse: (text: string) => void;
  onToolCall: (toolCall: { id: string; name: string; args: unknown; result?: unknown }) => void;
  onError: (error: Error) => void;
}

interface ContentPart {
  text?: string;
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
}

interface GenerateContentResponse {
  candidates?: Array<{
    content: {
      parts: ContentPart[];
    };
  }>;
  error?: {
    message: string;
  };
}

export class GeminiTextClient {
  private callbacks: GeminiTextClientCallbacks;
  private systemInstruction: string;
  private conversationHistory: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  constructor(systemInstruction: string, callbacks: GeminiTextClientCallbacks) {
    this.systemInstruction = systemInstruction;
    this.callbacks = callbacks;
  }

  async sendText(userText: string): Promise<void> {
    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      parts: [{ text: userText }],
    });

    try {
      const response = await this.callGeminiAPI();

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.candidates && response.candidates[0]) {
        const parts = response.candidates[0].content.parts;

        for (const part of parts) {
          if (part.text) {
            // Add assistant response to history
            this.conversationHistory.push({
              role: 'model',
              parts: [{ text: part.text }],
            });
            this.callbacks.onTextResponse(part.text);
          }

          if (part.functionCall) {
            const toolCall = {
              id: `call_${Date.now()}`,
              name: part.functionCall.name,
              args: part.functionCall.args,
            };

            // Execute the tool and continue conversation
            try {
              const result = await executeToolCall(toolCall.name, toolCall.args);
              // Notify after execution with result included
              this.callbacks.onToolCall({ ...toolCall, result });
              await this.sendToolResponse(toolCall.name, result);
            } catch (toolError) {
              console.error(`Tool execution error for ${toolCall.name}:`, toolError);
              // Notify even on error
              this.callbacks.onToolCall({ ...toolCall, result: null });
              await this.sendToolResponse(toolCall.name, {
                error: toolError instanceof Error ? toolError.message : 'Unknown error',
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Gemini API error:', error);
      this.callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  private async sendToolResponse(functionName: string, result: unknown): Promise<void> {
    // Add function response to history
    this.conversationHistory.push({
      role: 'function',
      parts: [{ text: JSON.stringify({ name: functionName, response: result }) }],
    });

    // Continue the conversation to get the model's response
    try {
      const response = await this.callGeminiAPI();

      if (response.candidates && response.candidates[0]) {
        const parts = response.candidates[0].content.parts;

        for (const part of parts) {
          if (part.text) {
            this.conversationHistory.push({
              role: 'model',
              parts: [{ text: part.text }],
            });
            this.callbacks.onTextResponse(part.text);
          }
        }
      }
    } catch (error) {
      console.error('Error getting response after tool call:', error);
    }
  }

  private async callGeminiAPI(): Promise<GenerateContentResponse> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.googleApiKey}`;

    const tools = getToolsForGemini();

    const requestBody = {
      contents: this.conversationHistory,
      systemInstruction: {
        parts: [{ text: this.systemInstruction }],
      },
      tools: [tools],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  reset(): void {
    this.conversationHistory = [];
  }
}

export default GeminiTextClient;
