export interface TradingConfig {
  defaultPriceTolerance: number;
  symbolTolerances: Record<string, number>;
}

export class ConfigManager {
  private config: TradingConfig;

  constructor() {
    this.config = {
      defaultPriceTolerance: 1.0, // Default 1.0%
      symbolTolerances: {}
    };
  }

  /**
   * 获取价格容忍度
   */
  getPriceTolerance(symbol?: string): number {
    if (symbol && this.config.symbolTolerances[symbol]) {
      return this.config.symbolTolerances[symbol];
    }
    return this.config.defaultPriceTolerance;
  }

  /**
   * 设置默认价格容忍度
   */
  setPriceTolerance(tolerance: number): void {
    if (tolerance <= 0) {
      throw new Error('Price tolerance must be positive');
    }
    this.config.defaultPriceTolerance = tolerance;
  }

  /**
   * 设置特定币种的价格容忍度
   */
  setSymbolTolerance(symbol: string, tolerance: number): void {
    if (tolerance <= 0) {
      throw new Error('Price tolerance must be positive');
    }
    this.config.symbolTolerances[symbol] = tolerance;
  }

  /**
   * 从环境变量加载配置
   */
  loadFromEnvironment(): void {
    // Load default price tolerance
    const defaultTolerance = process.env.PRICE_TOLERANCE;
    if (defaultTolerance) {
      const tolerance = parseFloat(defaultTolerance);
      if (!isNaN(tolerance) && tolerance > 0) {
        this.config.defaultPriceTolerance = tolerance;
      }
    }

    // Load symbol-specific tolerances
    // Format: BTCUSDT_TOLERANCE=1.0, ETHUSDT_TOLERANCE=0.3
    Object.keys(process.env).forEach(key => {
      if (key.endsWith('_TOLERANCE')) {
        const symbol = key.replace('_TOLERANCE', '');
        const tolerance = parseFloat(process.env[key] || '');
        if (!isNaN(tolerance) && tolerance > 0) {
          this.config.symbolTolerances[symbol] = tolerance;
        }
      }
    });
  }

  /**
   * 导出配置
   */
  exportConfig(): TradingConfig {
    return {
      ...this.config,
      symbolTolerances: { ...this.config.symbolTolerances }
    };
  }

  /**
   * 导入配置
   */
  importConfig(config: Partial<TradingConfig>): void {
    if (config.defaultPriceTolerance !== undefined) {
      this.setPriceTolerance(config.defaultPriceTolerance);
    }

    if (config.symbolTolerances) {
      Object.entries(config.symbolTolerances).forEach(([symbol, tolerance]) => {
        this.setSymbolTolerance(symbol, tolerance);
      });
    }
  }

  /**
   * 重置配置为默认值
   */
  reset(): void {
    this.config = {
      defaultPriceTolerance: 1.0,
      symbolTolerances: {}
    };
  }

  /**
   * 获取完整配置
   */
  getConfig(): TradingConfig {
    return this.exportConfig();
  }
}