# 日志系统优化 - 更新日志

## 更新时间
2025-10-25

## 问题描述
原系统日志输出过于冗余,包含大量调试信息,干扰用户查看重要操作:
- 每次轮询都显示"Loaded XX processed orders"
- 显示所有仓位检查详情
- 显示详细的资金分配计算过程
- 显示大量中间状态信息

## 解决方案
实现了分级日志系统,支持通过环境变量 `LOG_LEVEL` 控制日志详细程度。

## 主要改动

### 1. 新增日志级别枚举 (`src/config/constants.ts`)
```typescript
export enum LogLevel {
  ERROR = 0,   // 只显示错误
  WARN = 1,    // 显示警告和错误
  INFO = 2,    // 显示重要信息(默认)
  DEBUG = 3,   // 显示调试信息
  VERBOSE = 4  // 显示所有信息
}
```

### 2. 创建日志工具 (`src/utils/logger.ts`)
提供5个日志函数:
- `logError()` - 错误日志(总是显示)
- `logWarn()` - 警告日志
- `logInfo()` - 信息日志(默认级别)
- `logDebug()` - 调试日志
- `logVerbose()` - 详细日志

### 3. 更新核心服务

#### `follow-service.ts`
- 订单历史加载: `console.log` → `logDebug`
- 仓位重建: `console.log` → `logDebug`
- 仓位检查详情: `console.log` → `logVerbose`
- 余额信息: `console.log` → `logDebug`
- 价格检查: `console.log` → `logDebug`
- 资金分配详情: `console.log` → `logDebug`
- 重要操作(开仓/平仓): 保持 `logInfo`

#### `position-manager.ts`
- 平仓操作: 保持 `logInfo`
- 仓位详情: `console.log` → `logDebug`
- 孤立订单检查: `console.log` → `logDebug`
- 错误信息: `console.error` → `logError`

#### `order-history-manager.ts`
- 历史加载: `console.log` → `logDebug`
- 订单保存: `console.log` → `logDebug`
- 订单去重: `console.log` → `logDebug`
- 重要操作: 保持 `logInfo`

### 4. 文档更新
- 新增 `docs/logging.md` - 完整的日志系统使用文档
- 更新 `README.md` - 添加日志级别控制说明
- 更新 `.env.example` - 添加 LOG_LEVEL 配置
- 新增 `examples/log-levels-demo.sh` - 演示脚本

## 使用方法

### 默认模式(INFO) - 推荐日常使用
```bash
npm start -- follow deepseek-chat-v3.1 -i 60 -t 10% -m 10
```

**输出示例:**
```
🤖 Following agent: deepseek-chat-v3.1
🔍 Detected OID change for XRP: 211217736942 → 211217736949
🔄 CLOSING ALL POSITIONS: XRP - Entry order changed
✅ All positions successfully closed for XRP (1/1)
💰 Released margin from closing: $9.92 USDT (Profit)
📈 ENTRY CHANGED: XRP BUY 3609 @ 2.4448 (OID: 211217736949)
✅ Saved processed order: XRP BUY 3609 (OID: 211217736949)
✅ Generated 0 follow plan(s) for agent deepseek-chat-v3.1
📋 No new actions required
```

### 调试模式(DEBUG)
```bash
LOG_LEVEL=DEBUG npm start -- follow deepseek-chat-v3.1 -i 60 -t 10% -m 10
```

**额外显示:**
- 📚 订单历史加载详情
- 🔍 仓位检查详情
- 💰 余额变化
- 📊 资金分配详情

### 完整日志(VERBOSE)
```bash
LOG_LEVEL=VERBOSE npm start -- follow deepseek-chat-v3.1 -i 60 -t 10% -m 10
```

**显示所有日志,包括:**
- 每个仓位的详细状态
- 所有中间计算过程

## 日志级别对比

| 日志内容 | ERROR | WARN | INFO | DEBUG | VERBOSE |
|---------|-------|------|------|-------|---------|
| 错误信息 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 警告信息 | ❌ | ✅ | ✅ | ✅ | ✅ |
| 开仓/平仓操作 | ❌ | ❌ | ✅ | ✅ | ✅ |
| 订单历史加载 | ❌ | ❌ | ❌ | ✅ | ✅ |
| 仓位检查详情 | ❌ | ❌ | ❌ | ✅ | ✅ |
| 余额变化 | ❌ | ❌ | ❌ | ✅ | ✅ |
| 资金分配详情 | ❌ | ❌ | ❌ | ✅ | ✅ |
| 所有中间状态 | ❌ | ❌ | ❌ | ❌ | ✅ |

## 优化效果

### 优化前(所有日志)
```
📚 Loaded 13 processed orders from history
📚 Loaded 13 processed orders from history
🔍 Checking for orphaned orders...
📊 Found 12 open order(s)
✅ No orphaned orders found
📚 Loaded 13 processed orders from history
📚 Rebuilt 6 positions from order history for agent deepseek-chat-v3.1
🔍 XRP: Previous OID=211217736949, Current OID=211217736949, Qty=3609
🔍 DOGE: Previous OID=204672918246, Current OID=204672918246, Qty=27858
🔍 BTC: Previous OID=206132712257, Current OID=206132712257, Qty=0.12
🔍 ETH: Previous OID=211368817634, Current OID=211368817634, Qty=26.05
🔍 SOL: Previous OID=204642432133, Current OID=204642432133, Qty=81.81
🔍 BNB: Previous OID=211594155401, Current OID=211594155401, Qty=3.21
✅ Generated 0 follow plan(s) for agent deepseek-chat-v3.1
📋 No new actions required
```

### 优化后(INFO级别)
```
🤖 Following agent: deepseek-chat-v3.1
✅ Generated 0 follow plan(s) for agent deepseek-chat-v3.1
📋 No new actions required
```

**日志减少约 80%,只保留最重要的信息!**

## 向后兼容性
- 默认级别为 INFO,与优化前的重要日志输出一致
- 不设置 LOG_LEVEL 时,行为与优化前相同
- 所有现有功能保持不变

## 测试
- ✅ 编译通过 (`npm run build`)
- ✅ 所有日志函数正常工作
- ✅ 环境变量正确读取
- ✅ 默认级别正确(INFO)

## 相关文件
- `src/config/constants.ts` - 日志级别定义
- `src/utils/logger.ts` - 日志工具函数
- `src/services/follow-service.ts` - 跟单服务日志优化
- `src/services/position-manager.ts` - 仓位管理日志优化
- `src/services/order-history-manager.ts` - 订单历史日志优化
- `docs/logging.md` - 日志系统文档
- `README.md` - 使用说明更新
- `.env.example` - 配置示例更新
- `examples/log-levels-demo.sh` - 演示脚本
