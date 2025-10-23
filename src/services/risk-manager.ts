import { TradingPlan } from "../types/trading";
import { ConfigManager } from "./config-manager";

export interface PriceToleranceCheck {
  entryPrice: number;
  currentPrice: number;
  priceDifference: number; // Percentage difference
  tolerance: number; // Tolerance threshold in percentage
  withinTolerance: boolean;
  shouldExecute: boolean;
  reason: string;
}

export interface RiskAssessment {
  isValid: boolean;
  riskScore: number;
  warnings: string[];
  maxLoss: number;
  suggestedPositionSize: number;
  priceTolerance?: PriceToleranceCheck;
}

export class RiskManager {
  private configManager: ConfigManager;

  constructor(configManager?: ConfigManager) {
    this.configManager = configManager || new ConfigManager();
  }

  assessRisk(tradingPlan: TradingPlan): RiskAssessment {
    // Basic risk assessment logic
    const riskScore = this.calculateRiskScore(tradingPlan);
    const warnings = this.generateWarnings(tradingPlan, riskScore);

    return {
      isValid: riskScore <= 100, // Risk score threshold
      riskScore,
      warnings,
      maxLoss: tradingPlan.quantity * 1000, // Simplified calculation
      suggestedPositionSize: tradingPlan.quantity
    };
  }

  /**
   * 计算价格差异百分比
   */
  calculatePriceDifference(entryPrice: number, currentPrice: number): number {
    if (entryPrice <= 0) {
      throw new Error('Entry price must be greater than 0');
    }
    return Math.abs((currentPrice - entryPrice) / entryPrice) * 100;
  }

  /**
   * 检查价格是否在容忍范围内
   */
  checkPriceTolerance(
    entryPrice: number,
    currentPrice: number,
    symbol?: string,
    customTolerance?: number
  ): PriceToleranceCheck {
    const tolerance = customTolerance || this.configManager.getPriceTolerance(symbol);
    const priceDifference = this.calculatePriceDifference(entryPrice, currentPrice);
    const withinTolerance = priceDifference <= tolerance;

    return {
      entryPrice,
      currentPrice,
      priceDifference,
      tolerance,
      withinTolerance,
      shouldExecute: withinTolerance,
      reason: withinTolerance
        ? `Price difference ${priceDifference.toFixed(2)}% is within tolerance ${tolerance}%`
        : `Price difference ${priceDifference.toFixed(2)}% exceeds tolerance ${tolerance}%`
    };
  }

  /**
   * 包含价格容忍度检查的风险评估
   */
  assessRiskWithPriceTolerance(
    tradingPlan: TradingPlan,
    entryPrice: number,
    currentPrice: number,
    symbol?: string,
    customTolerance?: number
  ): RiskAssessment {
    // Get basic risk assessment
    const basicAssessment = this.assessRisk(tradingPlan);

    // Add price tolerance check
    const priceTolerance = this.checkPriceTolerance(entryPrice, currentPrice, symbol, customTolerance);

    // Combine warnings
    const combinedWarnings = [...basicAssessment.warnings];
    if (!priceTolerance.withinTolerance) {
      combinedWarnings.push(`Price tolerance check failed: ${priceTolerance.reason}`);
    }

    return {
      ...basicAssessment,
      warnings: combinedWarnings,
      priceTolerance,
      isValid: basicAssessment.isValid && priceTolerance.withinTolerance
    };
  }

  /**
   * 获取配置管理器
   */
  getConfigManager(): ConfigManager {
    return this.configManager;
  }

  private calculateRiskScore(tradingPlan: TradingPlan): number {
    // Simple risk scoring based on leverage and quantity
    const leverageRisk = tradingPlan.leverage * 10;
    const baseScore = 20;
    return Math.min(baseScore + leverageRisk, 100);
  }

  private generateWarnings(tradingPlan: TradingPlan, riskScore: number): string[] {
    const warnings: string[] = [];

    if (tradingPlan.leverage > 20) {
      warnings.push("High leverage detected");
    }

    if (riskScore > 80) {
      warnings.push("High risk score");
    }

    return warnings;
  }
}
