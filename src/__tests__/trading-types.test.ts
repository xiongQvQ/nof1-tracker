import { TradingPlan } from '../types/trading';

// Test file for trading types
describe('Trading Types', () => {
  it('should create a trading plan with id, symbol, side, and type', () => {
    const plan: TradingPlan = {
      id: 'test-plan-1',
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'MARKET',
      quantity: 0.001,
      leverage: 10,
      timestamp: Date.now()
    };

    expect(plan.id).toBe('test-plan-1');
    expect(plan.symbol).toBe('BTCUSDT');
    expect(plan.side).toBe('BUY');
    expect(plan.type).toBe('MARKET');
    expect(plan.quantity).toBe(0.001);
    expect(plan.leverage).toBe(10);
  });

  it('should create a trading plan with leverage', () => {
    const plan: TradingPlan = {
      id: 'test-plan-3',
      symbol: 'ADAUSDT',
      side: 'BUY',
      type: 'MARKET',
      quantity: 100,
      leverage: 20,
      timestamp: Date.now()
    };

    expect(plan.leverage).toBe(20);
  });
});