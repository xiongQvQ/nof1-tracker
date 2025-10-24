import { FuturesCapitalManager } from '../services/futures-capital-manager';
import { Position } from '../scripts/analyze-api';

describe('FuturesCapitalManager', () => {
  let capitalManager: FuturesCapitalManager;

  beforeEach(() => {
    capitalManager = new FuturesCapitalManager();
  });

  const mockPositions: Position[] = [
    {
      symbol: 'BTCUSDT',
      entry_price: 109538,
      quantity: 0.05,
      leverage: 20,
      current_price: 109089.5,
      unrealized_pnl: -22.65,
      confidence: 0.62,
      entry_oid: 210131632249,
      tp_oid: 210131645730,
      sl_oid: 210131650685,
      margin: 248.66,
      exit_plan: {
        profit_target: 112880.2,
        stop_loss: 108089.81,
        invalidation_condition: 'Test condition'
      }
    },
    {
      symbol: 'ETHUSDT',
      entry_price: 3891.1,
      quantity: 1.4,
      leverage: 20,
      current_price: 3845.25,
      unrealized_pnl: -64.26,
      confidence: 0.62,
      entry_oid: 210171486282,
      tp_oid: 210171501487,
      sl_oid: 210171516001,
      margin: 205.80,
      exit_plan: {
        profit_target: 4021.33,
        stop_loss: 3834.52,
        invalidation_condition: 'Test condition'
      }
    },
    {
      symbol: 'XRPUSDT',
      entry_price: 2.3989,
      quantity: -1504,
      leverage: 20,
      current_price: 2.38415,
      unrealized_pnl: 21.9584,
      confidence: 0.58,
      entry_oid: 209211935882,
      tp_oid: -1,
      sl_oid: -1,
      margin: 201.16,
      exit_plan: {
        profit_target: 2.3349,
        stop_loss: 2.4247,
        invalidation_condition: 'Test condition'
      }
    }
  ];

  it('should create FuturesCapitalManager instance', () => {
    expect(capitalManager).toBeInstanceOf(FuturesCapitalManager);
  });

  it('should allocate margin correctly based on proportions', () => {
    const totalMargin = 1000;
    const result = capitalManager.allocateMargin(mockPositions, totalMargin);

    // 验证总原始保证金
    const expectedOriginalMargin = 248.66 + 205.80 + 201.16; // 655.62
    expect(result.totalOriginalMargin).toBeCloseTo(expectedOriginalMargin, 2);

    // 验证总分配保证金 (使用floor向下取整，会略小于总数)
    expect(result.totalAllocatedMargin).toBeCloseTo(998, 0);

    // 验证BTC分配 (248.66 / 655.62 ≈ 37.94%)
    const btcAllocation = result.allocations.find(a => a.symbol === 'BTCUSDT');
    expect(btcAllocation).toBeDefined();
    expect(btcAllocation!.allocatedMargin).toBeCloseTo(379, 0); // floor后仍为379
    // notionalValue是独立floor计算的
    expect(btcAllocation!.notionalValue).toBeCloseTo(7585, 0); // 实际floor结果
    expect(btcAllocation!.allocationRatio).toBeCloseTo(0.3794, 3);
    expect(btcAllocation!.side).toBe('BUY');

    // 验证ETH分配 (205.80 / 655.62 ≈ 31.39%)
    const ethAllocation = result.allocations.find(a => a.symbol === 'ETHUSDT');
    expect(ethAllocation).toBeDefined();
    expect(ethAllocation!.allocatedMargin).toBeCloseTo(313, 0); // floor后为313
    // ETH的notionalValue也是独立取整的
    expect(ethAllocation!.notionalValue).toBeCloseTo(6278, 0);
    expect(ethAllocation!.allocationRatio).toBeCloseTo(0.3139, 3);
    expect(ethAllocation!.side).toBe('BUY');

    // 验证XRP分配 (201.16 / 655.62 ≈ 30.67%)
    const xrpAllocation = result.allocations.find(a => a.symbol === 'XRPUSDT');
    expect(xrpAllocation).toBeDefined();
    expect(xrpAllocation!.allocatedMargin).toBeCloseTo(306, 0); // floor后为306
    // XRP的notionalValue也是独立取整的
    expect(xrpAllocation!.notionalValue).toBeCloseTo(6136, 0);
    expect(xrpAllocation!.allocationRatio).toBeCloseTo(0.3067, 3);
    expect(xrpAllocation!.side).toBe('SELL'); // quantity为负数
  });

  it('should calculate adjusted quantities correctly', () => {
    const totalMargin = 1000;
    const result = capitalManager.allocateMargin(mockPositions, totalMargin);

    // BTC: 379.3 * 20 / 109089.5 ≈ 0.0695 BTC (rounded to 0.07)
    const btcAllocation = result.allocations.find(a => a.symbol === 'BTCUSDT');
    expect(btcAllocation!.adjustedQuantity).toBeCloseTo(0.07, 4);

    // ETH: 313.9 * 20 / 3845.25 ≈ 1.633 ETH
    const ethAllocation = result.allocations.find(a => a.symbol === 'ETHUSDT');
    expect(ethAllocation!.adjustedQuantity).toBeCloseTo(1.633, 3);

    // XRP: 306.8 * 20 / 2.38415 ≈ 2574 XRP
    const xrpAllocation = result.allocations.find(a => a.symbol === 'XRPUSDT');
    expect(xrpAllocation!.adjustedQuantity).toBeCloseTo(2574, 0);
  });

  it('should handle empty positions array', () => {
    const result = capitalManager.allocateMargin([], 1000);

    expect(result.totalOriginalMargin).toBe(0);
    expect(result.totalAllocatedMargin).toBe(0);
    expect(result.totalNotionalValue).toBe(0);
    expect(result.allocations).toHaveLength(0);
  });

  it('should handle positions with zero margin', () => {
    const positionsWithZeroMargin = [
      ...mockPositions,
      {
        symbol: 'TESTUSDT',
        entry_price: 100,
        quantity: 1,
        leverage: 10,
        current_price: 105,
        unrealized_pnl: 5,
        confidence: 0.5,
        entry_oid: 123456,
        tp_oid: -1,
        sl_oid: -1,
        margin: 0,
        exit_plan: {
          profit_target: 110,
          stop_loss: 90,
          invalidation_condition: 'Test condition'
        }
      }
    ];

    const result = capitalManager.allocateMargin(positionsWithZeroMargin, 1000);

    // 应该忽略margin为0的仓位
    expect(result.allocations).toHaveLength(3);
    expect(result.allocations.find(a => a.symbol === 'TESTUSDT')).toBeUndefined();
  });

  it('should use default total margin when not specified', () => {
    const result = capitalManager.allocateMargin(mockPositions);
    expect(result.totalAllocatedMargin).toBeCloseTo(998, 0); // floor结果
  });

  it('should validate allocation result', () => {
    const result = capitalManager.allocateMargin(mockPositions, 1000);
    expect(capitalManager.validateAllocation(result)).toBe(true);
  });

  it('should format amounts correctly', () => {
    expect(capitalManager.formatAmount(1234.567)).toBe('$1,234.57');
    expect(capitalManager.formatAmount(1000)).toBe('$1,000.00');
  });

  it('should format percentages correctly', () => {
    expect(capitalManager.formatPercentage(0.3796)).toBe('37.96%');
    expect(capitalManager.formatPercentage(1)).toBe('100.00%');
  });

  it('should set and get default total margin', () => {
    capitalManager.setDefaultTotalMargin(2000);
    expect(capitalManager.getDefaultTotalMargin()).toBe(2000);

    const result = capitalManager.allocateMargin(mockPositions);
    expect(result.totalAllocatedMargin).toBeCloseTo(1998, 0); // floor结果
  });

  it('should throw error for invalid margin', () => {
    expect(() => capitalManager.setDefaultTotalMargin(0)).toThrow('Total margin must be positive');
    expect(() => capitalManager.setDefaultTotalMargin(-100)).toThrow('Total margin must be positive');
  });

  it('should maintain leverage from original positions', () => {
    const result = capitalManager.allocateMargin(mockPositions, 1000);

    result.allocations.forEach(allocation => {
      const originalPosition = mockPositions.find(p => p.symbol === allocation.symbol);
      expect(allocation.leverage).toBe(originalPosition!.leverage);
    });
  });
});