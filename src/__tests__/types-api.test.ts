import {
  Position,
  AgentAccount,
  Nof1Response,
  ApiResponse,
  FollowPlan,
  PositionOperationResult,
  PositionValidationResult,
  PositionChange,
  CacheEntry,
  EnvironmentConfig,
  AppConfig,
  ErrorType,
  LogLevel
} from '../types/api';

describe('API Types', () => {
  describe('Position', () => {
    it('should create valid Position', () => {
      const position: Position = {
        symbol: 'BTCUSDT',
        entry_price: 43000,
        quantity: 0.05,
        leverage: 20,
        current_price: 43500,
        unrealized_pnl: 25,
        confidence: 0.85,
        entry_oid: 209776191762,
        tp_oid: 209776191763,
        sl_oid: 209776191764,
        margin: 100,
        exit_plan: {
          profit_target: 45000,
          stop_loss: 41000,
          invalidation_condition: 'price_below_stop_loss'
        }
      };

      expect(position.symbol).toBe('BTCUSDT');
      expect(position.entry_price).toBe(43000);
      expect(position.quantity).toBe(0.05);
      expect(position.leverage).toBe(20);
    });

    it('should handle short positions', () => {
      const shortPosition: Position = {
        symbol: 'ETHUSDT',
        entry_price: 3200,
        quantity: -1.5, // Negative for short
        leverage: 15,
        current_price: 3150,
        unrealized_pnl: 75,
        confidence: 0.80,
        entry_oid: 209776191765,
        tp_oid: -1,
        sl_oid: -1,
        margin: 320,
        exit_plan: {
          profit_target: 3000,
          stop_loss: 3400,
          invalidation_condition: 'price_above_stop_loss'
        }
      };

      expect(shortPosition.quantity).toBe(-1.5);
      expect(shortPosition.unrealized_pnl).toBe(75);
    });

    it('should handle positions without stop orders', () => {
      const positionWithoutStops: Position = {
        symbol: 'ADAUSDT',
        entry_price: 1.2,
        quantity: 1000,
        leverage: 10,
        current_price: 1.25,
        unrealized_pnl: 50,
        confidence: 0.75,
        entry_oid: 209776191766,
        tp_oid: -1,
        sl_oid: -1,
        margin: 120,
        exit_plan: {
          profit_target: 1.3,
          stop_loss: 1.15,
          invalidation_condition: 'price_below_stop_loss'
        }
      };

      expect(positionWithoutStops.tp_oid).toBe(-1);
      expect(positionWithoutStops.sl_oid).toBe(-1);
    });
  });

  describe('AgentAccount', () => {
    it('should create valid AgentAccount', () => {
      const agent: AgentAccount = {
        id: 'agent-123',
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
          }
        }
      };

      expect(agent.id).toBe('agent-123');
      expect(agent.model_id).toBe('gpt-5');
      expect(agent.since_inception_hourly_marker).toBe(135);
      expect(Object.keys(agent.positions)).toContain('BTCUSDT');
    });

    it('should handle agents with multiple positions', () => {
      const agentWithMultiplePositions: AgentAccount = {
        id: 'agent-456',
        model_id: 'claude-sonnet-4-5',
        since_inception_hourly_marker: 140,
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
            quantity: -1.0,
            leverage: 15,
            current_price: 3150,
            unrealized_pnl: 50,
            confidence: 0.80,
            entry_oid: 209776191763,
            tp_oid: -1,
            sl_oid: -1,
            margin: 213,
            exit_plan: {
              profit_target: 3000,
              stop_loss: 3400,
              invalidation_condition: 'price_above_stop_loss'
            }
          }
        }
      };

      expect(Object.keys(agentWithMultiplePositions.positions)).toHaveLength(2);
      expect(agentWithMultiplePositions.positions['BTCUSDT']).toBeDefined();
      expect(agentWithMultiplePositions.positions['ETHUSDT']).toBeDefined();
    });

    it('should handle agents with no positions', () => {
      const agentWithNoPositions: AgentAccount = {
        id: 'agent-789',
        model_id: 'deepseek-chat-v3.1',
        since_inception_hourly_marker: 145,
        positions: {}
      };

      expect(Object.keys(agentWithNoPositions.positions)).toHaveLength(0);
    });
  });

  describe('FollowPlan', () => {
    it('should create valid FollowPlan for ENTER action', () => {
      const followPlan: FollowPlan = {
        action: 'ENTER',
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.05,
        leverage: 20,
        reason: 'Following successful trade',
        agent: 'gpt-5',
        timestamp: Date.now(),
        allocatedMargin: 100,
        allocationRatio: 0.1
      };

      expect(followPlan.action).toBe('ENTER');
      expect(followPlan.symbol).toBe('BTCUSDT');
      expect(followPlan.side).toBe('BUY');
      expect(followPlan.quantity).toBe(0.05);
      expect(followPlan.leverage).toBe(20);
    });

    it('should create valid FollowPlan for EXIT action', () => {
      const followPlan: FollowPlan = {
        action: 'EXIT',
        symbol: 'ETHUSDT',
        side: 'SELL',
        type: 'MARKET',
        quantity: 1.0,
        leverage: 15,
        reason: 'Taking profit',
        agent: 'claude-sonnet-4-5',
        timestamp: Date.now()
      };

      expect(followPlan.action).toBe('EXIT');
      expect(followPlan.side).toBe('SELL');
      expect(followPlan.reason).toBe('Taking profit');
    });

    it('should handle HOLD action', () => {
      const holdPlan: FollowPlan = {
        action: 'HOLD',
        symbol: 'ADAUSDT',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 1000,
        leverage: 10,
        entryPrice: 1.2,
        reason: 'Waiting for better entry',
        agent: 'deepseek-chat-v3.1',
        timestamp: Date.now()
      };

      expect(holdPlan.action).toBe('HOLD');
      expect(holdPlan.entryPrice).toBe(1.2);
      expect(holdPlan.type).toBe('LIMIT');
    });
  });

  describe('Nof1Response', () => {
    it('should create valid Nof1Response', () => {
      const response: Nof1Response = {
        accountTotals: [
          {
            id: 'agent-1',
            model_id: 'gpt-5',
            since_inception_hourly_marker: 135,
            positions: {}
          },
          {
            id: 'agent-2',
            model_id: 'claude-sonnet-4-5',
            since_inception_hourly_marker: 140,
            positions: {}
          }
        ]
      };

      expect(response.accountTotals).toHaveLength(2);
      expect(response.accountTotals[0].model_id).toBe('gpt-5');
      expect(response.accountTotals[1].model_id).toBe('claude-sonnet-4-5');
    });

    it('should handle empty account totals', () => {
      const emptyResponse: Nof1Response = {
        accountTotals: []
      };

      expect(emptyResponse.accountTotals).toHaveLength(0);
    });
  });

  describe('ApiResponse', () => {
    it('should create generic ApiResponse', () => {
      const apiResponse: ApiResponse<string> = {
        success: true,
        data: 'Success message',
        timestamp: Date.now()
      };

      expect(apiResponse.success).toBe(true);
      expect(apiResponse.data).toBe('Success message');
      expect(typeof apiResponse.timestamp).toBe('number');
    });

    it('should handle error response', () => {
      const errorResponse: ApiResponse<null> = {
        success: false,
        data: null,
        error: 'Invalid parameters',
        timestamp: Date.now()
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.data).toBeNull();
      expect(errorResponse.error).toBe('Invalid parameters');
    });

    it('should handle complex data types', () => {
      const complexResponse: ApiResponse<FollowPlan[]> = {
        success: true,
        data: [
          {
            action: 'ENTER',
            symbol: 'BTCUSDT',
            side: 'BUY',
            type: 'MARKET',
            quantity: 0.05,
            leverage: 20,
            reason: 'Test plan',
            agent: 'gpt-5',
            timestamp: Date.now()
          }
        ],
        timestamp: Date.now()
      };

      expect(complexResponse.success).toBe(true);
      expect(complexResponse.data).toBeDefined();
      expect(complexResponse.data!).toHaveLength(1);
      expect(complexResponse.data![0].symbol).toBe('BTCUSDT');
    });
  });

  describe('PositionOperationResult', () => {
    it('should create successful operation result', () => {
      const result: PositionOperationResult = {
        success: true,
        orderId: 12345,
        symbol: 'BTCUSDT',
        operation: 'open'
      };

      expect(result.success).toBe(true);
      expect(result.orderId).toBe(12345);
      expect(result.symbol).toBe('BTCUSDT');
      expect(result.operation).toBe('open');
    });

    it('should create failed operation result', () => {
      const result: PositionOperationResult = {
        success: false,
        error: 'Insufficient balance',
        symbol: 'ETHUSDT',
        operation: 'close'
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient balance');
      expect(result.orderId).toBeUndefined();
    });
  });

  describe('PositionValidationResult', () => {
    it('should create valid validation result', () => {
      const result: PositionValidationResult = {
        isValid: true
      };

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.warnings).toBeUndefined();
    });

    it('should create invalid validation result with error', () => {
      const result: PositionValidationResult = {
        isValid: false,
        error: 'Position size too large',
        warnings: ['Consider reducing position size', 'High leverage detected']
      };

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Position size too large');
      expect(result.warnings).toHaveLength(2);
    });
  });

  describe('PositionChange', () => {
    it('should create new position change', () => {
      const change: PositionChange = {
        type: 'new_position',
        symbol: 'BTCUSDT',
        currentPosition: {
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
        }
      };

      expect(change.type).toBe('new_position');
      expect(change.symbol).toBe('BTCUSDT');
      expect(change.currentPosition).toBeDefined();
      expect(change.previousPosition).toBeUndefined();
    });
  });

  describe('CacheEntry', () => {
    it('should create valid cache entry', () => {
      const cacheEntry: CacheEntry<AgentAccount[]> = {
        data: [
          {
            id: 'agent-1',
            model_id: 'gpt-5',
            since_inception_hourly_marker: 135,
            positions: {}
          }
        ],
        timestamp: Date.now(),
        url: 'https://nof1.ai/api/account-totals?marker=123'
      };

      expect(cacheEntry.data).toHaveLength(1);
      expect(typeof cacheEntry.timestamp).toBe('number');
      expect(cacheEntry.url).toBe('https://nof1.ai/api/account-totals?marker=123');
    });
  });

  describe('EnvironmentConfig', () => {
    it('should create valid environment config', () => {
      const config: EnvironmentConfig = {
        binanceApiKey: 'test-api-key',
        binanceApiSecret: 'test-secret-key',
        nof1ApiBaseUrl: 'https://test.api.com',
        environment: 'development'
      };

      expect(config.binanceApiKey).toBe('test-api-key');
      expect(config.binanceApiSecret).toBe('test-secret-key');
      expect(config.environment).toBe('development');
    });
  });

  describe('AppConfig', () => {
    it('should create valid app config', () => {
      const config: AppConfig = {
        api: {
          baseUrl: 'https://nof1.ai/api',
          timeout: 30000
        },
        trading: {
          defaultLeverage: 1,
          minPositionSize: 0.001
        },
        cache: {
          ttl: 60000,
          maxSize: 100
        },
        logging: {
          level: LogLevel.INFO,
          enableColors: true
        }
      };

      expect(config.api.baseUrl).toBe('https://nof1.ai/api');
      expect(config.trading.defaultLeverage).toBe(1);
      expect(config.cache.ttl).toBe(60000);
      expect(config.logging.level).toBe(LogLevel.INFO);
    });
  });

  describe('Enums', () => {
    it('should have correct ErrorType values', () => {
      expect(ErrorType.API_ERROR).toBe('ApiError');
      expect(ErrorType.TRADING_ERROR).toBe('TradingError');
      expect(ErrorType.POSITION_ERROR).toBe('PositionError');
      expect(ErrorType.CONFIGURATION_ERROR).toBe('ConfigurationError');
      expect(ErrorType.VALIDATION_ERROR).toBe('ValidationError');
    });

    it('should have correct LogLevel values', () => {
      expect(LogLevel.ERROR).toBe('error');
      expect(LogLevel.WARN).toBe('warn');
      expect(LogLevel.INFO).toBe('info');
      expect(LogLevel.DEBUG).toBe('debug');
    });
  });

  describe('Type Compatibility', () => {
    it('should allow Position in Record<string, Position>', () => {
      const positions: Record<string, Position> = {
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
        }
      };

      expect(positions['BTCUSDT']).toBeDefined();
      expect(positions['BTCUSDT'].symbol).toBe('BTCUSDT');
    });

    it('should handle optional properties correctly', () => {
      const minimalFollowPlan: FollowPlan = {
        action: 'HOLD',
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.1,
        leverage: 10,
        reason: 'Minimal plan',
        agent: 'test-agent',
        timestamp: Date.now()
      };

      expect(minimalFollowPlan.entryPrice).toBeUndefined();
      expect(minimalFollowPlan.exitPrice).toBeUndefined();
      expect(minimalFollowPlan.position).toBeUndefined();
    });
  });
});