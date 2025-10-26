# 保证金模式配置

## 概述

系统支持**逐仓保证金模式 (ISOLATED)** 和**全仓保证金模式 (CROSSED)**,默认使用全仓模式。用户可以通过命令行参数 `--margin-type` 来选择保证金模式。

- **逐仓模式 (ISOLATED)**: 每个交易对的仓位相互独立,互不影响,可以更好地控制风险
- **全仓模式 (CROSSED)**: 所有交易对共享账户余额,资金利用率更高

## 使用方法

### 命令行参数

使用 `--margin-type` 参数指定保证金模式:

```bash
# 使用逐仓模式
nof1-trade follow <agent-name> --margin-type ISOLATED

# 使用全仓模式 (默认,可以不指定)
nof1-trade follow <agent-name> --margin-type CROSSED

# 不指定参数时默认使用全仓模式 (币安默认)
nof1-trade follow <agent-name>
```

**注意**: 币安期货账户默认就是全仓模式,所以系统只在用户明确指定 `--margin-type ISOLATED` 时才会调用 API 设置为逐仓模式,这样可以减少不必要的 API 调用。

## 主要变更

### 1. BinanceService 新增方法

添加了 `setMarginType()` 方法用于设置保证金模式:

```typescript
async setMarginType(symbol: string, marginType: 'ISOLATED' | 'CROSSED'): Promise<any>
```

- **ISOLATED**: 逐仓模式 - 每个交易对独立使用保证金
- **CROSSED**: 全仓模式 - 所有交易对共享账户余额

### 2. TradingExecutor 下单流程更新

在执行交易计划时,系统会按以下顺序进行设置:

1. **设置保证金模式为逐仓** (`setMarginType`)
2. **设置杠杆倍数** (`setLeverage`)
3. **执行订单** (`placeOrder`)

### 3. 错误处理

- 如果交易对已经是逐仓模式,API 会返回 "No need to change margin type" 错误,系统会友好地提示并继续执行
- 如果设置保证金模式失败,系统会记录警告但不会中断交易流程
- 保证了即使设置失败也能继续下单

## 优势

### 风险隔离
每个币种的仓位使用独立的保证金,一个币种爆仓不会影响其他币种。

### 资金管理
可以为每个交易对分配特定的保证金额度,更精确地控制风险敞口。

### 独立清算
每个仓位有独立的强平价格,不会因为账户整体保证金率而被强制平仓。

## 示例

假设账户有 1000 USDT:

### 逐仓模式 (当前)
- BTC/USDT 使用 300 USDT 保证金
- ETH/USDT 使用 200 USDT 保证金
- SOL/USDT 使用 100 USDT 保证金

如果 BTC 仓位爆仓,只会损失 300 USDT,ETH 和 SOL 的仓位不受影响。

### 全仓模式 (之前)
- 所有仓位共享 1000 USDT
- 如果任何一个仓位出现大幅亏损,可能导致整个账户保证金率不足
- 可能触发所有仓位的强制平仓

## 技术细节

### API 调用

```typescript
// 设置 BTC/USDT 为逐仓模式
await binanceService.setMarginType('BTCUSDT', 'ISOLATED');

// 设置杠杆
await binanceService.setLeverage('BTCUSDT', 10);

// 下单
await binanceService.placeOrder(order);
```

### 日志输出

成功设置:
```
✅ Margin type set to ISOLATED for BTCUSDT
```

已经是逐仓模式:
```
ℹ️ BTCUSDT is already in ISOLATED margin mode
```

设置失败:
```
⚠️ Failed to set margin type: [错误信息]
```

## 注意事项

1. **首次使用**: 第一次对某个交易对下单时,会自动设置为逐仓模式
2. **模式切换**: 如果之前使用的是全仓模式,系统会自动切换到逐仓模式
3. **持仓要求**: 切换保证金模式时,该交易对不能有持仓
4. **资金分配**: 使用逐仓模式时,需要确保为每个交易对分配了足够的保证金

## 相关文件

- `src/services/binance-service.ts` - 添加了 `setMarginType()` 方法
- `src/services/trading-executor.ts` - 在下单前调用 `setMarginType()`
- `src/__tests__/trading-executor.test.ts` - 添加了相关测试用例
- `src/__tests__/trading-executor-enhanced.test.ts` - 更新了测试 mock

## 测试

所有相关测试已更新并通过:
- ✅ 54 个测试用例通过 (trading-executor.test.ts)
- ✅ 19 个测试用例通过 (trading-executor-enhanced.test.ts)

包括:
- 保证金模式设置成功
- 保证金模式设置失败的容错处理
- "无需更改"错误的友好提示
