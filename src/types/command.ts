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
  profit?: number;        // 盈利目标百分比 (e.g., 30 for 30%)
  autoRefollow?: boolean; // 自动重新跟单 (默认false)
  marginType?: 'ISOLATED' | 'CROSSED'; // 保证金模式: ISOLATED(逐仓) 或 CROSSED(全仓), 默认全仓
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
