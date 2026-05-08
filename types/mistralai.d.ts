declare module '@mistralai/mistralai' {
  export class Mistral {
    constructor(config: { apiKey: string; timeoutMs?: number });
    chat: {
      complete(params: {
        model: string;
        messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
        temperature?: number;
        maxTokens?: number;
        responseFormat?: { type: 'json_object' | 'text' };
      }): Promise<{
        choices: Array<{ message: { content: string } }>;
        usage: { promptTokens: number; completionTokens: number; totalTokens: number };
        model: string;
      }>;
      stream(params: {
        model: string;
        messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
        temperature?: number;
        maxTokens?: number;
      }): AsyncIterable<{
        data: {
          choices: Array<{ delta: { content?: string } }>;
        };
      }>;
    };
  }
}
