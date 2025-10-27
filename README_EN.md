# Nof1 AI Agent Copy Trading System

[中文文档](./README.md) | English

![TypeScript](https://img.shields.io/badge/typescript-5.0%2B-blue)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

A command-line tool for tracking nof1.ai AI Agent trading signals and automatically executing Binance futures trades. Supports real-time copy trading from 7 AI quantitative agents with automatic position opening, closing, switching, and stop-loss/take-profit.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/F1F11HO935)

<img width="220" height="286" alt="b7c0054cf81fe6735d60ab5de48243e5" src="https://github.com/user-attachments/assets/4628befa-96b4-42dd-af42-4724a9a28336" />

## ⚡ Quick Start

```bash
# 1. Install and build
npm install && npm run build

# 2. Configure environment variables
cp .env.example .env
# Edit .env file, add your Binance API keys (must enable futures trading)

# 3. View available AI Agents
npm start -- agents

# 4. Test Telegram notifications (optional)
npm start -- telegram-test

# 5. Start copy trading (risk-only mode, no real trades)
npm start -- follow deepseek-chat-v3.1 --risk-only

# 6. Continuous monitoring (check every 30 seconds)
npm start -- follow gpt-5 --interval 30

# 7. View profit statistics
npm start -- profit
```

## 🚀 Features

- **🤖 AI Agent Copy Trading**: Support 7 AI quantitative trading agents (GPT-5, Gemini, DeepSeek, etc.)
- **📊 Real-time Monitoring**: Configurable polling interval for continuous agent tracking
- **🔄 Smart Copy Trading**: Auto-detect open, close, switch positions (OID changes), and stop-loss/take-profit
- **🎯 Profit Target Exit**: Support custom profit targets with automatic position closing when reached
- **🔄 Auto Refollow**: Optional auto-refollow feature that automatically re-enters after profit target exit
- **⚡ Futures Trading**: Full support for Binance USDT perpetual futures, 1x-125x leverage
- **📈 Profit Analysis**: Accurate profit analysis based on real trading data (including fee statistics)
- **🛡️ Risk Control**: Support `--risk-only` mode for observation without execution
- **📱 Telegram Notifications**: Real-time Telegram notifications for trade executions and stop-loss/take-profit events

## 📊 Live Trading Dashboard

**deepseek-chat-v3.1 Agent Live Trading Panel**: [https://nof1-tracker-dashboard.onrender.com](https://nof1-tracker-dashboard.onrender.com)

Real-time view of deepseek-chat-v3.1 AI Agent's trading performance, positions, and profit/loss statistics.

Dashboard: https://github.com/terryso/nof1-tracker-dashboard

## 📱 Telegram Notifications

Enable Telegram notifications to receive real-time alerts about your trading activities:

### Features

- **🔔 Trade Executions**: Get notified when trades are executed (LONG/SHORT positions)
- **📊 Rich Formatting**: Beautifully formatted messages with emojis and detailed trade information
- **🎯 Stop Loss & Take Profit**: Alerts when stop-loss or take-profit orders are set
- **🔐 Security**: Configure via environment variables for secure access

### Message Format

Messages include:
- 📈 Trade direction (LONG/SHORT) with emojis
- 💰 Quantity and price
- 🆔 Order ID
- 📊 Order status
- ⚡ Leverage information
- 🔒 Margin type (ISOLATED/CROSSED)

### Example Notifications

```
✅ Trade Executed

📈 LONG BTCUSDT
💰 Quantity: 1.5
💵 Price: 50000.00
🆔 Order ID: 123456
📊 Status: FILLED
⚡ Leverage: 10x
🔒 Isolated
```

```
🎯 Take Profit Order Set

📊 Symbol: BTCUSDT
💵 Price: 55000.00
🆔 Order ID: tp123
```

## 🤖 Supported AI Agents

| Agent Name |
|----------|
| **gpt-5** |
| **gemini-2.5-pro** |
| **deepseek-chat-v3.1** |
| **claude-sonnet-4-5** |
| **buynhold_btc** |
| **grok-4** |
| **qwen3-max** |

## ⚙️ Configuration

### 1. Binance API Key Configuration (Important)

This system uses **Binance Futures Trading API**, permissions must be configured correctly:

#### Create API Key
1. Register Binance Account: https://www.maxweb.red/referral/earn-together/refer2earn-usdc/claim?hl=zh-CN&ref=GRO_28502_ACBRJ&utm_source=default
2. Login to [Binance](https://www.binance.com/) → [API Management](https://www.binance.com/en/my/settings/api-management)
3. Create new API key, complete security verification

#### Configure Permissions (Critical)
- ✅ **Enable Futures** - Enable futures trading (Required)
- ✅ **Enable Reading** - Enable read permission (Required)
- ❌ **Enable Withdrawals** - Not needed

#### Testnet Environment (Recommended for Beginners)
1. Visit [Binance Testnet](https://testnet.binancefuture.com/)
2. Create testnet API key
3. Set in `.env`:
   ```env
   BINANCE_TESTNET=true
   BINANCE_API_KEY=testnet_api_key
   BINANCE_API_SECRET=testnet_secret_key
   ```

### 2. Telegram Notification Setup (Optional)

Set up Telegram notifications to receive real-time trading signals and alerts:

1. **Create a Telegram Bot**:
   - Open Telegram and search for [@BotFather](https://t.me/BotFather)
   - Send `/newbot` command and follow the instructions
   - Save the bot token you receive

2. **Get Your Chat ID**:
   - Search for your bot in Telegram
   - Send any message to your bot
   - Visit `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Look for `"chat":{"id":<YOUR_CHAT_ID>}`

3. **Configure Environment Variables**:
   ```env
   # Telegram Configuration (Optional)
   TELEGRAM_ENABLED=true
   TELEGRAM_API_TOKEN=your_telegram_bot_token
   TELEGRAM_CHAT_ID=your_telegram_chat_id
   ```

4. **Test Telegram Connection**:
   ```bash
   npm start -- telegram-test
   ```

### 3. Environment Variables

```env
# Binance API Configuration - Must support futures trading
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_API_SECRET=your_binance_api_secret_here
BINANCE_TESTNET=true  # true=testnet, false=mainnet

# Trading Configuration
MAX_POSITION_SIZE=1000
DEFAULT_LEVERAGE=10
RISK_PERCENTAGE=2.0

# Telegram Configuration (Optional)
TELEGRAM_ENABLED=true
TELEGRAM_API_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

## 📖 Usage

### Core Commands

#### 1. View Available AI Agents
```bash
npm start -- agents
```

#### 2. Copy Trade AI Agent (Core Feature)

**Basic Usage**:
```bash
# Single execution
npm start -- follow deepseek-chat-v3.1

# Continuous monitoring (poll every 30 seconds)
npm start -- follow gpt-5 --interval 30

# Risk control mode (observe only, no execution)
npm start -- follow claude-sonnet-4-5 --risk-only
```

**Advanced Options**:
```bash
# Set total margin (default 10 USDT)
npm start -- follow gpt-5 --total-margin 5000

# Set price tolerance (default 1.0%)
npm start -- follow deepseek-chat-v3.1 --price-tolerance 1.0

# Profit target exit (auto close when 30% profit reached)
npm start -- follow gpt-5 --profit 30

# Profit target exit + auto refollow
npm start -- follow deepseek-chat-v3.1 --profit 30 --auto-refollow

# Combined usage
npm start -- follow gpt-5 --interval 30 --total-margin 2000 --profit 25 --auto-refollow
```

**Command Options**:
- `-r, --risk-only`: Assess only, no execution (safe mode)
- `-i, --interval <seconds>`: Polling interval in seconds, default 30
- `-t, --price-tolerance <percentage>`: Price tolerance percentage, default 1.0%
- `-m, --total-margin <amount>`: Total margin (USDT), default 10
- `--profit <percentage>`: Profit target percentage, auto close when reached
- `--auto-refollow`: Auto refollow after profit target exit (disabled by default)

#### 3. Profit Statistics Analysis
```bash
# Analyze total profit since copy trading started (includes unrealized P&L by default)
npm start -- profit

# Analyze profit for specified time range
npm start -- profit --since 7d        # Last 7 days
npm start -- profit --since 2024-01-01 # Since January 1, 2024
npm start -- profit --since 1704067200000 # Using timestamp

# Analyze specific trading pair
npm start -- profit --pair BTCUSDT

# JSON format output
npm start -- profit --format json

# Force refresh cached data
npm start -- profit --refresh

# Include current positions unrealized P&L (default behavior)
npm start -- profit

# Show only current positions unrealized P&L (without realized trades)
npm start -- profit --unrealized-only

# Exclude unrealized P&L from analysis (realized trades only)
npm start -- profit --exclude-unrealized
```

**Profit Command Options**:
- `-s, --since <time>`: Time filter, supports "7d" (last 7 days), "2024-01-01" (specific date), timestamp format. If not specified, uses order-history.json creation time
- `-p, --pair <symbol>`: Specific trading pair (e.g., BTCUSDT)
- `--group-by <type>`: Group by method: symbol (by trading pair) or all (all)
- `--format <type>`: Output format: table (table) or json (JSON)
- `--refresh`: Force refresh cache to get latest data
- `--exclude-unrealized`: Exclude current positions unrealized P&L from analysis (realized trades only)
- `--unrealized-only`: Show only current positions unrealized P&L

**Output Statistics**:
- **Basic Statistics**: Total trades, realized profit/loss (including fees), win rate, average profit/loss
- **Unrealized P&L**: Current positions count, total unrealized P&L, detailed position info (included by default, excluded when using --exclude-unrealized)
- **Total P&L**: Complete profit situation including realized + unrealized P&L
- **Fee Analysis**: Total fee expenses, average fee per trade
- **Risk Metrics**: Maximum single profit, maximum single loss, unrealized P&L risk warnings
- **Grouped Statistics**: Detailed profit analysis grouped by trading pair

#### 4. System Status Check
```bash
npm start -- status
```

#### 5. Telegram Notification Test
```bash
# Test Telegram bot connection and send test message
npm start -- telegram-test
```

### Copy Trading Strategy

System automatically detects 4 types of trading signals:

1. **📈 New Position (ENTER)** - Auto copy when agent opens new position
2. **📉 Close Position (EXIT)** - Auto copy when agent closes position
3. **🔄 Switch Position (OID Change)** - Close old position then open new when entry_oid changes
4. **🎯 Stop Loss/Take Profit** - Auto close when price reaches profit_target or stop_loss

### 🎯 Profit Target Exit and Auto Refollow

#### Profit Target Exit
Set custom profit targets to automatically close positions when specified profit percentage is reached:

```bash
# Auto close when profit reaches 30%
npm start -- follow gpt-5 --profit 30

# Auto close when profit reaches 50%
npm start -- follow deepseek-chat-v3.1 --profit 50
```

**Features**:
- ✅ Real-time monitoring of profit percentage for each position
- ✅ Immediate market order execution when target is reached
- ✅ Support for both long and short position profit calculations
- ✅ Complete profit exit event recording

#### Auto Refollow
Build upon profit exit with optional auto-refollow functionality:

```bash
# Auto refollow after 30% profit exit
npm start -- follow gpt-5 --profit 30 --auto-refollow

# Combined: Continuous monitoring + Profit target + Auto refollow
npm start -- follow deepseek-chat-v3.1 --interval 30 --profit 25 --auto-refollow
```

**Workflow**:
1. 🔍 Detect position profit reaches target (e.g., 30%)
2. 💰 Execute immediate market order close to lock profit
3. 📝 Record profit exit event to history
4. 🔄 Reset order processing status for that symbol
5. ⏭️ Next polling cycle detects OID change and auto refollows

**Safety Features**:
- 🛡️ Price tolerance check before refollowing
- 📊 Preserve agent's original stop-loss/take-profit plan
- 🔄 Optional feature, disabled by default to avoid unintended impact
- 📝 Complete operation logging

**Usage Recommendations**:
- 🎯 Conservative: `--profit 20` (20% profit exit)
- ⚖️ Balanced: `--profit 30 --auto-refollow` (30% profit exit with refollow)
- 🚀 Aggressive: `--profit 50 --auto-refollow` (50% profit exit with refollow)

### Usage Examples

**Beginner Guide**:
```bash
# 1. Check system configuration
npm start -- status

# 2. View available agents
npm start -- agents

# 3. Test Telegram notifications (if configured)
npm start -- telegram-test

# 4. Risk control mode test
npm start -- follow buynhold_btc --risk-only

# 5. Single copy trade test
npm start -- follow deepseek-chat-v3.1

# 6. View profit statistics
npm start -- profit
```

**Continuous Monitoring**:
```bash
# Check every 30 seconds
npm start -- follow gpt-5 --interval 30

# Multi-agent parallel monitoring (different terminals)
npm start -- follow gpt-5 --interval 30
npm start -- follow deepseek-chat-v3.1 --interval 45
npm start -- follow claude-sonnet-4-5 --interval 60 --risk-only
```

**Profit Analysis**:
```bash
# View overall profit situation (includes unrealized P&L by default)
npm start -- profit

# View only realized profit (exclude unrealized P&L)
npm start -- profit --exclude-unrealized

# View only current positions unrealized P&L
npm start -- profit --unrealized-only

# Analyze different time ranges
npm start -- profit --since 1d      # Last 1 day
npm start -- profit --since 7d      # Last 1 week
npm start -- profit --since 30d     # Last 1 month

# Analyze by trading pair
npm start -- profit --pair BTCUSDT --since 7d
npm start -- profit --pair ETHUSDT --format json

# JSON output with unrealized P&L (default)
npm start -- profit --format json

# JSON output for unrealized P&L only
npm start -- profit --unrealized-only --format json
```

## 📊 Architecture Overview

```
src/
├── commands/               # Command handlers
│   ├── agents.ts          # Get AI agent list
│   ├── follow.ts          # Copy trade command (core)
│   ├── profit.ts          # Profit statistics analysis
│   ├── status.ts          # System status check
│   └── telegram.ts        # Telegram notification test
├── services/              # Core services
│   ├── api-client.ts      # Nof1 API client
│   ├── binance-service.ts # Binance API integration
│   ├── trading-executor.ts # Trade execution engine
│   ├── position-manager.ts # Position management
│   ├── profit-calculator.ts # Profit calculation engine
│   ├── trade-history-service.ts # Trade history service
│   ├── order-history-manager.ts # Order history management
│   ├── futures-capital-manager.ts # Futures capital management
│   └── telegram-service.ts # Telegram notification service
├── scripts/
│   └── analyze-api.ts     # API analysis engine (copy trading strategy)
├── types/                 # TypeScript type definitions
├── utils/                 # Utility functions
└── index.ts               # CLI entry point
```

**Core Flow**:
```
Copy Trading Flow:
User Command → follow handler → ApiAnalyzer analyzes agent signals
         ↓
    Detect trading actions (open/close/switch/stop-loss)
         ↓
    Generate FollowPlan → TradingExecutor executes
         ↓
    BinanceService → Binance API → Trade completed
         ↓
    TelegramService sends notification (if enabled)

Profit Analysis Flow:
User Command → profit handler → TradeHistoryService fetches historical trades
         ↓
    ProfitCalculator calculates profit (based on realizedPnl and fees)
         ↓
    Generate statistics report (basic stats, grouped stats, risk metrics)
         ↓
    Output results (table/JSON format)

Telegram Notification Flow:
Trading Executor → Trade/Order event
         ↓
    TelegramService.formatTradeMessage()
         ↓
    Send to Telegram API
         ↓
    User receives notification
```

## ⚠️ Important Notes

### Risk Warning

- **⚠️ Futures Trading Risk**: Futures trading uses leverage, may lead to rapid losses, use with caution
- **🧪 Test Environment**: Strongly recommend testing on Binance Testnet first
- **📊 Risk Management**: Recommend leverage ≤10x, use dedicated trading account
- **💡 Risk Control Mode**: Beginners should use `--risk-only` mode first
- **📈 Copy Trading Risk**: AI Agent strategies do not guarantee profit, assess risks yourself

### Security Recommendations

- Set IP whitelist to restrict access
- Regularly rotate API keys
- Never hardcode keys in code
- Avoid investing funds you cannot afford to lose

## 🔍 Troubleshooting

### Common Issues

**1. Insufficient Futures Trading Permission**
```
Error: Insufficient permissions
```
- ✅ Ensure **Enable Futures** permission is enabled in Binance API management
- ✅ Ensure **Enable Reading** permission is enabled
- Recreate API key with correct permissions

**2. Agent Not Found**
```
Error: Agent xxx not found
```
- Use `npm start -- agents` to view available agent list
- Confirm agent name spelling is correct (case-sensitive)

**3. Network Connection Issues**
```
Error: timeout
```
- Check network connection and firewall settings
- May need VPN to access Binance API in mainland China

**4. API Key Error**
```
Error: Invalid API Key
```
- Check if API key in `.env` file is correct
- Confirm API key has not expired
- Verify complete key is copied (no extra spaces)

**5. Telegram Notification Issues**
```
Error: Failed to send Telegram message
```
- ✅ Check if `TELEGRAM_ENABLED=true` in `.env` file
- ✅ Verify Telegram bot token is correct (from @BotFather)
- ✅ Verify chat ID is correct (get from bot API)
- ✅ Test with `npm start -- telegram-test`
- ✅ Ensure bot has not been blocked or deleted
- ✅ Check internet connection for Telegram API access

## 🔧 Development

```bash
# Run tests
npm test

# Development mode (auto-restart)
npm run dev

# Build
npm run build

# Code check
npm run lint
```

## 📚 More Documentation

- **[Detailed Copy Trading Strategy](./docs/follow-strategy.md)** - Complete copy trading strategy and risk assessment
- **[Quick Reference](./docs/quick-reference.md)** - Quick command reference

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=terryso/nof1-tracker&type=date&legend=top-left)](https://www.star-history.com/#terryso/nof1-tracker&type=date&legend=top-left)

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

---

**Disclaimer**: This tool is for learning and testing purposes only. Actual trading involves risk of capital loss, use with caution and comply with relevant laws and regulations.
