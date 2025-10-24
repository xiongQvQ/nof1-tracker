import { PositionManager } from '../services/position-manager';
import { BinanceService, OrderResponse, PositionResponse } from '../services/binance-service';
import { TradingExecutor } from '../services/trading-executor';
import { OrderHistoryManager } from '../services/order-history-manager';

// Mock dependencies
jest.mock('../services/binance-service');
jest.mock('../services/trading-executor');
jest.mock('../services/order-history-manager');

describe('PositionManager - Orphaned Orders Cleanup', () => {
  let positionManager: PositionManager;
  let mockBinanceService: jest.Mocked<BinanceService>;
  let mockTradingExecutor: jest.Mocked<TradingExecutor>;
  let mockOrderHistoryManager: jest.Mocked<OrderHistoryManager>;

  beforeEach(() => {
    // Create mock instances
    mockBinanceService = new BinanceService('test-key', 'test-secret', true) as jest.Mocked<BinanceService>;
    mockTradingExecutor = new TradingExecutor() as jest.Mocked<TradingExecutor>;
    mockOrderHistoryManager = new OrderHistoryManager() as jest.Mocked<OrderHistoryManager>;

    // Create position manager with mocks
    positionManager = new PositionManager(
      mockBinanceService,
      mockTradingExecutor,
      mockOrderHistoryManager
    );

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('cleanOrphanedOrders', () => {
    it('应该在没有挂单时返回成功', async () => {
      // Mock: 没有挂单
      mockBinanceService.getOpenOrders = jest.fn().mockResolvedValue([]);

      const result = await positionManager.cleanOrphanedOrders();

      expect(result.success).toBe(true);
      expect(result.cancelledOrders).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockBinanceService.getOpenOrders).toHaveBeenCalledTimes(1);
      expect(mockBinanceService.getAllPositions).not.toHaveBeenCalled();
    });

    it('应该在所有挂单都有对应仓位时不取消任何订单', async () => {
      // Mock: 有止盈止损单
      const mockOrders: OrderResponse[] = [
        {
          orderId: 1001,
          symbol: 'BTCUSDT',
          type: 'TAKE_PROFIT_MARKET',
          side: 'SELL',
          status: 'NEW'
        } as OrderResponse,
        {
          orderId: 1002,
          symbol: 'BTCUSDT',
          type: 'STOP_MARKET',
          side: 'SELL',
          status: 'NEW'
        } as OrderResponse
      ];

      // Mock: 有对应的BTC仓位
      const mockPositions: PositionResponse[] = [
        {
          symbol: 'BTCUSDT',
          positionAmt: '0.5', // 有仓位
          entryPrice: '50000',
          markPrice: '51000',
          leverage: '10'
        } as PositionResponse
      ];

      mockBinanceService.getOpenOrders = jest.fn().mockResolvedValue(mockOrders);
      mockBinanceService.getAllPositions = jest.fn().mockResolvedValue(mockPositions);

      const result = await positionManager.cleanOrphanedOrders();

      expect(result.success).toBe(true);
      expect(result.cancelledOrders).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockBinanceService.cancelOrder).not.toHaveBeenCalled();
    });

    it('应该取消没有对应仓位的止盈止损单', async () => {
      // Mock: 有止盈止损单
      const mockOrders: OrderResponse[] = [
        {
          orderId: 1001,
          symbol: 'BTCUSDT',
          type: 'TAKE_PROFIT_MARKET',
          side: 'SELL',
          status: 'NEW'
        } as OrderResponse,
        {
          orderId: 1002,
          symbol: 'BTCUSDT',
          type: 'STOP_MARKET',
          side: 'SELL',
          status: 'NEW'
        } as OrderResponse
      ];

      // Mock: BTC仓位为0
      const mockPositions: PositionResponse[] = [
        {
          symbol: 'BTCUSDT',
          positionAmt: '0', // 没有仓位
          entryPrice: '0',
          markPrice: '51000',
          leverage: '10'
        } as PositionResponse
      ];

      mockBinanceService.getOpenOrders = jest.fn().mockResolvedValue(mockOrders);
      mockBinanceService.getAllPositions = jest.fn().mockResolvedValue(mockPositions);
      mockBinanceService.cancelOrder = jest.fn().mockResolvedValue({} as OrderResponse);

      const result = await positionManager.cleanOrphanedOrders();

      expect(result.success).toBe(true);
      expect(result.cancelledOrders).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(mockBinanceService.cancelOrder).toHaveBeenCalledTimes(2);
      expect(mockBinanceService.cancelOrder).toHaveBeenCalledWith('BTC', 1001);
      expect(mockBinanceService.cancelOrder).toHaveBeenCalledWith('BTC', 1002);
    });

    it('应该只取消止盈止损单,不取消普通限价单', async () => {
      // Mock: 有多种类型的挂单
      const mockOrders: OrderResponse[] = [
        {
          orderId: 1001,
          symbol: 'BTCUSDT',
          type: 'TAKE_PROFIT_MARKET',
          side: 'SELL',
          status: 'NEW'
        } as OrderResponse,
        {
          orderId: 1002,
          symbol: 'BTCUSDT',
          type: 'LIMIT', // 普通限价单
          side: 'BUY',
          status: 'NEW'
        } as OrderResponse
      ];

      // Mock: BTC仓位为0
      const mockPositions: PositionResponse[] = [
        {
          symbol: 'BTCUSDT',
          positionAmt: '0',
          entryPrice: '0',
          markPrice: '51000',
          leverage: '10'
        } as PositionResponse
      ];

      mockBinanceService.getOpenOrders = jest.fn().mockResolvedValue(mockOrders);
      mockBinanceService.getAllPositions = jest.fn().mockResolvedValue(mockPositions);
      mockBinanceService.cancelOrder = jest.fn().mockResolvedValue({} as OrderResponse);

      const result = await positionManager.cleanOrphanedOrders();

      expect(result.success).toBe(true);
      expect(result.cancelledOrders).toBe(1); // 只取消止盈单
      expect(mockBinanceService.cancelOrder).toHaveBeenCalledTimes(1);
      expect(mockBinanceService.cancelOrder).toHaveBeenCalledWith('BTC', 1001);
    });

    it('应该处理多个币种的孤立挂单', async () => {
      // Mock: 多个币种的挂单
      const mockOrders: OrderResponse[] = [
        {
          orderId: 1001,
          symbol: 'BTCUSDT',
          type: 'TAKE_PROFIT_MARKET',
          side: 'SELL',
          status: 'NEW'
        } as OrderResponse,
        {
          orderId: 1002,
          symbol: 'ETHUSDT',
          type: 'STOP_MARKET',
          side: 'SELL',
          status: 'NEW'
        } as OrderResponse,
        {
          orderId: 1003,
          symbol: 'SOLUSDT',
          type: 'TAKE_PROFIT_MARKET',
          side: 'BUY',
          status: 'NEW'
        } as OrderResponse
      ];

      // Mock: 只有SOL有仓位
      const mockPositions: PositionResponse[] = [
        {
          symbol: 'BTCUSDT',
          positionAmt: '0',
          entryPrice: '0',
          markPrice: '51000',
          leverage: '10'
        } as PositionResponse,
        {
          symbol: 'ETHUSDT',
          positionAmt: '0',
          entryPrice: '0',
          markPrice: '3000',
          leverage: '10'
        } as PositionResponse,
        {
          symbol: 'SOLUSDT',
          positionAmt: '-10', // 有空头仓位
          entryPrice: '100',
          markPrice: '95',
          leverage: '10'
        } as PositionResponse
      ];

      mockBinanceService.getOpenOrders = jest.fn().mockResolvedValue(mockOrders);
      mockBinanceService.getAllPositions = jest.fn().mockResolvedValue(mockPositions);
      mockBinanceService.cancelOrder = jest.fn().mockResolvedValue({} as OrderResponse);

      const result = await positionManager.cleanOrphanedOrders();

      expect(result.success).toBe(true);
      expect(result.cancelledOrders).toBe(2); // BTC和ETH的挂单被取消
      expect(mockBinanceService.cancelOrder).toHaveBeenCalledTimes(2);
      expect(mockBinanceService.cancelOrder).toHaveBeenCalledWith('BTC', 1001);
      expect(mockBinanceService.cancelOrder).toHaveBeenCalledWith('ETH', 1002);
      // SOL的挂单不应该被取消
      expect(mockBinanceService.cancelOrder).not.toHaveBeenCalledWith('SOL', 1003);
    });

    it('应该处理取消订单时的错误', async () => {
      // Mock: 有孤立挂单
      const mockOrders: OrderResponse[] = [
        {
          orderId: 1001,
          symbol: 'BTCUSDT',
          type: 'TAKE_PROFIT_MARKET',
          side: 'SELL',
          status: 'NEW'
        } as OrderResponse,
        {
          orderId: 1002,
          symbol: 'ETHUSDT',
          type: 'STOP_MARKET',
          side: 'SELL',
          status: 'NEW'
        } as OrderResponse
      ];

      // Mock: 没有仓位
      const mockPositions: PositionResponse[] = [
        {
          symbol: 'BTCUSDT',
          positionAmt: '0',
          entryPrice: '0',
          markPrice: '51000',
          leverage: '10'
        } as PositionResponse,
        {
          symbol: 'ETHUSDT',
          positionAmt: '0',
          entryPrice: '0',
          markPrice: '3000',
          leverage: '10'
        } as PositionResponse
      ];

      mockBinanceService.getOpenOrders = jest.fn().mockResolvedValue(mockOrders);
      mockBinanceService.getAllPositions = jest.fn().mockResolvedValue(mockPositions);
      
      // Mock: 第一个取消成功,第二个失败
      mockBinanceService.cancelOrder = jest.fn()
        .mockResolvedValueOnce({} as OrderResponse)
        .mockRejectedValueOnce(new Error('Order not found'));

      const result = await positionManager.cleanOrphanedOrders();

      expect(result.success).toBe(false); // 有错误
      expect(result.cancelledOrders).toBe(1); // 只取消了一个
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Order not found');
    });

    it('应该处理API调用失败的情况', async () => {
      // Mock: getOpenOrders失败
      mockBinanceService.getOpenOrders = jest.fn().mockRejectedValue(new Error('API Error'));

      const result = await positionManager.cleanOrphanedOrders();

      expect(result.success).toBe(false);
      expect(result.cancelledOrders).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('API Error');
    });
  });
});
