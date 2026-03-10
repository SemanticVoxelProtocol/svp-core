/**
 * AI Compiler Agent
 * 整合Prompt模板、AI Client、解析和验证
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { loadAIConfig, AICompilerConfig } from './config';
import { AIClient } from './client';
import * as prompts from './prompts';

export interface AICompileOptions {
  level: 5 | 4 | 3 | 2;
  target?: string;
}

export interface AICompileResult {
  success: boolean;
  output?: string;
  outputPath?: string;
  error?: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export class AICompilerAgent {
  private config: AICompilerConfig;
  private projectPath: string;

  constructor(config: AICompilerConfig, projectPath: string) {
    this.config = config;
    this.projectPath = projectPath;
  }

  /**
   * 创建Agent实例（异步加载配置）
   */
  static async create(projectPath: string): Promise<AICompilerAgent> {
    const config = await loadAIConfig(projectPath);
    return new AICompilerAgent(config, projectPath);
  }

  /**
   * 执行编译
   */
  async compile(options: AICompileOptions): Promise<AICompileResult> {
    switch (options.level) {
      case 5:
        return this.compileL5ToL4();
      case 4:
        return this.compileL4ToL3();
      case 3:
        return this.compileL3ToL2();
      case 2:
        return this.compileL2ToL1();
      default:
        return { success: false, error: `Unsupported level: ${options.level}` };
    }
  }

  /**
   * L5 → L4: 意图到架构
   */
  private async compileL5ToL4(): Promise<AICompileResult> {
    try {
      // 1. 读取L5
      const l5Path = path.join(this.projectPath, 'blueprint.svp.yaml');
      const l5Content = await fs.readFile(l5Path, 'utf-8');

      // 2. 获取AI配置
      const compileConfig = this.config.compilation.l5ToL4;
      const providerName = compileConfig.provider || this.config.defaultProvider;
      const provider = this.config.providers[providerName];

      if (!provider.apiKey) {
        return {
          success: false,
          error: `API key not configured for provider "${providerName}". Please set OPENAI_API_KEY in .env`,
        };
      }

      // 3. 构建Prompt
      const systemPrompt = prompts.L5_TO_L4_SYSTEM_PROMPT;
      const userPrompt = prompts.buildL5ToL4UserPrompt(l5Content);

      // 4. 调用AI（使用层级特定模型）
      const client = new AIClient(provider);
      const model = compileConfig.model || provider.model;
      const response = await client.complete(systemPrompt, userPrompt, model);

      // 5. 提取YAML
      const yamlContent = this.extractYaml(response);

      // 6. 验证YAML
      try {
        const parsed = YAML.parse(yamlContent);
        if (parsed.level !== 4) {
          return { success: false, error: 'AI output is not valid L4 (level != 4)' };
        }
      } catch (e) {
        return { success: false, error: `Invalid YAML output: ${e}` };
      }

      // 7. 保存
      const l4Dir = path.join(this.projectPath, '.svp', 'l4');
      await fs.mkdir(l4Dir, { recursive: true });
      const l4Path = path.join(l4Dir, 'flows.yaml');
      await fs.writeFile(l4Path, yamlContent, 'utf-8');

      return {
        success: true,
        output: yamlContent,
        outputPath: l4Path,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * L4 → L3: 架构到逻辑
   */
  private async compileL4ToL3(): Promise<AICompileResult> {
    try {
      // 1. 读取L4
      const l4Path = path.join(this.projectPath, '.svp', 'l4', 'flows.yaml');
      const l4Content = await fs.readFile(l4Path, 'utf-8');

      // 2. 获取AI配置
      const compileConfig = this.config.compilation.l4ToL3;
      const providerName = compileConfig.provider || this.config.defaultProvider;
      const provider = this.config.providers[providerName];

      if (!provider.apiKey) {
        return {
          success: false,
          error: `API key not configured for provider "${providerName}"`,
        };
      }

      // 3. 构建Prompt
      const systemPrompt = prompts.L4_TO_L3_SYSTEM_PROMPT;
      const userPrompt = prompts.buildL4ToL3UserPrompt(l4Content);

      // 4. 调用AI（使用层级特定模型）
      const client = new AIClient(provider);
      const model = compileConfig.model || provider.model;
      const response = await client.complete(systemPrompt, userPrompt, model);

      // 5. 提取YAML
      const yamlContent = this.extractYaml(response);

      // 6. 验证
      try {
        const parsed = YAML.parse(yamlContent);
        if (parsed.level !== 3) {
          return { success: false, error: 'AI output is not valid L3 (level != 3)' };
        }
      } catch (e) {
        return { success: false, error: `Invalid YAML output: ${e}` };
      }

      // 7. 保存
      const l3Dir = path.join(this.projectPath, '.svp', 'l3');
      await fs.mkdir(l3Dir, { recursive: true });
      const l3Path = path.join(l3Dir, 'domain.yaml');
      await fs.writeFile(l3Path, yamlContent, 'utf-8');

      return {
        success: true,
        output: yamlContent,
        outputPath: l3Path,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * L3 → L2: 逻辑到代码骨架
   */
  private async compileL3ToL2(): Promise<AICompileResult> {
    try {
      // 1. 读取L3
      const l3Path = path.join(this.projectPath, '.svp', 'l3', 'domain.yaml');
      const l3Content = await fs.readFile(l3Path, 'utf-8');
      const l3 = YAML.parse(l3Content);

      // 2. 获取AI配置
      const compileConfig = this.config.compilation.l3ToL2;
      const providerName = compileConfig.provider || this.config.defaultProvider;
      const provider = this.config.providers[providerName];

      if (!provider.apiKey) {
        return {
          success: false,
          error: `API key not configured for provider "${providerName}"`,
        };
      }

      // 3. 为每个block生成L2
      const l2Dir = path.join(this.projectPath, '.svp', 'gen', 'blocks');
      await fs.mkdir(l2Dir, { recursive: true });

      const client = new AIClient(provider);
      const systemPrompt = prompts.L3_TO_L2_SYSTEM_PROMPT;
      const model = compileConfig.model || provider.model;
      const blocks = l3.blocks || [];
      const total = blocks.length;
      
      console.log(`  生成 ${total} 个代码骨架...`);

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const userPrompt = prompts.buildL3ToL2UserPrompt(l3Content, block.id);
        
        console.log(`  [${i+1}/${total}] 生成骨架: ${block.id}...`);
        const response = await client.complete(systemPrompt, userPrompt, model);
        
        const code = this.extractCode(response, 'typescript');
        const l2Path = path.join(l2Dir, `${block.id}.ts.block`);
        await fs.writeFile(l2Path, code, 'utf-8');
        console.log(`  [${i+1}/${total}] ✓ ${block.id}.ts.block`);
      }

      return {
        success: true,
        outputPath: l2Dir,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * L2 → L1: 骨架到实现
   */
  private async compileL2ToL1(): Promise<AICompileResult> {
    try {
      // 1. 读取L2和L3
      const l2Dir = path.join(this.projectPath, '.svp', 'gen', 'blocks');
      const l3Path = path.join(this.projectPath, '.svp', 'l3', 'domain.yaml');
      
      const l3Content = await fs.readFile(l3Path, 'utf-8');
      const l3 = YAML.parse(l3Content);

      // 2. 获取AI配置
      const compileConfig = this.config.compilation.l2ToL1;
      const providerName = compileConfig.provider || this.config.defaultProvider;
      const provider = this.config.providers[providerName];

      if (!provider.apiKey) {
        return {
          success: false,
          error: `API key not configured for provider "${providerName}"`,
        };
      }

      // 3. 为每个block生成L1
      const l1Dir = path.join(this.projectPath, 'src', 'blocks');
      await fs.mkdir(l1Dir, { recursive: true });

      const client = new AIClient(provider);
      const systemPrompt = prompts.L2_TO_L1_SYSTEM_PROMPT;
      const blocks = l3.blocks || [];
      const total = blocks.length;
      
      console.log(`  生成 ${total} 个代码块...`);

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const l2Path = path.join(l2Dir, `${block.id}.ts.block`);
        let l2Content: string;
        
        try {
          l2Content = await fs.readFile(l2Path, 'utf-8');
        } catch {
          console.log(`  [${i+1}/${total}] 跳过: ${block.id} (骨架不存在)`);
          continue;
        }

        console.log(`  [${i+1}/${total}] 编译: ${block.id}...`);
        
        const userPrompt = prompts.buildL2ToL1UserPrompt(l2Content, l3Content, block.id);
        const model = compileConfig.model || provider.model;
        const response = await client.complete(systemPrompt, userPrompt, model);
        
        const code = this.extractCode(response, 'typescript');
        const l1Path = path.join(l1Dir, `${block.id}.ts`);
        await fs.writeFile(l1Path, code, 'utf-8');
        
        console.log(`  [${i+1}/${total}] ✓ ${block.id}.ts`);
      }

      return {
        success: true,
        outputPath: l1Dir,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 从AI响应中提取YAML
   */
  private extractYaml(response: string): string {
    // 尝试提取 yaml 代码块 (支持可选空格、可选 yaml/yml 标签)
    const yamlMatch = response.match(/```(?:yaml|yml)?\s*\n?([\s\S]*?)(?:\n```|$)/);
    if (yamlMatch) {
      return yamlMatch[1].trim();
    }
    // 如果没有代码块，返回整个响应
    return response.trim();
  }

  /**
   * 从AI响应中提取代码
   */
  private extractCode(response: string, language: string): string {
    const pattern = new RegExp('```(?:' + language + ')?\\s*\\n([\\s\\S]*?)\\n```');
    const codeMatch = response.match(pattern);
    if (codeMatch) {
      return codeMatch[1].trim();
    }
    return response.trim();
  }
}
