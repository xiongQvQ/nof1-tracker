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
   * 将用户成交记录配对为交易对
   * 一个完整的交易包含一个建仓和一个平仓
   */
  private pairTrades(trades: UserTrade[]): TradePair[] {
    const tradePairs: TradePair[] = [];

    // 按交易对分组
    const tradesBySymbol = this.groupTradesBySymbol(trades);

    for (const symbol of Object.keys(tradesBySymbol)) {
      const symbolTrades = tradesBySymbol[symbol].sort((a, b) => a.time - b.time);
      const pairs = this.pairSymbolTrades(symbolTrades, symbol);
      tradePairs.push(...pairs);
    }

    return tradePairs;
  }

  /**
   * 为单个交易对配对交易记录
   */
  private pairSymbolTrades(trades: UserTrade[], symbol: string): TradePair[] {
    const pairs: TradePair[] = [];
    let currentQuantity = 0;
    let entryTrades: UserTrade[] = [];
    let totalEntryValue = 0;
    let totalEntryQuantity = 0;
    let totalEntryCommission = 0;

    for (const trade of trades) {
      const tradeQuantity = parseFloat(trade.qty);
      const tradePrice = parseFloat(trade.price);
      const commission = parseFloat(trade.commission);

      if (currentQuantity === 0) {
        // 开始新的仓位
        entryTrades.push(trade);
        totalEntryValue += tradeQuantity * tradePrice;
        totalEntryQuantity += tradeQuantity;
        totalEntryCommission += commission;

        if (trade.side === 'BUY') {
          currentQuantity += tradeQuantity;
        } else {
          currentQuantity -= tradeQuantity;
        }
      } else if ((currentQuantity > 0 && trade.side === 'SELL') ||
                 (currentQuantity < 0 && trade.side === 'BUY')) {
        // 平仓交易
        const closingQuantity = Math.min(tradeQuantity, Math.abs(currentQuantity));
        const exitValue = closingQuantity * tradePrice;
        const entryValue = (closingQuantity / totalEntryQuantity) * totalEntryValue;
        const entryCommission = (closingQuantity / totalEntryQuantity) * totalEntryCommission;

        const grossProfit = currentQuantity > 0
          ? exitValue - entryValue  // 多头平仓：卖出价 - 买入价
          : entryValue - exitValue; // 空头平仓：买入价 - 卖出价

        const totalCommission = entryCommission + (commission * (closingQuantity / tradeQuantity));
        // 使用币安API提供的realizedPnl，这已经是扣除手续费后的净盈亏
        // 如果平仓交易的数量与当前平仓数量相等，直接使用其realizedPnl
        // 否则按比例分配
        let realizedPnl: number;
        if (Math.abs(tradeQuantity - closingQuantity) < 0.00001) {
          realizedPnl = parseFloat(trade.realizedPnl);
        } else {
          realizedPnl = parseFloat(trade.realizedPnl) * (closingQuantity / tradeQuantity);
        }
        const profitPercentage = entryValue > 0 ? (realizedPnl / entryValue) * 100 : 0;

        // 计算持仓时间
        const entryTime = entryTrades[0].time;
        const duration = trade.time - entryTime;

        const pair: TradePair = {
          entryTrade: entryTrades[0], // 使用第一个建仓交易作为代表
          exitTrade: trade,
          symbol,
          entryPrice: totalEntryValue / totalEntryQuantity,
          exitPrice: tradePrice,
          quantity: closingQuantity,
          grossProfit,
          totalCommission,
          realizedPnl,
          profitPercentage,
          duration,
          entrySide: entryTrades[0].side
        };

        pairs.push(pair);

        // 更新当前仓位
        if (currentQuantity > 0) {
          currentQuantity -= closingQuantity;
        } else {
          currentQuantity += closingQuantity;
        }

        // 如果还有剩余仓位，更新平均建仓成本
        if (currentQuantity !== 0) {
          totalEntryValue -= entryValue;
          totalEntryQuantity -= closingQuantity;
          totalEntryCommission -= entryCommission;
        }
      } else {
        // 加仓
        entryTrades.push(trade);
        totalEntryValue += tradeQuantity * tradePrice;
        totalEntryQuantity += tradeQuantity;
        totalEntryCommission += commission;

        if (trade.side === 'BUY') {
          currentQuantity += tradeQuantity;
        } else {
          currentQuantity -= tradeQuantity;
        }
      }
    }

    return pairs;
  }

  /**
   * 计算统计信息
   */
  private calculateStats(tradePairs: TradePair[]): ProfitStats {
    if (tradePairs.length === 0) {
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

    const winningTrades = tradePairs.filter(pair => pair.realizedPnl > 0);
    const losingTrades = tradePairs.filter(pair => pair.realizedPnl < 0);

    const totalGrossProfit = tradePairs.reduce((sum, pair) => sum + pair.grossProfit, 0);
    const totalCommission = tradePairs.reduce((sum, pair) => sum + pair.totalCommission, 0);
    // 使用realizedPnl作为净盈亏
    const totalNetProfit = tradePairs.reduce((sum, pair) => sum + pair.realizedPnl, 0);
    const totalDuration = tradePairs.reduce((sum, pair) => sum + pair.duration, 0);

    const maxProfit = Math.max(...tradePairs.map(pair => pair.realizedPnl));
    const maxLoss = Math.min(...tradePairs.map(pair => pair.realizedPnl));

    const averageProfit = winningTrades.length > 0
      ? winningTrades.reduce((sum, pair) => sum + pair.realizedPnl, 0) / winningTrades.length
      : 0;

    const averageLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, pair) => sum + pair.realizedPnl, 0) / losingTrades.length
      : 0;

    return {
      totalTrades: tradePairs.length,
      totalGrossProfit,
      totalCommission,
      totalNetProfit,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: (winningTrades.length / tradePairs.length) * 100,
      averageProfit,
      averageLoss,
      maxProfit,
      maxLoss,
      averageDuration: totalDuration / tradePairs.length,
      totalDuration
    };
  }

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