# Nof1 AI Agent 跟单交易系统

![Tests](https://img.shields.io/badge/tests-254%20passed-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-92.79%25-brightgreen)
![TypeScript](https://img.shields.io/badge/typescript-5.0%2B-blue)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

一个用于跟踪 nof1.ai AI Agent 交易信号并自动执行 Binance 合约交易的命令行工具。支持多个AI量化交易Agent的实时跟单，包括自动开仓、平仓、换仓和止盈止损。

## ⚡ 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 构建项目
npm run build

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的 Binance API 密钥

# 4. 查看可用的AI Agent
npm start -- agents

# 5. 开始跟单（风险控制模式，不会真实交易）
npm start -- follow deepseek-chat-v3.1 --risk-only

# 6. 持续监控跟单（每30秒检查一次）
npm start -- follow gpt-5 --interval 30
```

## 📚 文档

- **[详细跟单策略文档](./docs/follow-strategy.md)** - 完整的跟单策略、风险评估和使用指南
- **[快速参考手册](./docs/quick-reference.md)** - 常用命令和快速操作指南

## 🚀 功能特性

- **🤖 AI Agent跟单**: 支持跟踪7个不同的AI量化交易Agent（GPT-5、Gemini、DeepSeek等）
- **📊 实时监控**: 可配置轮询间隔，实时跟踪Agent的交易动作
- **🔄 智能跟单**: 自动识别开仓、平仓、换仓（OID变化）和止盈止损信号
- **🛡️ 风险管理**: 内置风险评估机制，支持风险控制模式（只评估不执行）
- **⚡ 合约交易**: 完整支持Binance合约交易，包括杠杆设置和仓位管理
- **💻 CLI界面**: 用户友好的命令行界面，支持多种操作模式
- **🧪 TDD驱动**: 254个测试用例，92.79%代码覆盖率，确保代码质量和可靠性

## 🤖 支持的AI Agent

系统支持跟踪以下7个AI量化交易Agent：

| Agent名称 | 描述 | 特点 | 推荐场景 |
|----------|------|------|---------|
| **gpt-5** | 基于GPT-5的量化策略 | 激进策略，高频交易 | 适合经验丰富的交易者 |
| **gemini-2.5-pro** | 基于Gemini 2.5 Pro的策略 | 平衡策略 | 适合中等风险偏好 |
| **grok-4** | 基于Grok-4的策略 | 创新策略 | 适合探索新策略 |
| **qwen3-max** | 基于通义千问3 Max的策略 | 稳健策略 | 适合稳健型投资者 |
| **deepseek-chat-v3.1** | 基于DeepSeek Chat v3.1的策略 | 积极策略，短期交易 | 适合短线交易 |
| **claude-sonnet-4-5** | 基于Claude Sonnet 4.5的策略 | 平衡策略，稳健收益 | 适合长期持有 |
| **buynhold_btc** | 比特币买入持有策略 | 保守策略，长期持有 | 适合新手和保守投资者 |

**使用建议**：
- 🔰 **新手**: 建议从 `buynhold_btc` 或 `claude-sonnet-4-5` 开始
- 🎯 **进阶**: 可以尝试 `deepseek-chat-v3.1` 或 `gemini-2.5-pro`
- 🚀 **专业**: 适合使用 `gpt-5` 或 `grok-4`
- 💡 **建议**: 先使用 `--risk-only` 模式观察一段时间再实际交易

## 📋 系统要求

- Node.js >= 18.0.0
- npm >= 8.0.0
- TypeScript >= 5.0.0

## 🛠️ 安装

### 1. 克隆项目
```bash
git clone <repository-url>
cd nof1-tracker
```

### 2. 安装依赖
```bash
npm install
```

### 3. 构建项目
```bash
npm run build
```

### 4. 全局安装（可选）
```bash
npm install -g .
```

## ⚙️ 配置

### 1. 环境变量配置
复制环境变量模板：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置您的 API 密钥：

```env
# Nof1 API Configuration
NOF1_API_BASE_URL=https://nof1.ai/api

# Binance API Configuration - 必须支持合约交易
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_API_SECRET=your_binance_api_secret_here
BINANCE_TESTNET=true

# Trading Configuration
MAX_POSITION_SIZE=1000
DEFAULT_LEVERAGE=10
RISK_PERCENTAGE=2.0

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=trading.log
```

### 2. Binance API 密钥配置（重要）

本系统使用 **Binance 合约交易**，您需要正确配置API密钥权限：

#### 步骤1: 创建API密钥
1. 登录 [Binance](https://www.binance.com/)
2. 访问 [API Management](https://www.binance.com/en/my/settings/api-management)
3. 点击 "Create API" 创建新的API密钥
4. 完成安全验证（邮箱/手机验证码）

#### 步骤2: 配置API权限（关键）

**必须启用以下权限**：
- ✅ **Enable Futures** - 启用合约交易（必选）
- ✅ **Enable Reading** - 启用读取权限（必选）
- ⚠️ **Enable Spot & Margin Trading** - 现货交易（可选，建议启用）

**不要启用**：
- ❌ Enable Withdrawals - 不需要提现权限

#### 步骤3: IP白名单（推荐）
- 建议设置IP白名单以提高安全性
- 如果使用动态IP，可以选择"Unrestricted"（不限制IP）

#### 步骤4: 保存密钥
1. 复制 **API Key** 和 **Secret Key**
2. 将它们添加到 `.env` 文件：
   ```env
   BINANCE_API_KEY=你的API密钥
   BINANCE_API_SECRET=你的Secret密钥
   ```

#### 测试网环境（推荐新手使用）

在正式交易前，强烈建议先在测试网环境测试：

1. 访问 [Binance Testnet](https://testnet.binancefuture.com/)
2. 使用GitHub或Google账号登录
3. 在测试网创建API密钥
4. 在 `.env` 文件中设置：
   ```env
   BINANCE_TESTNET=true
   BINANCE_API_KEY=测试网API密钥
   BINANCE_API_SECRET=测试网Secret密钥
   ```

**测试网特点**：
- 使用虚拟资金，无真实资金风险
- 完全模拟真实交易环境
- 可以充分测试系统功能

### 3. Nof1 API 配置

工具会自动访问 `https://nof1.ai/api/account-totals` 端点获取AI Agent的交易信号，无需额外配置。

## 📖 使用方法

### 安装后使用

#### 1. 全局安装（推荐）
```bash
npm install -g .
```

#### 2. 本地使用
```bash
node dist/index.js [command] [options]
```

### 核心命令

#### 🤖 查看可用的AI Agent（重要）
在开始跟单前，先查看所有可用的AI Agent：
```bash
npm start -- agents
```

**输出示例**：
```
🤖 Fetching available AI agents...

📊 Available AI Agents:
==========================

Found 7 AI agent(s):

1. gpt-5
2. gemini-2.5-pro
3. grok-4
4. qwen3-max
5. deepseek-chat-v3.1
6. claude-sonnet-4-5
7. buynhold_btc

💡 Usage: npm start -- follow <agent-name>
Example: npm start -- follow deepseek-chat-v3.1
```

#### 🎯 跟单AI Agent（核心功能）
跟踪指定AI Agent的交易并自动执行：

**基础用法**：
```bash
# 跟单指定Agent（单次执行）
npm start -- follow deepseek-chat-v3.1

# 持续监控模式（每30秒轮询一次）
npm start -- follow gpt-5 --interval 30

# 风险控制模式（只评估不执行）
npm start -- follow claude-sonnet-4-5 --risk-only

# 自定义轮询间隔（60秒）
npm start -- follow gemini-2.5-pro --interval 60
```

**高级选项**：
```bash
# 设置总保证金（默认1000 USDT）
npm start -- follow gpt-5 --total-margin 5000

# 设置价格容差（默认0.5%）
npm start -- follow deepseek-chat-v3.1 --price-tolerance 1.0

# 组合使用
npm start -- follow gpt-5 --interval 30 --total-margin 2000 --risk-only
```

**输出示例**：
```
🤖 Starting to follow agent: gpt-5
⏰ Polling interval: 30 seconds
Press Ctrl+C to stop monitoring

📊 Follow Plans for gpt-5:
==========================

1. 📈 NEW POSITION: BTC
   Action: ENTER
   Side: BUY
   Quantity: 0.05
   Entry Price: 109538
   Leverage: 20x
   Entry OID: 210131632249
   ⚠️  Risk Score: 100/100
   ✅ Risk assessment: PASSED
   🔄 Executing trade...
   ✅ Trade executed successfully!

🎉 Follow analysis complete!
✅ Executed: 1 trade(s)
⏸️  Skipped: 0 trade(s)

--- Poll #2 ---
📋 No new actions required
```

#### 📋 其他辅助命令

**查看帮助**：
```bash
npm start -- --help
```

**系统状态检查**：
```bash
npm start -- status
```

### 命令详细说明

#### `agents` 命令
- **功能**: 获取所有可用的AI Agent列表
- **用途**: 在跟单前查看可用的Agent
- **输出**: 显示7个AI Agent的名称和使用示例

#### `follow <agent-name>` 命令（核心）
- **功能**: 跟踪指定AI Agent的交易信号并自动执行
- **参数**: `agent-name` - AI Agent名称（从agents命令获取）
- **选项**:
  - `-r, --risk-only`: 只进行风险评估，不执行交易（安全模式）
  - `-i, --interval <seconds>`: 轮询间隔（秒），默认30秒
  - `-t, --price-tolerance <percentage>`: 价格容差百分比，默认0.5%
  - `-m, --total-margin <amount>`: 总保证金（USDT），默认1000
- **跟单策略**:
  - 📈 **新开仓**: Agent开新仓位时自动跟单
  - 📉 **平仓**: Agent平仓时自动跟单
  - 🔄 **换仓**: 检测到entry_oid变化时，先平旧仓再开新仓
  - 🎯 **止盈止损**: 自动识别并执行止盈止损信号
  - 🔁 **持续监控**: 使用--interval参数可实现持续监控

#### `status` 命令
- **功能**: 检查系统状态和配置
- **输出**: 环境变量状态和API连接检查

### 使用示例

#### 1. 新手入门（推荐）
```bash
# 步骤1: 检查系统配置
npm start -- status

# 步骤2: 查看可用的AI Agent
npm start -- agents

# 步骤3: 使用风险控制模式测试（不会真实交易）
npm start -- follow buynhold_btc --risk-only

# 步骤4: 单次跟单测试
npm start -- follow deepseek-chat-v3.1
```

#### 2. 持续监控跟单
```bash
# 每30秒检查一次gpt-5的交易信号
npm start -- follow gpt-5 --interval 30

# 每60秒检查一次，使用风险控制模式
npm start -- follow claude-sonnet-4-5 --interval 60 --risk-only

# 自定义保证金和轮询间隔
npm start -- follow gemini-2.5-pro --interval 45 --total-margin 2000
```

#### 3. 多Agent并行监控
在不同终端窗口中运行：
```bash
# 终端1: 跟踪gpt-5
npm start -- follow gpt-5 --interval 30

# 终端2: 跟踪deepseek
npm start -- follow deepseek-chat-v3.1 --interval 45

# 终端3: 跟踪claude（风险控制模式）
npm start -- follow claude-sonnet-4-5 --interval 60 --risk-only
```

#### 4. 高级配置
```bash
# 设置更大的保证金和更宽松的价格容差
npm start -- follow gpt-5 --total-margin 5000 --price-tolerance 1.0 --interval 20

# 风险控制模式 + 自定义参数
npm start -- follow qwen3-max --risk-only --total-margin 3000 --price-tolerance 0.8
```

### 输出示例

#### agents 命令输出：
```
🤖 Fetching available AI agents...

📊 Available AI Agents:
==========================

Found 7 AI agent(s):

1. gpt-5
2. gemini-2.5-pro
3. grok-4
4. qwen3-max
5. deepseek-chat-v3.1
6. claude-sonnet-4-5
7. buynhold_btc

💡 Usage: npm start -- follow <agent-name>
Example: npm start -- follow deepseek-chat-v3.1
```

#### follow 命令输出（持续监控）：
```
🤖 Starting to follow agent: gpt-5
⏰ Polling interval: 30 seconds
Press Ctrl+C to stop monitoring

📊 Follow Plans for gpt-5:
==========================

1. 📈 NEW POSITION: BTC
   Action: ENTER
   Side: BUY
   Quantity: 0.05
   Entry Price: 109538
   Leverage: 20x
   Entry OID: 210131632249
   Reason: New position opened by gpt-5
   ⚠️  Risk Score: 100/100
   🚨 Warnings: High risk score
   ✅ Risk assessment: PASSED
   🔄 Executing trade...
   ✅ Trade executed successfully!

🎉 Follow analysis complete!
✅ Executed: 1 trade(s)
⏸️  Skipped: 0 trade(s)

--- Poll #2 ---
📋 No new actions required

--- Poll #3 ---
📊 Follow Plans for gpt-5:
==========================

1. 🔄 ENTRY OID CHANGED: BTC
   Action: EXIT (closing old position)
   Old Entry OID: 210131632249
   New Entry OID: 210131632250
   ✅ Trade executed successfully!

2. 📈 NEW ENTRY ORDER: BTC
   Action: ENTER
   Side: BUY
   Quantity: 0.05
   Entry Price: 109600
   Leverage: 20x
   ✅ Trade executed successfully!

🎉 Follow analysis complete!
✅ Executed: 2 trade(s)
⏸️  Skipped: 0 trade(s)
```

#### follow 命令输出（风险控制模式）：
```
🤖 Starting to follow agent: claude-sonnet-4-5

📊 Follow Plans for claude-sonnet-4-5:
==========================

1. 📈 NEW POSITION: ETH
   Action: ENTER
   Side: BUY
   Quantity: 0.8
   Entry Price: 3850.5
   Leverage: 10x
   ⚠️  Risk Score: 100/100
   ✅ Risk assessment: PASSED - Risk only mode

🎉 Follow analysis complete!
✅ Executed: 0 trade(s) (risk-only mode)
⏸️  Skipped: 0 trade(s)
```

#### status 命令输出：
```
🔍 Nof1 Trading CLI Status
==========================

📋 Environment Variables:
   BINANCE_API_KEY: ✅ Set
   BINANCE_API_SECRET: ✅ Set
   BINANCE_TESTNET: true

🌐 API Connectivity:
   📡 Checking nof1 API...
   🏪 Checking Binance API...
   ✅ All checks passed

🎉 System is ready for trading!
```

### 高级用法

#### AI Agent跟单策略详解

系统会自动识别以下4种交易信号：

1. **📈 新开仓 (ENTER)**
   - 触发条件：Agent开启新仓位（之前无仓位，现在有仓位）
   - 系统行为：自动跟单开仓

2. **📉 平仓 (EXIT)**
   - 触发条件：Agent关闭仓位（之前有仓位，现在无仓位）
   - 系统行为：自动跟单平仓

3. **🔄 换仓 (OID变化)**
   - 触发条件：同一交易对的entry_oid发生变化
   - 系统行为：先平掉旧仓位，再开新仓位
   - 说明：这是最复杂的场景，系统会执行两笔交易

4. **🎯 止盈止损**
   - 触发条件：当前价格达到profit_target或stop_loss
   - 系统行为：自动平仓
   - 多头：价格 >= profit_target 或 价格 <= stop_loss
   - 空头：价格 <= profit_target 或 价格 >= stop_loss

#### 风险管理配置

系统会自动评估每个交易计划的风险：

- **风险评分**: 基础分20 + 杠杆倍数×10，最高100分
- **杠杆检查**: 杠杆超过15x会发出高杠杆警告
- **仓位管理**: 基于total-margin参数计算合理仓位
- **价格容差**: 使用price-tolerance参数控制滑点

**风险等级参考**：
- 1-5x杠杆：低风险（30-70分）
- 8-10x杠杆：中等风险（100分）
- 15x+杠杆：高风险（100分+高杠杆警告）

#### 支持的交易类型
- **合约交易**: 完整支持Binance USDT永续合约
- **杠杆交易**: 支持1x-125x杠杆（建议≤20x）
- **订单类型**: MARKET市价单、LIMIT限价单
- **买卖方向**: 支持做多(BUY)和做空(SELL)

## 🔧 开发

### 运行测试
```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- --testPathPattern=api-analyzer

# 运行测试并生成覆盖率报告
npm run test:coverage

# 查看详细覆盖率报告
npm test -- --coverage
```

### 测试覆盖率
本项目采用 TDD（测试驱动开发）方法，具有全面的测试覆盖：

- **整体覆盖率**: 92.79% 语句覆盖率，78.14% 分支覆盖率，96.29% 函数覆盖率
- **核心组件**:
  - `analyze-api.ts`: 94.63% 语句覆盖率
  - `binance-service.ts`: 97.36% 语句覆盖率
  - `trading-executor.ts`: 89.71% 语句覆盖率
  - `config-manager.ts`: 90% 语句覆盖率
  - `risk-manager.ts`: 89.65% 语句覆盖率
  - `futures-capital-manager.ts`: 89.74% 语句覆盖率

- **测试套件**: 254 个测试用例全部通过
- **测试类型**: 单元测试、集成测试、API 测试、覆盖率测试

### 构建和开发
```bash
# 开发模式（自动重启）
npm run dev

# 构建
npm run build

# 启动
npm start
```

### 代码质量检查
```bash
# ESLint 检查
npm run lint

# 代码格式化
npm run format
```

## 📊 架构概览

```
src/
├── types/
│   └── trading.ts          # TradingPlan 接口定义
├── scripts/
│   └── analyze-api.ts      # API 分析引擎
├── services/
│   ├── binance-service.ts  # Binance API 集成
│   ├── trading-executor.ts # 交易执行引擎
│   └── risk-manager.ts     # 风险管理系统
├── __tests__/               # 测试文件
└── index.ts                # CLI 入口点
```

### 数据流程

1. **API 分析**: `ApiAnalyzer` → TradingPlan[]
2. **风险评估**: `RiskManager` → RiskAssessment
3. **订单转换**: `BinanceService` → BinanceOrder
4. **交易执行**: `TradingExecutor` → ExecutionResult
5. **结果展示**: CLI → 用户界面

## ⚠️ 重要提示

### 🔐 Binance API配置要求

本系统使用 **Binance 合约交易API**，配置API密钥时必须：

✅ **必须启用**：
- Enable Futures（启用合约交易）- **必选**
- Enable Reading（启用读取）- **必选**

❌ **不要启用**：
- Enable Withdrawals（提现权限）- 不需要

⚠️ **安全建议**：
- 设置IP白名单限制访问
- 定期更换API密钥
- 不要在代码中硬编码密钥

### 💰 风险提示

- **⚠️ 合约交易风险**: 合约交易使用杠杆，可能导致快速亏损，请谨慎使用
- **🧪 测试环境**: 强烈建议先在 Binance Testnet 测试，熟悉系统后再使用真实资金
- **📊 风险管理**: 请设置合理的最大仓位和杠杆限制（建议杠杆≤10x）
- **💡 风险控制模式**: 新手建议先使用 `--risk-only` 模式观察一段时间
- **💰 资金安全**: 使用专门的交易账户，避免投入无法承受损失的资金
- **📈 跟单风险**: AI Agent的策略不保证盈利，请自行评估风险

## 🔍 故障排除

### 常见问题

#### 1. API 密钥错误
```
Error: Invalid API Key
```
**解决方案**: 
- 检查 `.env` 文件中的 API 密钥是否正确
- 确认API密钥没有过期
- 验证是否复制了完整的密钥（没有多余空格）

#### 2. 合约交易权限不足（重要）
```
Error: Insufficient permissions
Error: API-key format invalid
```
**解决方案**: 
- ✅ 确保在Binance API管理页面启用了 **Enable Futures** 权限
- ✅ 确保启用了 **Enable Reading** 权限
- 如果是测试网，确认使用的是测试网API密钥
- 重新创建API密钥并正确配置权限

#### 3. Agent不存在
```
Error: Agent xxx not found
```
**解决方案**: 
- 使用 `npm start -- agents` 查看可用的Agent列表
- 确认Agent名称拼写正确（区分大小写）
- 支持的Agent: gpt-5, gemini-2.5-pro, grok-4, qwen3-max, deepseek-chat-v3.1, claude-sonnet-4-5, buynhold_btc

#### 4. 网络连接问题
```
Error: timeout
Error: ECONNREFUSED
```
**解决方案**: 
- 检查网络连接
- 确认防火墙设置
- 如果在中国大陆，可能需要使用VPN访问Binance API

#### 5. 测试失败
```
npm test 失败
```
**解决方案**: 
- 检查依赖是否正确安装：`npm install`
- 确认Node.js版本 >= 18.0.0
- 清除缓存后重新安装：`rm -rf node_modules package-lock.json && npm install`

## 📝 日志

工具会生成详细的日志记录，包括：
- API 请求和响应
- 交易执行结果
- 风险评估报告
- 错误信息和警告

日志文件位置：`trading.log`

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 开发规范
- 遵循 TDD 原则：先写测试，再实现功能
- 确保所有测试通过
- 遵循 TypeScript 最佳实践
- 添加适当的注释和文档

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

如果您遇到问题或有建议，请：

1. 查看 [Issues](../../issues) 页面
2. 创建新的 Issue 描述问题
3. 提供详细的错误信息和日志

---

**免责声明**: 本工具仅供学习和测试使用。实际交易存在资金损失风险，请谨慎使用并遵守相关法律法规。