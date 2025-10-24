# Commands Module

这个目录包含所有 CLI 命令的处理器实现。

## 文件结构

```
commands/
├── index.ts          # 统一导出所有命令处理器
├── analyze.ts        # 分析交易计划命令
├── execute.ts        # 执行特定交易计划命令
├── list.ts           # 列出可用交易计划命令
├── agents.ts         # 列出可用 AI 代理命令
├── follow.ts         # 跟随 AI 代理命令
└── status.ts         # 系统状态检查命令
```

## 设计原则

1. **单一职责** - 每个文件只负责一个命令的处理逻辑
2. **依赖注入** - 通过 `utils/command-helpers.ts` 统一初始化服务
3. **错误处理** - 使用统一的错误处理机制
4. **可测试性** - 命令处理器可独立测试

## 测试策略

### 当前状态

命令模块目前从覆盖率统计中排除(`jest.config.js`),原因:

1. **重构优先** - 优先完成代码结构重构
2. **集成测试** - 命令逻辑更适合集成测试而非单元测试
3. **依赖复杂** - 命令依赖多个服务,mock 成本较高

### 已有测试

- ✅ 基础函数定义测试
- ✅ 参数签名验证
- ✅ 异步函数类型检查
- ✅ 模块导出验证

### TODO: 集成测试计划

未来应添加以下集成测试:

1. **End-to-End 测试**
   - 使用真实的 CLI 调用测试完整流程
   - 验证命令行参数解析
   - 验证输出格式

2. **Mock 服务测试**
   - Mock API 响应测试各种场景
   - 测试错误处理路径
   - 测试边界条件

3. **快照测试**
   - 验证命令输出格式的一致性
   - 确保 UI 变更可追踪

## 使用示例

```typescript
import { handleAnalyzeCommand } from './commands';

// 分析交易计划
await handleAnalyzeCommand({ riskOnly: true });

// 执行特定计划
await handleExecuteCommand('plan-id-123', { force: false });

// 跟随代理
await handleFollowCommand('agent-name', { interval: '60' });
```

## 开发指南

### 添加新命令

1. 在 `commands/` 目录创建新文件,如 `new-command.ts`
2. 实现命令处理器函数
3. 在 `commands/index.ts` 中导出
4. 在 `src/index.ts` 中注册命令
5. 添加基础测试到 `__tests__/commands/`

### 修改现有命令

1. 修改对应的命令文件
2. 确保不破坏现有接口
3. 更新相关测试
4. 运行 `npm test` 验证

## 依赖关系

```
commands/
  ↓
utils/command-helpers.ts
  ↓
services/ (analyzer, executor, riskManager, etc.)
  ↓
scripts/analyze-api.ts
```

## 注意事项

- ⚠️ 命令处理器应该保持轻量,复杂逻辑应放在 services 层
- ⚠️ 避免在命令中直接操作数据库或文件系统
- ⚠️ 所有用户输入都应该经过验证
- ⚠️ 错误信息应该对用户友好且有指导性
