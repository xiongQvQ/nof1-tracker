import { ApiAnalyzer } from '../scripts/analyze-api';
import { ConfigManager } from '../services/config-manager';
import { ApiClient } from '../services/api-client';
import { BinanceService } from '../services/binance-service';
import { TradingExecutor } from '../services/trading-executor';
import { OrderHistoryManager } from '../services/order-history-manager';

// Mock services to avoid real HTTP requests and file I/O
jest.mock('../services/api-client');
jest.mock('../services/binance-service');
jest.mock('../services/trading-executor');
jest.mock('../services/order-history-manager');

const MockedApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;
const MockedBinanceService = BinanceService as jest.MockedClass<typeof BinanceService>;
const MockedTradingExecutor = TradingExecutor as jest.MockedClass<typeof TradingExecutor>;
const MockedOrderHistoryManager = OrderHistoryManager as jest.MockedClass<typeof OrderHistoryManager>;

// Mock console methods for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('ApiAnalyzer - followAgent Method', () => {
  let analyzer: ApiAnalyzer;
  let mockApiClient: jest.Mocked<ApiClient>;

  beforeEach(() => {
    // Create mocked ApiClient instance
    mockApiClient = new MockedApiClient() as jest.Mocked<ApiClient>;
    
    // Mock TradingExecutor's getAccountInfo to avoid real API calls
    MockedTradingExecutor.prototype.getAccountInfo = jest.fn().mockResolvedValue({
      availableBalance: '10000.00',
      totalWalletBalance: '10000.00'
    });
    
    // Mock BinanceService methods
    MockedBinanceService.prototype.getAccountInfo = jest.fn().mockResolvedValue({
      availableBalance: '10000.00',
      totalWalletBalance: '10000.00'
    });
    
    // Mock OrderHistoryManager to avoid file I/O
    MockedOrderHistoryManager.prototype.isOrderProcessed = jest.fn().mockReturnValue(false);
    MockedOrderHistoryManager.prototype.saveProcessedOrder = jest.fn();
    MockedOrderHistoryManager.prototype.getProcessedOrders = jest.fn().mockReturnValue([]);
    
    analyzer = new ApiAnalyzer(new ConfigManager(), mockApiClient);

    // Suppress console output for cleaner test output
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    jest.clearAllMocks();
  });

  describe('followAgent', () => {
    const mockAgentAccount = {
      id: 'test-agent-1',
      model_id: 'gpt-5',
      since_inception_hourly_marker: 135,
      positions: {
        'BTCUSDT': {
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
          }
        },
        'ETHUSDT': {
          symbol: 'ETHUSDT',
          entry_price: 3200,
          quantity: -0.3,
          leverage: 15,
          current_price: 3150,
          unrealized_pnl: 15,
          confidence: 0.80,
          entry_oid: 209776191763,
          tp_oid: -1,
          sl_oid: -1,
          margin: 64,
          exit_plan: {
            profit_target: 3000,
            stop_loss: 3400,
            invalidation_condition: 'price_above_stop_loss'
          }
        }
      }
    };

    it('should return empty array when agent is not found', async () => {
      mockApiClient.getAgentData.mockResolvedValue(null);

      const result = await analyzer.followAgent('non-existent-agent');

      expect(result).toEqual([]);
      expect(mockApiClient.getAgentData).toHaveBeenCalledWith('non-existent-agent');
    });

    it('should detect new positions and create ENTER follow plans', async () => {
      mockApiClient.getAgentData.mockResolvedValue(mockAgentAccount as any);

      const result = await analyzer.followAgent('gpt-5');

      expect(result).toHaveLength(2); // Two positions detected

      const btcPlan = result.find(p => p.symbol === 'BTCUSDT');
      expect(btcPlan).toBeDefined();
      expect(btcPlan!.action).toBe('ENTER');
      expect(btcPlan!.side).toBe('BUY');

      const ethPlan = result.find(p => p.symbol === 'ETHUSDT');
      expect(ethPlan).toBeDefined();
      expect(ethPlan!.action).toBe('ENTER');
      expect(ethPlan!.side).toBe('SELL');
    });

    it('should handle SELL positions correctly', async () => {
      const sellOnlyAgent = {
        ...mockAgentAccount,
        model_id: 'claude-sonnet-4-5',
        positions: {
          'BTCUSDT': {
            ...mockAgentAccount.positions['BTCUSDT'],
            quantity: -0.05 // Short position
          }
        }
      };

      mockApiClient.getAgentData.mockResolvedValue(sellOnlyAgent as any);

      const result = await analyzer.followAgent('claude-sonnet-4-5');

      expect(result).toHaveLength(2); // ENTER and EXIT for short positions
      const enterPlan = result.find(p => p.action === 'ENTER');
      const exitPlan = result.find(p => p.action === 'EXIT');

      expect(enterPlan).toBeDefined();
      expect(enterPlan!.action).toBe('ENTER');
      expect(enterPlan!.side).toBe('SELL');

      expect(exitPlan).toBeDefined();
      expect(exitPlan!.action).toBe('EXIT');
      expect(exitPlan!.side).toBe('BUY');
    });

    it('should handle empty positions array', async () => {
      const emptyPositionsAgent = {
        ...mockAgentAccount,
        model_id: 'deepseek-chat-v3.1',
        positions: {}
      };

      mockApiClient.getAgentData.mockResolvedValue(emptyPositionsAgent as any);

      const result = await analyzer.followAgent('deepseek-chat-v3.1');

      expect(result).toEqual([]);
    });

    it('should include capital allocation when totalMargin is provided', async () => {
      mockApiClient.getAgentData.mockResolvedValue(mockAgentAccount as any);

      const result = await analyzer.followAgent('gpt-5', { totalMargin: 1000 });

      expect(result).toHaveLength(2);
      // Should have allocation data
      expect(result[0].allocatedMargin).toBeDefined();
      expect(result[0].allocationRatio).toBeDefined();
    });
  });

  describe('getAvailableAgents', () => {
    it('should return list of unique agent IDs', async () => {
      const mockResponse = [
        { model_id: 'gpt-5', since_inception_hourly_marker: 135, positions: {} },
        { model_id: 'gpt-5', since_inception_hourly_marker: 136, positions: {} },
        { model_id: 'claude-sonnet-4-5', since_inception_hourly_marker: 135, positions: {} }
      ];

      mockApiClient.getAvailableAgents.mockResolvedValue(['gpt-5', 'claude-sonnet-4-5']);

      const result = await analyzer.getAvailableAgents();

      expect(result).toEqual(['gpt-5', 'claude-sonnet-4-5']);
      expect(mockApiClient.getAvailableAgents).toHaveBeenCalled();
    });
  });

  describe('getConfigManager', () => {
    it('should return the config manager instance', () => {
      const configManager = analyzer.getConfigManager();
      expect(configManager).toBeInstanceOf(ConfigManager);
    });
  });

  describe('Edge Cases', () => {
    it('should handle API errors gracefully', async () => {
      mockApiClient.getAgentData.mockRejectedValue(new Error('API error'));

      await expect(analyzer.followAgent('test-agent')).rejects.toThrow();
    });

    it('should handle malformed API response', async () => {
      mockApiClient.getAgentData.mockResolvedValue(undefined as any);

      const result = await analyzer.followAgent('test-agent');

      expect(result).toEqual([]);
    });
  });
});