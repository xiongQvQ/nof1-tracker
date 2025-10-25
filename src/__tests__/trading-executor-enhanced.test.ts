import { TradingExecutor } from "../services/trading-executor";
import { TradingPlan } from "../types/trading";
import { BinanceService } from "../services/binance-service";

// Mock BinanceService
jest.mock("../services/binance-service");
const MockedBinanceService = BinanceService as jest.MockedClass<typeof BinanceService>;

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe("TradingExecutor - Enhanced Coverage", () => {
  let executor: TradingExecutor;
  let mockBinanceService: jest.Mocked<BinanceService>;

  beforeEach(() => {
    executor = new TradingExecutor();
    mockBinanceService = (executor as any).binanceService;

    // Default mocks
    mockBinanceService.getServerTime = jest.fn().mockResolvedValue(Date.now());
    mockBinanceService.placeOrder = jest.fn().mockResolvedValue({
      orderId: 123456789,
      symbol: 'BTCUSDT',
      status: 'FILLED',
      clientOrderId: 'test-order',
      price: '43000',
      avgPrice: '43000',
      origQty: '0.001',
      executedQty: '0.001',
      cumQty: '0.001',
      cumQuote: '43',
      timeInForce: 'IOC',
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
      updateTime: Date.now()
    });
    mockBinanceService.setLeverage = jest.fn().mockResolvedValue({});
    mockBinanceService.setMarginType = jest.fn().mockResolvedValue({});
    mockBinanceService.getAccountInfo = jest.fn().mockResolvedValue({
      totalWalletBalance: '10000.0',
      availableBalance: '5000.0',
      totalInitialMargin: '0',
      totalMaintMargin: '0',
      totalPositionInitialMargin: '0',
      totalOpenOrderInitialMargin: '0',
      totalCrossWalletBalance: '10000.0'
    });
    mockBinanceService.get24hrTicker = jest.fn().mockResolvedValue({
      lastPrice: '50000.0'
    });
    mockBinanceService.getPositions = jest.fn().mockResolvedValue([]);
    mockBinanceService.convertToBinanceOrder = jest.fn().mockReturnValue({
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'MARKET',
      quantity: '0.001',
      leverage: 10
    });
    mockBinanceService.formatQuantity = jest.fn().mockImplementation((qty) => qty.toString());

    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    jest.clearAllMocks();
  });

  describe("Account Balance and Margin Checks", () => {
    it("should handle insufficient margin", async () => {
      mockBinanceService.getAccountInfo.mockResolvedValue({
        totalWalletBalance: '100.0',
        availableBalance: '10.0',
        totalInitialMargin: '0',
        totalMaintMargin: '0',
        totalPositionInitialMargin: '0',
        totalOpenOrderInitialMargin: '0',
        totalCrossWalletBalance: '100.0'
      });
      mockBinanceService.get24hrTicker.mockResolvedValue({
        lastPrice: '50000.0'
      });

      const tradingPlan: TradingPlan = {
        id: "test-plan",
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 1.0, // 需要 50000 / 10 = 5000 USDT 保证金
        leverage: 10,
        timestamp: Date.now()
      };

      const result = await executor.executePlan(tradingPlan);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Insufficient margin");
    });

    it("should warn on high margin usage", async () => {
      mockBinanceService.getAccountInfo.mockResolvedValue({
        totalWalletBalance: '1000.0',
        availableBalance: '1000.0',
        totalInitialMargin: '0',
        totalMaintMargin: '0',
        totalPositionInitialMargin: '0',
        totalOpenOrderInitialMargin: '0',
        totalCrossWalletBalance: '1000.0'
      });
      mockBinanceService.get24hrTicker.mockResolvedValue({
        lastPrice: '50000.0'
      });

      const tradingPlan: TradingPlan = {
        id: "test-plan",
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0.17, // 需要 850 USDT 保证金 (85% 使用率)
        leverage: 10,
        timestamp: Date.now()
      };

      const result = await executor.executePlan(tradingPlan);

      expect(result.success).toBe(true);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("High margin usage"));
    });

    it("should warn on small order value", async () => {
      mockBinanceService.getAccountInfo.mockResolvedValue({
        totalWalletBalance: '1000.0',
        availableBalance: '1000.0',
        totalInitialMargin: '0',
        totalMaintMargin: '0',
        totalPositionInitialMargin: '0',
        totalOpenOrderInitialMargin: '0',
        totalCrossWalletBalance: '1000.0'
      });
      mockBinanceService.get24hrTicker.mockResolvedValue({
        lastPrice: '50000.0'
      });

      const tradingPlan: TradingPlan = {
        id: "test-plan",
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0.00008, // 名义价值 = 4 USDT (小于 5 USDT)
        leverage: 10,
        timestamp: Date.now()
      };

      const result = await executor.executePlan(tradingPlan);

      expect(result.success).toBe(true);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Order value too small"));
    });

    it("should handle getAccountInfo failure gracefully", async () => {
      mockBinanceService.getAccountInfo.mockRejectedValue(new Error("API error"));

      const tradingPlan: TradingPlan = {
        id: "test-plan",
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0.001,
        leverage: 10,
        timestamp: Date.now()
      };

      const result = await executor.executePlan(tradingPlan);

      expect(result.success).toBe(true);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Failed to check account balance"));
    });

    it("should handle getAccountInfo with non-Error object", async () => {
      mockBinanceService.getAccountInfo.mockRejectedValue("Unknown error");

      const tradingPlan: TradingPlan = {
        id: "test-plan",
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0.001,
        leverage: 10,
        timestamp: Date.now()
      };

      const result = await executor.executePlan(tradingPlan);

      expect(result.success).toBe(true);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Failed to check account balance"));
    });
  });

  describe("Price Fetching", () => {
    it("should handle get24hrTicker failure", async () => {
      mockBinanceService.get24hrTicker.mockRejectedValue(new Error("Price fetch failed"));

      const tradingPlan: TradingPlan = {
        id: "test-plan",
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0.001,
        leverage: 10,
        timestamp: Date.now()
      };

      const result = await executor.executePlan(tradingPlan);

      expect(result.success).toBe(true);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Failed to get current price"));
    });

    it("should handle get24hrTicker with non-Error object", async () => {
      mockBinanceService.get24hrTicker.mockRejectedValue("Unknown price error");

      const tradingPlan: TradingPlan = {
        id: "test-plan",
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0.001,
        leverage: 10,
        timestamp: Date.now()
      };

      const result = await executor.executePlan(tradingPlan);

      expect(result.success).toBe(true);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Failed to get current price"));
    });
  });

  describe("Leverage Setting", () => {
    it("should handle setLeverage with non-Error object", async () => {
      mockBinanceService.setLeverage.mockRejectedValue("Unknown leverage error");

      const tradingPlan: TradingPlan = {
        id: "test-plan",
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0.001,
        leverage: 10,
        timestamp: Date.now()
      };

      const result = await executor.executePlan(tradingPlan);

      expect(result.success).toBe(true);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Failed to set leverage"));
    });
  });

  describe("Stop Orders with Errors", () => {
    const mockPosition = {
      symbol: "BTCUSDT",
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
        invalidation_condition: "price_below_stop_loss"
      }
    };

    beforeEach(() => {
      mockBinanceService.createStopOrdersFromPosition = jest.fn().mockReturnValue({
        takeProfitOrder: {
          symbol: "BTCUSDT",
          side: "SELL",
          type: "TAKE_PROFIT_MARKET",
          quantity: "0.05",
          stopPrice: "45000"
        },
        stopLossOrder: {
          symbol: "BTCUSDT",
          side: "SELL",
          type: "STOP_MARKET",
          quantity: "0.05",
          stopPrice: "41000"
        }
      });
    });

    it("should handle take profit order placement failure with Error", async () => {
      const originalExecutePlan = executor.executePlan;
      executor.executePlan = jest.fn().mockResolvedValue({
        success: true,
        orderId: "123456789"
      });

      let tpCallCount = 0;
      mockBinanceService.placeOrder = jest.fn().mockImplementation(async (order) => {
        if (order.type === 'TAKE_PROFIT_MARKET') {
          tpCallCount++;
          throw new Error("TP order failed");
        }
        return {
          orderId: 987654321,
          symbol: order.symbol,
          status: 'NEW',
          clientOrderId: 'test-order',
          price: '0',
          avgPrice: '0',
          origQty: order.quantity,
          executedQty: '0',
          cumQty: '0',
          cumQuote: '0',
          timeInForce: 'GTC',
          type: order.type,
          reduceOnly: false,
          closePosition: false,
          side: order.side,
          positionSide: 'BOTH',
          stopPrice: order.stopPrice || '0',
          workingType: 'CONTRACT_PRICE',
          priceProtect: false,
          origType: order.type,
          time: Date.now(),
          updateTime: Date.now()
        };
      });

      const tradingPlan: TradingPlan = {
        id: "test-plan",
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0.05,
        leverage: 20,
        timestamp: Date.now()
      };

      const result = await executor.executePlanWithStopOrders(tradingPlan, mockPosition);

      expect(result.success).toBe(true);
      expect(result.takeProfitOrderId).toBeUndefined();
      expect(result.stopLossOrderId).toBeDefined();
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Failed to place Take Profit order"));

      executor.executePlan = originalExecutePlan;
    });

    it("should handle take profit order placement failure with non-Error", async () => {
      const originalExecutePlan = executor.executePlan;
      executor.executePlan = jest.fn().mockResolvedValue({
        success: true,
        orderId: "123456789"
      });

      mockBinanceService.placeOrder = jest.fn().mockImplementation(async (order) => {
        if (order.type === 'TAKE_PROFIT_MARKET') {
          throw "Unknown TP error";
        }
        return {
          orderId: 987654321,
          symbol: order.symbol,
          status: 'NEW',
          clientOrderId: 'test-order',
          price: '0',
          avgPrice: '0',
          origQty: order.quantity,
          executedQty: '0',
          cumQty: '0',
          cumQuote: '0',
          timeInForce: 'GTC',
          type: order.type,
          reduceOnly: false,
          closePosition: false,
          side: order.side,
          positionSide: 'BOTH',
          stopPrice: order.stopPrice || '0',
          workingType: 'CONTRACT_PRICE',
          priceProtect: false,
          origType: order.type,
          time: Date.now(),
          updateTime: Date.now()
        };
      });

      const tradingPlan: TradingPlan = {
        id: "test-plan",
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0.05,
        leverage: 20,
        timestamp: Date.now()
      };

      const result = await executor.executePlanWithStopOrders(tradingPlan, mockPosition);

      expect(result.success).toBe(true);
      expect(result.takeProfitOrderId).toBeUndefined();
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Failed to place Take Profit order"));

      executor.executePlan = originalExecutePlan;
    });

    it("should handle stop loss order placement failure with Error", async () => {
      const originalExecutePlan = executor.executePlan;
      executor.executePlan = jest.fn().mockResolvedValue({
        success: true,
        orderId: "123456789"
      });

      mockBinanceService.placeOrder = jest.fn().mockImplementation(async (order) => {
        if (order.type === 'STOP_MARKET') {
          throw new Error("SL order failed");
        }
        return {
          orderId: 987654321,
          symbol: order.symbol,
          status: 'NEW',
          clientOrderId: 'test-order',
          price: '0',
          avgPrice: '0',
          origQty: order.quantity,
          executedQty: '0',
          cumQty: '0',
          cumQuote: '0',
          timeInForce: 'GTC',
          type: order.type,
          reduceOnly: false,
          closePosition: false,
          side: order.side,
          positionSide: 'BOTH',
          stopPrice: order.stopPrice || '0',
          workingType: 'CONTRACT_PRICE',
          priceProtect: false,
          origType: order.type,
          time: Date.now(),
          updateTime: Date.now()
        };
      });

      const tradingPlan: TradingPlan = {
        id: "test-plan",
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0.05,
        leverage: 20,
        timestamp: Date.now()
      };

      const result = await executor.executePlanWithStopOrders(tradingPlan, mockPosition);

      expect(result.success).toBe(true);
      expect(result.takeProfitOrderId).toBeDefined();
      expect(result.stopLossOrderId).toBeUndefined();
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Failed to place Stop Loss order"));

      executor.executePlan = originalExecutePlan;
    });

    it("should handle stop loss order placement failure with non-Error", async () => {
      const originalExecutePlan = executor.executePlan;
      executor.executePlan = jest.fn().mockResolvedValue({
        success: true,
        orderId: "123456789"
      });

      mockBinanceService.placeOrder = jest.fn().mockImplementation(async (order) => {
        if (order.type === 'STOP_MARKET') {
          throw "Unknown SL error";
        }
        return {
          orderId: 987654321,
          symbol: order.symbol,
          status: 'NEW',
          clientOrderId: 'test-order',
          price: '0',
          avgPrice: '0',
          origQty: order.quantity,
          executedQty: '0',
          cumQty: '0',
          cumQuote: '0',
          timeInForce: 'GTC',
          type: order.type,
          reduceOnly: false,
          closePosition: false,
          side: order.side,
          positionSide: 'BOTH',
          stopPrice: order.stopPrice || '0',
          workingType: 'CONTRACT_PRICE',
          priceProtect: false,
          origType: order.type,
          time: Date.now(),
          updateTime: Date.now()
        };
      });

      const tradingPlan: TradingPlan = {
        id: "test-plan",
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0.05,
        leverage: 20,
        timestamp: Date.now()
      };

      const result = await executor.executePlanWithStopOrders(tradingPlan, mockPosition);

      expect(result.success).toBe(true);
      expect(result.stopLossOrderId).toBeUndefined();
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Failed to place Stop Loss order"));

      executor.executePlan = originalExecutePlan;
    });
  });

  describe("Helper Methods Error Handling", () => {
    it("should handle getAccountInfo with non-Error", async () => {
      mockBinanceService.getAccountInfo.mockRejectedValue("Unknown error");

      await expect(executor.getAccountInfo()).rejects.toBe("Unknown error");
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Failed to get account info"));
    });

    it("should handle getPositions with non-Error", async () => {
      mockBinanceService.getPositions.mockRejectedValue("Unknown error");

      await expect(executor.getPositions()).rejects.toBe("Unknown error");
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Failed to get positions"));
    });

    it("should handle getOrderStatus with non-Error", async () => {
      mockBinanceService.getOrderStatus.mockRejectedValue("Unknown error");

      const result = await executor.getOrderStatus("BTCUSDT", "123456");

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Failed to get order status"));
    });

    it("should handle getOpenOrders with non-Error", async () => {
      mockBinanceService.getOpenOrders.mockRejectedValue("Unknown error");

      const result = await executor.getOpenOrders("BTCUSDT");

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Failed to get open orders"));
    });

    it("should handle cancelAllOrders with non-Error", async () => {
      mockBinanceService.cancelAllOrders.mockRejectedValue("Unknown error");

      const result = await executor.cancelAllOrders("BTCUSDT");

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Failed to cancel all orders"));
    });
  });

  describe("Constructor with Environment Variables", () => {
    it("should use testnet from environment variable", () => {
      const originalEnv = process.env.BINANCE_TESTNET;
      process.env.BINANCE_TESTNET = 'true';

      const testnetExecutor = new TradingExecutor();

      expect(testnetExecutor).toBeDefined();

      process.env.BINANCE_TESTNET = originalEnv;
    });

    it("should default to non-testnet when env var is false", () => {
      const originalEnv = process.env.BINANCE_TESTNET;
      process.env.BINANCE_TESTNET = 'false';

      const prodExecutor = new TradingExecutor();

      expect(prodExecutor).toBeDefined();

      process.env.BINANCE_TESTNET = originalEnv;
    });
  });
});
