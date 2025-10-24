# Nof1 Trading CLI

![Tests](https://img.shields.io/badge/tests-254%20passed-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-92.79%25-brightgreen)
![TypeScript](https://img.shields.io/badge/typescript-5.0%2B-blue)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

一个用于分析 nof1.ai API 信号并自动执行 Binance 合约交易的命令行工具。

## 💻 技术栈

- **Node.js**: 运行时环境 (>= 18.0.0)
- **TypeScript**: 类型安全的开发体验 (>= 5.0.0)
- **Jest**: 测试框架，支持单元测试、集成测试和覆盖率报告
- **Axios**: HTTP客户端，用于API请求
- **Crypto-JS**: 加密库，用于HMAC-SHA256签名
- **Commander.js**: CLI框架，提供用户友好的命令行界面
- **ESLint + Prettier**: 代码质量和格式化工具

## 📚 文档

- **[详细跟单策略文档](./docs/follow-strategy.md)** - 完整的跟单策略、风险评估和使用指南
- **[快速参考手册](./docs/quick-reference.md)** - 常用命令和快速操作指南

## 🚀 功能特性

- **📊 API分析**: 自动分析 nof1.ai account-totals API 返回的交易信号
- **🔄 交易执行**: 将交易计划转换为 Binance 合约订单并执行
- **🛡️ 风险管理**: 内置风险评估机制，防止过度杠杆和高风险交易
- **💻 CLI界面**: 用户友好的命令行界面，支持多种操作模式
- **🧪 TDD驱动**: 100%测试驱动开发，确保代码质量和可靠性

## 📋 系统要求

- Node.js >= 18.0.0
- npm >= 8.0.0
- TypeScript >= 5.0.0

## 🛠️ 安装

### 1. 克隆项目
```bash
git clone <repository-url>
cd nof1-maker
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

# Binance API Configuration
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

### 2. API 密钥配置

#### Binance API
1. 访问 [Binance API Management](https://www.binance.com/en/my/settings/api-management)
2. 创建新的 API 密钥
3. 启用现货和合约交易权限
4. 将 API 密钥和 Secret 添加到 `.env` 文件

#### Nof1 API
工具会自动访问 `https://nof1.ai/api/account-totals` 端点获取交易信号。

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

### 可用命令

#### 📋 查看帮助
```bash
nof1-trade --help
# 或
node dist/index.js --help
```

#### 🔍 系统状态检查
检查配置和连接状态：
```bash
nof1-trade status
# 或
node dist/index.js status
```

#### 📊 列出交易计划
查看所有可用的交易计划（不执行）：
```bash
nof1-trade list
# 或
node dist/index.js list

# 带lastHourlyMarker参数
nof1-trade list --marker 134
# 或
node dist/index.js list --marker 134
```

#### 🔄 分析交易计划
分析并执行所有交易计划：
```bash
nof1-trade analyze
# 或
node dist/index.js analyze

# 只进行风险评估，不执行交易
nof1-trade analyze --risk-only
# 或
node dist/index.js analyze --risk-only

# 指定lastHourlyMarker
nof1-trade analyze --marker 134
# 或
node dist/index.js analyze --marker 134
```

#### ⚡ 执行特定交易计划
根据ID执行单个交易：
```bash
nof1-trade execute plan-12345
# 或
node dist/index.js execute plan-12345

# 强制执行（忽略风险评估）
nof1-trade execute plan-12345 --force
# 或
node dist/index.js execute plan-12345 --force
```

### 命令详细说明

#### `analyze` 命令
- **功能**: 分析 nof1 API 并执行所有符合风险要求的交易
- **选项**:
  - `-m, --marker <number>`: lastHourlyMarker 参数
  - `-r, --risk-only`: 只进行风险评估，不执行交易

#### `execute <plan-id>` 命令
- **功能**: 执行指定的交易计划
- **参数**: `plan-id` - 交易计划ID
- **选项**:
  - `-f, --force`: 强制执行，忽略风险评估

#### `list` 命令
- **功能**: 列出所有可用的交易计划
- **选项**:
  - `-m, --marker <number>`: lastHourlyMarker 参数

#### `status` 命令
- **功能**: 检查系统状态和配置
- **输出**: 环境变量状态和API连接检查

### 使用示例

#### 1. 快速开始
```bash
# 检查系统状态
nof1-trade status

# 查看可用交易计划
nof1-trade list

# 分析并执行所有安全的交易
nof1-trade analyze
```

#### 2. 风险控制模式
```bash
# 只进行风险评估，不执行实际交易
nof1-trade analyze --risk-only

# 查看交易计划详情
nof1-trade list

# 执行特定交易
nof1-trade execute plan-12345
```

#### 3. 增量分析
```bash
# 获取最新的交易信号
nof1-trade analyze --marker 135

# 列出最新的交易计划
nof1-trade list --marker 135
```

#### 4. 高风险处理（谨慎使用）
```bash
# 强制执行高风险交易（不推荐）
nof1-trade execute plan-12345 --force
```

### 输出示例

#### analyze 命令输出：
```
🔍 Analyzing trading plans...

📊 Trading Plans Analysis:
==========================

📈 Found 2 trading plan(s):

1. BTCUSDT
   ID: plan-12345
   Side: BUY
   Type: MARKET
   Quantity: 0.001
   Leverage: 10x
   Timestamp: 2024-01-15T10:30:00.000Z
   ⚠️  Risk Score: 30/100
   ✅ Risk assessment: PASSED
   🔄 Executing trade...
   ✅ Trade executed successfully!
   📝 Order ID: order_abc123def456

2. ETHUSDT
   ID: plan-67890
   Side: SELL
   Type: LIMIT
   Quantity: 0.1
   Leverage: 5x
   Timestamp: 2024-01-15T10:31:00.000Z
   ⚠️  Risk Score: 75/100
   🚨 Warnings: High leverage detected
   ❌ Risk assessment: FAILED - Trade skipped

🎉 Trading analysis complete!
✅ Executed: 1 trade(s)
⏸️  Skipped: 1 trade(s) (high risk)
```

#### execute 命令输出：
```
🔍 Searching for trading plan: plan-12345
📊 Found trading plan: BTCUSDT
   Side: BUY
   Type: MARKET
   Quantity: 0.001
   Leverage: 10x

⚠️  Risk Score: 30/100
✅ Risk assessment PASSED

🔄 Executing trade...
✅ Trade executed successfully!
📝 Order ID: order_abc123def456
```

#### list 命令输出：
```
🔍 Analyzing trading plans...

📊 Available Trading Plans:
==========================

Found 2 trading plan(s):

1. BTCUSDT
   ID: plan-12345
   Side: BUY
   Type: MARKET
   Quantity: 0.001
   Leverage: 10x
   Risk Score: 30/100
   Status: ✅ Valid

2. ETHUSDT
   ID: plan-67890
   Side: SELL
   Type: LIMIT
   Quantity: 0.1
   Leverage: 20x
   Risk Score: 75/100
   Status: ❌ High Risk
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

#### 风险管理配置
系统会自动评估每个交易计划的风险：

- **风险评分**: 0-100 分，超过 100 分的交易将被拒绝
- **杠杆检查**: 杠杆超过 20x 会发出警告
- **仓位大小**: 基于配置的最大仓位限制

#### 交易类型支持
- **现货交易**: 支持 MARKET、LIMIT、STOP 订单
- **合约交易**: 支持指定杠杆倍数
- **买卖方向**: 支持 BUY 和 SELL 订单

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

## ⚠️ 风险提示

- **测试环境**: 建议先在 Binance Testnet 上测试
- **风险管理**: 请设置合理的最大仓位和杠杆限制
- **API 密钥安全**: 不要在代码中硬编码 API 密钥
- **资金安全**: 使用专门的交易账户，避免大额资金

## 🔍 故障排除

### 常见问题

#### 1. API 密钥错误
```
Error: Invalid API Key
```
**解决方案**: 检查 `.env` 文件中的 API 密钥是否正确

#### 2. 网络连接问题
```
Error: timeout
```
**解决方案**: 检查网络连接和防火墙设置

#### 3. 权限不足
```
Error: Insufficient permissions
```
**解决方案**: 确保 Binance API 密钥启用了合约交易权限

#### 4. 测试失败
```
npm test 失败
```
**解决方案**: 检查依赖是否正确安装：`npm install`

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