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
   */
  allocateMargin(positions: Position[], totalMargin?: number): CapitalAllocationResult {
    const totalMarginToUse = totalMargin || this.defaultTotalMargin;

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

      return {
        symbol: position.symbol,
        originalMargin: position.margin,
        allocatedMargin,
        notionalValue,
        adjustedQuantity,
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
   * 验证分配结果
   */
  validateAllocation(result: CapitalAllocationResult): boolean {
    // 检查总分配保证金是否等于预期总保证金（允许小数点误差）
    const expectedMargin = result.totalAllocatedMargin;
    const actualMargin = this.defaultTotalMargin;
    const difference = Math.abs(expectedMargin - actualMargin);

    if (difference > 0.01) { // 允许1分钱的误差
      console.warn(`Margin allocation mismatch: expected ${actualMargin}, got ${expectedMargin}`);
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