/**
 * SVP Configuration
 * 项目配置和 .svp/config.yaml 的解析
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';

export interface SVPProjectConfig {
  project: {
    name: string;
    language: 'typescript' | 'python' | 'go' | 'rust';
    description?: string;
  };
  source: {
    root: string;
    include: string[];
    exclude: string[];
    git: {
      enabled: boolean;
      maxHistoryDepth: number;
    };
  };
  context: {
    designDocs?: Array<{ path: string; description: string }>;
    environment?: Array<{ name: string; description: string; required: boolean }>;
  };
  lod: {
    defaultLevel: number;
    overrides: Array<{ path: string; level: number }>;
  };
  exposure: {
    virtualFolders: Record<string, { physicalPaths: string[]; description: string }>;
    restrictedPaths: string[];
    tokenBudget: {
      default: number;
      max: number;
    };
  };
  sync: {
    reverseSync: {
      enabled: boolean;
      highlightActiveVoxels: boolean;
      showArchitectureUpdates: boolean;
    };
    realtime: {
      enabled: boolean;
      debounceMs: number;
    };
  };
}

export const DEFAULT_CONFIG: Partial<SVPProjectConfig> = {
  source: {
    root: './src',
    include: ['src/**/*', 'lib/**/*'],
    exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.spec.ts'],
    git: {
      enabled: true,
      maxHistoryDepth: 100,
    },
  },
  lod: {
    defaultLevel: 4,
    overrides: [],
  },
  exposure: {
    virtualFolders: {},
    restrictedPaths: ['node_modules/**', '.git/**', '.env*'],
    tokenBudget: {
      default: 8000,
      max: 32000,
    },
  },
  sync: {
    reverseSync: {
      enabled: true,
      highlightActiveVoxels: true,
      showArchitectureUpdates: true,
    },
    realtime: {
      enabled: true,
      debounceMs: 500,
    },
  },
};

export async function loadProjectConfig(projectPath: string): Promise<SVPProjectConfig | null> {
  const configPath = path.join(projectPath, '.svp', 'config.yaml');
  
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const parsed = YAML.parse(content);
    return mergeConfig(DEFAULT_CONFIG, parsed);
  } catch (error) {
    // 如果没有配置文件，尝试从 blueprint 推断
    return null;
  }
}

export async function saveProjectConfig(
  projectPath: string,
  config: SVPProjectConfig
): Promise<void> {
  const svpDir = path.join(projectPath, '.svp');
  const configPath = path.join(svpDir, 'config.yaml');
  
  await fs.mkdir(svpDir, { recursive: true });
  await fs.writeFile(configPath, YAML.stringify(config), 'utf-8');
}

function mergeConfig(defaults: Partial<SVPProjectConfig>, override: any): SVPProjectConfig {
  return {
    project: override.project || defaults.project!,
    source: { ...defaults.source, ...override.source },
    context: override.context || {},
    lod: { ...defaults.lod, ...override.lod },
    exposure: { ...defaults.exposure, ...override.exposure },
    sync: { ...defaults.sync, ...override.sync },
  } as SVPProjectConfig;
}
