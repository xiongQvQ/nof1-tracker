import { RiskManager } from '../services/risk-manager';
import { TradingPlan } from '../types/trading';

describe('RiskManager', () => {
  it('should create RiskManager instance', () => {
    const riskManager = new RiskManager();
    expect(riskManager).toBeInstanceOf(RiskManager);
  });

  it('should validate trading plan within risk limits', () => {
    const riskManager = new RiskManager();

    const tradingPlan: TradingPlan = {
      id: 'test-plan-1',
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'MARKET',
      quantity: 0.001,
      leverage: 10,
      timestamp: Date.now()
    };

    const riskAssessment = riskManager.assessRisk(tradingPlan);

    expect(riskAssessment.isValid).toBe(true);
    expect(riskAssessment.riskScore).toBeGreaterThan(0);
  });

  describe('Price Tolerance', () => {
    it('should calculate price difference correctly', () => {
      const riskManager = new RiskManager();

      // Test 1% price increase
      const diff1 = riskManager.calculatePriceDifference(100, 101);
      expect(diff1).toBeCloseTo(1.0, 2);

      // Test 1% price decrease
      const diff2 = riskManager.calculatePriceDifference(100, 99);
      expect(diff2).toBeCloseTo(1.0, 2);

      // Test no price difference
      const diff3 = riskManager.calculatePriceDifference(100, 100);
      expect(diff3).toBe(0);
    });

    it('should check price tolerance within threshold', () => {
      const riskManager = new RiskManager();

      // Within tolerance (0.3% difference)
      const result1 = riskManager.checkPriceTolerance(100, 100.3, undefined, 0.5);
      expect(result1.withinTolerance).toBe(true);
      expect(result1.shouldExecute).toBe(true);

      // Exactly at tolerance (0.5% difference)
      const result2 = riskManager.checkPriceTolerance(100, 100.5, undefined, 0.5);
      expect(result2.withinTolerance).toBe(true);
      expect(result2.shouldExecute).toBe(true);
    });

    it('should check price tolerance outside threshold', () => {
      const riskManager = new RiskManager();

      // Outside tolerance (1% difference)
      const result1 = riskManager.checkPriceTolerance(100, 101, undefined, 0.5);
      expect(result1.withinTolerance).toBe(false);
      expect(result1.shouldExecute).toBe(false);

      // Outside tolerance (0.8% difference)
      const result2 = riskManager.checkPriceTolerance(100, 99.2, undefined, 0.5);
      expect(result2.withinTolerance).toBe(false);
      expect(result2.shouldExecute).toBe(false);
    });

    it('should include price tolerance in risk assessment', () => {
      const riskManager = new RiskManager();

      const tradingPlan: TradingPlan = {
        id: 'test-price-tolerance',
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.001,
        leverage: 10,
        timestamp: Date.now()
      };

      // Test with price tolerance check
      const currentPrice = 101; // 1% above entry price
      const entryPrice = 100;

      const riskAssessment = riskManager.assessRiskWithPriceTolerance(
        tradingPlan,
        entryPrice,
        currentPrice,
        'BTCUSDT',
        0.5
      );

      expect(riskAssessment.priceTolerance).toBeDefined();
      expect(riskAssessment.priceTolerance?.withinTolerance).toBe(false);
      expect(riskAssessment.priceTolerance?.shouldExecute).toBe(false);
      expect(riskAssessment.priceTolerance?.priceDifference).toBeCloseTo(1.0, 2);
    });
  });
});