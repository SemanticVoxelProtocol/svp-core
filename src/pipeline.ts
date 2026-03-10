import { SVPEngine } from './engine';
import type { CompileResult, CompileError } from './compiler';

export interface PipelineOptions {
  from: 5 | 4 | 3 | 2 | 1;
  to: 5 | 4 | 3 | 2 | 1;
  targets?: string[];
}

export interface PipelineResult {
  success: boolean;
  results: Map<number, CompileResult>;
  errors: CompileError[];
}

export class CompilePipeline {
  private engine: SVPEngine;

  constructor(engine: SVPEngine) {
    this.engine = engine;
  }

  /**
   * 运行编译管道
   */
  async run(options: PipelineOptions): Promise<PipelineResult> {
    const { from, to } = options;
    
    if (from <= to) {
      return {
        success: false,
        results: new Map(),
        errors: [{ level: from, message: `'from' level must be higher than 'to' level` }]
      };
    }

    const results = new Map<number, CompileResult>();
    const errors: CompileError[] = [];

    // 从高到低编译
    for (let level = from; level >= to; level--) {
      // 最后一层 L1 是代码，不需要编译（由 L2→L1 生成）
      if (level === 1) continue;

      const result = await this.engine.compile({ level });
      results.set(level, result);

      if (!result.success) {
        errors.push(...result.errors);
        return { success: false, results, errors };
      }
    }

    return { success: true, results, errors };
  }

  /**
   * 增量编译：只编译变更的部分
   */
  async runDelta(changedBlocks: string[]): Promise<PipelineResult> {
    const results = new Map<number, CompileResult>();
    const errors: CompileError[] = [];

    // 确定受影响的层级
    const affectedLevels = this.determineAffectedLevels(changedBlocks);

    for (const level of affectedLevels) {
      const result = await this.engine.compile({ level: level as 5 | 4 | 3 | 2 });
      results.set(level, result);

      if (!result.success) {
        errors.push(...result.errors);
        return { success: false, results, errors };
      }
    }

    return { success: true, results, errors };
  }

  /**
   * 确定受影响的编译层级
   */
  private determineAffectedLevels(changedBlocks: string[]): number[] {
    // 简化版：假设所有变更都影响到 L1
    return [5, 4, 3, 2];
  }
}
