# Nof1 AI Agent 跟单策略详细文档

## 📋 目录

- [概述](#概述)
- [系统架构](#系统架构)
- [跟单策略规则](#跟单策略规则)
- [订单ID (OID) 机制](#订单id-oid-机制)
- [风险评估系统](#风险评估系统)
- [实际使用场景](#实际使用场景)
- [监控和日志](#监控和日志)
- [故障处理](#故障处理)
- [最佳实践](#最佳实践)

---

## 🎯 概述

Nof1 AI Agent跟单系统是一个自动化交易系统，专门用于跟踪和复制来自7个不同AI量化交易Agent的交易策略。系统通过轮询nof1.ai API获取最新的交易数据，并根据预设的跟单规则执行相应的交易操作。

### 支持的AI Agent

1. **gpt-5** - 基于GPT-5的量化策略
2. **gemini-2.5-pro** - 基于Gemini 2.5 Pro的策略
3. **grok-4** - 基于Grok-4的策略
4. **qwen3-max** - 基于通义千问3 Max的策略
5. **deepseek-chat-v3.1** - 基于DeepSeek Chat v3.1的策略
6. **claude-sonnet-4-5** - 基于Claude Sonnet 4.5的策略
7. **buynhold_btc** - 比特币买入持有策略

---

## 🏗️ 系统架构

### 核心架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI Layer (index.ts)                      │
│  Commands: agents | follow | status                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Command Handlers (commands/)                   │
│  • handleAgentsCommand()  • handleFollowCommand()                │
│  • handleStatusCommand()                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ApiAnalyzer (scripts/)                        │
│  • followAgent()          • getAvailableAgents()                 │
│  • analyzeAccountTotals() • 环境验证                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
┌───────────────────────────┐  ┌───────────────────────────┐
│   ApiClient (services/)   │  │  FollowService (services/)│
│  • getAccountTotals()     │  │  • 仓位变化检测            │
│  • getAgentData()         │  │  • 资金分配               │
│  • 缓存管理               │  │  • 止盈止损检查            │
└───────────────────────────┘  └───────────────────────────┘
                                            │
                ┌───────────────────────────┼───────────────────────────┐
                ▼                           ▼                           ▼
┌───────────────────────┐  ┌───────────────────────┐  ┌──────────────────────┐
│ PositionManager       │  │ RiskManager           │  │ FuturesCapitalManager│
│  • openPosition()     │  │  • assessRisk()       │  │  • allocateMargin()  │
│  • closePosition()    │  │  • priceTolerance()   │  │  • 资金分配计算       │
│  • cleanOrphanedOrders│  │  • 风险评分           │  │  • 数量调整          │
└───────────────────────┘  └───────────────────────┘  └──────────────────────┘
                │                           │
                ▼                           ▼
┌───────────────────────┐  ┌───────────────────────┐
│ TradingExecutor       │  │ OrderHistoryManager   │
│  • executePlan()      │  │  • isOrderProcessed() │
│  • 止盈止损设置        │  │  • saveProcessedOrder()│
│  • 余额检查           │  │  • 订单去重           │
└───────────────────────┘  └───────────────────────┘
                │
                ▼
┌───────────────────────┐
│ BinanceService        │
│  • placeOrder()       │
│  • getPositions()     │
│  • setLeverage()      │
│  • API签名认证        │
└───────────────────────┘
```

### 服务层职责

#### 1. **ApiClient** - API通信层
- NOF1 API数据获取
- 响应缓存管理（60秒TTL）
- Agent数据过滤和去重
- 自动重试机制

#### 2. **FollowService** - 跟单核心逻辑
- 仓位变化检测（新开仓、平仓、换仓）
- 止盈止损条件检查
- 资金分配协调
- 孤立挂单清理

#### 3. **PositionManager** - 仓位管理
- 开仓/平仓操作执行
- 仓位验证
- 挂单清理（止盈止损单）
- 平仓验证机制

#### 4. **RiskManager** - 风险控制
- 风险评分计算
- 价格容忍度检查
- 警告生成
- 配置管理

#### 5. **FuturesCapitalManager** - 资金管理
- 按比例分配保证金
- 杠杆倍数保持
- 交易数量调整
- 精度控制

#### 6. **TradingExecutor** - 交易执行
- 订单执行
- 止盈止损单设置
- 余额检查
- 杠杆设置

#### 7. **OrderHistoryManager** - 订单历史
- 订单去重（防止重复执行）
- 历史记录持久化
- 统计信息
- 旧记录清理

---

## 📊 跟单策略规则

### 策略优先级（从高到低）

### 1. 🔄 entry_oid变化检测（最高优先级）

**触发条件**: 同一交易对的`entry_oid`发生变化

**执行策略**:
1. **先平仓** - 使用`PositionManager.closePosition()`关闭旧仓位
2. **等待确认** - 延迟1秒确保平仓完成
3. **订单去重** - 检查新订单是否已处理
4. **价格检查** - 验证价格容忍度
5. **再开仓** - 使用`PositionManager.openPosition()`跟单新仓位

**实现逻辑** (FollowService.handleEntryChanged):
```typescript
private async handleEntryChanged(
  change: PositionChange,
  agentId: string,
  plans: FollowPlan[]
): Promise<void> {
  const { previousPosition, currentPosition } = change;
  
  // 1. 平仓旧仓位
  const closeReason = `Entry order changed (old: ${previousPosition.entry_oid} → new: ${currentPosition.entry_oid})`;
  const closeResult = await this.positionManager.closePosition(
    previousPosition.symbol, 
    closeReason
  );

  if (closeResult.success) {
    // 2. 等待平仓确认
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. 订单去重检查
    if (this.orderHistoryManager.isOrderProcessed(
      currentPosition.entry_oid, 
      currentPosition.symbol
    )) {
      console.log(`SKIPPED: ${currentPosition.symbol} already processed`);
      return;
    }

    // 4. 价格容忍度检查
    const priceTolerance = this.riskManager.checkPriceTolerance(
      currentPosition.entry_price,
      currentPosition.current_price,
      currentPosition.symbol
    );

    if (priceTolerance.shouldExecute) {
      // 5. 开新仓位
      const openReason = `New entry order (${currentPosition.entry_oid}) by ${agentId}`;
      await this.positionManager.openPosition(
        currentPosition, 
        openReason, 
        agentId
      );
    }
  }
}
```

**输出示例**:
```
🔄 CLOSING ALL POSITIONS: BTC - Entry order changed (old: 210131632249 → new: 210131632250)
📊 Found 1 position(s) and 2 open order(s) for BTC
✅ All open orders cancelled for BTC
📉 Closing position: BTC SELL 0.05
✅ Position closed successfully: BTC (Order ID: 12345)
✅ All positions successfully closed for BTC (1/1)
📈 OPENING POSITION: BTC BUY 0.05 @ 109600 - New entry order (210131632250) by gpt-5
💰 Price Check: Entry $109600 vs Current $109650 - Price difference 0.05% is within tolerance 0.5%
✅ Position opened successfully: BTC (Order ID: 12346)
```

### 2. 📈 新开仓检测

**触发条件**:
- 之前没有该交易对的仓位
- 当前`quantity > 0`

**执行策略**: 
1. **订单去重** - 检查entry_oid是否已处理
2. **价格检查** - 验证价格容忍度
3. **生成跟单计划** - 创建ENTER类型的FollowPlan

**实现逻辑** (FollowService.handleNewPosition):
```typescript
private handleNewPosition(
  change: PositionChange,
  agentId: string,
  plans: FollowPlan[]
): void {
  const { currentPosition } = change;
  
  // 1. 订单去重检查
  if (this.orderHistoryManager.isOrderProcessed(
    currentPosition.entry_oid, 
    currentPosition.symbol
  )) {
    console.log(`SKIPPED: ${currentPosition.symbol} already processed`);
    return;
  }

  // 2. 价格容忍度检查
  const priceTolerance = this.riskManager.checkPriceTolerance(
    currentPosition.entry_price,
    currentPosition.current_price,
    currentPosition.symbol
  );

  // 3. 创建跟单计划
  const followPlan: FollowPlan = {
    action: "ENTER",
    symbol: currentPosition.symbol,
    side: currentPosition.quantity > 0 ? "BUY" : "SELL",
    type: "MARKET",
    quantity: Math.abs(currentPosition.quantity),
    leverage: currentPosition.leverage,
    entryPrice: currentPosition.entry_price,
    reason: `New position opened by ${agentId} (OID: ${currentPosition.entry_oid})`,
    agent: agentId,
    timestamp: Date.now(),
    position: currentPosition,
    priceTolerance
  };

  plans.push(followPlan);
}
```

**输出示例**:
```
📈 NEW POSITION: BTC BUY 0.05 @ 109538 (OID: 210131632249)
💰 Price Check: Entry $109538 vs Current $109550 - Price difference 0.01% is within tolerance 0.5%
```

### 3. 📉 平仓检测

**触发条件**:
- 之前有仓位 (`quantity > 0`)
- 当前仓位为空 (`quantity = 0`)

**执行策略**: 生成EXIT类型的跟单计划

**实现逻辑** (FollowService.handlePositionClosed):
```typescript
private handlePositionClosed(
  change: PositionChange,
  agentId: string,
  plans: FollowPlan[]
): void {
  const { previousPosition, currentPosition } = change;
  
  const followPlan: FollowPlan = {
    action: "EXIT",
    symbol: currentPosition.symbol,
    side: previousPosition.quantity > 0 ? "SELL" : "BUY", // 平仓方向相反
    type: "MARKET",
    quantity: Math.abs(previousPosition.quantity),
    leverage: previousPosition.leverage,
    exitPrice: currentPosition.current_price,
    reason: `Position closed by ${agentId}`,
    agent: agentId,
    timestamp: Date.now()
  };

  plans.push(followPlan);
}
```

**输出示例**:
```
📉 POSITION CLOSED: BTC SELL 0.05 @ 109089.5
```

### 4. 🎯 止盈止损检测

**触发条件**: 当前价格达到止盈或止损目标

**多头仓位**:
- **止盈**: `current_price >= profit_target`
- **止损**: `current_price <= stop_loss`

**空头仓位**:
- **止盈**: `current_price <= profit_target`
- **止损**: `current_price >= stop_loss`

**执行策略**: 自动生成EXIT计划

**实现逻辑** (PositionManager.shouldExitPosition):
```typescript
shouldExitPosition(position: Position): boolean {
  if (position.quantity === 0) {
    return false;
  }

  const { current_price, exit_plan } = position;

  if (position.quantity > 0) { // 多头仓位
    return current_price >= exit_plan.profit_target ||
           current_price <= exit_plan.stop_loss;
  } else { // 空头仓位
    return current_price <= exit_plan.profit_target ||
           current_price >= exit_plan.stop_loss;
  }
}

getExitReason(position: Position): string {
  const { current_price, exit_plan } = position;

  if (position.quantity > 0) {
    if (current_price >= exit_plan.profit_target) {
      return `Take profit at ${exit_plan.profit_target}`;
    }
    if (current_price <= exit_plan.stop_loss) {
      return `Stop loss at ${exit_plan.stop_loss}`;
    }
  } else {
    if (current_price <= exit_plan.profit_target) {
      return `Take profit at ${exit_plan.profit_target}`;
    }
    if (current_price >= exit_plan.stop_loss) {
      return `Stop loss at ${exit_plan.stop_loss}`;
    }
  }
  return "Exit condition met";
}
```

**输出示例**:
```
🎯 EXIT SIGNAL: BTC - Take profit at 112880.2
🎯 EXIT SIGNAL: ETH - Stop loss at 3834.52
```

### 5. 🧹 孤立挂单清理（每次轮询前执行）

**触发时机**: 每次`followAgent()`调用开始时

**清理目标**: 没有对应仓位的止盈止损单

**执行策略**:
1. **获取所有挂单** - 调用`getOpenOrders()`
2. **获取所有仓位** - 调用`getAllPositions()`（包括零仓位）
3. **识别孤立单** - 筛选出没有对应仓位的止盈止损单
4. **逐个取消** - 取消识别出的孤立挂单

**实现逻辑** (PositionManager.cleanOrphanedOrders):
```typescript
async cleanOrphanedOrders(): Promise<{
  success: boolean;
  cancelledOrders: number;
  errors: string[];
}> {
  // 1. 获取所有开放订单
  const allOpenOrders = await this.binanceService.getOpenOrders();
  
  if (allOpenOrders.length === 0) {
    return { success: true, cancelledOrders: 0, errors: [] };
  }

  // 2. 获取所有仓位
  const allPositions = await this.binanceService.getAllPositions();
  
  // 创建仓位映射
  const positionMap = new Map<string, boolean>();
  for (const position of allPositions) {
    const positionAmt = parseFloat(position.positionAmt);
    positionMap.set(position.symbol, Math.abs(positionAmt) > 0);
  }

  // 3. 找出孤立的挂单
  const orphanedOrders = allOpenOrders.filter(order => {
    const isStopOrder = order.type === 'TAKE_PROFIT_MARKET' || 
                       order.type === 'STOP_MARKET' ||
                       order.type === 'TAKE_PROFIT' ||
                       order.type === 'STOP';
    
    if (!isStopOrder) return false;

    const hasPosition = positionMap.get(order.symbol) || false;
    return !hasPosition;
  });

  // 4. 取消孤立的挂单
  const errors: string[] = [];
  let cancelledCount = 0;

  for (const order of orphanedOrders) {
    try {
      const baseSymbol = order.symbol.replace('USDT', '');
      await this.binanceService.cancelOrder(baseSymbol, order.orderId);
      cancelledCount++;
    } catch (error) {
      errors.push(`Failed to cancel order ${order.orderId}`);
    }
  }

  return {
    success: errors.length === 0,
    cancelledOrders: cancelledCount,
    errors
  };
}
```

**输出示例**:
```
🔍 Checking for orphaned orders...
📊 Found 5 open order(s)
⚠️ Found 2 orphaned order(s)
❌ Cancelling orphaned TAKE_PROFIT_MARKET order: BTCUSDT (Order ID: 12345)
✅ Cancelled order 12345 for BTCUSDT
✅ Orphaned orders cleanup complete: 2/2 cancelled
```

---

## 🆔 订单ID (OID) 机制

### OID类型说明

| 字段 | 含义 | 说明 |
|------|------|------|
| `entry_oid` | 入场订单ID | 开仓时的订单唯一标识 |
| `tp_oid` | 止盈订单ID | 止盈订单的标识符 |
| `sl_oid` | 止损订单ID | 止损订单的标识符 |
| `oid` | 当前主订单ID | 当前活跃订单的标识符 |

### OID状态判断

- **`tp_oid = -1`**: 未设置止盈订单
- **`sl_oid = -1`**: 未设置止损订单
- **`tp_oid > 0`**: 已设置止盈订单
- **`sl_oid > 0`**: 已设置止损订单

### OID变化处理

**换仓场景**:
```
旧仓位: entry_oid: 210131632249, quantity: 0.05, symbol: "BTC"
新仓位: entry_oid: 210131632250, quantity: 0.05, symbol: "BTC"

系统响应:
1. 平仓旧仓位 (SELL 0.05 BTC)
2. 开新仓位 (BUY 0.05 BTC @ 新价格)
```

**加仓场景**:
```
旧仓位: entry_oid: 210131632249, quantity: 0.05, symbol: "BTC"
新仓位: entry_oid: 210131632249, quantity: 0.08, symbol: "BTC"

系统响应:
- 不执行操作 (OID相同，可能是价格更新或手续费调整)
```

---

## ⚠️ 风险评估系统

### 风险评分算法

```typescript
riskScore = Math.min(基础分数 + 杠杆风险系数, 100)

其中:
- 基础分数 = 20
- 杠杆风险系数 = 杠杆倍数 × 10
- 最大风险分数 = 100（上限）
```

### 风险等级分类

| 杠杆倍数 | 风险分数 | 风险等级 | 警告信息 |
|---------|---------|---------|---------|
| 1x | 30/100 | 低风险 | 无 |
| 5x | 70/100 | 中等风险 | 无 |
| 8x | 100/100 | 高风险 | High risk score |
| 10x | 100/100 | 高风险 | High risk score |
| 15x+ | 100/100 | 极高风险 | High risk score, High leverage detected |

### 交易有效性判断

```typescript
isValid = riskScore <= 100  // 所有交易都会通过基础风险检查
```

**注意**: 当前系统中所有交易的风险评分都≤100，因此都会通过基础风险评估。建议在实际使用时设置更严格的风险阈值。

---

## 🎬 实际使用场景

### 场景1: 正常跟单新开仓

**Agent操作**: gpt-5 开启BTC多头仓位
**API数据**:
```json
{
  "symbol": "BTC",
  "quantity": 0.05,
  "entry_oid": 210131632249,
  "entry_price": 109538,
  "leverage": 20
}
```

**系统响应**:
```
📈 NEW POSITION: BTC BUY 0.05 @ 109538 (OID: 210131632249)
⚠️  Risk Score: 100/100
🚨 Warnings: High risk score
✅ Risk assessment: PASSED
🔄 Executing trade...
✅ Trade executed successfully!
```

### 场景2: 换仓操作（OID变化）

**Agent操作**: deepseek 更换BTC入场订单
**API数据变化**:
```json
// 之前
{"entry_oid": 210131632249, "quantity": 0.05, "entry_price": 109538}
// 现在
{"entry_oid": 210131632250, "quantity": 0.05, "entry_price": 109600}
```

**系统响应**:
```
🔄 ENTRY OID CHANGED: BTC - closing old position (210131632249 → 210131632250)
📉 Position closed: BTC SELL 0.05 @ 109590
📈 NEW ENTRY ORDER: BTC BUY 0.05 @ 109600 (OID: 210131632250)
✅ Both trades executed successfully!
```

### 场景3: 止盈退出

**Agent操作**: BTC达到止盈目标
**API数据**:
```json
{
  "symbol": "BTC",
  "quantity": 0,
  "exit_plan": {"profit_target": 112880.2},
  "current_price": 112900
}
```

**系统响应**:
```
🎯 EXIT SIGNAL: BTC - Take profit at 112880.2
📉 Taking profit: BTC SELL 0.05 @ 112900
✅ Profit taken successfully!
```

### 场景4: 风险控制模式

**命令**: `npm start -- follow gpt-5 --risk-only`

**系统行为**:
- 执行完整的策略分析
- 进行风险评估
- **不执行实际交易**
- 显示所有交易计划和风险信息

**输出**:
```
📊 Follow Plans for gpt-5:
✅ Risk assessment: PASSED - Risk only mode
🎉 Follow analysis complete!
✅ Executed: 0 trade(s) (risk-only mode)
```

---

## 📊 监控和日志

### 轮询机制

- **默认轮询间隔**: 30秒
- **可配置间隔**: `--interval <seconds>`
- **实时监控**: Ctrl+C 优雅退出

### 日志级别

| 级别 | 类型 | 示例 |
|------|------|------|
| 📡 INFO | API调用 | `📡 Calling API: https://nof1.ai/api/account-totals?lastHourlyMarker=134` |
| 🎯 INFO | 状态更新 | `🎯 Found agent gpt-5 (marker: 138) with 6 positions` |
| 📈 ACTION | 开仓操作 | `📈 NEW POSITION: BTC BUY 0.05 @ 109538` |
| 🔄 ACTION | 换仓操作 | `🔄 ENTRY OID CHANGED: BTC - closing old position` |
| 📉 ACTION | 平仓操作 | `📉 POSITION CLOSED: BTC SELL 0.05 @ 109089.5` |
| 🎯 ACTION | 止盈止损 | `🎯 EXIT SIGNAL: BTC - Take profit at 112880.2` |
| ⚠️  WARNING | 风险警告 | `⚠️ Risk Score: 100/100` |
| 🚨 WARNING | 高风险警告 | `🚨 Warnings: High leverage detected` |
| ❌ ERROR | 错误信息 | `❌ Agent not-found: invalid-agent` |
| ✅ SUCCESS | 成功信息 | `✅ Trade executed successfully!` |

### 实时监控示例

```bash
npm start -- follow gpt-5 --interval 60

# 输出示例:
🤖 Starting to follow agent: gpt-5
⏰ Polling interval: 60 seconds
Press Ctrl+C to stop monitoring

--- Poll #1 ---
🤖 Following agent: gpt-5
🎯 Found agent gpt-5 (marker: 138) with 6 positions
📈 NEW POSITION: BTC BUY 0.05 @ 109538 (OID: 210131632249)
✅ Generated 1 follow plan(s)

--- Poll #2 ---
🤖 Following agent: gpt-5
🎯 Found agent gpt-5 (marker: 138) with 6 positions
📋 No new actions required

--- Poll #3 ---
🤖 Following agent: gpt-5
🎯 Found agent gpt-5 (marker: 138) with 6 positions
🔄 ENTRY OID CHANGED: BTC - closing old position (210131632249 → 210131632250)
📉 POSITION CLOSED: BTC SELL 0.05 @ 109590
📈 NEW ENTRY ORDER: BTC BUY 0.05 @ 109600 (OID: 210131632250)
✅ Generated 2 follow plan(s)
```

---

## 🚨 故障处理

### 常见错误类型

#### 1. API连接错误

**错误信息**: `❌ Error during polling: Request timeout`

**解决方案**:
- 检查网络连接
- 确认API端点可访问
- 系统会自动重试下次轮询

#### 2. Agent不存在

**错误信息**: `❌ Agent invalid-agent not found`

**解决方案**:
- 使用 `npm start -- agents` 查看可用agent列表
- 确认agent名称拼写正确

#### 3. 风险评估失败

**错误信息**: `❌ Risk assessment: FAILED`

**解决方案**:
- 检查杠杆设置是否过高
- 使用 `--force` 参数强制执行（不推荐）
- 调整风险管理参数

#### 4. 交易执行失败

**错误信息**: `❌ Trade execution failed: Insufficient balance`

**解决方案**:
- 检查账户余额
- 确认API密钥权限
- 检查交易时段限制

### 系统恢复机制

1. **自动重试**: API调用失败会在下次轮询自动重试
2. **状态保持**: 系统会记住上次轮询的状态，确保OID跟踪连续性
3. **优雅退出**: Ctrl+C会安全停止监控，不会丢失数据
4. **错误隔离**: 单个交易失败不会影响其他交易执行

---

## 💡 最佳实践

### 1. 选择合适的AI Agent

| Agent | 特点 | 适合场景 | 风险等级 |
|-------|------|---------|---------|
| `buynhold_btc` | 保守策略 | 长期投资 | 低风险 |
| `claude-sonnet-4-5` | 平衡策略 | 稳健收益 | 中风险 |
| `deepseek-chat-v3.1` | 积极策略 | 短期交易 | 高风险 |
| `gpt-5` | 激进策略 | 高频交易 | 极高风险 |

### 2. 风险管理建议

#### 新手建议
```bash
# 使用风险控制模式
npm start -- follow buynhold_btc --risk-only --interval 300

# 小额测试
npm start -- follow claude-sonnet-4-5 --risk-only
```

#### 进阶用户
```bash
# 正常跟单
npm start -- follow deepseek-chat-v3.1 --interval 60

# 多agent监控（多个终端）
npm start -- follow gpt-5 --interval 30 &
npm start -- follow gemini-2.5-pro --interval 45 &
```

#### 专业用户
```bash
# 高频监控
npm start -- follow gpt-5 --interval 15

# 风险控制下的激进跟单
npm start -- follow gpt-5 --interval 30
```

### 3. 监控建议

#### 定期检查
- 每日查看交易执行结果
- 监控账户余额变化
- 检查系统日志错误

#### 实时监控
- 关注市场重大事件
- 监控agent持仓变化
- 注意止盈止损触发

#### 性能优化
- 根据网络状况调整轮询间隔
- 监控系统资源使用
- 定期重启清理内存

### 4. 安全建议

#### API密钥安全
- 使用测试网环境进行初期测试
- 定期更换API密钥
- 限制API权限（只开启必要权限）

#### 资金安全
- 使用专门账户进行跟单
- 设置合理的最大损失限额
- 定期提取盈利资金

#### 系统安全
- 定期更新系统版本
- 监控异常登录活动
- 备份重要配置文件

---

## 📞 技术支持

### 问题反馈

如果遇到问题，请提供以下信息：

1. **系统信息**
   - 操作系统版本
   - Node.js版本
   - 项目版本号

2. **错误描述**
   - 完整的错误信息
   - 复现步骤
   - 使用的命令参数

3. **日志信息**
   - 相关的控制台输出
   - 系统日志文件
   - API响应数据

### 联系方式

- GitHub Issues: [项目Issues页面]
- 文档更新: 请提交PR到文档仓库
- 功能建议: 通过Issues提交feature request

---

## 📚 相关文档

- **[quick-reference.md](./quick-reference.md)** - 快速参考手册
- **[orphaned-orders-cleanup.md](./orphaned-orders-cleanup.md)** - 孤立挂单清理功能说明
- **[futures-capital-management.md](./futures-capital-management.md)** - 资金管理系统说明
- **[price-tolerance.md](./price-tolerance.md)** - 价格容忍度机制说明
- **[REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md)** - 代码重构总结

---

## 🔄 版本历史

### v2.0.0 (2025-10-24)
- ✨ 重构为模块化服务层架构
- ✨ 新增订单去重机制
- ✨ 新增孤立挂单清理功能
- ✨ 新增价格容忍度检查
- ✨ 新增资金管理系统
- 📝 完善文档和测试

### v1.0.0 (2025-10-23)
- 🎉 初始版本发布
- 📊 基础跟单功能
- 🤖 支持7个AI Agent

---

**最后更新**: 2025-10-24
**文档版本**: v2.0.0
**系统版本**: nof1-trading-cli v2.0.0

---

*免责声明: 本文档仅供学习和参考使用。实际交易存在资金损失风险，请谨慎使用并遵守相关法律法规。*