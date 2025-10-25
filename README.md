# Nof1 AI Agent 跟单交易系统

中文 | [English](./README_EN.md)

![TypeScript](https://img.shields.io/badge/typescript-5.0%2B-blue)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

一个用于跟踪 nof1.ai AI Agent 交易信号并自动执行 Binance 合约交易的命令行工具。支持7个AI量化Agent的实时跟单，自动识别开仓、平仓、换仓和止盈止损信号。

## ⚡ 快速开始

```bash
# 1. 安装和构建
npm install && npm run build

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入 Binance API 密钥（必须启用合约交易权限）

# 3. 查看可用的AI Agent
npm start -- agents

# 4. 开始跟单（风险控制模式，不会真实交易）
npm start -- follow deepseek-chat-v3.1 --risk-only

# 5. 持续监控跟单（每30秒检查一次）
npm start -- follow gpt-5 --interval 30

# 6. 查看盈利统计
npm start -- profit
```

## 🚀 功能特性

- **🤖 AI Agent跟单**: 支持7个AI量化交易Agent（GPT-5、Gemini、DeepSeek等）
- **📊 实时监控**: 可配置轮询间隔，持续跟踪Agent交易动作
- **🔄 智能跟单**: 自动识别开仓、平仓、换仓（OID变化）和止盈止损
- **⚡ 合约交易**: 完整支持Binance USDT永续合约，支持1x-125x杠杆
- **📈 盈利统计**: 精确的盈利分析，基于真实交易数据计算（含手续费统计）
- **🛡️ 风险控制**: 支持`--risk-only`模式，只观察不执行交易

## 🤖 支持的AI Agent

| Agent名称 |
|----------|
| **gpt-5** |
| **gemini-2.5-pro** |
| **deepseek-chat-v3.1** |
| **claude-sonnet-4-5** |
| **buynhold_btc** |
| **grok-4** |
| **qwen3-max** |


## ⚙️ 配置

### 1. Binance API 密钥配置（重要）

本系统使用 **Binance 合约交易API**，必须正确配置权限：

#### 创建API密钥
1. 登录 [Binance](https://www.binance.com/) → [API Management](https://www.binance.com/en/my/settings/api-management)
2. 创建新API密钥，完成安全验证

#### 配置权限（关键）
- ✅ **Enable Futures** - 启用合约交易（必选）
- ✅ **Enable Reading** - 启用读取权限（必选）
- ❌ **Enable Withdrawals** - 不需要提现权限

#### 测试网环境（推荐新手）
1. 访问 [Binance Testnet](https://testnet.binancefuture.com/)
2. 创建测试网API密钥
3. 在`.env`中设置：
   ```env
   BINANCE_TESTNET=true
   BINANCE_API_KEY=测试网API密钥
   BINANCE_API_SECRET=测试网Secret密钥
   ```

### 2. 环境变量配置

```env
# Binance API Configuration - 必须支持合约交易
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_API_SECRET=your_binance_api_secret_here
BINANCE_TESTNET=true  # true=测试网, false=正式网

# Trading Configuration
MAX_POSITION_SIZE=1000
DEFAULT_LEVERAGE=10
RISK_PERCENTAGE=2.0
```

## 📖 使用方法

### 核心命令

#### 1. 查看可用的AI Agent
```bash
npm start -- agents
```

#### 2. 跟单AI Agent（核心功能）

**基础用法**：
```bash
# 单次执行
npm start -- follow deepseek-chat-v3.1

# 持续监控（每30秒轮询）
npm start -- follow gpt-5 --interval 30

# 风险控制模式（只观察不执行）
npm start -- follow claude-sonnet-4-5 --risk-only
```

**高级选项**：
```bash
# 设置总保证金（默认10 USDT）
npm start -- follow gpt-5 --total-margin 5000

# 设置价格容差（默认1.0%）
npm start -- follow deepseek-chat-v3.1 --price-tolerance 1.0

# 组合使用
npm start -- follow gpt-5 --interval 30 --total-margin 2000 --risk-only
```

**命令选项说明**：
- `-r, --risk-only`: 只评估不执行交易（安全模式）
- `-i, --interval <seconds>`: 轮询间隔（秒），默认30秒
- `-t, --price-tolerance <percentage>`: 价格容差百分比，默认1.0%
- `-m, --total-margin <amount>`: 总保证金（USDT），默认10

#### 3. 盈利统计分析
```bash
# 统计跟单开始以来的总盈利（默认包含浮动盈亏）
npm start -- profit

# 统计指定时间范围的盈利
npm start -- profit --since 7d        # 最近7天
npm start -- profit --since 2024-01-01 # 从2024年1月1日开始
npm start -- profit --since 1704067200000 # 使用时间戳

# 指定交易对统计
npm start -- profit --pair BTCUSDT

# JSON格式输出
npm start -- profit --format json

# 强制刷新缓存数据
npm start -- profit --refresh

# 包含当前仓位的浮动盈亏（默认行为）
npm start -- profit

# 仅显示当前仓位的浮动盈亏（不含已实现交易）
npm start -- profit --unrealized-only

# 排除浮动盈亏（仅分析已实现交易）
npm start -- profit --exclude-unrealized
```

**profit命令选项说明**：
- `-s, --since <time>`: 时间筛选器，支持"7d"（最近7天）、"2024-01-01"（指定日期）、时间戳格式。不指定则使用order-history.json的创建时间
- `-p, --pair <symbol>`: 指定交易对（如BTCUSDT）
- `--group-by <type>`: 分组方式：symbol（按交易对）或all（全部）
- `--format <type>`: 输出格式：table（表格）或json（JSON）
- `--refresh`: 强制刷新缓存，获取最新数据
- `--exclude-unrealized`: 排除当前仓位的浮动盈亏，仅分析已实现交易
- `--unrealized-only`: 仅显示当前仓位的浮动盈亏

**输出统计信息**：
- **基础统计**: 总交易次数、已实现盈亏（扣除手续费）、胜率、平均盈利/亏损
- **浮动盈亏**: 当前仓位数量、总浮动盈亏、详细仓位信息（默认包含，使用--exclude-unrealized时排除）
- **总盈亏**: 已实现盈亏 + 浮动盈亏的完整盈利情况
- **手续费分析**: 总手续费支出、平均每笔手续费
- **风险指标**: 最大单笔盈利、最大单笔亏损、浮动盈亏风险提示
- **分组统计**: 按交易对分组的详细盈利情况

#### 4. 系统状态检查
```bash
npm start -- status
```

### 跟单策略说明

系统自动识别4种交易信号：

1. **📈 新开仓 (ENTER)** - Agent开新仓位时自动跟单
2. **📉 平仓 (EXIT)** - Agent平仓时自动跟单
3. **🔄 换仓 (OID变化)** - 检测到entry_oid变化时，先平旧仓再开新仓
4. **🎯 止盈止损** - 价格达到profit_target或stop_loss时自动平仓

### 使用示例

**新手入门**：
```bash
# 1. 检查系统配置
npm start -- status

# 2. 查看可用Agent
npm start -- agents

# 3. 风险控制模式测试
npm start -- follow buynhold_btc --risk-only

# 4. 单次跟单测试
npm start -- follow deepseek-chat-v3.1

# 5. 查看盈利统计
npm start -- profit
```

**持续监控**：
```bash
# 每30秒检查一次
npm start -- follow gpt-5 --interval 30

# 多Agent并行监控（不同终端）
npm start -- follow gpt-5 --interval 30
npm start -- follow deepseek-chat-v3.1 --interval 45
npm start -- follow claude-sonnet-4-5 --interval 60 --risk-only
```

**盈利分析**：
```bash
# 查看总盈利情况（默认包含浮动盈亏）
npm start -- profit

# 仅查看已实现盈利（排除浮动盈亏）
npm start -- profit --exclude-unrealized

# 仅查看当前仓位的浮动盈亏
npm start -- profit --unrealized-only

# 按不同时间范围分析
npm start -- profit --since 1d      # 最近1天
npm start -- profit --since 7d      # 最近1周
npm start -- profit --since 30d     # 最近1月

# 按交易对分析
npm start -- profit --pair BTCUSDT --since 7d
npm start -- profit --pair ETHUSDT --format json

# JSON格式输出（默认包含浮动盈亏）
npm start -- profit --format json

# 仅浮动盈亏的JSON格式输出
npm start -- profit --unrealized-only --format json
```

## 📊 架构概览

```
src/
├── commands/               # 命令处理器
│   ├── agents.ts          # 获取AI Agent列表
│   ├── follow.ts          # 跟单命令（核心）
│   ├── profit.ts          # 盈利统计分析
│   └── status.ts          # 系统状态检查
├── services/              # 核心服务
│   ├── api-client.ts      # Nof1 API客户端
│   ├── binance-service.ts # Binance API集成
│   ├── trading-executor.ts # 交易执行引擎
│   ├── position-manager.ts # 仓位管理
│   ├── profit-calculator.ts # 盈利计算引擎
│   ├── trade-history-service.ts # 交易历史服务
│   ├── order-history-manager.ts # 订单历史管理
│   └── futures-capital-manager.ts # 合约资金管理
├── scripts/
│   └── analyze-api.ts     # API分析引擎（跟单策略）
├── types/                 # TypeScript类型定义
├── utils/                 # 工具函数
└── index.ts               # CLI入口点
```

**核心流程**：
```
跟单流程：
用户命令 → follow命令处理器 → ApiAnalyzer分析Agent信号
         ↓
    识别交易动作（开仓/平仓/换仓/止盈止损）
         ↓
    生成FollowPlan → TradingExecutor执行
         ↓
    BinanceService → Binance API → 交易完成

盈利分析流程：
用户命令 → profit命令处理器 → TradeHistoryService获取历史交易
         ↓
    ProfitCalculator计算盈利（基于realizedPnl和手续费）
         ↓
    生成统计报告（基础统计、分组统计、风险指标）
         ↓
    输出结果（表格/JSON格式）
```

## ⚠️ 重要提示

### 风险提示

- **⚠️ 合约交易风险**: 合约交易使用杠杆，可能导致快速亏损，请谨慎使用
- **🧪 测试环境**: 强烈建议先在 Binance Testnet 测试
- **📊 风险管理**: 建议杠杆≤10x，使用专门的交易账户
- **💡 风险控制模式**: 新手建议先使用`--risk-only`模式观察
- **📈 跟单风险**: AI Agent的策略不保证盈利，请自行评估风险

### 安全建议

- 设置IP白名单限制访问
- 定期更换API密钥
- 不要在代码中硬编码密钥
- 避免投入无法承受损失的资金

## 🔍 故障排除

### 常见问题

**1. 合约交易权限不足**
```
Error: Insufficient permissions
```
- ✅ 确保在Binance API管理页面启用了 **Enable Futures** 权限
- ✅ 确保启用了 **Enable Reading** 权限
- 重新创建API密钥并正确配置权限

**2. Agent不存在**
```
Error: Agent xxx not found
```
- 使用`npm start -- agents`查看可用Agent列表
- 确认Agent名称拼写正确（区分大小写）

**3. 网络连接问题**
```
Error: timeout
```
- 检查网络连接和防火墙设置
- 如果在中国大陆，可能需要使用VPN访问Binance API

**4. API密钥错误**
```
Error: Invalid API Key
```
- 检查`.env`文件中的API密钥是否正确
- 确认API密钥没有过期
- 验证是否复制了完整的密钥（没有多余空格）

## 🔧 开发

```bash
# 运行测试
npm test

# 开发模式（自动重启）
npm run dev

# 构建
npm run build

# 代码检查
npm run lint
```

## 📚 更多文档

- **[详细跟单策略文档](./docs/follow-strategy.md)** - 完整的跟单策略和风险评估
- **[快速参考手册](./docs/quick-reference.md)** - 常用命令快速查询

## 📄 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情

---

**免责声明**: 本工具仅供学习和测试使用。实际交易存在资金损失风险，请谨慎使用并遵守相关法律法规。
