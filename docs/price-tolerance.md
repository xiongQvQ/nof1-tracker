# 价格容忍度功能说明

## 🎯 功能概述

价格容忍度功能解决了AI Agent入场价格与当前市场价格存在差异的问题。当差异低于设定阈值时，系统会市价执行；超过阈值时，则放弃执行并等待新的入场订单。

## 📊 工作原理

### 价格差异计算
```typescript
priceDifference = |(currentPrice - entryPrice) / entryPrice| × 100%
```

### 决策逻辑
1. **计算差异**: 比较AI Agent的入场价格与当前市场价格
2. **阈值检查**: 与设定的容忍度阈值进行比较
3. **执行决策**:
   - 差异 ≤ 阈值 → 市价执行 ✅
   - 差异 > 阈值 → 放弃执行 ❌

## 🔧 配置方法

### 1. CLI命令配置
```bash
# 使用默认容忍度（0.5%）
npm start -- follow deepseek-chat-v3.1

# 自定义容忍度（1%）
npm start -- follow deepseek-chat-v3.1 --price-tolerance 1.0

# 严格价格控制（0.2%）
npm start -- follow deepseek-chat-v3.1 --price-tolerance 0.2

# 宽松价格控制（2%）
npm start -- follow deepseek-chat-v3.1 --price-tolerance 2.0
```

### 2. 环境变量配置
```bash
# 设置默认价格容忍度
export PRICE_TOLERANCE=0.8

# 设置特定币种容忍度
export BTCUSDT_TOLERANCE=1.0
export ETHUSDT_TOLERANCE=0.5
```

### 3. 编程配置
```typescript
import { ConfigManager } from './services/config-manager';

const configManager = new ConfigManager();
configManager.setPriceTolerance(0.8); // 全局设置
configManager.setSymbolTolerance('BTCUSDT', 1.0); // 币种特定设置
```

## 📈 实际示例

### 示例1：价格差异在容忍范围内
```
🤖 跟单 Agent: deepseek-chat-v3.1
📈 NEW POSITION: BTCUSDT BUY 0.001 @ 43000 (OID: 209776191762)
💰 Price Check: Entry $43000 vs Current $43215
📏 Price Difference: 0.50% (Tolerance: 0.50%)
✅ Price Tolerance: Price difference 0.50% is within tolerance 0.50%
✅ Risk assessment: PASSED
🔄 Executing trade...
✅ Trade executed successfully!
```

### 示例2：价格差异超出容忍范围
```
🤖 跟单 Agent: deepseek-chat-v3.1
📈 NEW POSITION: BTCUSDT BUY 0.001 @ 43000 (OID: 209776191762)
💰 Price Check: Entry $43000 vs Current $43500
📏 Price Difference: 1.16% (Tolerance: 0.50%)
✅ Price Tolerance: Price difference 1.16% exceeds tolerance 0.50%
❌ Risk assessment: FAILED - Trade skipped
```

## 🎛️ 容忍度建议

### 市场状况与容忍度设置
| 市场状况 | 建议容忍度 | 说明 |
|---------|-----------|------|
| 稳定市场 | 0.2% - 0.5% | 价格变化小，严格跟单 |
| 波动市场 | 0.5% - 1.0% | 适度放宽，避免错过机会 |
| 高波动市场 | 1.0% - 2.0% | 宽松设置，优先执行 |
| 新闻事件期间 | 1.5% - 3.0% | 应对剧烈价格波动 |

### 不同策略的容忍度
| 交易策略 | 建议容忍度 | 风险等级 |
|---------|-----------|---------|
| 保守跟单 | 0.2% - 0.3% | 低风险 |
| 标准跟单 | 0.5% - 0.8% | 中风险 |
| 积极跟单 | 1.0% - 1.5% | 高风险 |
| 高频跟单 | 1.5% - 2.5% | 极高风险 |

## 📊 性能影响

### 执行率分析
- **0.2%容忍度**: 约60-70%执行率，高精度跟单
- **0.5%容忍度**: 约80-85%执行率，平衡精度和机会
- **1.0%容忍度**: 约90-95%执行率，优先执行机会
- **2.0%容忍度**: 约98%+执行率，几乎不跳过

### 风险收益平衡
- **低容忍度**: 减少滑点损失，但可能错过交易机会
- **高容忍度**: 增加交易机会，但可能承受滑点损失

## 🛠️ 故障排除

### 常见问题
1. **所有交易都被跳过**
   - 检查容忍度设置是否过严
   - 确认市场价格数据是否正常
   - 考虑市场波动性是否增加

2. **从未执行价格检查**
   - 确认使用的是ENTER操作
   - 检查API是否返回current_price数据
   - 验证position数据完整性

3. **价格差异显示异常**
   - 检查entry_price是否为0或负数
   - 验证current_price数据有效性
   - 确认价格数据源可靠性

### 调试技巧
```bash
# 使用风险模式查看详细信息
npm start -- follow deepseek-chat-v3.1 --risk-only --price-tolerance 0.5

# 检查特定币种的价格容忍度
export BTCUSDT_TOLERANCE=1.0
npm start -- follow gpt-5 --risk-only
```

## 📝 最佳实践

### 1. 渐进式调整
```bash
# 从严格开始
npm start -- follow claude-sonnet-4-5 --price-tolerance 0.2 --risk-only

# 逐步放宽
npm start -- follow claude-sonnet-4-5 --price-tolerance 0.5 --risk-only
npm start -- follow claude-sonnet-4-5 --price-tolerance 0.8 --risk-only

# 确定最优值后实盘
npm start -- follow claude-sonnet-4-5 --price-tolerance 0.8
```

### 2. 多Agent差异化设置
```bash
# 终端1：保守Agent + 严格容忍度
npm start -- follow buynhold_btc --price-tolerance 0.3 &

# 终端2：激进Agent + 宽松容忍度
npm start -- follow gpt-5 --price-tolerance 1.2 &
```

### 3. 市场适应性调整
```bash
# 稳定市场（夜间）
npm start -- follow deepseek-chat-v3.1 --price-tolerance 0.5

# 波动市场（开盘时段）
npm start -- follow deepseek-chat-v3.1 --price-tolerance 1.0

# 新闻事件期间
npm start -- follow deepseek-chat-v3.1 --price-tolerance 2.0
```

## 🔍 监控和分析

### 关键指标
- **执行率**: 实际执行 / 总信号数量
- **平均滑点**: 实际成交价 vs 预期价格差异
- **跳过原因**: 价格差异 vs 其他原因
- **容忍度使用率**: 接近容忍度阈值的交易比例

### 日志分析
系统会自动记录价格检查信息：
```
💰 Price Check: Entry $43000 vs Current $43215
📏 Price Difference: 0.50% (Tolerance: 0.50%)
✅ Price Tolerance: Price difference 0.50% is within tolerance 0.50%
```

---

**版本**: v1.0
**更新时间**: 2025-01-24
**相关文档**: [quick-reference.md](./quick-reference.md) | [follow-strategy.md](./follow-strategy.md)