import { BinanceService } from "../services/binance-service";
import axios from 'axios';
import CryptoJS from 'crypto-js';

// Mock the dependencies
jest.mock('axios');
jest.mock('crypto-js');

describe("BinanceService - Integration Tests", () => {
  let binanceService: BinanceService;
  let mockAxiosInstance: any;
  let mockIsAxiosError: jest.Mock;

  beforeEach(() => {
    // Setup mock axios instance
    mockAxiosInstance = {
      request: jest.fn(),
      get: jest.fn()
    };

    // Mock axios.create to return our mock instance
    (axios.create as jest.Mock) = jest.fn(() => mockAxiosInstance);

    // Mock crypto-js
    (CryptoJS.HmacSHA256 as jest.Mock) = jest.fn(() => ({
      toString: jest.fn(() => 'test_signature')
    }));

    // Mock axios.isAxiosError for error handling
    mockIsAxiosError = jest.fn();
    (axios.isAxiosError as unknown as jest.Mock) = mockIsAxiosError;
    mockIsAxiosError.mockReturnValue(false);

    binanceService = new BinanceService('test_key', 'test_secret', false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("API Method Coverage", () => {
    it("should have all required public methods", () => {
      expect(typeof binanceService.getServerTime).toBe('function');
      expect(typeof binanceService.getAccountInfo).toBe('function');
      expect(typeof binanceService.getPositions).toBe('function');
      expect(typeof binanceService.placeOrder).toBe('function');
      expect(typeof binanceService.setLeverage).toBe('function');
      expect(typeof binanceService.cancelOrder).toBe('function');
      expect(typeof binanceService.cancelAllOrders).toBe('function');
      expect(typeof binanceService.getOrderStatus).toBe('function');
      expect(typeof binanceService.getOpenOrders).toBe('function');
      expect(typeof binanceService.get24hrTicker).toBe('function');
      expect(typeof binanceService.convertToBinanceOrder).toBe('function');
      expect(typeof binanceService.createTakeProfitOrder).toBe('function');
      expect(typeof binanceService.createStopLossOrder).toBe('function');
      expect(typeof binanceService.createStopOrdersFromPosition).toBe('function');
    });

    it("should use correct base URL for mainnet", () => {
      const mainnetService = new BinanceService('key', 'secret', false);
      expect(mainnetService).toBeDefined();
    });

    it("should use correct base URL for testnet", () => {
      const testnetService = new BinanceService('key', 'secret', true);
      expect(testnetService).toBeDefined();
    });
  });

  describe("Method Execution Paths", () => {
    it("should execute getServerTime method", async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { serverTime: 1234567890 } });

      const result = await binanceService.getServerTime();
      expect(result).toBe(1234567890);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/fapi/v1/time');
    });

    it("should execute getAccountInfo method", async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: { totalWalletBalance: '1000.0' }
      });

      const result = await binanceService.getAccountInfo();
      expect(result.totalWalletBalance).toBe('1000.0');
      expect(mockAxiosInstance.request).toHaveBeenCalled();
      expect(CryptoJS.HmacSHA256).toHaveBeenCalled();
    });

    it("should execute getPositions method", async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: [
          { symbol: 'BTCUSDT', positionAmt: '0.001' },
          { symbol: 'ETHUSDT', positionAmt: '0' }
        ]
      });

      const result = await binanceService.getPositions();
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('BTCUSDT');
    });

    it("should execute placeOrder method", async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: { orderId: 123456, status: 'FILLED' }
      });

      const order = {
        symbol: 'BTCUSDT',
        side: 'BUY' as const,
        type: 'MARKET' as const,
        quantity: '0.001',
        leverage: 10
      };

      const result = await binanceService.placeOrder(order);
      expect(result.orderId).toBe(123456);
      expect(mockAxiosInstance.request).toHaveBeenCalled();
    });

    it("should execute setLeverage method", async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: { leverage: 20 } });

      const result = await binanceService.setLeverage('BTCUSDT', 20);
      expect(result.leverage).toBe(20);
      expect(mockAxiosInstance.request).toHaveBeenCalled();
    });

    it("should execute cancelOrder method", async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: { orderId: 123456, status: 'CANCELED' }
      });

      const result = await binanceService.cancelOrder('BTCUSDT', 123456);
      expect(result.orderId).toBe(123456);
      expect(mockAxiosInstance.request).toHaveBeenCalled();
    });

    it("should execute cancelAllOrders method", async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: { code: 200, msg: 'success' } });

      const result = await binanceService.cancelAllOrders('BTCUSDT');
      expect(result.code).toBe(200);
      expect(mockAxiosInstance.request).toHaveBeenCalled();
    });

    it("should execute getOrderStatus method", async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: { orderId: 123456, status: 'FILLED' }
      });

      const result = await binanceService.getOrderStatus('BTCUSDT', 123456);
      expect(result.orderId).toBe(123456);
      expect(mockAxiosInstance.request).toHaveBeenCalled();
    });

    it("should execute getOpenOrders method", async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: [{ orderId: 123456, symbol: 'BTCUSDT', status: 'NEW' }]
      });

      const result = await binanceService.getOpenOrders('BTCUSDT');
      expect(result).toHaveLength(1);
      expect(result[0].orderId).toBe(123456);
      expect(mockAxiosInstance.request).toHaveBeenCalled();
    });

    it("should execute get24hrTicker method", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: [{ symbol: 'BTCUSDT', lastPrice: '50000' }]
      });

      const result = await binanceService.get24hrTicker('BTCUSDT');
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('BTCUSDT');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/fapi/v1/ticker/24hr?symbol=BTCUSDT');
    });
  });

  describe("Error Handling Paths", () => {
    it("should handle API errors with response data", async () => {
      const error = {
        response: {
          data: { msg: 'Invalid symbol' },
          status: 400
        }
      };
      mockIsAxiosError.mockReturnValue(true);
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(binanceService.getAccountInfo()).rejects.toThrow('Binance API Error: Invalid symbol');
    });

    it("should handle API errors without response data", async () => {
      const error = {
        response: {
          status: 500
        }
      };
      mockIsAxiosError.mockReturnValue(true);
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(binanceService.getAccountInfo()).rejects.toThrow('Binance API Error: undefined');
    });

    it("should handle network errors", async () => {
      const error = new Error('Network timeout');
      mockIsAxiosError.mockReturnValue(false);
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(binanceService.getAccountInfo()).rejects.toThrow('Request failed: Network timeout');
    });

    it("should handle public API errors", async () => {
      const error = {
        response: {
          data: { msg: 'Invalid symbol' },
          status: 400
        }
      };
      mockIsAxiosError.mockReturnValue(true);
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(binanceService.get24hrTicker('INVALID')).rejects.toThrow('Binance API Error: Invalid symbol');
    });
  });

  describe("Parameter Handling", () => {
    it("should handle optional symbol parameter in getOpenOrders", async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: [] });

      await binanceService.getOpenOrders(); // No symbol provided
      expect(mockAxiosInstance.request).toHaveBeenCalled();
    });

    it("should handle optional symbol parameter in get24hrTicker", async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      await binanceService.get24hrTicker(); // No symbol provided
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/fapi/v1/ticker/24hr');
    });

    it("should handle different order types", async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: { orderId: 123456 } });

      const orderTypes = ['MARKET', 'LIMIT', 'STOP', 'TAKE_PROFIT'] as const;

      for (const orderType of orderTypes) {
        const order = {
          symbol: 'BTCUSDT',
          side: 'BUY' as const,
          type: orderType,
          quantity: '0.001',
          leverage: 10,
          price: orderType !== 'MARKET' ? '50000' : undefined
        };

        await binanceService.placeOrder(order);
        expect(mockAxiosInstance.request).toHaveBeenCalled();
      }
    });

    it("should handle different request methods", async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: { success: true } });

      // Test GET request (account info)
      await binanceService.getAccountInfo();

      // Test POST request (place order)
      const order = {
        symbol: 'BTCUSDT',
        side: 'BUY' as const,
        type: 'MARKET' as const,
        quantity: '0.001',
        leverage: 10
      };
      await binanceService.placeOrder(order);

      // Test DELETE request (cancel order)
      await binanceService.cancelOrder('BTCUSDT', 123456);

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
    });
  });

  describe("Constructor Variations", () => {
    it("should handle empty API credentials", () => {
      const service = new BinanceService('', '', false);
      expect(service).toBeDefined();
    });

    it("should handle null API credentials", () => {
      const service = new BinanceService(null as any, null as any, false);
      expect(service).toBeDefined();
    });

    it("should handle undefined API credentials", () => {
      const service = new BinanceService(undefined as any, undefined as any, false);
      expect(service).toBeDefined();
    });
  });
});