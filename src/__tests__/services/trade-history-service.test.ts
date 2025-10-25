import * as fs from 'fs-extra';
import * as path from 'path';
import { TradeHistoryService, TradeHistoryOptions, CachedTradeData } from '../../services/trade-history-service';
import { BinanceService, UserTrade } from '../../services/binance-service';

jest.mock('fs-extra');
jest.mock('../../services/binance-service');

describe('TradeHistoryService', () => {
  let service: TradeHistoryService;
  let mockBinanceService: jest.Mocked<BinanceService>;
  const testCacheDir = './test-cache';

  const mockTrades: UserTrade[] = [
    {
      symbol: 'BTCUSDT',
      id: 1,
      orderId: 100,
      side: 'BUY',
      qty: '0.1',
      price: '50000',
      quoteQty: '5000',
      commission: '5',
      commissionAsset: 'USDT',
      realizedPnl: '100',
      time: 1000000,
      positionSide: 'LONG',
      buyer: true,
      maker: false
    },
    {
      symbol: 'BTCUSDT',
      id: 2,
      orderId: 101,
      side: 'SELL',
      qty: '0.1',
      price: '51000',
      quoteQty: '5100',
      commission: '5',
      commissionAsset: 'USDT',
      realizedPnl: '-50',
      time: 2000000,
      positionSide: 'LONG',
      buyer: false,
      maker: false
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockBinanceService = new BinanceService('test-key', 'test-secret') as jest.Mocked<BinanceService>;
    service = new TradeHistoryService(mockBinanceService, testCacheDir);
    
    (fs.ensureDirSync as jest.Mock).mockImplementation(() => {});
  });

  describe('constructor', () => {
    it('应该创建缓存目录', () => {
      expect(fs.ensureDirSync).toHaveBeenCalledWith(testCacheDir);
    });
  });

  describe('getTrades', () => {
    const options: TradeHistoryOptions = {
      startTime: 1000000,
      endTime: 3000000
    };

    it('应该从API获取交易数据并缓存', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      mockBinanceService.getAllUserTradesInRange = jest.fn().mockResolvedValue(mockTrades);

      const result = await service.getTrades(options);

      expect(mockBinanceService.getAllUserTradesInRange).toHaveBeenCalledWith(
        options.startTime,
        options.endTime,
        undefined
      );
      expect(result).toEqual(mockTrades);
      expect(fs.writeJsonSync).toHaveBeenCalled();
    });

    it('应该从缓存加载数据', async () => {
      const cachedData: CachedTradeData = {
        trades: mockTrades,
        lastUpdated: Date.now(),
        timeRange: {
          startTime: 1000000,
          endTime: 3000000
        }
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readJsonSync as jest.Mock).mockReturnValue(cachedData);

      const result = await service.getTrades(options);

      expect(mockBinanceService.getAllUserTradesInRange).not.toHaveBeenCalled();
      expect(result).toEqual(mockTrades);
    });

    it('应该在缓存过期时重新获取数据', async () => {
      const expiredCachedData: CachedTradeData = {
        trades: mockTrades,
        lastUpdated: Date.now() - 10 * 60 * 1000, // 10分钟前
        timeRange: {
          startTime: 1000000,
          endTime: 3000000
        }
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readJsonSync as jest.Mock).mockReturnValue(expiredCachedData);
      mockBinanceService.getAllUserTradesInRange = jest.fn().mockResolvedValue(mockTrades);

      const result = await service.getTrades(options);

      expect(mockBinanceService.getAllUserTradesInRange).toHaveBeenCalled();
      expect(result).toEqual(mockTrades);
    });

    it('应该在forceRefresh为true时强制刷新', async () => {
      const cachedData: CachedTradeData = {
        trades: mockTrades,
        lastUpdated: Date.now(),
        timeRange: {
          startTime: 1000000,
          endTime: 3000000
        }
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readJsonSync as jest.Mock).mockReturnValue(cachedData);
      mockBinanceService.getAllUserTradesInRange = jest.fn().mockResolvedValue(mockTrades);

      const result = await service.getTrades({ ...options, forceRefresh: true });

      expect(mockBinanceService.getAllUserTradesInRange).toHaveBeenCalled();
      expect(result).toEqual(mockTrades);
    });

    it('应该在缓存读取失败时从API获取数据', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readJsonSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read error');
      });
      mockBinanceService.getAllUserTradesInRange = jest.fn().mockResolvedValue(mockTrades);

      const result = await service.getTrades(options);
      
      expect(mockBinanceService.getAllUserTradesInRange).toHaveBeenCalled();
      expect(result).toEqual(mockTrades);
    });

    it('应该在API失败且无缓存时抛出错误', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      mockBinanceService.getAllUserTradesInRange = jest.fn().mockRejectedValue(new Error('API Error'));

      await expect(service.getTrades(options)).rejects.toThrow('API Error');
    });

    it('应该按时间范围筛选缓存数据', async () => {
      const cachedData: CachedTradeData = {
        trades: mockTrades,
        lastUpdated: Date.now(),
        timeRange: {
          startTime: 500000,
          endTime: 4000000
        }
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readJsonSync as jest.Mock).mockReturnValue(cachedData);

      const result = await service.getTrades({
        startTime: 1500000,
        endTime: 2500000
      });

      expect(result).toHaveLength(1);
      expect(result[0].time).toBe(2000000);
    });

    it('应该支持按symbol筛选', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      mockBinanceService.getAllUserTradesInRange = jest.fn().mockResolvedValue(mockTrades);

      await service.getTrades({ ...options, symbol: 'BTCUSDT' });

      expect(mockBinanceService.getAllUserTradesInRange).toHaveBeenCalledWith(
        options.startTime,
        options.endTime,
        'BTCUSDT'
      );
    });
  });

  describe('parseTimeFilter', () => {
    it('应该解析天数格式', () => {
      const result = TradeHistoryService.parseTimeFilter('7d');
      const now = Date.now();
      const expectedStartTime = now - (7 * 24 * 60 * 60 * 1000);

      expect(result.endTime).toBeCloseTo(now, -3);
      expect(result.startTime).toBeCloseTo(expectedStartTime, -3);
    });

    it('应该解析日期格式', () => {
      const result = TradeHistoryService.parseTimeFilter('2024-01-01');
      const expectedStartTime = new Date('2024-01-01').getTime();

      expect(result.startTime).toBe(expectedStartTime);
      expect(result.endTime).toBeCloseTo(Date.now(), -3);
    });

    it('应该解析时间戳格式', () => {
      const timestamp = '1704067200000';
      const result = TradeHistoryService.parseTimeFilter(timestamp);

      expect(result.startTime).toBe(1704067200000);
      expect(result.endTime).toBeCloseTo(Date.now(), -3);
    });

    it('应该在无效格式时抛出错误', () => {
      expect(() => TradeHistoryService.parseTimeFilter('invalid')).toThrow('Invalid time format');
    });

    it('应该在无效日期时抛出错误', () => {
      expect(() => TradeHistoryService.parseTimeFilter('2024-13-01')).toThrow('Invalid date format');
    });
  });

  describe('clearCache', () => {
    it('应该清除指定symbol的缓存', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.removeSync as jest.Mock).mockImplementation(() => {});

      service.clearCache('BTCUSDT');

      expect(fs.removeSync).toHaveBeenCalledWith(
        path.join(testCacheDir, 'trades-btcusdt.json')
      );
    });

    it('应该清除所有缓存', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.removeSync as jest.Mock).mockImplementation(() => {});

      service.clearCache();

      expect(fs.removeSync).toHaveBeenCalledWith(
        path.join(testCacheDir, 'trades-all.json')
      );
    });

    it('应该处理缓存文件不存在的情况', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      expect(() => service.clearCache()).not.toThrow();
      expect(fs.removeSync).not.toHaveBeenCalled();
    });

    it('应该处理删除失败的情况', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.removeSync as jest.Mock).mockImplementation(() => {
        throw new Error('Delete failed');
      });

      expect(() => service.clearCache()).not.toThrow();
    });
  });

  describe('getCacheStats', () => {
    it('应该返回缓存统计信息', () => {
      const mockFiles = ['trades-btcusdt.json', 'trades-ethusdt.json'];
      const mockStats = { size: 1024 };
      const mockData = {
        trades: mockTrades,
        lastUpdated: 1000000
      };

      (fs.readdirSync as jest.Mock).mockReturnValue(mockFiles);
      (fs.statSync as jest.Mock).mockReturnValue(mockStats);
      (fs.readJsonSync as jest.Mock).mockReturnValue(mockData);

      const result = service.getCacheStats();

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['btcusdt']).toEqual({
        tradesCount: 2,
        lastUpdated: 1000000,
        size: 1024
      });
    });

    it('应该处理空缓存目录', () => {
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      const result = service.getCacheStats();

      expect(Object.keys(result)).toHaveLength(0);
    });

    it('应该处理读取失败', () => {
      (fs.readdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read failed');
      });

      const result = service.getCacheStats();

      expect(Object.keys(result)).toHaveLength(0);
    });

    it('应该过滤非交易缓存文件', () => {
      const mockFiles = ['trades-btcusdt.json', 'other-file.json', 'trades-ethusdt.json'];
      const mockStats = { size: 1024 };
      const mockData = {
        trades: mockTrades,
        lastUpdated: 1000000
      };

      (fs.readdirSync as jest.Mock).mockReturnValue(mockFiles);
      (fs.statSync as jest.Mock).mockReturnValue(mockStats);
      (fs.readJsonSync as jest.Mock).mockReturnValue(mockData);

      const result = service.getCacheStats();

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['btcusdt']).toBeDefined();
      expect(result['ethusdt']).toBeDefined();
    });
  });

  describe('printCacheStats', () => {
    it('应该打印缓存统计信息', () => {
      const mockFiles = ['trades-btcusdt.json'];
      const mockStats = { size: 1024 };
      const mockData = {
        trades: mockTrades,
        lastUpdated: 1000000
      };

      (fs.readdirSync as jest.Mock).mockReturnValue(mockFiles);
      (fs.statSync as jest.Mock).mockReturnValue(mockStats);
      (fs.readJsonSync as jest.Mock).mockReturnValue(mockData);

      expect(() => service.printCacheStats()).not.toThrow();
    });

    it('应该处理空缓存', () => {
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      expect(() => service.printCacheStats()).not.toThrow();
    });
  });
});
