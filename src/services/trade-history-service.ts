import * as fs from 'fs-extra';
import * as path from 'path';
import { logInfo, logDebug, logWarn } from '../utils/logger';
import { BinanceService, UserTrade } from './binance-service';

export interface TradeHistoryOptions {
  symbol?: string;
  startTime: number;
  endTime: number;
  forceRefresh?: boolean;
}

export interface CachedTradeData {
  trades: UserTrade[];
  lastUpdated: number;
  symbol?: string;
  timeRange: {
    startTime: number;
    endTime: number;
  };
}

export class TradeHistoryService {
  private cacheDir: string;
  private binanceService: BinanceService;
  private cacheExpiry: number = 5 * 60 * 1000; // 5分钟缓存过期时间

  constructor(binanceService: BinanceService, cacheDir: string = './data') {
    this.binanceService = binanceService;
    this.cacheDir = cacheDir;
    fs.ensureDirSync(cacheDir);
  }

  /**
   * 生成缓存文件路径
   */
  private getCacheFilePath(symbol?: string): string {
    const fileName = symbol ? `trades-${symbol.toLowerCase()}.json` : 'trades-all.json';
    return path.join(this.cacheDir, fileName);
  }

  /**
   * 加载缓存的交易数据
   */
  private loadCachedData(symbol?: string): CachedTradeData | null {
    try {
      const cacheFile = this.getCacheFilePath(symbol);
      if (!fs.existsSync(cacheFile)) {
        return null;
      }

      const data = fs.readJsonSync(cacheFile);
      const now = Date.now();

      // 检查缓存是否过期
      if (now - data.lastUpdated > this.cacheExpiry) {
        logDebug(`Cache expired for ${symbol || 'all symbols'}`);
        return null;
      }

      logDebug(`Loaded cached trades: ${data.trades.length} records for ${symbol || 'all symbols'}`);
      return data;
    } catch (error) {
      logWarn(`Failed to load cached trades: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * 保存交易数据到缓存
   */
  private saveCachedData(trades: UserTrade[], symbol: string | undefined, startTime: number, endTime: number): void {
    try {
      const cacheFile = this.getCacheFilePath(symbol);
      const data: CachedTradeData = {
        trades,
        lastUpdated: Date.now(),
        symbol,
        timeRange: {
          startTime,
          endTime
        }
      };

      fs.writeJsonSync(cacheFile, data, { spaces: 2 });
      logDebug(`Cached ${trades.length} trades for ${symbol || 'all symbols'}`);
    } catch (error) {
      logWarn(`Failed to cache trades: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取用户交易记录
   */
  async getTrades(options: TradeHistoryOptions): Promise<UserTrade[]> {
    const { symbol, startTime, endTime, forceRefresh = false } = options;

    // 如果不强制刷新，先尝试从缓存加载
    if (!forceRefresh) {
      const cachedData = this.loadCachedData(symbol);
      if (cachedData &&
          cachedData.timeRange.startTime <= startTime &&
          cachedData.timeRange.endTime >= endTime) {

        // 从缓存数据中筛选指定时间范围
        const filteredTrades = cachedData.trades.filter(
          trade => trade.time >= startTime && trade.time <= endTime
        );

        logInfo(`✅ Loaded ${filteredTrades.length} trades from cache for ${symbol || 'all symbols'}`);
        return filteredTrades;
      }
    }

    try {
      logInfo(`📡 Fetching trades from Binance API for ${symbol || 'all symbols'}...`);

      // 从API获取数据
      const trades = await this.binanceService.getAllUserTradesInRange(startTime, endTime, symbol);

      // 缓存数据
      this.saveCachedData(trades, symbol, startTime, endTime);

      logInfo(`✅ Retrieved ${trades.length} trades from Binance API for ${symbol || 'all symbols'}`);
      return trades;
    } catch (error) {
      logWarn(`❌ Failed to fetch trades from API: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // 如果API调用失败，尝试加载过期的缓存数据作为备选
      if (!forceRefresh) {
        const cachedData = this.loadCachedData(symbol);
        if (cachedData) {
          logWarn(`⚠️ Using expired cache data due to API failure`);
          return cachedData.trades.filter(
            trade => trade.time >= startTime && trade.time <= endTime
          );
        }
      }

      throw error;
    }
  }

  /**
   * 解析时间筛选参数
   */
  static parseTimeFilter(timeFilter: string): { startTime: number; endTime: number } {
    const now = Date.now();
    let startTime: number;
    let endTime: number = now;

    // 检查是否为天数格式 (如: 7d, 30d)
    const daysMatch = timeFilter.match(/^(\d+)d$/i);
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      startTime = now - (days * 24 * 60 * 60 * 1000);
      return { startTime, endTime };
    }

    // 检查是否为日期格式 (如: 2024-01-01)
    const dateMatch = timeFilter.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (dateMatch) {
      startTime = new Date(dateMatch[1]).getTime();
      if (isNaN(startTime)) {
        throw new Error(`Invalid date format: ${timeFilter}. Expected YYYY-MM-DD`);
      }
      return { startTime, endTime };
    }

    // 检查是否为时间戳格式 (如: 1704067200000)
    const timestampMatch = timeFilter.match(/^\d{13}$/);
    if (timestampMatch) {
      startTime = parseInt(timeFilter);
      return { startTime, endTime };
    }

    throw new Error(
      `Invalid time format: ${timeFilter}. Supported formats: ` +
      `'7d' (last 7 days), '2024-01-01' (since date), '1704067200000' (timestamp)`
    );
  }

  /**
   * 清理缓存文件
   */
  clearCache(symbol?: string): void {
    try {
      const cacheFile = this.getCacheFilePath(symbol);
      if (fs.existsSync(cacheFile)) {
        fs.removeSync(cacheFile);
        logInfo(`🗑️ Cleared cache for ${symbol || 'all symbols'}`);
      }
    } catch (error) {
      logWarn(`Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { [key: string]: { tradesCount: number; lastUpdated: number; size: number } } {
    const stats: { [key: string]: { tradesCount: number; lastUpdated: number; size: number } } = {};

    try {
      const files = fs.readdirSync(this.cacheDir)
        .filter(file => file.startsWith('trades-') && file.endsWith('.json'));

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stat = fs.statSync(filePath);
        const data = fs.readJsonSync(filePath);

        const key = file.replace('trades-', '').replace('.json', '') || 'all';
        stats[key] = {
          tradesCount: data.trades?.length || 0,
          lastUpdated: data.lastUpdated || 0,
          size: stat.size
        };
      }
    } catch (error) {
      logWarn(`Failed to get cache stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return stats;
  }

  /**
   * 打印缓存统计信息
   */
  printCacheStats(): void {
    const stats = this.getCacheStats();

    logInfo(`\n📊 Trade Cache Statistics:`);
    logInfo(`==========================`);

    if (Object.keys(stats).length === 0) {
      logInfo(`No cached data found`);
      return;
    }

    Object.entries(stats).forEach(([key, stat]) => {
      const lastUpdated = new Date(stat.lastUpdated).toISOString();
      const sizeKB = (stat.size / 1024).toFixed(2);
      logInfo(`${key}: ${stat.tradesCount} trades, ${sizeKB}KB, updated: ${lastUpdated}`);
    });
  }
}