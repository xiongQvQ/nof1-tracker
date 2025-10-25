import * as fs from 'fs-extra';
import * as path from 'path';

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

export interface OrderHistoryData {
  processedOrders: ProcessedOrder[];
  lastUpdated: number;
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
        console.log(`📚 Loaded ${data.processedOrders.length} processed orders from history`);
        return data;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load order history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 返回默认空历史
    const emptyHistory: OrderHistoryData = {
      processedOrders: [],
      lastUpdated: Date.now()
    };
    console.log(`📚 Starting with empty order history`);
    return emptyHistory;
  }

  /**
   * 保存订单历史数据
   */
  private saveOrderHistory(): void {
    try {
      this.historyData.lastUpdated = Date.now();
      fs.writeJsonSync(this.historyFilePath, this.historyData, { spaces: 2 });
      console.log(`💾 Saved ${this.historyData.processedOrders.length} orders to history`);
    } catch (error) {
      console.error(`❌ Failed to save order history: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      console.log(`🔄 Order already processed: ${symbol} (OID: ${entryOid})`);
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
      console.log(`⚠️ Order ${symbol} (OID: ${entryOid}) already exists in history`);
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

    console.log(`✅ Saved processed order: ${symbol} ${side} ${quantity} (OID: ${entryOid})`);
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
      console.log(`🧹 Cleaned up ${removedCount} old order records (kept last ${daysToKeep} days)`);
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
   * 打印统计信息
   */
  printStats(): void {
    const stats = this.getStats();

    console.log(`\n📊 Order History Statistics:`);
    console.log(`==========================`);
    console.log(`Total Orders: ${stats.totalOrders}`);
    console.log(`Last Updated: ${new Date(stats.lastUpdated).toISOString()}`);

    if (Object.keys(stats.ordersByAgent).length > 0) {
      console.log(`\nOrders by Agent:`);
      Object.entries(stats.ordersByAgent).forEach(([agent, count]) => {
        console.log(`  ${agent}: ${count}`);
      });
    }

    if (Object.keys(stats.ordersBySymbol).length > 0) {
      console.log(`\nOrders by Symbol:`);
      Object.entries(stats.ordersBySymbol).forEach(([symbol, count]) => {
        console.log(`  ${symbol}: ${count}`);
      });
    }
  }
}