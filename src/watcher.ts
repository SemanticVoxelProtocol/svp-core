import * as chokidar from 'chokidar';
import * as path from 'path';
import { SVPEngine } from './engine';

export interface WatchOptions {
  projectPath: string;
  onChange?: (event: FileChangeEvent) => void;
}

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  level?: number;
}

export class SVPWatcher {
  private watcher?: chokidar.FSWatcher;
  private options: WatchOptions;

  constructor(options: WatchOptions) {
    this.options = options;
  }

  /**
   * 开始监听文件变化
   */
  start(): void {
    const { projectPath } = this.options;

    // 监听 L5-L3 的变化（人类编辑层）
    const watchPaths = [
      path.join(projectPath, 'blueprint.svp.yaml'),  // L5
      path.join(projectPath, '.svp', 'l4', '**', '*.yaml'),  // L4
      path.join(projectPath, '.svp', 'l3', '**', '*.yaml'),  // L3
    ];

    this.watcher = chokidar.watch(watchPaths, {
      ignored: /(^|[\/\\])\../, // 忽略隐藏文件
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher
      .on('add', (filePath) => this.handleChange('add', filePath))
      .on('change', (filePath) => this.handleChange('change', filePath))
      .on('unlink', (filePath) => this.handleChange('unlink', filePath));
  }

  /**
   * 停止监听
   */
  stop(): Promise<void> {
    return this.watcher?.close() ?? Promise.resolve();
  }

  /**
   * 处理文件变化
   */
  private handleChange(type: 'add' | 'change' | 'unlink', filePath: string): void {
    const level = this.detectLevel(filePath);
    
    const event: FileChangeEvent = {
      type,
      path: filePath,
      level
    };

    this.options.onChange?.(event);
  }

  /**
   * 检测文件属于哪个层级
   */
  private detectLevel(filePath: string): number | undefined {
    if (filePath.includes('blueprint.svp.yaml')) return 5;
    if (filePath.includes('.svp/l4/')) return 4;
    if (filePath.includes('.svp/l3/')) return 3;
    return undefined;
  }
}
