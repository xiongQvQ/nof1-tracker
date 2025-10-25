import { ProfitCalculator, TradePair, ProfitStats, ProfitAnalysis } from '../../services/profit-calculator';
import { UserTrade } from '../../services/binance-service';

describe('ProfitCalculator', () => {
  let calculator: ProfitCalculator;

  beforeEach(() => {
    calculator = new ProfitCalculator();
  });

  describe('analyzeProfit', () => {
    it('应该正确分析空交易列表', () => {
      const trades: UserTrade[] = [];
      const result = calculator.analyzeProfit(trades);

      expect(result.overall.totalTrades).toBe(0);
      expect(result.overall.totalNetProfit).toBe(0);
      expect(result.overall.winRate).toBe(0);
      expect(result.tradePairs).toEqual([]);
      expect(Object.keys(result.bySymbol)).toHaveLength(0);
    });

    it('应该正确分析单个盈利交易', () => {
      const trades: UserTrade[] = [
        {
          symbol: 'BTCUSDT',
          id: 1,
          orderId: 100,
          price: '50000',
          qty: '0.1',
          quoteQty: '5000',
          commission: '5',
          commissionAsset: 'USDT',
          time: 1000000,
          buyer: true,
          maker: false,
          side: 'BUY',
          positionSide: 'LONG',
          realizedPnl: '100'
        }
      ];

      const result = calculator.analyzeProfit(trades);

      expect(result.overall.totalTrades).toBe(1);
      expect(result.overall.totalGrossProfit).toBe(100);
      expect(result.overall.totalCommission).toBe(5);
      expect(result.overall.totalNetProfit).toBe(95);
      expect(result.overall.winningTrades).toBe(1);
      expect(result.overall.losingTrades).toBe(0);
      expect(result.overall.winRate).toBe(100);
    });

    it('应该正确分析多个交易', () => {
      const trades: UserTrade[] = [
        {
          symbol: 'BTCUSDT',
          id: 1,
          orderId: 100,
          price: '50000',
          qty: '0.1',
          quoteQty: '5000',
          commission: '5',
          commissionAsset: 'USDT',
          time: 1000000,
          buyer: true,
          maker: false,
          side: 'BUY',
          positionSide: 'LONG',
          realizedPnl: '100'
        },
        {
          symbol: 'BTCUSDT',
          id: 2,
          orderId: 101,
          price: '51000',
          qty: '0.1',
          quoteQty: '5100',
          commission: '5',
          commissionAsset: 'USDT',
          time: 2000000,
          buyer: false,
          maker: false,
          side: 'SELL',
          positionSide: 'LONG',
          realizedPnl: '-50'
        }
      ];

      const result = calculator.analyzeProfit(trades);

      expect(result.overall.totalTrades).toBe(2);
      expect(result.overall.totalGrossProfit).toBe(50);
      expect(result.overall.totalCommission).toBe(10);
      expect(result.overall.totalNetProfit).toBe(40);
      expect(result.overall.winningTrades).toBe(1);
      expect(result.overall.losingTrades).toBe(1);
      expect(result.overall.winRate).toBe(50);
    });

    it('应该按交易对分组统计', () => {
      const trades: UserTrade[] = [
        {
          symbol: 'BTCUSDT',
          id: 1,
          orderId: 100,
          price: '50000',
          qty: '0.1',
          quoteQty: '5000',
          commission: '5',
          commissionAsset: 'USDT',
          time: 1000000,
          buyer: true,
          maker: false,
          side: 'BUY',
          positionSide: 'LONG',
          realizedPnl: '100'
        },
        {
          symbol: 'ETHUSDT',
          id: 2,
          orderId: 101,
          price: '3000',
          qty: '1',
          quoteQty: '3000',
          commission: '3',
          commissionAsset: 'USDT',
          time: 2000000,
          buyer: true,
          maker: false,
          side: 'BUY',
          positionSide: 'LONG',
          realizedPnl: '50'
        }
      ];

      const result = calculator.analyzeProfit(trades);

      expect(Object.keys(result.bySymbol)).toHaveLength(2);
      expect(result.bySymbol['BTCUSDT']).toBeDefined();
      expect(result.bySymbol['ETHUSDT']).toBeDefined();
      expect(result.bySymbol['BTCUSDT'].stats.totalTrades).toBe(1);
      expect(result.bySymbol['ETHUSDT'].stats.totalTrades).toBe(1);
    });

    it('应该正确计算最大盈利和最大亏损', () => {
      const trades: UserTrade[] = [
        {
          symbol: 'BTCUSDT',
          id: 1,
          orderId: 100,
          price: '50000',
          qty: '0.1',
          quoteQty: '5000',
          commission: '5',
          commissionAsset: 'USDT',
          time: 1000000,
          buyer: true,
          maker: false,
          side: 'BUY',
          positionSide: 'LONG',
          realizedPnl: '200'
        },
        {
          symbol: 'BTCUSDT',
          id: 2,
          orderId: 101,
          price: '51000',
          qty: '0.1',
          quoteQty: '5100',
          commission: '5',
          commissionAsset: 'USDT',
          time: 2000000,
          buyer: false,
          maker: false,
          side: 'SELL',
          positionSide: 'LONG',
          realizedPnl: '-150'
        },
        {
          symbol: 'BTCUSDT',
          id: 3,
          orderId: 102,
          price: '52000',
          qty: '0.1',
          quoteQty: '5200',
          commission: '5',
          commissionAsset: 'USDT',
          time: 3000000,
          buyer: true,
          maker: false,
          side: 'BUY',
          positionSide: 'LONG',
          realizedPnl: '50'
        }
      ];

      const result = calculator.analyzeProfit(trades);

      expect(result.overall.maxProfit).toBe(200);
      expect(result.overall.maxLoss).toBe(-150);
    });

    it('应该正确计算平均盈利和平均亏损', () => {
      const trades: UserTrade[] = [
        {
          symbol: 'BTCUSDT',
          id: 1,
          orderId: 100,
          price: '50000',
          qty: '0.1',
          quoteQty: '5000',
          commission: '5',
          commissionAsset: 'USDT',
          time: 1000000,
          buyer: true,
          maker: false,
          side: 'BUY',
          positionSide: 'LONG',
          realizedPnl: '100'
        },
        {
          symbol: 'BTCUSDT',
          id: 2,
          orderId: 101,
          price: '51000',
          qty: '0.1',
          quoteQty: '5100',
          commission: '5',
          commissionAsset: 'USDT',
          time: 2000000,
          buyer: false,
          maker: false,
          side: 'SELL',
          positionSide: 'LONG',
          realizedPnl: '200'
        },
        {
          symbol: 'BTCUSDT',
          id: 3,
          orderId: 102,
          price: '52000',
          qty: '0.1',
          quoteQty: '5200',
          commission: '5',
          commissionAsset: 'USDT',
          time: 3000000,
          buyer: true,
          maker: false,
          side: 'BUY',
          positionSide: 'LONG',
          realizedPnl: '-50'
        },
        {
          symbol: 'BTCUSDT',
          id: 4,
          orderId: 103,
          price: '53000',
          qty: '0.1',
          quoteQty: '5300',
          commission: '5',
          commissionAsset: 'USDT',
          time: 4000000,
          buyer: false,
          maker: false,
          side: 'SELL',
          positionSide: 'LONG',
          realizedPnl: '-100'
        }
      ];

      const result = calculator.analyzeProfit(trades);

      expect(result.overall.averageProfit).toBe(150); // (100 + 200) / 2
      expect(result.overall.averageLoss).toBe(-75); // (-50 + -100) / 2
    });
  });

  describe('formatCurrency', () => {
    it('应该正确格式化货币', () => {
      expect(ProfitCalculator.formatCurrency(1234.5678)).toBe('1234.5678');
      expect(ProfitCalculator.formatCurrency(1234.5678, 2)).toBe('1234.57');
      expect(ProfitCalculator.formatCurrency(0)).toBe('0.0000');
      expect(ProfitCalculator.formatCurrency(-1234.5678)).toBe('-1234.5678');
    });
  });

  describe('formatPercentage', () => {
    it('应该正确格式化百分比', () => {
      expect(ProfitCalculator.formatPercentage(12.3456)).toBe('12.35%');
      expect(ProfitCalculator.formatPercentage(12.3456, 3)).toBe('12.346%');
      expect(ProfitCalculator.formatPercentage(0)).toBe('0.00%');
      expect(ProfitCalculator.formatPercentage(-12.3456)).toBe('-12.35%');
    });
  });

  describe('formatDuration', () => {
    it('应该正确格式化分钟', () => {
      const minutes = 30 * 60 * 1000; // 30分钟
      expect(ProfitCalculator.formatDuration(minutes)).toBe('30m');
    });

    it('应该正确格式化小时和分钟', () => {
      const duration = (2 * 60 * 60 * 1000) + (30 * 60 * 1000); // 2小时30分钟
      expect(ProfitCalculator.formatDuration(duration)).toBe('2h 30m');
    });

    it('应该正确格式化天、小时和分钟', () => {
      const duration = (3 * 24 * 60 * 60 * 1000) + (5 * 60 * 60 * 1000) + (15 * 60 * 1000); // 3天5小时15分钟
      expect(ProfitCalculator.formatDuration(duration)).toBe('3d 5h 15m');
    });

    it('应该正确处理0毫秒', () => {
      expect(ProfitCalculator.formatDuration(0)).toBe('0m');
    });
  });

  describe('复杂交易配对场景', () => {
    it('应该正确配对多次开平仓交易', () => {
      const trades: UserTrade[] = [
        // 第一次开仓
        {
          symbol: 'BTCUSDT',
          id: 1,
          orderId: 100,
          price: '50000',
          qty: '0.1',
          quoteQty: '5000',
          commission: '5',
          commissionAsset: 'USDT',
          time: 1000000,
          buyer: true,
          maker: false,
          side: 'BUY',
          positionSide: 'LONG',
          realizedPnl: '0'
        },
        // 第一次平仓
        {
          symbol: 'BTCUSDT',
          id: 2,
          orderId: 101,
          price: '51000',
          qty: '0.1',
          quoteQty: '5100',
          commission: '5',
          commissionAsset: 'USDT',
          time: 2000000,
          buyer: false,
          maker: false,
          side: 'SELL',
          positionSide: 'LONG',
          realizedPnl: '90'
        },
        // 第二次开仓
        {
          symbol: 'BTCUSDT',
          id: 3,
          orderId: 102,
          price: '52000',
          qty: '0.2',
          quoteQty: '10400',
          commission: '10',
          commissionAsset: 'USDT',
          time: 3000000,
          buyer: true,
          maker: false,
          side: 'BUY',
          positionSide: 'LONG',
          realizedPnl: '0'
        },
        // 第二次平仓
        {
          symbol: 'BTCUSDT',
          id: 4,
          orderId: 103,
          price: '53000',
          qty: '0.2',
          quoteQty: '10600',
          commission: '10',
          commissionAsset: 'USDT',
          time: 4000000,
          buyer: false,
          maker: false,
          side: 'SELL',
          positionSide: 'LONG',
          realizedPnl: '180'
        }
      ];

      const result = calculator.analyzeProfit(trades);

      expect(result.overall.totalTrades).toBe(4);
      expect(result.overall.totalGrossProfit).toBe(270); // 90 + 180
    });

    it('应该处理加仓场景', () => {
      const trades: UserTrade[] = [
        // 初始开仓
        {
          symbol: 'BTCUSDT',
          id: 1,
          orderId: 100,
          price: '50000',
          qty: '0.1',
          quoteQty: '5000',
          commission: '5',
          commissionAsset: 'USDT',
          time: 1000000,
          buyer: true,
          maker: false,
          side: 'BUY',
          positionSide: 'LONG',
          realizedPnl: '0'
        },
        // 加仓
        {
          symbol: 'BTCUSDT',
          id: 2,
          orderId: 101,
          price: '51000',
          qty: '0.1',
          quoteQty: '5100',
          commission: '5',
          commissionAsset: 'USDT',
          time: 2000000,
          buyer: true,
          maker: false,
          side: 'BUY',
          positionSide: 'LONG',
          realizedPnl: '0'
        },
        // 全部平仓
        {
          symbol: 'BTCUSDT',
          id: 3,
          orderId: 102,
          price: '52000',
          qty: '0.2',
          quoteQty: '10400',
          commission: '10',
          commissionAsset: 'USDT',
          time: 3000000,
          buyer: false,
          maker: false,
          side: 'SELL',
          positionSide: 'LONG',
          realizedPnl: '180'
        }
      ];

      const result = calculator.analyzeProfit(trades);

      expect(result.overall.totalTrades).toBe(3);
      expect(result.overall.totalGrossProfit).toBe(180);
    });

    it('应该处理空头交易', () => {
      const trades: UserTrade[] = [
        // 开空仓
        {
          symbol: 'BTCUSDT',
          id: 1,
          orderId: 100,
          price: '50000',
          qty: '0.1',
          quoteQty: '5000',
          commission: '5',
          commissionAsset: 'USDT',
          time: 1000000,
          buyer: false,
          maker: false,
          side: 'SELL',
          positionSide: 'SHORT',
          realizedPnl: '0'
        },
        // 平空仓
        {
          symbol: 'BTCUSDT',
          id: 2,
          orderId: 101,
          price: '49000',
          qty: '0.1',
          quoteQty: '4900',
          commission: '5',
          commissionAsset: 'USDT',
          time: 2000000,
          buyer: true,
          maker: false,
          side: 'BUY',
          positionSide: 'SHORT',
          realizedPnl: '90'
        }
      ];

      const result = calculator.analyzeProfit(trades);

      expect(result.overall.totalTrades).toBe(2);
      expect(result.overall.totalGrossProfit).toBe(90);
      expect(result.overall.winningTrades).toBe(1);
    });

    it('应该处理部分平仓场景', () => {
      const trades: UserTrade[] = [
        // 开仓
        {
          symbol: 'BTCUSDT',
          id: 1,
          orderId: 100,
          price: '50000',
          qty: '0.2',
          quoteQty: '10000',
          commission: '10',
          commissionAsset: 'USDT',
          time: 1000000,
          buyer: true,
          maker: false,
          side: 'BUY',
          positionSide: 'LONG',
          realizedPnl: '0'
        },
        // 部分平仓
        {
          symbol: 'BTCUSDT',
          id: 2,
          orderId: 101,
          price: '51000',
          qty: '0.1',
          quoteQty: '5100',
          commission: '5',
          commissionAsset: 'USDT',
          time: 2000000,
          buyer: false,
          maker: false,
          side: 'SELL',
          positionSide: 'LONG',
          realizedPnl: '90'
        },
        // 剩余平仓
        {
          symbol: 'BTCUSDT',
          id: 3,
          orderId: 102,
          price: '52000',
          qty: '0.1',
          quoteQty: '5200',
          commission: '5',
          commissionAsset: 'USDT',
          time: 3000000,
          buyer: false,
          maker: false,
          side: 'SELL',
          positionSide: 'LONG',
          realizedPnl: '185'
        }
      ];

      const result = calculator.analyzeProfit(trades);

      expect(result.overall.totalTrades).toBe(3);
      expect(result.overall.totalGrossProfit).toBe(275); // 90 + 185
    });

    it('应该处理多个交易对', () => {
      const trades: UserTrade[] = [
        // BTC交易
        {
          symbol: 'BTCUSDT',
          id: 1,
          orderId: 100,
          price: '50000',
          qty: '0.1',
          quoteQty: '5000',
          commission: '5',
          commissionAsset: 'USDT',
          time: 1000000,
          buyer: true,
          maker: false,
          side: 'BUY',
          positionSide: 'LONG',
          realizedPnl: '100'
        },
        // ETH交易
        {
          symbol: 'ETHUSDT',
          id: 2,
          orderId: 101,
          price: '3000',
          qty: '1',
          quoteQty: '3000',
          commission: '3',
          commissionAsset: 'USDT',
          time: 2000000,
          buyer: true,
          maker: false,
          side: 'BUY',
          positionSide: 'LONG',
          realizedPnl: '50'
        },
        // SOL交易
        {
          symbol: 'SOLUSDT',
          id: 3,
          orderId: 102,
          price: '100',
          qty: '10',
          quoteQty: '1000',
          commission: '1',
          commissionAsset: 'USDT',
          time: 3000000,
          buyer: true,
          maker: false,
          side: 'BUY',
          positionSide: 'LONG',
          realizedPnl: '-20'
        }
      ];

      const result = calculator.analyzeProfit(trades);

      expect(Object.keys(result.bySymbol)).toHaveLength(3);
      expect(result.bySymbol['BTCUSDT']).toBeDefined();
      expect(result.bySymbol['ETHUSDT']).toBeDefined();
      expect(result.bySymbol['SOLUSDT']).toBeDefined();
      expect(result.overall.totalTrades).toBe(3);
      expect(result.overall.winningTrades).toBe(2);
      expect(result.overall.losingTrades).toBe(1);
    });
  });

  describe('边界情况', () => {
    it('应该处理只有亏损交易的情况', () => {
      const trades: UserTrade[] = [
        {
          symbol: 'BTCUSDT',
          id: 1,
          orderId: 100,
          price: '50000',
          qty: '0.1',
          quoteQty: '5000',
          commission: '5',
          commissionAsset: 'USDT',
          time: 1000000,
          buyer: true,
          maker: false,
          side: 'BUY',
          positionSide: 'LONG',
          realizedPnl: '-100'
        },
        {
          symbol: 'BTCUSDT',
          id: 2,
          orderId: 101,
          price: '51000',
          qty: '0.1',
          quoteQty: '5100',
          commission: '5',
          commissionAsset: 'USDT',
          time: 2000000,
          buyer: false,
          maker: false,
          side: 'SELL',
          positionSide: 'LONG',
          realizedPnl: '-50'
        }
      ];

      const result = calculator.analyzeProfit(trades);

      expect(result.overall.winningTrades).toBe(0);
      expect(result.overall.losingTrades).toBe(2);
      expect(result.overall.winRate).toBe(0);
      expect(result.overall.averageProfit).toBe(0);
      expect(result.overall.averageLoss).toBe(-75);
    });

    it('应该处理只有盈利交易的情况', () => {
      const trades: UserTrade[] = [
        {
          symbol: 'BTCUSDT',
          id: 1,
          orderId: 100,
          price: '50000',
          qty: '0.1',
          quoteQty: '5000',
          commission: '5',
          commissionAsset: 'USDT',
          time: 1000000,
          buyer: true,
          maker: false,
          side: 'BUY',
          positionSide: 'LONG',
          realizedPnl: '100'
        },
        {
          symbol: 'BTCUSDT',
          id: 2,
          orderId: 101,
          price: '51000',
          qty: '0.1',
          quoteQty: '5100',
          commission: '5',
          commissionAsset: 'USDT',
          time: 2000000,
          buyer: false,
          maker: false,
          side: 'SELL',
          positionSide: 'LONG',
          realizedPnl: '50'
        }
      ];

      const result = calculator.analyzeProfit(trades);

      expect(result.overall.winningTrades).toBe(2);
      expect(result.overall.losingTrades).toBe(0);
      expect(result.overall.winRate).toBe(100);
      expect(result.overall.averageProfit).toBe(75);
      expect(result.overall.averageLoss).toBe(0);
    });

    it('应该处理realizedPnl为0的交易', () => {
      const trades: UserTrade[] = [
        {
          symbol: 'BTCUSDT',
          id: 1,
          orderId: 100,
          price: '50000',
          qty: '0.1',
          quoteQty: '5000',
          commission: '5',
          commissionAsset: 'USDT',
          time: 1000000,
          buyer: true,
          maker: false,
          side: 'BUY',
          positionSide: 'LONG',
          realizedPnl: '0'
        }
      ];

      const result = calculator.analyzeProfit(trades);

      expect(result.overall.totalTrades).toBe(1);
      expect(result.overall.totalGrossProfit).toBe(0);
      expect(result.overall.winningTrades).toBe(0);
      expect(result.overall.losingTrades).toBe(0);
    });
  });
});
