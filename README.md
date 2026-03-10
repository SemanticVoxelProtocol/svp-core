# SVP-Core

Semantic Voxel Protocol - Core Engine

SVP 核心编译引擎，提供 AI 编译器、增量编译、变更检测和管道管理功能。

## 特性

- 🤖 **AI 编译器** - 支持 OpenAI/Anthropic/DeepSeek 的 L5→L1 自动编译
- ⚡ **增量编译** - 只编译变更的部分，提升效率
- 👁️ **变更检测** - 文件监听和依赖分析
- 💾 **编译缓存** - 避免重复编译
- 🗺️ **源映射管理** - 支持从 L1 代码追溯到 L5 意图
- 🔧 **多模型配置** - 不同层级可使用不同 AI 模型

## 安装

```bash
npm install @semanticvoxelprotocol/core
```

## 使用

### AI 编译器

```typescript
import { AICompilerAgent } from '@semanticvoxelprotocol/core';

// 创建编译器（自动加载 .env 配置）
const compiler = await AICompilerAgent.create('./my-project');

// L5 → L4: 意图到架构
const result4 = await compiler.compile({ level: 5 });
console.log(result4.outputPath); // .svp/l4/flows.yaml

// L4 → L3: 架构到逻辑
const result3 = await compiler.compile({ level: 4 });
console.log(result3.outputPath); // .svp/l3/domain.yaml

// L3 → L2: 逻辑到骨架
const result2 = await compiler.compile({ level: 3 });
console.log(result2.outputPath); // .svp/gen/blocks/

// L2 → L1: 骨架到实现
const result1 = await compiler.compile({ level: 2 });
console.log(result1.outputPath); // src/blocks/
```

### 增量编译引擎

```typescript
import { SVPEngine } from '@semanticvoxelprotocol/core';

const engine = new SVPEngine({
  projectPath: './my-project',
  targetLanguage: 'typescript'
});

// 编译到指定层级
await engine.compile({ level: 3 });
```

### 完整管道

```typescript
import { CompilePipeline } from '@semanticvoxelprotocol/core';

const pipeline = new CompilePipeline(engine);
await pipeline.run({ from: 5, to: 1 });
```

## 配置

在项目根目录创建 `.env` 文件：

```bash
# AI Provider 配置
SVP_AI_PROVIDER=openai
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1

# 或 DeepSeek
# SVP_AI_PROVIDER=deepseek
# DEEPSEEK_API_KEY=sk-xxx
# DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# 层级特定模型配置（可选）
SVP_L5_MODEL=gpt-4o
SVP_L4_MODEL=gpt-4o-mini
SVP_L3_MODEL=gpt-4o-mini
SVP_L2_MODEL=gpt-4o-mini
```

## API 参考

### AICompilerAgent

| 方法 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `create(projectPath)` | `string` | `Promise<AICompilerAgent>` | 工厂方法 |
| `compile({ level })` | `{ level: 5\|4\|3\|2 }` | `Promise<AICompileResult>` | 编译指定层级 |

### SVPEngine

| 方法 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `compile({ level })` | `{ level: number }` | `Promise<void>` | 增量编译 |
| `watch()` | - | `Promise<void>` | 启动监听模式 |

### CompilePipeline

| 方法 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `run({ from, to })` | `{ from: number, to: number }` | `Promise<void>` | 执行编译管道 |

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 运行测试
npm run test
```

## License

MIT
