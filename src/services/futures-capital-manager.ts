import { Position } from "../scripts/analyze-api";

export interface CapitalAllocation {
  symbol: string;
  originalMargin: number;
  allocatedMargin: number;
  notionalValue: number;
  adjustedQuantity: number;
  allocationRatio: number;
  leverage: number;
  side: "BUY" | "SELL";
}

export interface CapitalAllocationResult {
  totalOriginalMargin: number;
  totalAllocatedMargin: number;
  totalNotionalValue: number;
  allocations: CapitalAllocation[];
}

export class FuturesCapitalManager {
  private defaultTotalMargin: number = 1000; // 默认总保证金1000 USDT

  /**
   * 分配保证金到各个仓位
   * @param positions Agent的仓位信息
   * @param totalMargin 用户设定的总保证金
   * @param availableBalance 可用余额（可选，用于检查是否有足够资金）
   */
  allocateMargin(positions: Position[], totalMargin?: number, availableBalance?: number): CapitalAllocationResult {
    let totalMarginToUse = totalMargin || this.defaultTotalMargin;

    // 如果提供了可用余额，检查是否足够
    if (availableBalance && totalMarginToUse > availableBalance) {
      console.warn(`⚠️ Insufficient available balance: Required ${totalMarginToUse.toFixed(2)} USDT, Available ${availableBalance.toFixed(2)} USDT`);
      console.warn(`💡 Reducing allocation to available balance: ${availableBalance.toFixed(2)} USDT`);
      // 如果没有足够余额，使用可用余额作为总保证金
      totalMarginToUse = availableBalance;
    }

    // 过滤出有效的仓位（margin > 0）
    const validPositions = positions.filter(p => p.margin > 0);

    if (validPositions.length === 0) {
      return {
        totalOriginalMargin: 0,
        totalAllocatedMargin: 0,
        totalNotionalValue: 0,
        allocations: []
      };
    }

    // 计算总原始保证金
    const totalOriginalMargin = validPositions.reduce((sum, p) => sum + p.margin, 0);

    // 计算每个仓位的分配
    const allocations: CapitalAllocation[] = validPositions.map(position => {
      const allocationRatio = position.margin / totalOriginalMargin;
      const allocatedMargin = totalMarginToUse * allocationRatio;
      const notionalValue = allocatedMargin * position.leverage;
      const adjustedQuantity = notionalValue / position.current_price;
      const side = position.quantity > 0 ? "BUY" : "SELL";

      // 去掉小数部分：直接截断小数，不四舍五入
      const roundedAllocatedMargin = Math.floor(allocatedMargin);
      const roundedNotionalValue = Math.floor(notionalValue);
      const roundedAdjustedQuantity = this.roundQuantity(adjustedQuantity, position.symbol);

      return {
        symbol: position.symbol,
        originalMargin: position.margin,
        allocatedMargin: roundedAllocatedMargin,
        notionalValue: roundedNotionalValue,
        adjustedQuantity: roundedAdjustedQuantity,
        allocationRatio,
        leverage: position.leverage,
        side
      };
    });

    // 计算总计
    const totalAllocatedMargin = allocations.reduce((sum, a) => sum + a.allocatedMargin, 0);
    const totalNotionalValue = allocations.reduce((sum, a) => sum + a.notionalValue, 0);

    return {
      totalOriginalMargin,
      totalAllocatedMargin,
      totalNotionalValue,
      allocations
    };
  }

  /**
   * 获取默认总保证金
   */
  getDefaultTotalMargin(): number {
    return this.defaultTotalMargin;
  }

  /**
   * 设置默认总保证金
   */
  setDefaultTotalMargin(margin: number): void {
    if (margin <= 0) {
      throw new Error('Total margin must be positive');
    }
    this.defaultTotalMargin = margin;
  }

  /**
   * 格式化金额显示
   */
  formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * 格式化百分比显示
   */
  formatPercentage(ratio: number): string {
    return `${(ratio * 100).toFixed(2)}%`;
  }

  /**
   * 根据交易对精度格式化数量
   */
  private roundQuantity(quantity: number, symbol: string): number {
    // 数量精度映射，基于各个币种的最小交易单位
    const quantityPrecisionMap: Record<string, number> = {
      'BTCUSDT': 3,      // BTC: 保留3位小数，最小0.001
      'ETHUSDT': 3,      // ETH: 保留3位小数，最小0.001
      'BNBUSDT': 2,      // BNB: 保留2位小数，最小0.01
      'XRPUSDT': 1,      // XRP: 保留1位小数，最小0.1
      'ADAUSDT': 0,      // ADA: 保留0位小数，最小1
      'DOGEUSDT': 0,     // DOGE: 保留0位小数，最小10
      'SOLUSDT': 2,      // SOL: 保留2位小数，最小0.01
      'AVAXUSDT': 2,     // AVAX: 保留2位小数，最小0.01
      'MATICUSDT': 1,    // MATIC: 保留1位小数，最小0.1
      'DOTUSDT': 2,      // DOT: 保留2位小数，最小0.01
      'LINKUSDT': 2,     // LINK: 保留2位小数，最小0.01
      'UNIUSDT': 2,      // UNI: 保留2位小数，最小0.01
    };

    // 转换为币安格式
    const binanceSymbol = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`;
    const precision = quantityPrecisionMap[binanceSymbol] || 3;

    // 使用Math.round进行取整，避免浮点数精度问题
    const factor = Math.pow(10, precision);
    return Math.round(quantity * factor) / factor;
  }

  /**
   * 验证分配结果
   */
  validateAllocation(result: CapitalAllocationResult): boolean {
    // 检查总分配保证金是否等于预期总保证金（取整后允许较大误差）
    const expectedMargin = result.totalAllocatedMargin;
    const actualMargin = this.defaultTotalMargin;
    const difference = Math.abs(expectedMargin - actualMargin);

    if (difference > 10) { // 由于向下取整，允许更大的误差
      console.warn(`Margin allocation mismatch: expected ${actualMargin}, got ${expectedMargin}, difference: ${difference}`);
      return false;
    }

    // 检查所有分配比例之和是否为1
    const totalRatio = result.allocations.reduce((sum, a) => sum + a.allocationRatio, 0);
    if (Math.abs(totalRatio - 1.0) > 0.001) {
      console.warn(`Allocation ratio sum is not 1.0: ${totalRatio}`);
      return false;
    }

    return true;
  }
}