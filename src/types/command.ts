import { ApiAnalyzer } from '../scripts/analyze-api';
import { TradingExecutor } from '../services/trading-executor';
import { RiskManager } from '../services/risk-manager';
import { OrderHistoryManager } from '../services/order-history-manager';

/**
 * 命令选项接口
 */
export interface CommandOptions {
  riskOnly?: boolean;
  priceTolerance?: number;
  totalMargin?: number;
  force?: boolean;
  interval?: string;
}

/**
 * 服务容器接口
 */
export interface ServiceContainer {
  analyzer: ApiAnalyzer;
  executor: TradingExecutor;
  riskManager: RiskManager;
  orderHistoryManager?: OrderHistoryManager;
}
