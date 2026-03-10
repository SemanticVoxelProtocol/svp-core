/**
 * AI API Adapter Configuration
 * 支持OpenAI API规范，可配置其他provider
 */

import { promises as fs } from 'fs';
import * as path from 'path';

export interface AIProviderConfig {
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
}

export interface AICompilerConfig {
  defaultProvider: string;
  providers: Record<string, AIProviderConfig>;
  compilation: {
    l5ToL4: { provider?: string; model?: string };
    l4ToL3: { provider?: string; model?: string };
    l3ToL2: { provider?: string; model?: string };
    l2ToL1: { provider?: string; model?: string };
  };
}

export const DEFAULT_AI_CONFIG: AICompilerConfig = {
  defaultProvider: 'openai',
  providers: {
    openai: {
      name: 'OpenAI',
      baseURL: 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      temperature: 0.2,
      maxTokens: 4000,
      timeout: 60000,
    },
    anthropic: {
      name: 'Anthropic',
      baseURL: 'https://api.anthropic.com/v1',
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229',
      temperature: 0.2,
      maxTokens: 4000,
      timeout: 60000,
    },
    local: {
      name: 'Local (Ollama)',
      baseURL: process.env.LOCAL_AI_URL || 'http://localhost:11434/v1',
      apiKey: 'ollama',
      model: process.env.LOCAL_MODEL || 'codellama',
      temperature: 0.2,
      maxTokens: 4000,
      timeout: 120000,
    },
  },
  compilation: {
    l5ToL4: { provider: 'openai' },
    l4ToL3: { provider: 'openai' },
    l3ToL2: { provider: 'openai' },
    l2ToL1: { provider: 'openai' },
  },
};

export async function loadAIConfig(projectPath: string): Promise<AICompilerConfig> {
  const envPath = path.join(projectPath, '.env');
  const localEnvPath = path.join(projectPath, '.env.local');
  
  await loadEnvFile(envPath);
  await loadEnvFile(localEnvPath);
  
  const config: AICompilerConfig = {
    defaultProvider: process.env.SVP_AI_PROVIDER || DEFAULT_AI_CONFIG.defaultProvider,
    providers: {
      openai: {
        ...DEFAULT_AI_CONFIG.providers.openai,
        apiKey: process.env.OPENAI_API_KEY || DEFAULT_AI_CONFIG.providers.openai.apiKey,
        model: process.env.OPENAI_MODEL || DEFAULT_AI_CONFIG.providers.openai.model,
        baseURL: process.env.OPENAI_BASE_URL || DEFAULT_AI_CONFIG.providers.openai.baseURL,
      },
      anthropic: {
        ...DEFAULT_AI_CONFIG.providers.anthropic,
        apiKey: process.env.ANTHROPIC_API_KEY || DEFAULT_AI_CONFIG.providers.anthropic.apiKey,
        model: process.env.ANTHROPIC_MODEL || DEFAULT_AI_CONFIG.providers.anthropic.model,
      },
      local: {
        ...DEFAULT_AI_CONFIG.providers.local,
        baseURL: process.env.LOCAL_AI_URL || DEFAULT_AI_CONFIG.providers.local.baseURL,
        model: process.env.LOCAL_MODEL || DEFAULT_AI_CONFIG.providers.local.model,
      },
    },
    compilation: {
      l5ToL4: { 
        provider: process.env.SVP_L5_PROVIDER || DEFAULT_AI_CONFIG.compilation.l5ToL4.provider,
        model: process.env.SVP_L5_MODEL,
      },
      l4ToL3: { 
        provider: process.env.SVP_L4_PROVIDER || DEFAULT_AI_CONFIG.compilation.l4ToL3.provider,
        model: process.env.SVP_L4_MODEL,
      },
      l3ToL2: { 
        provider: process.env.SVP_L3_PROVIDER || DEFAULT_AI_CONFIG.compilation.l3ToL2.provider,
        model: process.env.SVP_L3_MODEL,
      },
      l2ToL1: { 
        provider: process.env.SVP_L2_PROVIDER || DEFAULT_AI_CONFIG.compilation.l2ToL1.provider,
        model: process.env.SVP_L2_MODEL,
      },
    },
  };
  
  return config;
}

async function loadEnvFile(envPath: string): Promise<void> {
  try {
    const content = await fs.readFile(envPath, 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim();
      
      if (key && value) {
        const cleanValue = value.replace(/^["']|["']$/g, '');
        process.env[key] = cleanValue;
      }
    }
  } catch {
    // 文件不存在，忽略
  }
}

export function validateAIConfig(config: AICompilerConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const provider = config.providers[config.defaultProvider];
  if (!provider) {
    errors.push(`Default provider "${config.defaultProvider}" not found`);
  } else if (!provider.apiKey) {
    errors.push(`API key not configured for provider "${config.defaultProvider}"`);
  }
  
  return { valid: errors.length === 0, errors };
}
