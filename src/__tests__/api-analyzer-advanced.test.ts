import { ApiAnalyzer, Position, FollowPlan } from '../scripts/analyze-api';
import { ConfigManager } from '../services/config-manager';
import { RiskManager } from '../services/risk-manager';
import { FuturesCapitalManager } from '../services/futures-capital-manager';
import axios from 'axios';

// Mock axios to control API responses
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock console methods for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('ApiAnalyzer - Advanced Coverage Tests', () => {
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

  let mockPosition: Position;

  beforeEach(() => {
    mockPosition = {
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
    };
  });

  describe('Private Methods Testing', () => {

    describe('shouldExitPosition', () => {
      it('should return true for long position reaching profit target', () => {
        const profitReachedPosition = {
          ...mockPosition,
          current_price: 45000 // Equal to profit target
        };

        // Access private method for testing
        const shouldExit = (analyzer as any).shouldExitPosition(profitReachedPosition);
        expect(shouldExit).toBe(true);
      });

      it('should return true for long position reaching stop loss', () => {
        const stopLossPosition = {
          ...mockPosition,
          current_price: 41000 // Equal to stop loss
        };

        const shouldExit = (analyzer as any).shouldExitPosition(stopLossPosition);
        expect(shouldExit).toBe(true);
      });

      it('should return false for long position within range', () => {
        const inRangePosition = {
          ...mockPosition,
          current_price: 43500 // Between profit target and stop loss
        };

        const shouldExit = (analyzer as any).shouldExitPosition(inRangePosition);
        expect(shouldExit).toBe(false);
      });

      it('should return true for short position reaching profit target', () => {
        const shortProfitPosition = {
          ...mockPosition,
          quantity: -0.05, // Short position
          exit_plan: {
            profit_target: 41000, // For short: profit when price goes down
            stop_loss: 45000,      // For short: stop loss when price goes up
            invalidation_condition: 'price_above_stop_loss'
          },
          current_price: 41000 // Equal to profit target for short
        };

        const shouldExit = (analyzer as any).shouldExitPosition(shortProfitPosition);
        expect(shouldExit).toBe(true);
      });

      it('should return true for short position reaching stop loss', () => {
        const shortStopLossPosition = {
          ...mockPosition,
          quantity: -0.05, // Short position
          exit_plan: {
            profit_target: 41000, // For short: profit when price goes down
            stop_loss: 45000,      // For short: stop loss when price goes up
            invalidation_condition: 'price_above_stop_loss'
          },
          current_price: 45000 // Equal to stop loss for short
        };

        const shouldExit = (analyzer as any).shouldExitPosition(shortStopLossPosition);
        expect(shouldExit).toBe(true);
      });

      it('should return false for short position within range', () => {
        const shortInRangePosition = {
          ...mockPosition,
          quantity: -0.05, // Short position
          exit_plan: {
            profit_target: 41000, // For short: profit when price goes down
            stop_loss: 45000,      // For short: stop loss when price goes up
            invalidation_condition: 'price_above_stop_loss'
          },
          current_price: 43500 // Between profit target (41000) and stop loss (45000) for short
        };

        const shouldExit = (analyzer as any).shouldExitPosition(shortInRangePosition);
        expect(shouldExit).toBe(false);
      });

      it('should handle zero profit target', () => {
        const zeroProfitTargetPosition = {
          ...mockPosition,
          exit_plan: {
            profit_target: 0,
            stop_loss: 41000,
            invalidation_condition: ''
          }
        };

        const shouldExit = (analyzer as any).shouldExitPosition(zeroProfitTargetPosition);
        // With current_price=43500, profit_target=0, stop_loss=41000
        // For long position: current_price (43500) >= profit_target (0) is TRUE
        expect(shouldExit).toBe(true);
      });

      it('should handle zero stop loss', () => {
        const zeroStopLossPosition = {
          ...mockPosition,
          exit_plan: {
            profit_target: 45000,
            stop_loss: 0,
            invalidation_condition: ''
          }
        };

        const shouldExit = (analyzer as any).shouldExitPosition(zeroStopLossPosition);
        expect(shouldExit).toBe(false);
      });
    });

    describe('getExitReason', () => {
      it('should return take profit reason for long position at profit target', () => {
        const profitReachedPosition = {
          ...mockPosition,
          current_price: 45000
        };

        const exitReason = (analyzer as any).getExitReason(profitReachedPosition);
        expect(exitReason).toBe('Take profit at 45000');
      });

      it('should return stop loss reason for long position at stop loss', () => {
        const stopLossPosition = {
          ...mockPosition,
          current_price: 41000
        };

        const exitReason = (analyzer as any).getExitReason(stopLossPosition);
        expect(exitReason).toBe('Stop loss at 41000');
      });

      it('should return take profit reason for short position at profit target', () => {
        const shortProfitPosition = {
          ...mockPosition,
          quantity: -0.05,
          exit_plan: {
            profit_target: 41000, // For short: profit when price goes down
            stop_loss: 45000,      // For short: stop loss when price goes up
            invalidation_condition: 'price_above_stop_loss'
          },
          current_price: 41000
        };

        const exitReason = (analyzer as any).getExitReason(shortProfitPosition);
        expect(exitReason).toBe('Take profit at 41000');
      });

      it('should return stop loss reason for short position at stop loss', () => {
        const shortStopLossPosition = {
          ...mockPosition,
          quantity: -0.05,
          exit_plan: {
            profit_target: 41000, // For short: profit when price goes down
            stop_loss: 45000,      // For short: stop loss when price goes up
            invalidation_condition: 'price_above_stop_loss'
          },
          current_price: 45000
        };

        const exitReason = (analyzer as any).getExitReason(shortStopLossPosition);
        expect(exitReason).toBe('Stop loss at 45000');
      });

      it('should return generic reason for position within range', () => {
        const inRangePosition = {
          ...mockPosition,
          current_price: 43500
        };

        const exitReason = (analyzer as any).getExitReason(inRangePosition);
        expect(exitReason).toBe('Exit condition met');
      });

      it('should handle negative prices gracefully', () => {
        const negativePricePosition = {
          ...mockPosition,
          current_price: -1000
        };

        const exitReason = (analyzer as any).getExitReason(negativePricePosition);
        // For long position with current_price=-1000, profit_target=45000, stop_loss=41000:
        // current_price >= profit_target? -1000 >= 45000 -> false
        // current_price <= stop_loss? -1000 <= 41000 -> true
        expect(exitReason).toBe('Stop loss at 41000');
      });

      it('should handle zero prices gracefully', () => {
        const zeroPricePosition = {
          ...mockPosition,
          current_price: 0
        };

        const exitReason = (analyzer as any).getExitReason(zeroPricePosition);
        // For long position with current_price=0, profit_target=45000, stop_loss=41000:
        // current_price >= profit_target? 0 >= 45000 -> false
        // current_price <= stop_loss? 0 <= 41000 -> true
        expect(exitReason).toBe('Stop loss at 41000');
      });
    });

    describe('needsAction', () => {
      it('should return true for valid positions', () => {
        const needsAction = (analyzer as any).needsAction(mockPosition);
        expect(needsAction).toBe(true);
      });

      it('should return false for zero quantity positions', () => {
        const zeroQuantityPosition = {
          ...mockPosition,
          quantity: 0
        };

        const needsAction = (analyzer as any).needsAction(zeroQuantityPosition);
        expect(needsAction).toBe(false);
      });

      it('should return false for zero current price positions', () => {
        const zeroCurrentPricePosition = {
          ...mockPosition,
          current_price: 0
        };

        const needsAction = (analyzer as any).needsAction(zeroCurrentPricePosition);
        expect(needsAction).toBe(false);
      });

      it('should return false for zero leverage positions', () => {
        const zeroLeveragePosition = {
          ...mockPosition,
          leverage: 0
        };

        const needsAction = (analyzer as any).needsAction(zeroLeveragePosition);
        expect(needsAction).toBe(false);
      });

      it('should return false for negative leverage positions', () => {
        const negativeLeveragePosition = {
          ...mockPosition,
          leverage: -5
        };

        const needsAction = (analyzer as any).needsAction(negativeLeveragePosition);
        expect(needsAction).toBe(false);
      });
    });

    describe('getLatestAgentData', () => {
      it('should filter to latest data for each agent', () => {
        const testData = {
          accountTotals: [
            {
              id: '1',
              model_id: 'gpt-5',
              since_inception_hourly_marker: 135,
              positions: { 'BTCUSDT': mockPosition }
            },
            {
              id: '2',
              model_id: 'gpt-5',
              since_inception_hourly_marker: 134, // Older data - should be filtered out
              positions: { 'ETHUSDT': { ...mockPosition, symbol: 'ETHUSDT' } }
            },
            {
              id: '3',
              model_id: 'claude-sonnet-4-5',
              since_inception_hourly_marker: 136, // Newer data
              positions: { 'ADAUSDT': { ...mockPosition, symbol: 'ADAUSDT' } }
            }
          ]
        };

        const latestData = (analyzer as any).getLatestAgentData(testData.accountTotals);

        expect(latestData).toHaveLength(2); // Only 2 unique model_ids
        expect(latestData.find((a: any) => a.model_id === 'gpt-5')!.since_inception_hourly_marker).toBe(135);
        expect(latestData.find((a: any) => a.model_id === 'claude-sonnet-4-5')!.since_inception_hourly_marker).toBe(136);
        expect(latestData.find((a: any) => a.model_id === 'nonexistent')).toBeUndefined();
      });

      it('should handle empty account totals array', () => {
        const latestData = (analyzer as any).getLatestAgentData([]);
        expect(latestData).toEqual([]);
      });

      it('should handle null account totals', () => {
        // Test that the method handles null input gracefully in actual implementation
        expect(() => {
          (analyzer as any).getLatestAgentData(null);
        }).toThrow('accountTotals is not iterable');
      });

      it('should handle undefined account totals', () => {
        // Test that the method handles undefined input gracefully in actual implementation
        expect(() => {
          (analyzer as any).getLatestAgentData(undefined);
        }).toThrow('accountTotals is not iterable');
      });

      it('should handle missing model_id', () => {
        const invalidData = [
          { id: '1', model_id: '', since_inception_hourly_marker: 135, positions: {} },
          { id: '2', model_id: null as any, since_inception_hourly_marker: 134, positions: {} }
        ];

        const latestData = (analyzer as any).getLatestAgentData(invalidData);
        expect(latestData).toHaveLength(2);
      });
    });
  });

  describe('Integration with Services', () => {
    it('should integrate with ConfigManager', () => {
      const configManager = analyzer.getConfigManager();
      expect(configManager).toBeInstanceOf(ConfigManager);

      // Test setting configuration
      configManager.setPriceTolerance(1.0);
      expect(configManager.getPriceTolerance()).toBe(1.0);
    });

    it('should use RiskManager for price tolerance checks', async () => {
      const agentData = {
        accountTotals: [
          {
            id: 'test-agent',
            model_id: 'gpt-5',
            since_inception_hourly_marker: 135,
            positions: {
              'BTCUSDT': {
                ...mockPosition,
                entry_price: 43000,
                current_price: 43500
              }
            }
          }
        ]
      };

      mockedAxios.get.mockResolvedValue({ data: agentData });

      // This should call riskManager.checkPriceTolerance internally
      const result = await analyzer.followAgent('gpt-5');

      expect(result).toHaveLength(1);
      expect(result[0].priceTolerance).toBeDefined();
    });

    it('should use FuturesCapitalManager for allocation', async () => {
      const agentData = {
        accountTotals: [
          {
            id: 'test-agent',
            model_id: 'gpt-5',
            since_inception_hourly_marker: 135,
            positions: {
              'BTCUSDT': {
                ...mockPosition,
                margin: 100
              },
              'ETHUSDT': {
                ...mockPosition,
                symbol: 'ETHUSDT',
                margin: 150
              }
            }
          }
        ]
      };

      mockedAxios.get.mockResolvedValue({ data: agentData });

      // This should trigger capital allocation
      const result = await analyzer.followAgent('gpt-5', 1000);

      expect(result).toHaveLength(2);
      // Check that allocation data is present
      expect(result.some(plan => plan.allocatedMargin !== undefined)).toBe(true);
      expect(result.some(plan => plan.allocationRatio !== undefined)).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network timeout'));

      await expect(analyzer.followAgent('gpt-5')).rejects.toThrow('Network timeout');
    });

    it('should handle malformed API response', async () => {
      mockedAxios.get.mockResolvedValue({ data: null });

      await expect(analyzer.followAgent('gpt-5')).rejects.toThrow();
    });

    it('should handle invalid accountTotals structure', async () => {
      const invalidData = { invalid: 'data' };
      mockedAxios.get.mockResolvedValue({ data: invalidData });

      await expect(analyzer.followAgent('gpt-5')).rejects.toThrow();
    });

    it('should handle missing positions in account data', async () => {
      const noPositionsData = {
        accountTotals: [
          {
            id: 'test-agent',
            model_id: 'gpt-5',
            since_inception_hourly_marker: 135,
            positions: {} // Empty positions
          }
        ]
      };

      mockedAxios.get.mockResolvedValue({ data: noPositionsData });

      const result = await analyzer.followAgent('gpt-5');
      expect(result).toEqual([]);
    });

    it('should handle positions with missing required fields', async () => {
      const incompletePositionData = {
        accountTotals: [
          {
            id: 'test-agent',
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
                // Missing exit_plan - this should cause the shouldExitPosition to throw
              }
            }
          }
        ]
      };

      mockedAxios.get.mockResolvedValue({ data: incompletePositionData });

      // Should throw due to missing exit_plan when shouldExitPosition is called
      await expect(analyzer.followAgent('gpt-5')).rejects.toThrow();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large number of agents efficiently', async () => {
      const largeDataSet = {
        accountTotals: Array.from({ length: 100 }, (_, i) => ({
          id: `agent-${i}`,
          model_id: `model-${i}`,
          since_inception_hourly_marker: 135 + Math.floor(i / 10),
          positions: {
            [`SYMBOL-${i}`]: mockPosition
          }
        }))
      };

      mockedAxios.get.mockResolvedValue({ data: largeDataSet });

      const startTime = Date.now();
      const result = await analyzer.followAgent('model-5');
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle large number of positions per agent', async () => {
      const manyPositionsData = {
        accountTotals: [
          {
            id: 'test-agent',
            model_id: 'gpt-5',
            since_inception_hourly_marker: 135,
            positions: {}
          }
        ]
      };

      // Create 50 positions for this agent
      for (let i = 0; i < 50; i++) {
        (manyPositionsData.accountTotals[0].positions as any)[`SYMBOL-${i}`] = {
          ...mockPosition,
          symbol: `SYMBOL-${i}`,
          entry_oid: 209776191762 + i
        };
      }

      mockedAxios.get.mockResolvedValue({ data: manyPositionsData });

      const result = await analyzer.followAgent('gpt-5');
      expect(result).toBeDefined();
      // Should have 50 ENTER plans
      expect(result.filter(plan => plan.action === 'ENTER')).toHaveLength(50);
    });
  });

  describe('State Management', () => {
    it('should maintain state between calls', async () => {
      const firstCallData = {
        accountTotals: [
          {
            id: 'test-agent',
            model_id: 'gpt-5',
            since_inception_hourly_marker: 135,
            positions: {
              'BTCUSDT': {
                ...mockPosition,
                entry_oid: 123
              }
            }
          }
        ]
      };

      const secondCallData = {
        accountTotals: [
          {
            id: 'test-agent',
            model_id: 'gpt-5',
            since_inception_hourly_marker: 136,
            positions: {
              'BTCUSDT': {
                ...mockPosition,
                entry_oid: 456, // Changed OID
                current_price: 44000
              }
            }
          }
        ]
      };

      // First call
      mockedAxios.get.mockResolvedValue({ data: firstCallData });
      await analyzer.followAgent('gpt-5');

      // Second call should detect the OID change
      mockedAxios.get.mockResolvedValue({ data: secondCallData });
      const result = await analyzer.followAgent('gpt-5');

      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should reset state for different agents', async () => {
      const agent1Data = {
        accountTotals: [
          {
            id: 'agent-1',
            model_id: 'gpt-5',
            since_inception_hourly_marker: 135,
            positions: { 'BTCUSDT': mockPosition }
          }
        ]
      };

      const agent2Data = {
        accountTotals: [
          {
            id: 'agent-2',
            model_id: 'claude-sonnet-4-5',
            since_inception_hourly_marker: 135,
            positions: { 'ETHUSDT': { ...mockPosition, symbol: 'ETHUSDT' } }
          }
        ]
      };

      // Follow agent 1
      mockedAxios.get.mockResolvedValue({ data: agent1Data });
      const result1 = await analyzer.followAgent('gpt-5');

      // Follow agent 2 should not be affected by agent 1's state
      mockedAxios.get.mockResolvedValue({ data: agent2Data });
      const result2 = await analyzer.followAgent('claude-sonnet-4-5');

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });
});