# Nof1 跟单系统快速参考

## 🚀 快速开始

### 基础命令
```bash
# 查看所有可用AI Agent
npm start -- agents

# 跟单特定Agent（只风险评估）
npm start -- follow deepseek-chat-v3.1 --risk-only

# 实际跟单交易
npm start -- follow deepseek-chat-v3.1

# 持续监控（每60秒轮询）
npm start -- follow deepseek-chat-v3.1 --interval 60

# 自定义价格容忍度（1%）
npm start -- follow deepseek-chat-v3.1 --price-tolerance 1.0

# 严格价格控制（0.2%）
npm start -- follow deepseek-chat-v3.1 --price-tolerance 0.2

# 资金管理跟单（设置总保证金）
npm start -- follow gpt-5 --total-margin 1000

# 小额测试（100 USDT保证金）
npm start -- follow claude-sonnet-4-5 --total-margin 100 --risk-only

# 大额投资（5000 USDT保证金）
npm start -- follow gpt-5 --total-margin 5000
```

## 🤖 AI Agent列表

| Agent |
|-------|
| `buynhold_btc` |
| `claude-sonnet-4-5` |
| `deepseek-chat-v3.1` |
| `gpt-5` |
| `gemini-2.5-pro` |
| `grok-4` |
| `qwen3-max` |

## 📊 跟单策略优先级

### 1. 🔄 换仓检测（最高优先级）
**条件**: `entry_oid`发生变化
**操作**: 先平仓 → 再开仓
```
🔄 ENTRY OID CHANGED: BTC (old → new)
📉 Close old position
📈 Open new position
```

### 2. 📈 新开仓检测
**条件**: 之前无仓位 + `quantity > 0`
**操作**: 直接跟单
```
📈 NEW POSITION: BTC BUY 0.05 @ 109538 (OID: 210131632249)
```

### 3. 📉 平仓检测
**条件**: `quantity = 0`
**操作**: 跟单平仓
```
📉 POSITION CLOSED: BTC SELL 0.05 @ 109089.5
```

### 4. 🎯 止盈止损检测
**条件**: 价格达到目标
**操作**: 自动平仓
```
🎯 EXIT SIGNAL: BTC - Take profit at 112880.2
```

## ⚠️ 风险评估

### 风险评分公式
```
riskScore = 20 + (leverage × 10)
```

### 价格容忍度检查
```
priceDifference = |(currentPrice - entryPrice) / entryPrice| × 100%
```

**默认容忍度**: 0.5%
**行为**:
- 差异 ≤ 0.5% → 执行交易 ✅
- 差异 > 0.5% → 跳过交易 ❌

### 风险等级
| 杠杆 | 风险分数 | 等级 |
|------|---------|------|
| 1x | 30/100 | 低风险 ✅ |
| 5x | 70/100 | 中等风险 ⚠️ |
| 8x+ | 100/100 | 高风险 🚨 |

### 价格容忍度示例
```bash
# 默认0.5%容忍度
Entry: $100, Current: $100.40 → 0.4% ✅ 执行
Entry: $100, Current: $101.00 → 1.0% ❌ 跳过

# 1%容忍度
npm start -- follow gpt-5 --price-tolerance 1.0
Entry: $100, Current: $100.80 → 0.8% ✅ 执行
```

## 💰 资金管理

### 资金分配原则
- **比例分配**：按Agent原始保证金比例分配资金
- **杠杆保持**：完全复制Agent的杠杆倍数
- **方向保持**：保持Agent的BUY/SELL方向
- **数量调整**：根据分配资金重新计算交易数量

### 资金分配示例
```bash
npm start -- follow gpt-5 --total-margin 1000

💰 Capital Allocation for gpt-5:
==========================================
💰 Total Margin: $1000.00
📈 Total Notional Value: $17527.00

BTCUSDT - BUY (20x leverage)
   📊 Original Margin: $248.66 (20.07%)
   💰 Allocated Margin: $200.70
   📈 Notional Value: $4014.00
   📏 Adjusted Quantity: 0.0366 BTC

ETHUSDT - BUY (20x leverage)
   📊 Original Margin: $205.80 (16.61%)
   💰 Allocated Margin: $166.10
   📈 Notional Value: $3322.00
   📏 Adjusted Quantity: 0.854 ETH
```

### 保证金设置建议
| 资金规模 | 建议保证金 | 适用场景 |
|---------|-----------|---------|
| 测试学习 | 50-200 USDT | 功能测试、风险控制 |
| 标准投资 | 500-2000 USDT | 日常跟单、平衡风险 |
| 大额投资 | 2000-10000 USDT | 经验用户、高收益 |

## 🆔 OID说明

| 字段 | 含义 |
|------|------|
| `entry_oid` | 入场订单ID |
| `tp_oid` | 止盈订单ID |
| `sl_oid` | 止损订单ID |
| `oid` | 当前主订单ID |

### OID状态
- `tp_oid = -1`: 未设置止盈
- `sl_oid = -1`: 未设置止损
- OID变化 = 换仓信号

## 📝 实际使用示例

### 新手推荐
```bash
# 1. 先查看可用agent
npm start -- agents

# 2. 风险测试模式
npm start -- follow claude-sonnet-4-5 --risk-only --interval 300

# 3. 小额实盘测试
npm start -- follow buynhold_btc --interval 300
```

### 进阶使用
```bash
# 正常跟单
npm start -- follow deepseek-chat-v3.1 --interval 60

# 高频监控
npm start -- follow gpt-5 --interval 30
```

### 多Agent监控
```bash
# 终端1
npm start -- follow gpt-5 --interval 30 &

# 终端2
npm start -- follow deepseek-chat-v3.1 --interval 45 &
```

## 🔧 故障排除

### 常见问题
```bash
# 检查系统状态
npm start -- status

# 检查网络连接
curl "https://nof1.ai/api/account-totals?lastHourlyMarker=134"

# 查看详细日志
npm start -- follow gpt-5 --risk-only
```

### 错误类型
- `Agent not found`: 检查agent名称
- `Network error`: 检查网络连接
- `Risk assessment failed`: 杠杆过高

## 💡 最佳实践

### 安全建议
- ✅ 先用 `--risk-only` 测试
- ✅ 从小资金开始
- ✅ 设置合理轮询间隔
- ✅ 定期检查交易结果
- 📏 根据市场情况调整价格容忍度
- 💰 设置合理的总保证金

### 风险控制
- 🎯 选择适合的Agent
- 📊 监控风险评分
- 💰 使用专门账户
- 📈 定期提取盈利
- 💰 价格容忍度建议：
  - 稳定市场：0.2-0.5%
  - 波动市场：0.5-1.0%
  - 高频交易：1.0-2.0%
- 💰 资金管理建议：
  - 测试阶段：50-200 USDT
  - 标准投资：500-2000 USDT
  - 分散投资：不要全部投入一个Agent

---

**快速参考版本**: v1.0
**详细文档**: [follow-strategy.md](./follow-strategy.md)