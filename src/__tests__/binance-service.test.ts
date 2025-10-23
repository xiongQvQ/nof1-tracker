import {
  BinanceService,
  BinanceOrder,
  StopLossOrder,
  TakeProfitOrder
} from "../services/binance-service";
import { TradingPlan } from "../types/trading";

// Mock crypto for signature generation
jest.mock("crypto", () => ({
  createHmac: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue("mock-signature")
  }))
}));

describe("BinanceService", () => {
  let service: BinanceService;

  beforeEach(() => {
    service = new BinanceService("test-api-key", "test-api-secret");
  });

  describe("constructor", () => {
    it("should create BinanceService instance with API credentials", () => {
      const service = new BinanceService("test-api-key", "test-api-secret");
      expect(service).toBeInstanceOf(BinanceService);
    });

    it("should create BinanceService instance with empty credentials", () => {
      const service = new BinanceService("", "");
      expect(service).toBeInstanceOf(BinanceService);
    });

    it("should handle null/undefined credentials", () => {
      const service1 = new BinanceService(null as any, null as any);
      const service2 = new BinanceService(undefined as any, undefined as any);
      expect(service1).toBeInstanceOf(BinanceService);
      expect(service2).toBeInstanceOf(BinanceService);
    });
  });

  describe("convertToBinanceOrder", () => {
    it("should convert basic TradingPlan to Binance order", () => {
      const tradingPlan: TradingPlan = {
        id: "test-plan-1",
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0.001,
        leverage: 10,
        timestamp: Date.now()
      };

      const binanceOrder = service.convertToBinanceOrder(tradingPlan);

      expect(binanceOrder).toEqual({
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: "0.001",
        leverage: 10
      });
    });

    it("should convert SELL orders correctly", () => {
      const tradingPlan: TradingPlan = {
        id: "test-plan-2",
        symbol: "ETHUSDT",
        side: "SELL",
        type: "LIMIT",
        quantity: 1.5,
        leverage: 5,
        timestamp: Date.now()
      };

      const binanceOrder = service.convertToBinanceOrder(tradingPlan);

      expect(binanceOrder).toEqual({
        symbol: "ETHUSDT",
        side: "SELL",
        type: "LIMIT",
        quantity: "1.5",
        leverage: 5
      });
    });

    it("should handle zero quantity", () => {
      const tradingPlan: TradingPlan = {
        id: "test-plan-3",
        symbol: "DOGEUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0,
        leverage: 1,
        timestamp: Date.now()
      };

      const binanceOrder = service.convertToBinanceOrder(tradingPlan);

      expect(binanceOrder.quantity).toBe("0");
    });

    it("should handle very small quantities", () => {
      const tradingPlan: TradingPlan = {
        id: "test-plan-4",
        symbol: "SHIBUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0.00000001,
        leverage: 1,
        timestamp: Date.now()
      };

      const binanceOrder = service.convertToBinanceOrder(tradingPlan);

      expect(binanceOrder.quantity).toBe("1e-8");
    });

    it("should handle very large quantities", () => {
      const tradingPlan: TradingPlan = {
        id: "test-plan-5",
        symbol: "USDTUSDT",
        side: "SELL",
        type: "MARKET",
        quantity: 1000000,
        leverage: 1,
        timestamp: Date.now()
      };

      const binanceOrder = service.convertToBinanceOrder(tradingPlan);

      expect(binanceOrder.quantity).toBe("1000000");
    });

    it("should handle special symbol formats", () => {
      const tradingPlan: TradingPlan = {
        id: "test-plan-6",
        symbol: "1000PEPEUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 1000,
        leverage: 3,
        timestamp: Date.now()
      };

      const binanceOrder = service.convertToBinanceOrder(tradingPlan);

      expect(binanceOrder.symbol).toBe("1000PEPEUSDT");
    });

    it("should handle all order types", () => {
      const orderTypes: Array<"MARKET" | "LIMIT" | "STOP"> = [
        "MARKET", "LIMIT", "STOP"
      ];

      orderTypes.forEach(type => {
        const tradingPlan: TradingPlan = {
          id: `test-plan-${type}`,
          symbol: "BTCUSDT",
          side: "BUY",
          type: type,
          quantity: 0.001,
          leverage: 10,
          timestamp: Date.now()
        };

        const binanceOrder = service.convertToBinanceOrder(tradingPlan);
        expect(binanceOrder.type).toBe(type);
      });
    });

    it("should handle high leverage values", () => {
      const tradingPlan: TradingPlan = {
        id: "test-plan-high-leverage",
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0.001,
        leverage: 125,
        timestamp: Date.now()
      };

      const binanceOrder = service.convertToBinanceOrder(tradingPlan);
      expect(binanceOrder.leverage).toBe(125);
    });
  });

  describe("createTakeProfitOrder", () => {
    it("should create basic take profit order for BUY position", () => {
      const result = service.createTakeProfitOrder(
        "BTCUSDT",
        "SELL",
        0.05,
        45000
      );

      expect(result).toEqual({
        symbol: "BTCUSDT",
        side: "SELL",
        type: "TAKE_PROFIT_MARKET",
        quantity: "0.05",
        stopPrice: "45000"
      });
    });

    it("should create take profit order for SELL position", () => {
      const result = service.createTakeProfitOrder(
        "ETHUSDT",
        "BUY",
        1.5,
        2000
      );

      expect(result).toEqual({
        symbol: "ETHUSDT",
        side: "BUY",
        type: "TAKE_PROFIT_MARKET",
        quantity: "1.5",
        stopPrice: "2000"
      });
    });

    it("should handle decimal quantities", () => {
      const result = service.createTakeProfitOrder(
        "BTCUSDT",
        "SELL",
        0.01234567,
        45000.12345
      );

      expect(result).toEqual({
        symbol: "BTCUSDT",
        side: "SELL",
        type: "TAKE_PROFIT_MARKET",
        quantity: "0.01234567",
        stopPrice: "45000.12345"
      });
    });

    it("should handle very small take profit prices", () => {
      const result = service.createTakeProfitOrder(
        "SHIBUSDT",
        "SELL",
        1000000,
        0.000001
      );

      expect(result.stopPrice).toBe("0.000001");
    });

    it("should handle very large take profit prices", () => {
      const result = service.createTakeProfitOrder(
        "BTCUSDT",
        "SELL",
        1,
        1000000
      );

      expect(result.stopPrice).toBe("1000000");
    });
  });

  describe("createStopLossOrder", () => {
    it("should create basic stop loss order for BUY position", () => {
      const result = service.createStopLossOrder(
        "BTCUSDT",
        "SELL",
        0.05,
        41000
      );

      expect(result).toEqual({
        symbol: "BTCUSDT",
        side: "SELL",
        type: "STOP_MARKET",
        quantity: "0.05",
        stopPrice: "41000"
      });
    });

    it("should create stop loss order for SELL position", () => {
      const result = service.createStopLossOrder(
        "ETHUSDT",
        "BUY",
        1.5,
        2400
      );

      expect(result).toEqual({
        symbol: "ETHUSDT",
        side: "BUY",
        type: "STOP_MARKET",
        quantity: "1.5",
        stopPrice: "2400"
      });
    });

    it("should handle decimal quantities and prices", () => {
      const result = service.createStopLossOrder(
        "BTCUSDT",
        "SELL",
        0.01234567,
        41000.98765
      );

      expect(result).toEqual({
        symbol: "BTCUSDT",
        side: "SELL",
        type: "STOP_MARKET",
        quantity: "0.01234567",
        stopPrice: "41000.98765"
      });
    });

    it("should handle very small stop loss prices", () => {
      const result = service.createStopLossOrder(
        "SHIBUSDT",
        "SELL",
        1000000,
        0.000001
      );

      expect(result.stopPrice).toBe("0.000001");
    });

    it("should handle very large stop loss prices", () => {
      const result = service.createStopLossOrder(
        "BTCUSDT",
        "SELL",
        1,
        1000000
      );

      expect(result.stopPrice).toBe("1000000");
    });
  });

  describe("createStopOrdersFromPosition", () => {
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

    it("should create both take profit and stop loss orders for BUY position", () => {
      const result = service.createStopOrdersFromPosition(mockPosition, "BUY");

      expect(result.takeProfitOrder).toEqual({
        symbol: "BTCUSDT",
        side: "SELL", // Close long position
        type: "TAKE_PROFIT_MARKET",
        quantity: "0.05",
        stopPrice: "45000"
      });

      expect(result.stopLossOrder).toEqual({
        symbol: "BTCUSDT",
        side: "SELL", // Close long position
        type: "STOP_MARKET",
        quantity: "0.05",
        stopPrice: "41000"
      });
    });

    it("should create both take profit and stop loss orders for SELL position", () => {
      const shortPosition = {
        ...mockPosition,
        quantity: -0.05
      };

      const result = service.createStopOrdersFromPosition(shortPosition, "SELL");

      expect(result.takeProfitOrder).toEqual({
        symbol: "BTCUSDT",
        side: "BUY", // Close short position
        type: "TAKE_PROFIT_MARKET",
        quantity: "0.05",
        stopPrice: "45000"
      });

      expect(result.stopLossOrder).toEqual({
        symbol: "BTCUSDT",
        side: "BUY", // Close short position
        type: "STOP_MARKET",
        quantity: "0.05",
        stopPrice: "41000"
      });
    });

    it("should handle position with only take profit", () => {
      const positionTpOnly = {
        ...mockPosition,
        exit_plan: {
          profit_target: 45000,
          stop_loss: 0,
          invalidation_condition: ""
        }
      };

      const result = service.createStopOrdersFromPosition(positionTpOnly, "BUY");

      expect(result.takeProfitOrder).toBeDefined();
      expect(result.takeProfitOrder!.stopPrice).toBe("45000");
      expect(result.stopLossOrder).toBeNull();
    });

    it("should handle position with only stop loss", () => {
      const positionSlOnly = {
        ...mockPosition,
        exit_plan: {
          profit_target: 0,
          stop_loss: 41000,
          invalidation_condition: ""
        }
      };

      const result = service.createStopOrdersFromPosition(positionSlOnly, "BUY");

      expect(result.takeProfitOrder).toBeNull();
      expect(result.stopLossOrder).toBeDefined();
      expect(result.stopLossOrder!.stopPrice).toBe("41000");
    });

    it("should handle position with no exit plan", () => {
      const positionNoExit = {
        ...mockPosition,
        exit_plan: undefined
      };

      const result = service.createStopOrdersFromPosition(positionNoExit, "BUY");

      expect(result.takeProfitOrder).toBeNull();
      expect(result.stopLossOrder).toBeNull();
    });

    it("should handle position with empty exit plan", () => {
      const positionEmptyExit = {
        ...mockPosition,
        exit_plan: {
          profit_target: 0,
          stop_loss: 0,
          invalidation_condition: ""
        }
      };

      const result = service.createStopOrdersFromPosition(positionEmptyExit, "BUY");

      expect(result.takeProfitOrder).toBeNull();
      expect(result.stopLossOrder).toBeNull();
    });

    it("should handle negative quantities correctly", () => {
      const shortPosition = {
        ...mockPosition,
        quantity: -1.5
      };

      const result = service.createStopOrdersFromPosition(shortPosition, "SELL");

      expect(result.takeProfitOrder!.quantity).toBe("1.5");
      expect(result.stopLossOrder!.quantity).toBe("1.5");
    });

    it("should handle very small quantities", () => {
      const tinyPosition = {
        ...mockPosition,
        quantity: 0.000001
      };

      const result = service.createStopOrdersFromPosition(tinyPosition, "BUY");

      expect(result.takeProfitOrder!.quantity).toBe("0.000001");
      expect(result.stopLossOrder!.quantity).toBe("0.000001");
    });

    it("should handle very large quantities", () => {
      const largePosition = {
        ...mockPosition,
        quantity: 10000
      };

      const result = service.createStopOrdersFromPosition(largePosition, "BUY");

      expect(result.takeProfitOrder!.quantity).toBe("10000");
      expect(result.stopLossOrder!.quantity).toBe("10000");
    });

    it("should handle different symbol formats", () => {
      const specialSymbolPosition = {
        ...mockPosition,
        symbol: "1000PEPEUSDT"
      };

      const result = service.createStopOrdersFromPosition(specialSymbolPosition, "BUY");

      expect(result.takeProfitOrder!.symbol).toBe("1000PEPEUSDT");
      expect(result.stopLossOrder!.symbol).toBe("1000PEPEUSDT");
    });
  });

  describe("Edge Cases", () => {
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

    it("should handle missing position data", () => {
      const incompletePosition = {
        symbol: "BTCUSDT"
        // Missing other required fields
      };

      const result = service.createStopOrdersFromPosition(incompletePosition as any, "BUY");

      expect(result.takeProfitOrder).toBeNull();
      expect(result.stopLossOrder).toBeNull();
    });

    it("should handle null position", () => {
      const result = service.createStopOrdersFromPosition(null as any, "BUY");

      expect(result.takeProfitOrder).toBeNull();
      expect(result.stopLossOrder).toBeNull();
    });

    it("should handle undefined position", () => {
      const result = service.createStopOrdersFromPosition(undefined as any, "BUY");

      expect(result.takeProfitOrder).toBeNull();
      expect(result.stopLossOrder).toBeNull();
    });

    it("should handle negative prices in exit plan", () => {
      const negativePricePosition = {
        ...mockPosition,
        exit_plan: {
          profit_target: -45000,
          stop_loss: -41000,
          invalidation_condition: ""
        }
      };

      const result = service.createStopOrdersFromPosition(negativePricePosition, "BUY");

      expect(result.takeProfitOrder).toBeNull();
      expect(result.stopLossOrder).toBeNull();
    });

    it("should handle NaN quantities", () => {
      const nanQuantityPosition = {
        ...mockPosition,
        quantity: NaN
      };

      const result = service.createStopOrdersFromPosition(nanQuantityPosition, "BUY");

      expect(result.takeProfitOrder).toBeDefined();
      expect(result.stopLossOrder).toBeDefined();
      // Should handle NaN by converting to "NaN"
      expect(result.takeProfitOrder!.quantity).toBe("NaN");
      expect(result.stopLossOrder!.quantity).toBe("NaN");
    });

    it("should handle Infinity quantities", () => {
      const infinityQuantityPosition = {
        ...mockPosition,
        quantity: Infinity
      };

      const result = service.createStopOrdersFromPosition(infinityQuantityPosition, "BUY");

      expect(result.takeProfitOrder).toBeDefined();
      expect(result.stopLossOrder).toBeDefined();
      expect(result.takeProfitOrder!.quantity).toBe("Infinity");
      expect(result.stopLossOrder!.quantity).toBe("Infinity");
    });
  });

  describe("Private Methods (via public interface)", () => {
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

    it("should correctly calculate stop order sides through createStopOrdersFromPosition", () => {
      // Test BUY position (should close with SELL)
      const buyPosition = { ...mockPosition, quantity: 0.1 };
      const buyResult = service.createStopOrdersFromPosition(buyPosition, "BUY");

      if (buyResult.takeProfitOrder) {
        expect(buyResult.takeProfitOrder.side).toBe("SELL");
      }
      if (buyResult.stopLossOrder) {
        expect(buyResult.stopLossOrder.side).toBe("SELL");
      }

      // Test SELL position (should close with BUY)
      const sellPosition = { ...mockPosition, quantity: -0.1 };
      const sellResult = service.createStopOrdersFromPosition(sellPosition, "SELL");

      if (sellResult.takeProfitOrder) {
        expect(sellResult.takeProfitOrder.side).toBe("BUY");
      }
      if (sellResult.stopLossOrder) {
        expect(sellResult.stopLossOrder.side).toBe("BUY");
      }
    });
  });

  describe("Integration with Trading Types", () => {
    it("should work with complex trading plan scenarios", () => {
      const complexTradingPlan: TradingPlan = {
        id: "complex-plan",
        symbol: "ETHUSDT",
        side: "SELL",
        type: "LIMIT",
        quantity: 2.5,
        leverage: 15,
        timestamp: Date.now()
      };

      const binanceOrder = service.convertToBinanceOrder(complexTradingPlan);

      expect(binanceOrder.symbol).toBe("ETHUSDT");
      expect(binanceOrder.side).toBe("SELL");
      expect(binanceOrder.type).toBe("LIMIT");
      expect(binanceOrder.quantity).toBe("2.5");
      expect(binanceOrder.leverage).toBe(15);
    });

    it("should maintain precision for financial calculations", () => {
      const highPrecisionPlan: TradingPlan = {
        id: "precision-test",
        symbol: "BTCUSDT",
        side: "BUY",
        type: "LIMIT",
        quantity: 0.00000001,
        leverage: 100,
        timestamp: Date.now()
      };

      const binanceOrder = service.convertToBinanceOrder(highPrecisionPlan);
      expect(binanceOrder.quantity).toBe("1e-8");

      const tpOrder = service.createTakeProfitOrder(
        "BTCUSDT",
        "SELL",
        0.00000001,
        43210.12345678
      );
      expect(tpOrder.quantity).toBe("1e-8");
      expect(tpOrder.stopPrice).toBe("43210.12345678");
    });
  });

  // New API method coverage tests
  describe("API Method Coverage", () => {
    let mockAxios: any;

    beforeEach(() => {
      // Mock axios for API tests
      mockAxios = {
        create: jest.fn(() => ({
          request: jest.fn(),
          get: jest.fn()
        }))
      };

      // Mock axios module
      const axios = require('axios');
      axios.create = mockAxios.create;
      axios.isAxiosError = jest.fn(() => false);
    });

    it("should have getServerTime method", () => {
      expect(typeof service.getServerTime).toBe('function');
    });

    it("should have getAccountInfo method", () => {
      expect(typeof service.getAccountInfo).toBe('function');
    });

    it("should have getPositions method", () => {
      expect(typeof service.getPositions).toBe('function');
    });

    it("should have placeOrder method", () => {
      expect(typeof service.placeOrder).toBe('function');
    });

    it("should have setLeverage method", () => {
      expect(typeof service.setLeverage).toBe('function');
    });

    it("should have cancelOrder method", () => {
      expect(typeof service.cancelOrder).toBe('function');
    });

    it("should have cancelAllOrders method", () => {
      expect(typeof service.cancelAllOrders).toBe('function');
    });

    it("should have getOrderStatus method", () => {
      expect(typeof service.getOrderStatus).toBe('function');
    });

    it("should have getOpenOrders method", () => {
      expect(typeof service.getOpenOrders).toBe('function');
    });

    it("should have get24hrTicker method", () => {
      expect(typeof service.get24hrTicker).toBe('function');
    });

    it("should execute constructor with different network settings", () => {
      const mainnetService = new BinanceService('key', 'secret', false);
      const testnetService = new BinanceService('key', 'secret', true);

      expect(mainnetService).toBeDefined();
      expect(testnetService).toBeDefined();
    });

    it("should handle constructor with null credentials", () => {
      const nullService = new BinanceService(null as any, null as any, false);
      expect(nullService).toBeDefined();
    });

    it("should handle constructor with undefined credentials", () => {
      const undefService = new BinanceService(undefined as any, undefined as any, false);
      expect(undefService).toBeDefined();
    });
  });
});
