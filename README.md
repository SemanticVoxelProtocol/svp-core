# SVP-Core

Semantic Voxel Protocol - Core Engine

SVP 核心编译引擎，负责 IR 的编译、验证和管道管理。

## 安装

```bash
npm install @semanticvoxelprotocol/core
```

## 使用

```typescript
import { SVPEngine, CompilePipeline } from '@semanticvoxelprotocol/core';

const engine = new SVPEngine({
  projectPath: './my-project',
  targetLanguage: 'typescript'
});

// 编译 L5 → L4
await engine.compile({ level: 5 });

// 或完整管道
const pipeline = new CompilePipeline(engine);
await pipeline.run({ from: 5, to: 1 });
```

## 功能

- 增量编译
- 变更检测
- 编译缓存
- 源映射管理
- 错误聚合
