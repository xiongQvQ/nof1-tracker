# 日志系统使用说明

## 概述

系统使用分级日志系统,可以通过环境变量 `LOG_LEVEL` 控制日志输出的详细程度。

## 日志级别

从低到高分为5个级别:

| 级别 | 值 | 说明 | 包含的日志 |
|------|-----|------|-----------|
| **ERROR** | 0 | 只显示错误 | 错误信息 |
| **WARN** | 1 | 显示警告和错误 | 错误 + 警告 |
| **INFO** | 2 | 显示重要信息(默认) | 错误 + 警告 + 重要操作 |
| **DEBUG** | 3 | 显示调试信息 | 错误 + 警告 + 重要操作 + 调试详情 |
| **VERBOSE** | 4 | 显示所有信息 | 所有日志 |

## 使用方法

### 方法1: 临时设置(单次运行)

```bash
# Linux/Mac
LOG_LEVEL=INFO npm start -- follow deepseek-chat-v3.1 -i 60 -t 10% -m 10

# Windows (PowerShell)
$env:LOG_LEVEL="INFO"; npm start -- follow deepseek-chat-v3.1 -i 60 -t 10% -m 10

# Windows (CMD)
set LOG_LEVEL=INFO && npm start -- follow deepseek-chat-v3.1 -i 60 -t 10% -m 10
```

### 方法2: 在 .env 文件中设置(持久化)

在项目根目录的 `.env` 文件中添加:

```bash
LOG_LEVEL=INFO
```

## 推荐配置

### 日常跟单(推荐)

```bash
LOG_LEVEL=INFO
```

**输出内容:**
- ✅ 仓位变化检测
- 📈 开仓/平仓操作
- 💰 资金分配结果
- ⚠️ 警告信息
- ❌ 错误信息

**隐藏内容:**
- 订单历史加载详情
- 价格检查详情
- 资金分配计算过程
- 仓位检查详情

### 调试模式

```bash
LOG_LEVEL=DEBUG
```

**额外显示:**
- 📚 订单历史加载
- 🔍 仓位检查详情
- 💰 余额变化
- 📊 资金分配详情

### 完整日志(排查问题)

```bash
LOG_LEVEL=VERBOSE
```

**显示所有日志,包括:**
- 每个仓位的详细状态
- 所有API调用
- 完整的计算过程

### 安静模式(只看错误)

```bash
LOG_LEVEL=ERROR
```

**只显示:**
- ❌ 错误信息

## 日志输出示例

### INFO 级别(默认)

```
🤖 Starting to follow agent: deepseek-chat-v3.1
⏰ Polling interval: 60 seconds
🎯 Found agent deepseek-chat-v3.1 (marker: 174) with 6 positions
🤖 Following agent: deepseek-chat-v3.1
🔍 Detected OID change for XRP: 211217736942 → 211217736949
🔄 CLOSING ALL POSITIONS: XRP - Entry order changed
✅ All positions successfully closed for XRP (1/1)
💰 Released margin from closing: $9.92 USDT (Profit)
📈 ENTRY CHANGED (with released margin $9.92): XRP BUY 3609 @ 2.4448 (OID: 211217736949)
✅ Saved processed order: XRP BUY 3609 (OID: 211217736949)
✅ Generated 0 follow plan(s) for agent deepseek-chat-v3.1
📋 No new actions required
```

### DEBUG 级别

```
🤖 Starting to follow agent: deepseek-chat-v3.1
⏰ Polling interval: 60 seconds
📚 Loaded 13 processed orders from history
🔍 Checking for orphaned orders...
📊 Found 12 open order(s)
✅ No orphaned orders found
📚 Rebuilt 6 positions from order history for agent deepseek-chat-v3.1
🎯 Found agent deepseek-chat-v3.1 (marker: 174) with 6 positions
🤖 Following agent: deepseek-chat-v3.1
🔍 Detected OID change for XRP: 211217736942 → 211217736949
💡 Found existing position on Binance: XRPUSDT LONG 39.1
💡 Balance before closing: $16.86 USDT
🔄 CLOSING ALL POSITIONS: XRP - Entry order changed
📊 Found 1 position(s) and 0 open order(s) for XRP
✅ All positions successfully closed for XRP (1/1)
💡 Balance after closing: $26.78 USDT
💰 Released margin from closing: $9.92 USDT (Profit)
📈 ENTRY CHANGED (with released margin $9.92): XRP BUY 3609 @ 2.4448
💰 Price Check: Entry $2.4448 vs Current $2.55045 - Price difference 4.32%
💾 Saved 14 orders to history
✅ Saved processed order: XRP BUY 3609 (OID: 211217736949)
✅ Generated 0 follow plan(s) for agent deepseek-chat-v3.1
📋 No new actions required
```

## 常见场景

### 场景1: 正常跟单,不想看太多信息

```bash
LOG_LEVEL=INFO npm start -- follow deepseek-chat-v3.1 -i 60 -t 10% -m 10
```

### 场景2: 发现问题,需要调试

```bash
LOG_LEVEL=DEBUG npm start -- follow deepseek-chat-v3.1 -i 60 -t 10% -m 10
```

### 场景3: 深度排查,需要所有信息

```bash
LOG_LEVEL=VERBOSE npm start -- follow deepseek-chat-v3.1 -i 60 -t 10% -m 10
```

### 场景4: 后台运行,只记录错误

```bash
LOG_LEVEL=ERROR npm start -- follow deepseek-chat-v3.1 -i 60 -t 10% -m 10 > /dev/null 2>&1
```

## 注意事项

1. **默认级别**: 如果不设置 `LOG_LEVEL`,默认使用 `INFO` 级别
2. **大小写**: 环境变量值不区分大小写 (`INFO` 和 `info` 效果相同)
3. **性能**: `VERBOSE` 级别会输出大量日志,可能影响性能,仅用于调试
4. **日志文件**: 如需保存日志到文件,可以使用重定向:
   ```bash
   npm start -- follow agent -i 60 > logs/output.log 2>&1
   ```

## 代码中使用

开发者可以在代码中使用以下函数:

```typescript
import { logError, logWarn, logInfo, logDebug, logVerbose } from '../utils/logger';

// 错误日志 (总是显示)
logError('❌ Critical error occurred');

// 警告日志 (WARN 及以上)
logWarn('⚠️ Something might be wrong');

// 信息日志 (INFO 及以上) - 重要操作
logInfo('✅ Position opened successfully');

// 调试日志 (DEBUG 及以上) - 详细信息
logDebug('📊 Account balance: $100.00');

// 详细日志 (VERBOSE 级别) - 所有细节
logVerbose('🔍 Checking position: BTC qty=0.1');
```
