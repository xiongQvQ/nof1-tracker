# 合约资金管理功能说明

## 🎯 功能概述

合约资金管理功能解决了AI Agent同时下多个订单时的资金分配问题。系统会根据用户设定的总初始保证金，按照Agent原始投资的比例分配资金到各个订单中，同时保持与Agent相同的杠杆倍数和交易方向。

## 💰 核心概念

### 初始保证金 (Initial Margin)
- 用户实际投入的资金
- 通过 `--total-margin` 参数设置
- 默认值：1000 USDT

### 杠杆倍数 (Leverage)
- 与Agent的杠杆设置完全一致
- 放大交易规模的倍数
- 例如：20x杠杆意味着100 USDT保证金可以交易2000 USDT名义价值

### 名义持仓价值 (Notional Value)
- 初始保证金 × 杠杆倍数
- 实际控制的合约价值
- 计算公式：`notionalValue = allocatedMargin × leverage`

## 🔧 使用方法

### 基础命令
```bash
# 使用默认总保证金（1000 USDT）
npm start -- follow gpt-5

# 设置自定义总保证金
npm start -- follow gpt-5 --total-margin 2000

# 小额测试
npm start -- follow gpt-5 --total-margin 100

# 只进行风险评估，不实际交易
npm start -- follow gpt-5 --total-margin 500 --risk-only
```

### 高级配置
```bash
# 结合价格容忍度和资金管理
npm start -- follow gpt-5 --total-margin 1500 --price-tolerance 0.8

# 设置监控间隔
npm start -- follow gpt-5 --total-margin 1000 --interval 60

# 风险测试模式
npm start -- follow gpt-5 --total-margin 100 --risk-only --interval 300
```

## 📊 分配算法

### 分配原则
1. **保持Agent投资比例**：严格按照Agent原始保证金的比例分配
2. **保持杠杆倍数**：完全复制Agent的杠杆设置
3. **保持交易方向**：正数为BUY，负数为SELL
4. **动态计算数量**：根据分配保证金和当前价格重新计算

### 分配公式
```typescript
// 1. 计算Agent总原始保证金
totalOriginalMargin = Σ(position.margin)

// 2. 计算各币种分配比例
allocationRatio = position.margin / totalOriginalMargin

// 3. 分配用户保证金
allocatedMargin = totalMargin × allocationRatio

// 4. 计算名义持仓价值
notionalValue = allocatedMargin × leverage

// 5. 计算调整后数量
adjustedQuantity = notionalValue / currentPrice
```

## 📈 实际示例

### 示例1：GPT-5 Agent资金分配
假设GPT-5当前有6个仓位，用户设置总保证金1000 USDT：

```
🤖 Following agent: gpt-5
💰 Total margin set to $1000.00

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

XRPUSDT - SELL (20x leverage)
   📊 Original Margin: $201.16 (16.23%)
   💰 Allocated Margin: $162.30
   📈 Notional Value: $3246.00
   📏 Adjusted Quantity: 1353 XRP

DOGEUSDT - BUY (10x leverage)
   📊 Original Margin: $183.97 (14.85%)
   💰 Allocated Margin: $148.50
   📈 Notional Value: $1485.00
   📏 Adjusted Quantity: 7873 DOGE

SOLUSDT - BUY (20x leverage)
   📊 Original Margin: $177.83 (14.35%)
   💰 Allocated Margin: $143.50
   📈 Notional Value: $2870.00
   📏 Adjusted Quantity: 15.26 SOL

BNBUSDT - SELL (10x leverage)
   📊 Original Margin: $221.87 (17.90%)
   💰 Allocated Margin: $179.00
   📈 Notional Value: $1790.00
   📏 Adjusted Quantity: 1.62 BNB

==========================================
```

### 示例2：不同保证金的对比
```bash
# 100 USDT保证金
npm start -- follow gpt-5 --total-margin 100
💰 Total Margin: $100.00
📈 Total Notional Value: $1752.70

# 1000 USDT保证金（默认）
npm start -- follow gpt-5 --total-margin 1000
💰 Total Margin: $1000.00
📈 Total Notional Value: $17527.00

# 5000 USDT保证金
npm start -- follow gpt-5 --total-margin 5000
💰 Total Margin: $5000.00
📈 Total Notional Value: $87635.00
```

## 🎛️ 配置建议

### 保证金设置建议
| 资金规模 | 建议保证金 | 风险等级 | 适用场景 |
|---------|-----------|---------|---------|
| 小额测试 | 50-200 USDT | 低风险 | 功能测试、学习使用 |
| 标准跟单 | 500-2000 USDT | 中风险 | 日常跟单、风险可控 |
| 大额投资 | 2000-10000 USDT | 高风险 | 经验用户、资金充足 |
| 专业级别 | 10000+ USDT | 极高风险 | 专业交易、高风险承受 |

### 杠杆影响分析
| 杠杆倍数 | 保证金需求 | 风险特征 | 收益潜力 |
|---------|-----------|---------|---------|
| 1-5x | 低 | 低风险 | 稳定收益 |
| 10-20x | 中等 | 中等风险 | 平衡风险收益 |
| 50x+ | 高 | 高风险 | 高收益高风险 |

## 📊 监控和分析

### 关键指标
- **保证金利用率**：已分配保证金 / 总保证金
- **名义持仓价值**：总杠杆后的持仓规模
- **分配比例**：各币种的资金分配占比
- **杠杆倍数**：每个仓位的杠杆设置

### 风险提示
1. **杠杆风险**：高杠杆会放大收益和亏损
2. **市场风险**：价格波动可能导致保证金不足
3. **流动性风险**：某些币种可能存在流动性问题
4. **技术风险**：系统故障或网络问题

### 安全建议
- ✅ 从小金额开始测试
- ✅ 了解杠杆交易的风险
- ✅ 定期检查持仓状况
- ✅ 设置止损保护措施
- ✅ 不要投入超过可承受损失的资金

## 🔍 故障排除

### 常见问题

**Q: 为什么有些订单没有资金分配？**
A: 只有ENTER操作的订单才会进行资金分配，EXIT操作不需要分配新资金。

**Q: 分配的保证金与预期不符？**
A: 系统按照Agent原始保证金的比例精确分配，可能会有小数点精度差异。

**Q: 如何查看详细的分配信息？**
A: 系统会自动显示每个币种的原始保证金、分配保证金、名义价值和调整后数量。

**Q: 资金分配失败怎么办？**
A: 检查Agent的position数据是否包含margin字段，确保API返回完整数据。

### 调试技巧
```bash
# 使用风险模式查看分配详情
npm start -- follow gpt-5 --total-margin 100 --risk-only

# 检查特定Agent的数据
npm start -- follow gpt-5 --total-margin 100 --risk-only --interval 60

# 测试不同的保证金金额
npm start -- follow claude-sonnet-4-5 --total-margin 50 --risk-only
npm start -- follow claude-sonnet-4-5 --total-margin 500 --risk-only
```

## 💡 最佳实践

### 新手推荐
```bash
# 1. 小额测试
npm start -- follow buynhold_btc --total-margin 50 --risk-only

# 2. 中等金额实盘
npm start -- follow claude-sonnet-4-5 --total-margin 500

# 3. 监控和调整
npm start -- follow claude-sonnet-4-5 --total-margin 500 --interval 300
```

### 高级用户
```bash
# 多Agent分散投资
npm start -- follow gpt-5 --total-margin 2000 &
npm start -- follow claude-sonnet-4-5 --total-margin 1500 &
npm start -- follow deepseek-chat-v3.1 --total-margin 1000 &

# 动态调整保证金
# 根据市场情况调整总投资金额
npm start -- follow gpt-5 --total-margin 3000 --price-tolerance 1.0
```

### 风险管理
- 🎯 **分散投资**：不要把所有资金投入一个Agent
- 📊 **定期评估**：定期检查投资表现和风险状况
- 💰 **止损设置**：合理设置止损保护资金安全
- 📈 **逐步增加**：先小额测试，再逐步增加投资金额

---

**版本**: v1.0
**更新时间**: 2025-01-24
**相关文档**: [quick-reference.md](./quick-reference.md) | [price-tolerance.md](./price-tolerance.md)