import {
  initializeServices,
  applyConfiguration,
  printPlanInfo,
  convertToTradingPlan,
  handleError
} from '../../utils/command-helpers';
import { ApiAnalyzer } from '../../scripts/analyze-api';

// Mock dependencies
jest.mock('../../scripts/analyze-api');
jest.mock('../../services/trading-executor');
jest.mock('../../services/risk-manager');
jest.mock('../../services/order-history-manager');

describe('Command Helpers', () => {
  describe('initializeServices', () => {
    it('should initialize services without order history', () => {
      const services = initializeServices(false);

      expect(services).toHaveProperty('analyzer');
      expect(services).toHaveProperty('executor');
      expect(services).toHaveProperty('riskManager');
      expect(services.orderHistoryManager).toBeUndefined();
    });

    it('should initialize services with order history', () => {
      const services = initializeServices(true);

      expect(services).toHaveProperty('analyzer');
      expect(services).toHaveProperty('executor');
      expect(services).toHaveProperty('riskManager');
      expect(services).toHaveProperty('orderHistoryManager');
    });
  });

  describe('applyConfiguration', () => {
    let consoleLogSpy: jest.SpyInstance;
    let mockAnalyzer: any;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      mockAnalyzer = {
        getConfigManager: jest.fn(() => ({
          setPriceTolerance: jest.fn()
        }))
      };
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should apply price tolerance configuration', () => {
      applyConfiguration(mockAnalyzer, { priceTolerance: 1.5 });

      expect(mockAnalyzer.getConfigManager).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('1.5%'));
    });

    it('should apply total margin configuration', () => {
      applyConfiguration(mockAnalyzer, { totalMargin: 5000 });

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('$5000'));
    });

    it('should handle empty options', () => {
      applyConfiguration(mockAnalyzer, {});

      expect(mockAnalyzer.getConfigManager).not.toHaveBeenCalled();
    });
  });

  describe('printPlanInfo', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should print plan info with index', () => {
      const plan = {
        id: 'test-1',
        symbol: 'BTCUSDT',
        side: 'BUY' as const,
        type: 'MARKET' as const,
        quantity: 0.001,
        leverage: 10,
        timestamp: Date.now()
      };

      printPlanInfo(plan, 0);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('1. BTCUSDT'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('BUY'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('10x'));
    });

    it('should print plan info without index', () => {
      const plan = {
        id: 'test-1',
        symbol: 'ETHUSDT',
        side: 'SELL' as const,
        type: 'LIMIT' as const,
        quantity: 0.01,
        leverage: 5,
        timestamp: Date.now()
      };

      printPlanInfo(plan);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('ETHUSDT'));
    });
  });

  describe('convertToTradingPlan', () => {
    it('should convert FollowPlan to TradingPlan', () => {
      const followPlan = {
        agent: 'test-agent',
        symbol: 'BTCUSDT',
        side: 'BUY' as const,
        type: 'MARKET' as const,
        quantity: 0.001,
        leverage: 10,
        timestamp: 1234567890,
        action: 'ENTER' as const,
        reason: 'Test reason'
      };

      const tradingPlan = convertToTradingPlan(followPlan);

      expect(tradingPlan).toEqual({
        id: 'test-agent_BTCUSDT_1234567890',
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.001,
        leverage: 10,
        timestamp: 1234567890
      });
    });
  });

  describe('handleError', () => {
    let consoleErrorSpy: jest.SpyInstance;
    let processExitSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error');

      expect(() => handleError(error, 'Test context')).toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Test context:', 'Test error');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle non-Error objects', () => {
      expect(() => handleError('String error', 'Test context')).toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Test context:', 'String error');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
