/**
 * SVP Engine
 * 核心引擎，整合配置、编译、文件监听
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { L5Blueprint, validateL5 } from '@semanticvoxelprotocol/ir';
import { SVPCompiler, CompileOptions, CompileResult } from './compiler';
import { loadProjectConfig, SVPProjectConfig } from './config';

export interface SVPEngineOptions {
  projectPath: string;
  targetLanguage?: 'typescript' | 'python' | 'go' | 'rust';
  incremental?: boolean;
  strict?: boolean;
}

export interface EngineStatus {
  initialized: boolean;
  levels: {
    5: { exists: boolean; file?: string };
    4: { exists: boolean; file?: string };
    3: { exists: boolean; files?: string[] };
    2: { exists: boolean; files?: string[] };
    1: { exists: boolean; files?: string[] };
  };
  config?: SVPProjectConfig;
}

export class SVPEngine {
  private options: SVPEngineOptions;
  private compiler: SVPCompiler;
  private cache: Map<string, string> = new Map();

  constructor(options: SVPEngineOptions) {
    this.options = {
      targetLanguage: 'typescript',
      incremental: true,
      strict: false,
      ...options,
    };
    this.compiler = new SVPCompiler(options.projectPath);
  }

  /**
   * 获取引擎状态
   */
  async getStatus(): Promise<EngineStatus> {
    const { projectPath } = this.options;

    // 检查 L5
    const l5Path = path.join(projectPath, 'blueprint.svp.yaml');
    const l5Exists = await this.fileExists(l5Path);

    // 检查 L4
    const l4Path = path.join(projectPath, '.svp', 'l4', 'flows.yaml');
    const l4Exists = await this.fileExists(l4Path);

    // 检查 L3
    const l3Dir = path.join(projectPath, '.svp', 'l3');
    const l3Exists = await this.dirExists(l3Dir);
    const l3Files = l3Exists ? await this.listYamlFiles(l3Dir) : [];

    // 检查 L2
    const l2Dir = path.join(projectPath, '.svp', 'gen', 'blocks');
    const l2Exists = await this.dirExists(l2Dir);
    const l2Files = l2Exists ? await this.listBlockFiles(l2Dir) : [];

    // 检查 L1
    const l1Dir = path.join(projectPath, 'src', 'blocks');
    const l1Exists = await this.dirExists(l1Dir);
    const l1Files = l1Exists ? await this.listTsFiles(l1Dir) : [];

    // 加载配置
    const config = await loadProjectConfig(projectPath);

    return {
      initialized: l5Exists,
      levels: {
        5: { exists: l5Exists, file: l5Exists ? 'blueprint.svp.yaml' : undefined },
        4: { exists: l4Exists, file: l4Exists ? '.svp/l4/flows.yaml' : undefined },
        3: { exists: l3Exists, files: l3Files },
        2: { exists: l2Exists, files: l2Files },
        1: { exists: l1Exists, files: l1Files },
      },
      config: config || undefined,
    };
  }

  /**
   * 编译指定层级
   */
  async compile(options: CompileOptions): Promise<CompileResult> {
    return this.compiler.compile(options);
  }

  /**
   * 加载 L5 蓝图
   */
  async loadL5(): Promise<L5Blueprint | null> {
    const l5Path = path.join(this.options.projectPath, 'blueprint.svp.yaml');
    
    try {
      const content = await fs.readFile(l5Path, 'utf-8');
      const parsed = YAML.parse(content);
      
      const validation = validateL5(parsed);
      if (validation.valid) {
        return validation.data;
      }
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 初始化新项目
   */
  async init(projectName: string, language: string): Promise<void> {
    const { projectPath } = this.options;

    // 创建 .svp 目录结构
    await fs.mkdir(path.join(projectPath, '.svp', 'l4'), { recursive: true });
    await fs.mkdir(path.join(projectPath, '.svp', 'l3'), { recursive: true });
    await fs.mkdir(path.join(projectPath, '.svp', 'gen', 'blocks'), { recursive: true });
    await fs.mkdir(path.join(projectPath, 'src', 'blocks'), { recursive: true });

    // 创建 L5 蓝图模板
    const blueprint: L5Blueprint = {
      svpVersion: '0.1.0',
      level: 5,
      project: {
        name: projectName,
        description: `A ${language} project using SVP`,
        version: '0.1.0',
      },
      intent: {
        problem: 'Describe the problem you want to solve',
        solution: 'Describe your solution approach',
        successCriteria: ['Define what success looks like'],
      },
      constraints: {
        functional: ['List functional constraints'],
        nonFunctional: ['List performance/security constraints'],
      },
      domains: [
        {
          name: 'Core',
          responsibility: 'Core business logic',
          boundaries: {
            inScope: ['Core functionality'],
            outOfScope: ['External integrations'],
          },
          dependencies: [],
        },
      ],
      integrations: [],
      context: {
        designDocs: [],
        environment: [],
      },
    };

    await fs.writeFile(
      path.join(projectPath, 'blueprint.svp.yaml'),
      YAML.stringify(blueprint),
      'utf-8'
    );

    // 创建 .gitignore
    const gitignoreContent = `# SVP Generated Files
.svp/gen/
src/blocks/*.svp.ts
.svp/cache/
`;
    await fs.writeFile(
      path.join(projectPath, '.svp', '.gitignore'),
      gitignoreContent,
      'utf-8'
    );
  }

  /**
   * 工具方法：检查文件是否存在
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 工具方法：检查目录是否存在
   */
  private async dirExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * 列出 YAML 文件
   */
  private async listYamlFiles(dir: string): Promise<string[]> {
    try {
      const files = await fs.readdir(dir);
      return files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
    } catch {
      return [];
    }
  }

  /**
   * 列出 Block 文件
   */
  private async listBlockFiles(dir: string): Promise<string[]> {
    try {
      const files = await fs.readdir(dir);
      return files.filter(f => f.endsWith('.block'));
    } catch {
      return [];
    }
  }

  /**
   * 列出 TypeScript 文件
   */
  private async listTsFiles(dir: string): Promise<string[]> {
    try {
      const files = await fs.readdir(dir);
      return files.filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));
    } catch {
      return [];
    }
  }
}
