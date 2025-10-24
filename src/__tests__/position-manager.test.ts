import { PositionManager } from '../services/position-manager';
import { BinanceService } from '../services/binance-service';
import { TradingExecutor } from '../services/trading-executor';
import { OrderHistoryManager } from '../services/order-history-manager';

// Mock console methods for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Shared mock data to avoid repetition
const createMockBinancePosition = (overrides = {}) => ({
  symbol: 'BTCUSDT',
  positionAmt: '0.05',
  entryPrice: '43000',
  markPrice: '43500',
  unRealizedProfit: '25',
  liquidationPrice: '20000',
  leverage: '20',
  maxNotionalValue: '1000000',
  marginType: 'cross',
  isolatedMargin: '0',
  isAutoAddMargin: 'false',
  positionSide: 'BOTH',
  notional: '2175',
  isolatedWallet: '0',
  updateTime: Date.now(),
  ...overrides
});

const createMockBinanceOrder = (overrides = {}) => ({
  orderId: 123,
  symbol: 'BTCUSDT',
  status: 'FILLED',
  clientOrderId: 'client123',
  price: '43000',
  avgPrice: '43000',
  origQty: '0.05',
  executedQty: '0.05',
  cumQty: '0.05',
  cumQuote: '2150',
  timeInForce: 'GTC',
  type: 'MARKET',
  reduceOnly: false,
  closePosition: false,
  side: 'BUY',
  positionSide: 'BOTH',
  stopPrice: '0',
  workingType: 'CONTRACT_PRICE',
  priceProtect: false,
  origType: 'MARKET',
  time: Date.now(),
  updateTime: Date.now(),
  ...overrides
});

const createMockPosition = (overrides = {}) => ({
  symbol: 'BTCUSDT',
  entry_price: 43000,
  quantity: 0.05,
  leverage: 20,
  current_price: 43500,
  unrealized_pnl: 25,
  confidence: 0.85,
  entry_oid: 209776191762,
  tp_oid: -1,
  sl_oid: -1,
  margin: 100,
  exit_plan: {
    profit_target: 45000,
    stop_loss: 41000,
    invalidation_condition: 'price_below_stop_loss'
  },
  ...overrides
});

describe('PositionManager', () => {
  let positionManager: PositionManager;
  let mockBinanceService: jest.Mocked<BinanceService>;
  let mockTradingExecutor: jest.Mocked<TradingExecutor>;
  let mockOrderHistoryManager: jest.Mocked<OrderHistoryManager>;

  beforeEach(() => {
    // Use fake timers to speed up tests with delays
    jest.useFakeTimers();

    // Create mock instances with minimal mocking
    mockBinanceService = {
      getPositions: jest.fn(),
      getOpenOrders: jest.fn(),
      cancelAllOrders: jest.fn(),
      convertSymbol: jest.fn((symbol) => symbol)
    } as any;

    mockTradingExecutor = {
      executePlan: jest.fn()
    } as any;

    mockOrderHistoryManager = {
      saveProcessedOrder: jest.fn()
    } as any;

    // Suppress console output for cleaner test output
    console.log = jest.fn();
    console.error = jest.fn();
    jest.clearAllMocks();

    positionManager = new PositionManager(
      mockBinanceService,
      mockTradingExecutor,
      mockOrderHistoryManager
    );
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Constructor', () => {
    it('should create PositionManager instance with required dependencies', () => {
      expect(positionManager).toBeInstanceOf(PositionManager);
    });
  });

  describe('closePosition', () => {
    it('should close position successfully when no positions exist', async () => {
      // Mock empty positions and orders
      mockBinanceService.getPositions.mockResolvedValue([]);
      mockBinanceService.getOpenOrders.mockResolvedValue([]);

      const result = await positionManager.closePosition('BTCUSDT', 'Test close');

      expect(result.success).toBe(true);
      expect(result.symbol).toBe('BTCUSDT');
      expect(result.operation).toBe('close');
    });

    it('should cancel open orders before closing positions', async () => {
      mockBinanceService.getPositions.mockResolvedValue([createMockBinancePosition()]);
      mockBinanceService.getOpenOrders.mockResolvedValue([createMockBinanceOrder()]);
      mockBinanceService.cancelAllOrders.mockResolvedValue(undefined);
      mockBinanceService.getPositions.mockResolvedValue([]); // After close

      const result = await positionManager.closePosition('BTCUSDT', 'Test close');

      expect(mockBinanceService.cancelAllOrders).toHaveBeenCalledWith('BTCUSDT');
      expect(result.success).toBe(true);
    });

    it('should return error if canceling orders fails', async () => {
      mockBinanceService.getPositions.mockResolvedValue([createMockBinancePosition()]);
      mockBinanceService.getOpenOrders.mockResolvedValue([createMockBinanceOrder()]);
      mockBinanceService.cancelAllOrders.mockRejectedValue(new Error('Cancel failed'));

      const result = await positionManager.closePosition('BTCUSDT', 'Test close');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to cancel open orders');
    });

    it('should return error if positions remain after close attempt', async () => {
      const mockPosition = createMockBinancePosition();

      mockBinanceService.getPositions
        .mockResolvedValueOnce([mockPosition])
        .mockResolvedValueOnce([mockPosition]); // Still there after close
      mockBinanceService.getOpenOrders.mockResolvedValue([]);
      mockTradingExecutor.executePlan.mockResolvedValue({
        success: true,
        orderId: '12345'
      });

      const resultPromise = positionManager.closePosition('BTCUSDT', 'Test close');
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Some positions still remain open');
    });
  });

  describe('openPosition', () => {
    it('should open position successfully', async () => {
      const mockPosition = createMockPosition();
      mockTradingExecutor.executePlan.mockResolvedValue({
        success: true,
        orderId: '12345'
      });

      const result = await positionManager.openPosition(mockPosition, 'Test open', 'agent-123');

      expect(result.success).toBe(true);
      expect(result.orderId).toBe(12345);
      expect(result.symbol).toBe('BTCUSDT');
      expect(result.operation).toBe('open');
      expect(mockTradingExecutor.executePlan).toHaveBeenCalledWith({
        id: expect.stringContaining('open_BTCUSDT_'),
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.05,
        leverage: 20,
        timestamp: expect.any(Number)
      });
    });

    it('should handle sell position', async () => {
      const sellPosition = createMockPosition({ quantity: -0.05 });
      mockTradingExecutor.executePlan.mockResolvedValue({
        success: true,
        orderId: '12346'
      });

      const result = await positionManager.openPosition(sellPosition, 'Test sell', 'agent-456');

      expect(result.success).toBe(true);
      expect(mockTradingExecutor.executePlan).toHaveBeenCalledWith({
        id: expect.stringContaining('open_BTCUSDT_'),
        symbol: 'BTCUSDT',
        side: 'SELL',
        type: 'MARKET',
        quantity: 0.05,
        leverage: 20,
        timestamp: expect.any(Number)
      });
    });

    it('should return error if position validation fails', async () => {
      const invalidPosition = createMockPosition({ quantity: 0 });

      const result = await positionManager.openPosition(invalidPosition, 'Test invalid', 'agent-789');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Position quantity cannot be zero');
      expect(mockTradingExecutor.executePlan).not.toHaveBeenCalled();
    });

    it('should return error if trading execution fails', async () => {
      mockTradingExecutor.executePlan.mockResolvedValue({
        success: false,
        error: 'Insufficient balance'
      });

      const result = await positionManager.openPosition(createMockPosition(), 'Test fail', 'agent-000');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient balance');
    });

    it('should save processed order on successful open', async () => {
      mockTradingExecutor.executePlan.mockResolvedValue({
        success: true,
        orderId: '12347'
      });

      await positionManager.openPosition(createMockPosition(), 'Test save', 'agent-save');

      expect(mockOrderHistoryManager.saveProcessedOrder).toHaveBeenCalledWith(
        209776191762,
        'BTCUSDT',
        'agent-save',
        'BUY',
        0.05
      );
    });

    it('should handle trading executor exceptions', async () => {
      mockTradingExecutor.executePlan.mockRejectedValue(new Error('Network error'));

      const result = await positionManager.openPosition(createMockPosition(), 'Test exception', 'agent-exception');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('shouldExitPosition', () => {
    it('should return false for zero quantity positions', () => {
      const zeroPosition = createMockPosition({ quantity: 0 });
      expect(positionManager.shouldExitPosition(zeroPosition)).toBe(false);
    });

    it('should return true for long position at profit target', () => {
      const profitPosition = createMockPosition({ current_price: 45000 });
      expect(positionManager.shouldExitPosition(profitPosition)).toBe(true);
    });

    it('should return true for long position at stop loss', () => {
      const lossPosition = createMockPosition({ current_price: 41000 });
      expect(positionManager.shouldExitPosition(lossPosition)).toBe(true);
    });

    it('should return false for long position within range', () => {
      expect(positionManager.shouldExitPosition(createMockPosition())).toBe(false);
    });

    it('should return true for short position at profit target', () => {
      const shortPosition = createMockPosition({ quantity: -0.05, current_price: 41000 });
      expect(positionManager.shouldExitPosition(shortPosition)).toBe(true);
    });

    it('should return true for short position at stop loss', () => {
      const shortPosition = createMockPosition({ quantity: -0.05, current_price: 45000 });
      expect(positionManager.shouldExitPosition(shortPosition)).toBe(true);
    });
  });

  describe('getExitReason', () => {
    it('should return take profit reason for long position', () => {
      const profitPosition = createMockPosition({ current_price: 45000 });
      expect(positionManager.getExitReason(profitPosition)).toBe('Take profit at 45000');
    });

    it('should return stop loss reason for long position', () => {
      const lossPosition = createMockPosition({ current_price: 41000 });
      expect(positionManager.getExitReason(lossPosition)).toBe('Stop loss at 41000');
    });

    it('should return take profit reason for short position', () => {
      const shortPosition = createMockPosition({ quantity: -0.05, current_price: 41000 });
      expect(positionManager.getExitReason(shortPosition)).toBe('Take profit at 45000');
    });

    it('should return stop loss reason for short position', () => {
      const shortPosition = createMockPosition({ quantity: -0.05, current_price: 46000 });
      expect(positionManager.getExitReason(shortPosition)).toBe('Stop loss at 41000');
    });

    it('should return default reason for other conditions', () => {
      expect(positionManager.getExitReason(createMockPosition())).toBe('Exit condition met');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty symbol in closePosition', async () => {
      mockBinanceService.getPositions.mockResolvedValue([]);
      mockBinanceService.getOpenOrders.mockResolvedValue([]);

      const result = await positionManager.closePosition('', 'Test empty');

      expect(result.success).toBe(true);
      expect(result.symbol).toBe('');
    });

    it('should handle special characters in symbol', async () => {
      mockBinanceService.getPositions.mockResolvedValue([]);
      mockBinanceService.getOpenOrders.mockResolvedValue([]);

      const result = await positionManager.closePosition('BTC/USDT', 'Test special chars');

      expect(result.success).toBe(true);
      expect(result.symbol).toBe('BTC/USDT');
    });

    it('should handle very large position quantities', async () => {
      const largePosition = createMockPosition({
        quantity: 1000000,
        leverage: 1,
        unrealized_pnl: 5000000,
        margin: 43000000000
      });

      mockTradingExecutor.executePlan.mockResolvedValue({
        success: true,
        orderId: '99999'
      });

      const result = await positionManager.openPosition(largePosition, 'Large position', 'agent-large');

      expect(result.success).toBe(true);
      expect(mockTradingExecutor.executePlan).toHaveBeenCalledWith({
        id: expect.stringContaining('open_BTCUSDT_'),
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 1000000,
        leverage: 1,
        timestamp: expect.any(Number)
      });
    });

    it('should handle negative leverage validation', async () => {
      const invalidLeveragePosition = createMockPosition({ leverage: -5 });

      const result = await positionManager.openPosition(invalidLeveragePosition, 'Test invalid leverage', 'agent-invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Leverage must be greater than zero');
    });

    it('should handle zero entry price validation', async () => {
      const zeroPricePosition = createMockPosition({ entry_price: 0, margin: 0 });

      const result = await positionManager.openPosition(zeroPricePosition, 'Test zero price', 'agent-zero');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Entry price must be greater than zero');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete position lifecycle', async () => {
      const position = createMockPosition();

      // Open position
      mockTradingExecutor.executePlan.mockResolvedValue({
        success: true,
        orderId: '12345'
      });

      const openResult = await positionManager.openPosition(position, 'Integration test', 'agent-integration');
      expect(openResult.success).toBe(true);
      expect(mockOrderHistoryManager.saveProcessedOrder).toHaveBeenCalled();

      // Check if should exit (shouldn't yet)
      expect(positionManager.shouldExitPosition(position)).toBe(false);

      // Simulate profit condition
      const profitPosition = { ...position, current_price: 45000 };
      expect(positionManager.shouldExitPosition(profitPosition)).toBe(true);
      expect(positionManager.getExitReason(profitPosition)).toBe('Take profit at 45000');

      // Close position
      mockBinanceService.getPositions
        .mockResolvedValueOnce([createMockBinancePosition()])
        .mockResolvedValueOnce([]); // After close
      mockBinanceService.getOpenOrders.mockResolvedValue([]);
      mockTradingExecutor.executePlan.mockResolvedValue({
        success: true,
        orderId: '54321'
      });

      const closeResultPromise = positionManager.closePosition('BTCUSDT', 'Take profit');
      await jest.runAllTimersAsync();
      const closeResult = await closeResultPromise;
      
      expect(closeResult.success).toBe(true);
      expect(closeResult.operation).toBe('close');
    });
  });
});