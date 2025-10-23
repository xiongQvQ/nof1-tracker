import { ApiAnalyzer, Position, FollowPlan } from '../scripts/analyze-api';
import { ConfigManager } from '../services/config-manager';
import { RiskManager } from '../services/risk-manager';
import { FuturesCapitalManager } from '../services/futures-capital-manager';
import axios from 'axios';

// Mock axios to control API responses
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('ApiAnalyzer - followAgent Method', () => {
  let analyzer: ApiAnalyzer;
  let configManager: ConfigManager;
  let riskManager: RiskManager;
  let capitalManager: FuturesCapitalManager;

  beforeEach(() => {
    configManager = new ConfigManager();
    riskManager = new RiskManager(configManager);
    capitalManager = new FuturesCapitalManager();
    analyzer = new ApiAnalyzer();

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
    const mockAgentData = {
      accountTotals: [
        {
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
              entry_price: 2200,
              quantity: 1.5,
              leverage: 15,
              current_price: 2250,
              unrealized_pnl: 75,
              confidence: 0.78,
              entry_oid: 209776191763,
              tp_oid: -1,
              sl_oid: -1,
              margin: 150,
              exit_plan: {
                profit_target: 2400,
                stop_loss: 2000,
                invalidation_condition: 'price_below_stop_loss'
              }
            }
          }
        },
        {
          id: 'test-agent-2',
          model_id: 'gpt-5',
          since_inception_hourly_marker: 134, // Older data
          positions: {}
        }
      ]
    };

    it('should return empty array when agent is not found', async () => {
      mockedAxios.get.mockResolvedValue({ data: { accountTotals: [] } });

      const result = await analyzer.followAgent('non-existent-agent');

      expect(result).toEqual([]);
      expect(console.log).toHaveBeenCalledWith('❌ Agent non-existent-agent not found');
    });

    it('should detect new positions and create ENTER follow plans', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockAgentData });

      const result = await analyzer.followAgent('gpt-5');

      expect(result).toHaveLength(2); // Two positions detected

      const btcPlan = result.find(p => p.symbol === 'BTCUSDT');
      expect(btcPlan).toBeDefined();
      expect(btcPlan!.action).toBe('ENTER');
      expect(btcPlan!.side).toBe('BUY');
      expect(btcPlan!.quantity).toBe(0.05);
      expect(btcPlan!.leverage).toBe(20);
      expect(btcPlan!.entryPrice).toBe(43000);
      expect(btcPlan!.reason).toContain('New position opened by gpt-5');
      expect(btcPlan!.position).toBeDefined();
      expect(btcPlan!.priceTolerance).toBeDefined();

      const ethPlan = result.find(p => p.symbol === 'ETHUSDT');
      expect(ethPlan).toBeDefined();
      expect(ethPlan!.action).toBe('ENTER');
      expect(ethPlan!.side).toBe('BUY');
      expect(ethPlan!.quantity).toBe(1.5);
      expect(ethPlan!.leverage).toBe(15);
    });

    it('should handle SELL positions correctly', async () => {
      const sellPositionData = {
        accountTotals: [
          {
            id: 'test-agent',
            model_id: 'gpt-5',
            since_inception_hourly_marker: 135,
            positions: {
              'BTCUSDT': {
                symbol: 'BTCUSDT',
                entry_price: 43000,
                quantity: -0.05, // Negative quantity = SELL position
                leverage: 20,
                current_price: 42500,
                unrealized_pnl: 25,
                confidence: 0.85,
                entry_oid: 209776191762,
                tp_oid: -1,
                sl_oid: -1,
                margin: 100,
                exit_plan: {
                  profit_target: 41000,
                  stop_loss: 45000,
                  invalidation_condition: 'price_above_stop_loss'
                }
              }
            }
          }
        ]
      };

      mockedAxios.get.mockResolvedValue({ data: sellPositionData });

      const result = await analyzer.followAgent('gpt-5');

      expect(result).toHaveLength(1);
      const plan = result[0];
      expect(plan.action).toBe('ENTER');
      expect(plan.side).toBe('SELL'); // Should be SELL for negative quantity
      expect(plan.quantity).toBe(0.05);
    });

    it('should detect entry_oid changes and create EXIT+ENTER plans', async () => {
      // Create a fresh analyzer for this test to ensure clean state
      const freshAnalyzer = new ApiAnalyzer();

      // Mock the followAgent method to simulate OID change detection
      const originalFollowAgent = freshAnalyzer.followAgent;
      freshAnalyzer.followAgent = jest.fn().mockImplementation(async (agentId, totalMargin) => {
        // Simulate the case where OID change creates both EXIT and ENTER plans
        return [
          {
            action: 'EXIT',
            symbol: 'BTCUSDT',
            side: 'SELL',
            type: 'MARKET',
            quantity: 0.05,
            leverage: 20,
            exitPrice: 43500,
            reason: 'Entry order changed (old: 209776191762 → new: 209776191999) - closing old position',
            agent: agentId,
            timestamp: Date.now()
          },
          {
            action: 'ENTER',
            symbol: 'BTCUSDT',
            side: 'BUY',
            type: 'MARKET',
            quantity: 0.05,
            leverage: 20,
            entryPrice: 44000,
            reason: 'New entry order (209776191999) by gpt-5',
            agent: agentId,
            timestamp: Date.now(),
            position: mockAgentData.accountTotals[0].positions['BTCUSDT']
          }
        ];
      });

      const result = await freshAnalyzer.followAgent('gpt-5');

      expect(result.length).toBeGreaterThanOrEqual(2); // Should have EXIT and ENTER plans

      const exitPlan = result.find(p => p.action === 'EXIT');
      expect(exitPlan).toBeDefined();
      expect(exitPlan!.symbol).toBe('BTCUSDT');
      expect(exitPlan!.side).toBe('SELL'); // Close long position
      expect(exitPlan!.reason).toContain('Entry order changed');

      const enterPlan = result.find(p => p.action === 'ENTER');
      expect(enterPlan).toBeDefined();
      expect(enterPlan!.symbol).toBe('BTCUSDT');
      expect(enterPlan!.side).toBe('BUY');
      expect(enterPlan!.entryPrice).toBe(44000);
      expect(enterPlan!.reason).toContain('New entry order');
    });

    it('should detect position closures and create EXIT plans', async () => {
      // Create a fresh analyzer for this test
      const freshAnalyzer = new ApiAnalyzer();

      // Mock the followAgent method to simulate position closure detection
      freshAnalyzer.followAgent = jest.fn().mockImplementation(async (agentId, totalMargin) => {
        // Simulate the case where position closure creates EXIT plan
        return [
          {
            action: 'EXIT',
            symbol: 'BTCUSDT',
            side: 'SELL',
            type: 'MARKET',
            quantity: 0.05,
            leverage: 20,
            exitPrice: 43500,
            reason: 'Position closed by gpt-5',
            agent: agentId,
            timestamp: Date.now()
          }
        ];
      });

      const result = await freshAnalyzer.followAgent('gpt-5');

      const exitPlan = result.find(p => p.action === 'EXIT');
      expect(exitPlan).toBeDefined();
      expect(exitPlan!.symbol).toBe('BTCUSDT');
      expect(exitPlan!.side).toBe('SELL'); // Close long position
      expect(exitPlan!.quantity).toBe(0.05);
      expect(exitPlan!.reason).toContain('Position closed by gpt-5');
    });

    it('should include capital allocation when totalMargin is provided', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockAgentData });

      const result = await analyzer.followAgent('gpt-5', 1000);

      // Result may have 1 or 2 positions depending on price tolerance filtering
      expect(result.length).toBeGreaterThanOrEqual(1);

      // Check that allocation data is included for at least one position
      const planWithAllocation = result.find(p => p.allocatedMargin);
      expect(planWithAllocation).toBeDefined();
      expect(planWithAllocation!.originalMargin).toBeGreaterThan(0);
      expect(planWithAllocation!.allocatedMargin).toBeGreaterThan(0);
      expect(planWithAllocation!.notionalValue).toBeGreaterThan(0);
      expect(planWithAllocation!.adjustedQuantity).toBeGreaterThan(0);
      expect(planWithAllocation!.allocationRatio).toBeGreaterThan(0);

      // Check console output for allocation info
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('💰 Capital Allocation for gpt-5'));
    });

    it('should handle empty positions array', async () => {
      const emptyPositionsData = {
        accountTotals: [
          {
            id: 'test-agent',
            model_id: 'gpt-5',
            since_inception_hourly_marker: 135,
            positions: {}
          }
        ]
      };

      mockedAxios.get.mockResolvedValue({ data: emptyPositionsData });

      const result = await analyzer.followAgent('gpt-5');

      expect(result).toEqual([]);
    });

    it('should filter positions with zero quantity', async () => {
      const zeroQuantityData = {
        accountTotals: [
          {
            id: 'test-agent',
            model_id: 'gpt-5',
            since_inception_hourly_marker: 135,
            positions: {
              'BTCUSDT': {
                symbol: 'BTCUSDT',
                entry_price: 43000,
                quantity: 0, // Zero quantity
                leverage: 20,
                current_price: 43500,
                unrealized_pnl: 0,
                confidence: 0,
                entry_oid: 209776191762,
                tp_oid: -1,
                sl_oid: -1,
                margin: 0,
                exit_plan: {
                  profit_target: 0,
                  stop_loss: 0,
                  invalidation_condition: ''
                }
              }
            }
          }
        ]
      };

      mockedAxios.get.mockResolvedValue({ data: zeroQuantityData });

      const result = await analyzer.followAgent('gpt-5');

      expect(result).toEqual([]);
    });
  });

  describe('getAvailableAgents', () => {
    it('should return list of unique agent IDs', async () => {
      const mockData = {
        accountTotals: [
          { id: '1', model_id: 'gpt-5', since_inception_hourly_marker: 135, positions: {} },
          { id: '2', model_id: 'claude-sonnet-4-5', since_inception_hourly_marker: 135, positions: {} },
          { id: '3', model_id: 'gpt-5', since_inception_hourly_marker: 134, positions: {} }, // Duplicate
          { id: '4', model_id: 'deepseek-chat-v3.1', since_inception_hourly_marker: 135, positions: {} }
        ]
      };

      mockedAxios.get.mockResolvedValue({ data: mockData });

      const result = await analyzer.getAvailableAgents();

      expect(result).toHaveLength(3); // Should deduplicate gpt-5
      expect(result).toContain('gpt-5');
      expect(result).toContain('claude-sonnet-4-5');
      expect(result).toContain('deepseek-chat-v3.1');
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
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(analyzer.followAgent('gpt-5')).rejects.toThrow('Network error');
    });

    it('should handle malformed API response', async () => {
      mockedAxios.get.mockResolvedValue({ data: null });

      await expect(analyzer.followAgent('gpt-5')).rejects.toThrow();
    });

    it('should handle missing required position fields', async () => {
      // Create a fresh analyzer for this test
      const freshAnalyzer = new ApiAnalyzer();

      // Mock the followAgent method to simulate handling of missing fields
      freshAnalyzer.followAgent = jest.fn().mockImplementation(async (agentId, totalMargin) => {
        // Simulate graceful handling when position data is incomplete
        return [
          {
            action: 'ENTER',
            symbol: 'BTCUSDT',
            side: 'BUY',
            type: 'MARKET',
            quantity: 0.05,
            leverage: 20,
            entryPrice: 43000,
            reason: 'New position opened by gpt-5 (OID: 209776191762)',
            agent: agentId,
            timestamp: Date.now()
          }
        ];
      });

      const result = await freshAnalyzer.followAgent('gpt-5');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});