/**
 * AI API Client
 * 基于OpenAI API规范，支持其他兼容provider
 */

import { AIProviderConfig } from './config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class AIClient {
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  /**
   * 发送chat completion请求
   */
  async chatCompletion(
    messages: ChatMessage[],
    options?: Partial<ChatCompletionRequest>
  ): Promise<ChatCompletionResponse> {
    const requestBody: ChatCompletionRequest = {
      model: options?.model || this.config.model,
      messages,
      temperature: options?.temperature ?? this.config.temperature,
      max_tokens: options?.max_tokens ?? this.config.maxTokens,
      stream: false,
      ...options,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    // 简化请求体，只保留必要参数
    const simplifiedBody = {
      model: requestBody.model,
      messages: requestBody.messages,
      temperature: requestBody.temperature,
      max_tokens: requestBody.max_tokens,
    };

    try {
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify(simplifiedBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }

      const data = await response.json() as ChatCompletionResponse;
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * 简单的单轮对话
   */
  async complete(systemPrompt: string, userPrompt: string, model?: string): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await this.chatCompletion(messages, { model });
    
    if (response.choices.length === 0) {
      throw new Error('Empty response from AI');
    }

    return response.choices[0].message.content;
  }

  /**
   * 流式响应（用于长文本生成）
   */
  async *streamCompletion(
    messages: ChatMessage[],
    options?: Partial<ChatCompletionRequest>
  ): AsyncGenerator<string> {
    const requestBody: ChatCompletionRequest = {
      model: options?.model || this.config.model,
      messages,
      temperature: options?.temperature ?? this.config.temperature,
      max_tokens: options?.max_tokens ?? this.config.maxTokens,
      stream: true,
      ...options,
    };

    const response = await fetch(`${this.config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
