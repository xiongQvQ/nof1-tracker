import { UserTrade } from './binance-service';
import { logInfo, logDebug } from '../utils/logger';

export interface TradePair {
  entryTrade: UserTrade;
  exitTrade: UserTrade;
  symbol: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  grossProfit: number;
  totalCommission: number;
  realizedPnl: number; // 使用币安API提供的已实现盈亏
  profitPercentage: number;
  duration: number; // 持仓时间(毫秒)
  entrySide: 'BUY' | 'SELL';
}

export interface ProfitStats {
  totalTrades: number;
  totalGrossProfit: number;
  totalCommission: number;
  totalNetProfit: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageProfit: number;
  averageLoss: number;
  maxProfit: number;
  maxLoss: number;
  averageDuration: number;
  totalDuration: number;
}

export interface GroupedStats {
  symbol?: string;
  trades: TradePair[];
  stats: ProfitStats;
}

export interface ProfitAnalysis {
  overall: ProfitStats;
  bySymbol: { [symbol: string]: GroupedStats };
  tradePairs: TradePair[];
}

export class ProfitCalculator {
  /**
   * 分析盈利情况
   */
  analyzeProfit(trades: UserTrade[]): ProfitAnalysis {
    logDebug(`Analyzing profit for ${trades.length} trades`);

    // 直接统计所有交易的盈亏（realizedPnl已经包含手续费）
    const overall = this.calculateSimpleStats(trades);

    // 按交易对分组统计
    const tradesBySymbol = this.groupTradesBySymbol(trades);
    const bySymbol: { [symbol: string]: GroupedStats } = {};

    for (const symbol of Object.keys(tradesBySymbol)) {
      const symbolTrades = tradesBySymbol[symbol];
      const stats = this.calculateSimpleStats(symbolTrades);
      bySymbol[symbol] = {
        symbol,
        trades: [], // 简化版本不需要交易对
        stats
      };
    }

    logInfo(`✅ Profit analysis completed: ${trades.length} trades analyzed`);

    return {
      overall,
      bySymbol,
      tradePairs: [] // 简化版本不需要交易对
    };
  }

  /**
   * 简化版统计计算 - 直接统计所有交易的realizedPnl
   */
  private calculateSimpleStats(trades: UserTrade[]): ProfitStats {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        totalGrossProfit: 0,
        totalCommission: 0,
        totalNetProfit: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        averageProfit: 0,
        averageLoss: 0,
        maxProfit: 0,
        maxLoss: 0,
        averageDuration: 0,
        totalDuration: 0
      };
    }

    const realizedPnls = trades.map(trade => parseFloat(trade.realizedPnl));
    const winningTrades = trades.filter(trade => parseFloat(trade.realizedPnl) > 0);
    const losingTrades = trades.filter(trade => parseFloat(trade.realizedPnl) < 0);

    const totalRealizedPnl = realizedPnls.reduce((sum, pnl) => sum + pnl, 0);
    const totalCommission = trades.reduce((sum, trade) => sum + parseFloat(trade.commission), 0);
    const totalNetProfit = totalRealizedPnl - totalCommission; // 净盈亏 = 已实现盈亏 - 手续费

    const maxProfit = Math.max(...realizedPnls);
    const maxLoss = Math.min(...realizedPnls);

    const averageProfit = winningTrades.length > 0
      ? winningTrades.reduce((sum, trade) => sum + parseFloat(trade.realizedPnl), 0) / winningTrades.length
      : 0;

    const averageLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, trade) => sum + parseFloat(trade.realizedPnl), 0) / losingTrades.length
      : 0;

    return {
      totalTrades: trades.length,
      totalGrossProfit: totalRealizedPnl, // 毛利润 = 已实现盈亏（不包含手续费）
      totalCommission,
      totalNetProfit, // 净盈亏 = 毛利润 - 手续费
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: (winningTrades.length / trades.length) * 100,
      averageProfit,
      averageLoss,
      maxProfit,
      maxLoss,
      averageDuration: 0, // 简化版本不计算持仓时间
      totalDuration: 0
    };
  }

  /**
   * 按交易对分组交易记录
   */
  private groupTradesBySymbol(trades: UserTrade[]): { [symbol: string]: UserTrade[] } {
    const grouped: { [symbol: string]: UserTrade[] } = {};

    for (const trade of trades) {
      if (!grouped[trade.symbol]) {
        grouped[trade.symbol] = [];
      }
      grouped[trade.symbol].push(trade);
    }

    return grouped;
  }

  /**
   * 格式化数字为货币字符串
   */
  static formatCurrency(amount: number, decimals: number = 4): string {
    return amount.toFixed(decimals);
  }

  /**
   * 格式化百分比
   */
  static formatPercentage(percentage: number, decimals: number = 2): string {
    return `${percentage.toFixed(decimals)}%`;
  }

  /**
   * 格式化持续时间
   */
  static formatDuration(milliseconds: number): string {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
}