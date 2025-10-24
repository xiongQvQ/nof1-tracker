# 孤立挂单清理功能

## 问题描述

当创建仓位时,系统会同时创建止盈和止损挂单。但是当其中一个挂单触发后,仓位被平掉,可能还会剩下另一个止盈或止损单。

这会导致以下问题:
- 下次新建仓位时,这个遗留的挂单可能意外触发
- 挂单和仓位不匹配,造成交易混乱
- 可能导致意外的盈亏

## 解决方案

在每次轮询时,自动检查并清理没有对应仓位的止盈止损单。

### 实现细节

#### 1. BinanceService 新增方法

```typescript
/**
 * 获取所有仓位信息(包括零仓位)
 */
async getAllPositions(): Promise<PositionResponse[]>
```

这个方法返回所有币种的仓位信息,包括仓位为0的币种,用于检查挂单是否有对应的仓位。

#### 2. PositionManager 新增方法

```typescript
/**
 * 清理孤立的挂单 - 没有对应仓位的止盈止损单
 * 在轮询时调用,确保不会有遗留的挂单意外触发
 */
async cleanOrphanedOrders(): Promise<{
  success: boolean;
  cancelledOrders: number;
  errors: string[];
}>
```

该方法的工作流程:

1. **获取所有开放订单**
   - 调用 `getOpenOrders()` 获取所有挂单

2. **获取所有仓位信息**
   - 调用 `getAllPositions()` 获取所有仓位(包括零仓位)
   - 创建仓位映射表,记录每个币种是否有仓位

3. **识别孤立挂单**
   - 筛选出止盈止损单类型:
     - `TAKE_PROFIT_MARKET`
     - `STOP_MARKET`
     - `TAKE_PROFIT`
     - `STOP`
   - 检查这些挂单是否有对应的仓位
   - 如果没有对应仓位,标记为孤立挂单

4. **取消孤立挂单**
   - 逐个取消识别出的孤立挂单
   - 记录成功和失败的情况
   - 返回清理结果

#### 3. FollowService 集成

在 `followAgent()` 方法的开始处调用清理功能:

```typescript
async followAgent(
  agentId: string,
  currentPositions: Position[],
  totalMargin?: number
): Promise<FollowPlan[]> {
  console.log(`${LOGGING_CONFIG.EMOJIS.ROBOT} Following agent: ${agentId}`);

  // 0. 清理孤立的挂单 (没有对应仓位的止盈止损单)
  await this.positionManager.cleanOrphanedOrders();

  // ... 其他跟单逻辑
}
```

## 使用场景

### 场景1: 止盈单触发后

1. 创建BTC多头仓位,同时创建止盈单和止损单
2. 价格上涨,止盈单触发,仓位被平掉
3. 止损单还留在系统中
4. 下次轮询时,自动检测并取消这个止损单

### 场景2: 止损单触发后

1. 创建ETH空头仓位,同时创建止盈单和止损单
2. 价格上涨,止损单触发,仓位被平掉
3. 止盈单还留在系统中
4. 下次轮询时,自动检测并取消这个止盈单

### 场景3: 多个币种混合

1. 同时持有BTC、ETH、SOL仓位
2. BTC和ETH的仓位被平掉,但挂单还在
3. SOL仓位还在,挂单也在
4. 清理功能会:
   - 取消BTC和ETH的孤立挂单
   - 保留SOL的挂单(因为有对应仓位)

## 日志输出

清理过程会输出详细的日志:

```
🔍 Checking for orphaned orders...
📊 Found 5 open order(s)
⚠️ Found 2 orphaned order(s)
❌ Cancelling orphaned TAKE_PROFIT_MARKET order: BTCUSDT (Order ID: 12345)
✅ Cancelled order 12345 for BTCUSDT
❌ Cancelling orphaned STOP_MARKET order: ETHUSDT (Order ID: 12346)
✅ Cancelled order 12346 for ETHUSDT
✅ Orphaned orders cleanup complete: 2/2 cancelled
```

## 错误处理

- 如果没有挂单,直接返回成功
- 如果所有挂单都有对应仓位,不取消任何订单
- 如果取消订单失败,记录错误但继续处理其他订单
- 返回结果包含成功取消的数量和错误列表

## 测试覆盖

测试文件: `src/__tests__/position-manager-orphaned-orders.test.ts`

测试场景:
1. ✅ 没有挂单时返回成功
2. ✅ 所有挂单都有对应仓位时不取消任何订单
3. ✅ 取消没有对应仓位的止盈止损单
4. ✅ 只取消止盈止损单,不取消普通限价单
5. ✅ 处理多个币种的孤立挂单
6. ✅ 处理取消订单时的错误
7. ✅ 处理API调用失败的情况

## 性能考虑

- 清理操作在每次轮询开始时执行
- 只有在检测到挂单时才会查询仓位信息
- 取消操作是串行的,确保每个订单都能正确处理
- 不会影响正常的跟单逻辑

## 安全性

- 只取消止盈止损单,不影响普通限价单
- 只取消没有对应仓位的挂单,有仓位的挂单会被保留
- 使用错误处理装饰器,确保异常不会中断轮询流程
- 详细的日志记录,便于追踪和调试

## 总结

这个功能有效解决了止盈止损单触发后遗留挂单的问题,确保系统中的挂单始终与实际仓位保持一致,避免意外触发导致的交易问题。
