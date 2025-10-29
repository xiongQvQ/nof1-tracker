# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nof1 AI Agent Trading System - An automated copy-trading CLI tool that tracks AI agent trading signals from nof1.ai and executes corresponding Binance futures contract trades. Supports 7 AI quantitative trading agents with real-time signal following, automatically identifying open, close, position change, and take-profit/stop-loss signals.

**Core Languages:** TypeScript, Node.js 18+

## Development Commands

### Building & Running
```bash
# Build the project (TypeScript compilation)
npm run build

# Run in development mode with ts-node (no compilation needed)
npm run dev

# Run compiled version
npm start -- <command> [options]
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run a single test file
npm test -- path/to/test.test.ts
```

### Code Quality
```bash
# Run ESLint
npm run lint

# Format code with Prettier
npm run format
```

### Application Commands
```bash
# List available AI agents
npm start -- agents

# Follow an agent (single execution)
npm start -- follow <agent-name>

# Follow with continuous monitoring (30s interval)
npm start -- follow <agent-name> --interval 30

# Risk assessment only (no real trades)
npm start -- follow <agent-name> --risk-only

# Profit/loss analysis
npm start -- profit

# System status check
npm start -- status
```

## High-Level Architecture

### Core Trading Flow

The system follows a pipeline architecture for signal processing and trade execution:

```
Nof1 API → ApiAnalyzer → FollowPlan → RiskManager → TradingExecutor → Binance API
```

1. **ApiAnalyzer** (`src/scripts/analyze-api.ts`) - Entry point for signal analysis
   - Fetches agent account data from nof1.ai API
   - Compares current agent positions with local tracking state
   - Generates `FollowPlan` objects for 4 action types:
     - **ENTER**: Agent opens new position (no existing local position)
     - **EXIT**: Agent closes position (local position exists, agent has none)
     - **Position Change**: Detected via `entry_oid` change (close old, open new)
     - **Stop-loss/Take-profit**: Price reaches exit thresholds

2. **FollowService** (`src/services/follow-service.ts`) - Follow plan generation logic
   - Core method: `followAgent(agentName, options)` returns `FollowPlan[]`
   - Maintains state tracking via `PositionManager` and `OrderHistoryManager`
   - Handles profit target exits and auto-refollow logic
   - Applies capital allocation using `FuturesCapitalManager`

3. **RiskManager** (`src/services/risk-manager.ts`) - Pre-execution validation
   - Price tolerance checking (default 1%)
   - Leverage validation (configurable max)
   - Position size limits
   - Returns risk assessment with approval/rejection

4. **TradingExecutor** (`src/services/trading-executor.ts`) - Binance API execution
   - Executes approved trading plans via `BinanceService`
   - Sets stop-loss and take-profit orders
   - Manages leverage and margin modes (ISOLATED/CROSSED)
   - Returns execution results with order IDs

### Key State Management

**OrderHistoryManager** (`src/services/order-history-manager.ts`)
- Persists trading history to `order-history.json`
- Tracks processed `entry_oid` values to prevent duplicate trades
- Records execution timestamps and profit exits
- Critical for detecting position changes via OID comparison

**PositionManager** (`src/services/position-manager.ts`)
- Interfaces with Binance to get current positions
- Handles orphaned order cleanup (orders without positions)
- Manages position closing and partial exits
- Synchronizes local state with exchange state

### Service Layer Design Pattern

Most services follow dependency injection pattern with `ConfigManager`:

```typescript
class Service {
  constructor(configManager?: ConfigManager) {
    this.configManager = configManager || new ConfigManager();
    if (!configManager) {
      this.configManager.loadFromEnvironment();
    }
  }
}
```

**BinanceService** (`src/services/binance-service.ts`)
- Low-level Binance Futures API wrapper
- Handles authentication (API key signing with HMAC-SHA256)
- Supports both testnet and production environments
- Methods: `createMarketOrder`, `getPositions`, `setLeverage`, `getAccountInfo`

**ApiClient** (`src/services/api-client.ts`)
- HTTP client for nof1.ai API endpoints
- Fetches agent account data with positions
- Endpoint: `GET /accounts/{agentName}/totals`

### CLI Command Architecture

Commands are defined in `src/index.ts` using Commander.js and implemented in `src/commands/`:

- **agents.ts** - Lists available AI agents
- **follow.ts** - Main trading loop with polling support
- **profit.ts** - P&L analysis using `ProfitCalculator` and `TradeHistoryService`
- **status.ts** - System configuration and API connectivity check
- **telegram.ts** - Test Telegram notifications

### Configuration Management

**Environment Variables** (`.env.example` template):
- `BINANCE_API_KEY`, `BINANCE_API_SECRET` - Must have Futures trading enabled
- `BINANCE_TESTNET` - Toggle between testnet/production
- `NOF1_API_BASE_URL` - nof1.ai API endpoint
- `MAX_POSITION_SIZE`, `DEFAULT_LEVERAGE`, `RISK_PERCENTAGE` - Trading parameters
- `LOG_LEVEL` - Logging verbosity (INFO/DEBUG/VERBOSE)
- `TELEGRAM_API_TOKEN`, `TELEGRAM_CHAT_ID` - Optional notifications

**ConfigManager** (`src/services/config-manager.ts`)
- Loads and validates environment variables
- Provides typed configuration access
- Used across all service classes

### Critical Implementation Details

**Order ID (OID) Tracking**
- `entry_oid` from nof1.ai identifies unique position entries
- Changes in `entry_oid` trigger position changes (close old + open new)
- `OrderHistoryManager.processedOrders` tracks seen OIDs
- OID comparison happens in `FollowService.shouldOpenPosition()`

**Capital Allocation**
- `FuturesCapitalManager` maps agent margin to user capital
- Uses `totalMargin` parameter (default 10 USDT) for scaling
- Calculates allocation ratio: `userMargin / agentMargin`
- Adjusts quantity proportionally while maintaining leverage

**Profit Target Exits**
- `--profit <percentage>` flag enables auto-exit on profit targets
- `PositionManager.checkPositionProfitTargets()` monitors unrealized P&L
- On target hit: market close + reset OID tracking state
- `--auto-refollow` allows re-entry after profit exit

**Price Tolerance**
- `RiskManager.checkPriceTolerance()` validates entry prices
- Compares agent entry price vs current market price
- Default 1% tolerance prevents slippage on stale signals
- Configurable via `--price-tolerance` flag

### Testing Architecture

- **Unit tests**: Mock services for isolated component testing
- **Integration tests**: Test command flows with real service interactions
- Test utilities in `src/__tests__/` follow naming: `<service>.test.ts`
- Use Jest with ts-jest for TypeScript support

## Important Patterns and Conventions

### Error Handling
- Custom errors in `src/utils/errors.ts`: `ConfigurationError`, `TradingError`, `ApiError`
- `handleErrors()` decorator for consistent error wrapping
- All async operations should have try-catch with meaningful error messages

### Logging
- Winston logger configured in `src/utils/logger.ts`
- Use appropriate levels: `error` (failures), `warn` (degraded), `info` (operations), `debug` (details)
- Log important state transitions: signal detection, trade execution, profit exits

### Type Safety
- Strict TypeScript (`tsconfig.json`: `strict: true`)
- Type definitions in `src/types/`: `api.ts`, `trading.ts`, `command.ts`
- Avoid `any` types; use specific interfaces

### Async/Await Patterns
- Prefer async/await over raw promises
- Commands use polling loops with `setInterval` for continuous monitoring
- Always handle rejections in async functions

### Data Persistence
- `order-history.json` - Trading execution log (critical for state)
- JSON files use `fs-extra` for atomic writes
- Cache management in `TradeHistoryService` (5-minute TTL)

## Working with Binance API

**Authentication**: All private endpoints require signature
- Timestamp + query parameters → HMAC SHA256 with API secret
- Signature appended as `signature` parameter
- Implementation in `BinanceService.generateSignature()`

**Testnet Usage**: Highly recommended for development
- Testnet endpoint: `https://testnet.binancefuture.com`
- Get test API keys from: https://testnet.binancefuture.com/
- Set `BINANCE_TESTNET=true` in `.env`

**Rate Limits**: Binance enforces strict rate limiting
- Respect weight limits (check response headers)
- Implement exponential backoff on 429 errors
- Current implementation: basic error handling, no explicit rate limiting

## Common Development Tasks

### Adding a New Trading Signal Type
1. Define signal detection logic in `FollowService`
2. Create corresponding `FollowPlan` in `followAgent()` method
3. Update risk assessment rules in `RiskManager` if needed
4. Add tests for new signal type in `src/__tests__/follow-service.test.ts`

### Adding a New Command
1. Define command in `src/index.ts` using Commander API
2. Implement handler in `src/commands/<command-name>.ts`
3. Export handler from `src/commands/index.ts`
4. Add tests in `src/__tests__/commands/<command-name>.test.ts`

### Modifying Capital Allocation Logic
- Edit `FuturesCapitalManager.allocateCapital()` method
- Update `FollowService` to apply new allocation strategy
- Consider impact on existing positions and profit calculations
- Test with various margin scenarios

### Debugging Trade Execution Issues
1. Enable verbose logging: `LOG_LEVEL=DEBUG` in `.env`
2. Check `order-history.json` for execution records
3. Verify Binance API connectivity: `npm start -- status`
4. Test in risk-only mode: `npm start -- follow <agent> --risk-only`
5. Compare agent positions via `npm start -- agents` with local state

## Security Considerations

- **Never commit `.env`** - Contains sensitive API keys
- **API permissions**: Binance keys should only have Futures + Reading enabled (no withdrawals)
- **Testnet first**: Always test with testnet before production
- **IP whitelisting**: Configure Binance API keys with IP restrictions in production
- **Rate limiting**: Implement proper rate limiting to avoid API bans
- **Fund isolation**: Use dedicated trading account with limited capital

## Project-Specific Context

**Target Users**: Cryptocurrency traders interested in following AI trading strategies

**Risk Warning**: This system executes real trades with real funds. Users must understand leverage trading risks and set appropriate risk parameters (`MAX_POSITION_SIZE`, `RISK_PERCENTAGE`).

**Deployment Pattern**: Typically runs as long-running process with `--interval` flag on a server or user's local machine. The README mentions deployment service options for 24/7 operation.

**Documentation References**:
- Full follow strategy: `docs/follow-strategy.md`
- Quick reference: `docs/quick-reference.md`
- English README: `README_EN.md`
