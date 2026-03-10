/**
 * SVP Compiler
 * 分层编译的核心逻辑
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { L5Blueprint, L4LogicChain, L3LogicBlock, validateL5, validateL4, validateL3 } from '@semanticvoxelprotocol/ir';

export interface CompileOptions {
  level: 5 | 4 | 3 | 2;
  target?: string;
  dryRun?: boolean;
}

export interface CompileResult {
  success: boolean;
  outputPath?: string;
  errors: CompileError[];
  warnings: string[];
}

export interface CompileError {
  level: number;
  message: string;
  file?: string;
  line?: number;
}

export class SVPCompiler {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * 编译指定层级
   */
  async compile(options: CompileOptions): Promise<CompileResult> {
    const { level, target, dryRun } = options;

    switch (level) {
      case 5:
        return this.compileL5ToL4(target, dryRun);
      case 4:
        return this.compileL4ToL3(target, dryRun);
      case 3:
        return this.compileL3ToL2(target, dryRun);
      case 2:
        return this.compileL2ToL1(target, dryRun);
      default:
        return {
          success: false,
          errors: [{ level, message: `Unsupported compilation level: ${level}` }],
          warnings: [],
        };
    }
  }

  /**
   * L5 → L4: 意图到架构
   */
  private async compileL5ToL4(target?: string, dryRun?: boolean): Promise<CompileResult> {
    try {
      // 读取 L5
      const l5Path = path.join(this.projectPath, 'blueprint.svp.yaml');
      const l5Content = await fs.readFile(l5Path, 'utf-8');
      const l5 = YAML.parse(l5Content) as L5Blueprint;

      // 验证 L5
      const validation = validateL5(l5);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors.errors.map(e => ({
            level: 5,
            message: e.message,
          })),
          warnings: [],
        };
      }

      // MVP 阶段：L5→L4 需要 AI 辅助
      // 这里返回提示，实际编译通过 MCP/AI 完成
      return {
        success: false,
        errors: [{
          level: 5,
          message: 'L5→L4 compilation requires AI assistance. Use `svp compile --level 5 --ai` or MCP integration.',
        }],
        warnings: [],
      };
    } catch (error) {
      return {
        success: false,
        errors: [{
          level: 5,
          message: error instanceof Error ? error.message : 'Unknown error reading L5',
        }],
        warnings: [],
      };
    }
  }

  /**
   * L4 → L3: 架构到逻辑块
   */
  private async compileL4ToL3(target?: string, dryRun?: boolean): Promise<CompileResult> {
    try {
      const l4Path = path.join(this.projectPath, '.svp', 'l4', 'flows.yaml');
      
      // 检查 L4 是否存在
      try {
        await fs.access(l4Path);
      } catch {
        return {
          success: false,
          errors: [{
            level: 4,
            message: 'L4 not found. Please compile L5→L4 first.',
          }],
          warnings: [],
        };
      }

      const l4Content = await fs.readFile(l4Path, 'utf-8');
      const l4 = YAML.parse(l4Content) as L4LogicChain;

      // 验证 L4
      const validation = validateL4(l4);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors.errors.map(e => ({
            level: 4,
            message: e.message,
          })),
          warnings: [],
        };
      }

      return {
        success: false,
        errors: [{
          level: 4,
          message: 'L4→L3 compilation requires AI assistance. Use `svp compile --level 4 --ai` or MCP integration.',
        }],
        warnings: [],
      };
    } catch (error) {
      return {
        success: false,
        errors: [{
          level: 4,
          message: error instanceof Error ? error.message : 'Unknown error reading L4',
        }],
        warnings: [],
      };
    }
  }

  /**
   * L3 → L2: 逻辑块到代码骨架
   */
  private async compileL3ToL2(target?: string, dryRun?: boolean): Promise<CompileResult> {
    try {
      const l3Dir = path.join(this.projectPath, '.svp', 'l3');
      
      // 检查 L3 目录
      try {
        await fs.access(l3Dir);
      } catch {
        return {
          success: false,
          errors: [{
            level: 3,
            message: 'L3 not found. Please compile L4→L3 first.',
          }],
          warnings: [],
        };
      }

      return {
        success: false,
        errors: [{
          level: 3,
          message: 'L3→L2 compilation requires AI assistance. Use `svp compile --level 3 --ai` or MCP integration.',
        }],
        warnings: [],
      };
    } catch (error) {
      return {
        success: false,
        errors: [{
          level: 3,
          message: error instanceof Error ? error.message : 'Unknown error reading L3',
        }],
        warnings: [],
      };
    }
  }

  /**
   * L2 → L1: 代码骨架到实现
   */
  private async compileL2ToL1(target?: string, dryRun?: boolean): Promise<CompileResult> {
    try {
      const l2Dir = path.join(this.projectPath, '.svp', 'gen', 'blocks');
      const l1Dir = path.join(this.projectPath, 'src', 'blocks');

      // 检查 L2
      try {
        await fs.access(l2Dir);
      } catch {
        return {
          success: false,
          errors: [{
            level: 2,
            message: 'L2 not found. Please compile L3→L2 first.',
          }],
          warnings: [],
        };
      }

      return {
        success: false,
        errors: [{
          level: 2,
          message: 'L2→L1 compilation requires AI assistance. Use `svp compile --level 2 --ai` or MCP integration.',
        }],
        warnings: [],
      };
    } catch (error) {
      return {
        success: false,
        errors: [{
          level: 2,
          message: error instanceof Error ? error.message : 'Unknown error reading L2',
        }],
        warnings: [],
      };
    }
  }
}
