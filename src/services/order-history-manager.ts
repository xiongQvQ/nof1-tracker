import * as fs from 'fs-extra';
import * as path from 'path';
import { logInfo, logDebug, logWarn } from '../utils/logger';

export interface ProcessedOrder {
  entryOid: number;
  symbol: string;
  agent: string;
  timestamp: number;
  orderId?: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price?: number;
}

export interface ProfitExitRecord {
  symbol: string;
  entryOid: number;
  exitPrice: number;
  profitPercentage: number;
  timestamp: number;
  reason: string;
}

export interface OrderHistoryData {
  processedOrders: ProcessedOrder[];
  profitExits?: ProfitExitRecord[]; // 盈利退出记录
  lastUpdated: number;
  createdAt?: number; // 跟单开始时间
}

export class OrderHistoryManager {
  private historyFilePath: string;
  private historyData: OrderHistoryData;

  constructor(historyDir: string = './data') {
    // 确保数据目录存在
    fs.ensureDirSync(historyDir);
    this.historyFilePath = path.join(historyDir, 'order-history.json');
    this.historyData = this.loadOrderHistory();
  }

  /**
   * 加载订单历史数据
   */
  private loadOrderHistory(): OrderHistoryData {
    try {
      if (fs.existsSync(this.historyFilePath)) {
        const data = fs.readJsonSync(this.historyFilePath);

        // 确保profitExits字段存在（兼容旧文件）
        if (!data.profitExits) {
          data.profitExits = [];
        }

        // 如果没有createdAt字段，尝试添加
        if (!data.createdAt && data.processedOrders.length > 0) {
          // 使用第一个订单的时间作为创建时间
          const firstOrderTimestamp = Math.min(...data.processedOrders.map((order: ProcessedOrder) => order.timestamp));
          data.createdAt = firstOrderTimestamp;

          // 保存更新后的数据
          this.saveOrderHistoryData(data);
          logInfo(`📅 Added createdAt field based on earliest order: ${new Date(data.createdAt).toISOString()}`);
        } else if (!data.createdAt) {
          // 如果没有任何订单记录，使用文件创建时间
          try {
            const stats = fs.statSync(this.historyFilePath);
            data.createdAt = stats.birthtimeMs || stats.mtimeMs;
            this.saveOrderHistoryData(data);
            logInfo(`📅 Added createdAt field based on file creation time: ${new Date(data.createdAt).toISOString()}`);
          } catch (error) {
            // 如果获取文件时间失败，使用当前时间
            data.createdAt = Date.now();
            this.saveOrderHistoryData(data);
            logInfo(`📅 Added createdAt field using current time: ${new Date(data.createdAt).toISOString()}`);
          }
        }

        logDebug(`📚 Loaded ${data.processedOrders.length} processed orders from history`);
        return data;
      }
    } catch (error) {
      logWarn(`⚠️ Failed to load order history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 返回默认空历史
    const emptyHistory: OrderHistoryData = {
      processedOrders: [],
      profitExits: [],
      lastUpdated: Date.now(),
      createdAt: Date.now()
    };
    logDebug(`📚 Starting with empty order history`);
    return emptyHistory;
  }

  /**
   * 保存订单历史数据
   */
  private saveOrderHistory(): void {
    try {
      this.historyData.lastUpdated = Date.now();
      fs.writeJsonSync(this.historyFilePath, this.historyData, { spaces: 2 });
      logDebug(`💾 Saved ${this.historyData.processedOrders.length} orders to history`);
    } catch (error) {
      logWarn(`❌ Failed to save order history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 保存指定的历史数据（用于更新createdAt等字段）
   */
  private saveOrderHistoryData(data: OrderHistoryData): void {
    try {
      fs.writeJsonSync(this.historyFilePath, data, { spaces: 2 });
      logDebug(`💾 Saved updated order history data`);
    } catch (error) {
      logWarn(`❌ Failed to save order history data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 重新加载订单历史(用于手动修改文件后刷新)
   */
  reloadHistory(): void {
    this.historyData = this.loadOrderHistory();
  }

  /**
   * 检查订单是否已处理
   */
  isOrderProcessed(entryOid: number, symbol: string): boolean {
    const isProcessed = this.historyData.processedOrders.some(
      order => order.entryOid === entryOid && order.symbol === symbol
    );

    if (isProcessed) {
      logDebug(`🔄 Order already processed: ${symbol} (OID: ${entryOid})`);
    }

    return isProcessed;
  }

  /**
   * 保存已处理的订单
   */
  saveProcessedOrder(
    entryOid: number,
    symbol: string,
    agent: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    price?: number,
    orderId?: string
  ): void {
    // 检查是否已经存在
    if (this.isOrderProcessed(entryOid, symbol)) {
      logDebug(`⚠️ Order ${symbol} (OID: ${entryOid}) already exists in history`);
      return;
    }

    const processedOrder: ProcessedOrder = {
      entryOid,
      symbol,
      agent,
      timestamp: Date.now(),
      orderId,
      side,
      quantity,
      price
    };

    this.historyData.processedOrders.push(processedOrder);
    this.saveOrderHistory();

    logInfo(`✅ Saved processed order: ${symbol} ${side} ${quantity} (OID: ${entryOid})`);
  }

  /**
   * 获取已处理的订单列表
   */
  getProcessedOrders(): ProcessedOrder[] {
    return [...this.historyData.processedOrders];
  }

  /**
   * 获取特定代理的已处理订单
   */
  getProcessedOrdersByAgent(agent: string): ProcessedOrder[] {
    // 每次获取时重新加载,确保数据是最新的
    this.reloadHistory();
    return this.historyData.processedOrders.filter(order => order.agent === agent);
  }

  /**
   * 获取特定交易对的已处理订单
   */
  getProcessedOrdersBySymbol(symbol: string): ProcessedOrder[] {
    return this.historyData.processedOrders.filter(order => order.symbol === symbol);
  }

  /**
   * 清理旧的订单记录（保留指定天数内的记录）
   */
  cleanupOldOrders(daysToKeep: number = 30): void {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const originalCount = this.historyData.processedOrders.length;

    this.historyData.processedOrders = this.historyData.processedOrders.filter(
      order => order.timestamp > cutoffTime
    );

    const removedCount = originalCount - this.historyData.processedOrders.length;
    if (removedCount > 0) {
      this.saveOrderHistory();
      logInfo(`🧹 Cleaned up ${removedCount} old order records (kept last ${daysToKeep} days)`);
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalOrders: number;
    ordersByAgent: Record<string, number>;
    ordersBySymbol: Record<string, number>;
    lastUpdated: number;
  } {
    const ordersByAgent: Record<string, number> = {};
    const ordersBySymbol: Record<string, number> = {};

    this.historyData.processedOrders.forEach(order => {
      ordersByAgent[order.agent] = (ordersByAgent[order.agent] || 0) + 1;
      ordersBySymbol[order.symbol] = (ordersBySymbol[order.symbol] || 0) + 1;
    });

    return {
      totalOrders: this.historyData.processedOrders.length,
      ordersByAgent,
      ordersBySymbol,
      lastUpdated: this.historyData.lastUpdated
    };
  }

  /**
   * 获取跟单开始时间
   */
  getCreatedAt(): number {
    // 重新加载以确保数据是最新的
    this.reloadHistory();

    if (this.historyData.createdAt) {
      return this.historyData.createdAt;
    }

    // 如果仍然没有createdAt（理论上不应该发生），提供备用逻辑
    if (this.historyData.processedOrders.length > 0) {
      // 使用最早订单的时间
      const earliestOrder = this.historyData.processedOrders.reduce((earliest, order) =>
        order.timestamp < earliest.timestamp ? order : earliest
      );
      logWarn(`⚠️ Using earliest order timestamp as fallback: ${new Date(earliestOrder.timestamp).toISOString()}`);
      return earliestOrder.timestamp;
    }

    // 最后的备用方案：使用当前时间减去1天（假设至少有一天的跟单历史）
    const fallbackTime = Date.now() - (24 * 60 * 60 * 1000);
    logWarn(`⚠️ Using fallback time (1 day ago): ${new Date(fallbackTime).toISOString()}`);
    return fallbackTime;
  }

  /**
   * 打印统计信息
   */
  printStats(): void {
    const stats = this.getStats();

    logInfo(`\n📊 Order History Statistics:`);
    logInfo(`==========================`);
    logInfo(`Total Orders: ${stats.totalOrders}`);
    logInfo(`Last Updated: ${new Date(stats.lastUpdated).toISOString()}`);
    logInfo(`Created At: ${new Date(this.getCreatedAt()).toISOString()}`);

    if (Object.keys(stats.ordersByAgent).length > 0) {
      logInfo(`\nOrders by Agent:`);
      Object.entries(stats.ordersByAgent).forEach(([agent, count]) => {
        logInfo(`  ${agent}: ${count}`);
      });
    }

    if (Object.keys(stats.ordersBySymbol).length > 0) {
      logInfo(`\nOrders by Symbol:`);
      Object.entries(stats.ordersBySymbol).forEach(([symbol, count]) => {
        logInfo(`  ${symbol}: ${count}`);
      });
    }
  }

  /**
   * 添加盈利退出记录
   */
  addProfitExitRecord(record: Omit<ProfitExitRecord, 'timestamp'>): void {
    const profitExitRecord: ProfitExitRecord = {
      ...record,
      timestamp: Date.now()
    };

    // 初始化profitExits数组（如果不存在）
    if (!this.historyData.profitExits) {
      this.historyData.profitExits = [];
    }

    this.historyData.profitExits.push(profitExitRecord);
    this.saveOrderHistory();
    logInfo(`💰 Recorded profit exit: ${record.symbol} at ${record.profitPercentage.toFixed(2)}% profit`);
  }

  /**
   * 检查特定订单是否有盈利退出记录
   */
  hasProfitExitRecord(entryOid: number, symbol: string): boolean {
    if (!this.historyData.profitExits) {
      return false;
    }

    return this.historyData.profitExits.some(
      record => record.entryOid === entryOid && record.symbol === symbol
    );
  }

  /**
   * 重置特定symbol的订单处理状态（用于重新跟单）
   */
  resetSymbolOrderStatus(symbol: string, entryOid?: number): void {
    let removedCount = 0;

    if (entryOid) {
      // 移除特定OID的订单记录
      const originalLength = this.historyData.processedOrders.length;
      this.historyData.processedOrders = this.historyData.processedOrders.filter(
        order => !(order.entryOid === entryOid && order.symbol === symbol)
      );
      removedCount = originalLength - this.historyData.processedOrders.length;
    } else {
      // 移除该symbol的所有订单记录
      const originalLength = this.historyData.processedOrders.length;
      this.historyData.processedOrders = this.historyData.processedOrders.filter(
        order => order.symbol !== symbol
      );
      removedCount = originalLength - this.historyData.processedOrders.length;
    }

    if (removedCount > 0) {
      this.saveOrderHistory();
      logInfo(`🔄 Reset order status for ${symbol}: removed ${removedCount} processed order(s)`);
    } else {
      logDebug(`🔄 No processed orders found to reset for ${symbol}`);
    }
  }

  /**
   * 获取盈利退出记录
   */
  getProfitExitRecords(): ProfitExitRecord[] {
    return [...(this.historyData.profitExits || [])];
  }

  /**
   * 获取特定symbol的盈利退出记录
   */
  getProfitExitRecordsBySymbol(symbol: string): ProfitExitRecord[] {
    if (!this.historyData.profitExits) {
      return [];
    }

    return this.historyData.profitExits.filter(record => record.symbol === symbol);
  }
}