import { BinanceService } from '../services/binance-service';
import { TradeHistoryService } from '../services/trade-history-service';
import { ProfitCalculator, ProfitAnalysis } from '../services/profit-calculator';
import { OrderHistoryManager } from '../services/order-history-manager';
import { logInfo, logWarn, logError } from '../utils/logger';
import { handleError } from '../utils/command-helpers';

export interface ProfitCommandOptions {
  since?: string;
  pair?: string;
  groupBy?: 'symbol' | 'all';
  format?: 'table' | 'json';
  refresh?: boolean;
}

export async function handleProfitCommand(options: ProfitCommandOptions): Promise<void> {
  try {
    // 验证环境变量
    const apiKey = process.env.BINANCE_API_KEY;
    const apiSecret = process.env.BINANCE_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error('BINANCE_API_KEY and BINANCE_API_SECRET environment variables are required');
    }

    // 初始化服务
    const binanceService = new BinanceService(apiKey, apiSecret);
    const tradeHistoryService = new TradeHistoryService(binanceService);
    const profitCalculator = new ProfitCalculator();
    const orderHistoryManager = new OrderHistoryManager();

    logInfo('📊 Starting profit analysis...');

    // 解析时间参数
    let timeFilter = options.since;
    let timeRange;

    if (!timeFilter) {
      // 如果没有指定时间，使用order-history的创建时间
      const createdAt = orderHistoryManager.getCreatedAt();
      timeRange = {
        startTime: createdAt,
        endTime: Date.now()
      };
      const startDate = new Date(createdAt).toISOString().split('T')[0];
      logInfo(`📅 Using order history start time: ${startDate} (${new Date(createdAt).toISOString()})`);
    } else {
      // 用户指定了时间参数
      try {
        timeRange = TradeHistoryService.parseTimeFilter(timeFilter);
      } catch (error) {
        throw new Error(`Invalid time format: ${timeFilter}. ${error instanceof Error ? error.message : ''}`);
      }
    }

    logInfo(`📅 Analyzing trades from: ${new Date(timeRange.startTime).toISOString()} to ${new Date(timeRange.endTime).toISOString()}`);

    // 获取交易记录
    const trades = await tradeHistoryService.getTrades({
      symbol: options.pair,
      startTime: timeRange.startTime,
      endTime: timeRange.endTime,
      forceRefresh: options.refresh
    });

    if (trades.length === 0) {
      logWarn('⚠️ No trades found in the specified time range');
      return;
    }

    logInfo(`📈 Found ${trades.length} trades, analyzing profitability...`);

    // 分析盈利情况
    const analysis: ProfitAnalysis = profitCalculator.analyzeProfit(trades);

    // 输出结果
    if (options.format === 'json') {
      outputJson(analysis);
    } else {
      outputTable(analysis, options);
    }

    // 清理资源
    binanceService.destroy();

  } catch (error) {
    handleError(error, 'Profit analysis failed');
  }
}

/**
 * 以表格格式输出结果
 */
function outputTable(analysis: ProfitAnalysis, options: ProfitCommandOptions): void {
  const { overall, bySymbol } = analysis;

  logInfo('\n' + '='.repeat(80));
  logInfo('📊 PROFIT ANALYSIS REPORT');
  logInfo('='.repeat(80));

  // 总体统计
  logInfo('\n📈 OVERALL STATISTICS:');
  logInfo('-'.repeat(50));
  logInfo(`Total Completed Trades: ${overall.totalTrades}`);
  logInfo(`Winning Trades: ${overall.winningTrades}`);
  logInfo(`Losing Trades: ${overall.losingTrades}`);
  logInfo(`Win Rate: ${ProfitCalculator.formatPercentage(overall.winRate)}`);
  logInfo('');
  logInfo(`Total Gross Profit: ${ProfitCalculator.formatCurrency(overall.totalGrossProfit)} USDT`);
  logInfo(`Total Commission: ${ProfitCalculator.formatCurrency(overall.totalCommission)} USDT`);
  logInfo(`Total Net Profit: ${ProfitCalculator.formatCurrency(overall.totalNetProfit)} USDT`);
  logInfo('');
  logInfo(`Average Win: ${ProfitCalculator.formatCurrency(overall.averageProfit)} USDT`);
  logInfo(`Average Loss: ${ProfitCalculator.formatCurrency(overall.averageLoss)} USDT`);
  logInfo(`Max Profit: ${ProfitCalculator.formatCurrency(overall.maxProfit)} USDT`);
  logInfo(`Max Loss: ${ProfitCalculator.formatCurrency(overall.maxLoss)} USDT`);
  logInfo('');
  logInfo(`Average Trade Duration: ${ProfitCalculator.formatDuration(overall.averageDuration)}`);
  logInfo(`Total Duration: ${ProfitCalculator.formatDuration(overall.totalDuration)}`);

  // 按交易对分组统计
  if (options.groupBy === 'symbol' && Object.keys(bySymbol).length > 1) {
    logInfo('\n📊 BREAKDOWN BY SYMBOL:');
    logInfo('-'.repeat(50));

    const symbols = Object.keys(bySymbol).sort();
    for (const symbol of symbols) {
      const symbolStats = bySymbol[symbol].stats;
      const netProfit = symbolStats.totalNetProfit;
      const profitIndicator = netProfit >= 0 ? '📈' : '📉';

      logInfo(`${profitIndicator} ${symbol}:`);
      logInfo(`  Trades: ${symbolStats.totalTrades} | Win Rate: ${ProfitCalculator.formatPercentage(symbolStats.winRate)}`);
      logInfo(`  Net Profit: ${ProfitCalculator.formatCurrency(netProfit)} USDT | Commission: ${ProfitCalculator.formatCurrency(symbolStats.totalCommission)} USDT`);
      logInfo(`  Max Profit: ${ProfitCalculator.formatCurrency(symbolStats.maxProfit)} USDT | Max Loss: ${ProfitCalculator.formatCurrency(symbolStats.maxLoss)} USDT`);
      logInfo('');
    }
  }

  // 最近交易详情
  logInfo('\n📋 NOTE: Individual trade details are now simplified to focus on overall profitability statistics.');
  logInfo('Each trade record in Binance API represents completed transactions with realized P&L already calculated.');

  // 分析总结
  logInfo('\n📝 ANALYSIS SUMMARY:');
  logInfo('-'.repeat(50));
  if (overall.totalNetProfit > 0) {
    logInfo(`✅ Profitable Strategy: Net profit of ${ProfitCalculator.formatCurrency(overall.totalNetProfit)} USDT`);
  } else if (overall.totalNetProfit < 0) {
    logInfo(`⚠️ Unprofitable Strategy: Net loss of ${ProfitCalculator.formatCurrency(Math.abs(overall.totalNetProfit))} USDT`);
  } else {
    logInfo(`➖ Breakeven Strategy: No net profit or loss`);
  }

  if (overall.winRate >= 50) {
    logInfo(`✅ Good Win Rate: ${ProfitCalculator.formatPercentage(overall.winRate)}`);
  } else {
    logInfo(`⚠️ Low Win Rate: ${ProfitCalculator.formatPercentage(overall.winRate)}`);
  }

  const avgTradeProfit = overall.totalTrades > 0 ? overall.totalNetProfit / overall.totalTrades : 0;
  if (avgTradeProfit > 0) {
    logInfo(`✅ Positive Average Trade: ${ProfitCalculator.formatCurrency(avgTradeProfit)} USDT`);
  } else {
    logInfo(`⚠️ Negative Average Trade: ${ProfitCalculator.formatCurrency(avgTradeProfit)} USDT`);
  }

  logInfo('\n' + '='.repeat(80));
}

/**
 * 以JSON格式输出结果
 */
function outputJson(analysis: ProfitAnalysis): void {
  console.log(JSON.stringify(analysis, null, 2));
}