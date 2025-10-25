import { ApiAnalyzer, FollowPlan } from '../scripts/analyze-api';
import { TradingExecutor, StopOrderExecutionResult } from '../services/trading-executor';
import { RiskManager } from '../services/risk-manager';
import { OrderHistoryManager } from '../services/order-history-manager';
import { TradingPlan } from '../types/trading';
import { CommandOptions, ServiceContainer } from '../types/command';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 初始化服务容器
 */
export function initializeServices(includeOrderHistory = false): ServiceContainer {
  const analyzer = new ApiAnalyzer();
  return {
    analyzer,
    executor: new TradingExecutor(),
    riskManager: new RiskManager(),
    // 使用 analyzer 内部的 orderHistoryManager 实例,确保一致性
    ...(includeOrderHistory && { orderHistoryManager: analyzer.getOrderHistoryManager() })
  };
}

/**
 * 应用配置选项
 */
export function applyConfiguration(analyzer: ApiAnalyzer, options: CommandOptions): void {
  if (options.priceTolerance && !isNaN(options.priceTolerance)) {
    analyzer.getConfigManager().setPriceTolerance(options.priceTolerance);
    console.log(`📊 Price tolerance set to ${options.priceTolerance}%`);
  }

  if (options.totalMargin && !isNaN(options.totalMargin)) {
    console.log(`💰 Total margin set to $${options.totalMargin.toFixed(2)}`);
  }
}

/**
 * 打印交易计划基本信息
 */
export function printPlanInfo(plan: TradingPlan, index?: number): void {
  const prefix = index !== undefined ? `${index + 1}. ` : '';
  console.log(`${prefix}${plan.symbol}`);
  console.log(`   ID: ${plan.id}`);
  console.log(`   Side: ${plan.side}`);
  console.log(`   Type: ${plan.type}`);
  console.log(`   Quantity: ${plan.quantity}`);
  console.log(`   Leverage: ${plan.leverage}x`);
  if ('timestamp' in plan) {
    console.log(`   Timestamp: ${new Date(plan.timestamp).toISOString()}`);
  }
}

/**
 * 打印跟随计划信息
 */
export function printFollowPlanInfo(plan: FollowPlan, index: number): void {
  console.log(`\n${index + 1}. ${plan.symbol} - ${plan.action}`);
  console.log(`   Side: ${plan.side}`);
  console.log(`   Type: ${plan.type}`);
  console.log(`   Quantity: ${plan.quantity.toFixed(6)}`);
  console.log(`   Leverage: ${plan.leverage}x`);
  if (plan.entryPrice) console.log(`   Entry Price: ${plan.entryPrice}`);
  if (plan.exitPrice) console.log(`   Exit Price: ${plan.exitPrice}`);
  console.log(`   Reason: ${plan.reason}`);
}

/**
 * 打印风险评估结果
 */
export function printRiskAssessment(riskAssessment: any): void {
  console.log(`   ⚠️  Risk Score: ${riskAssessment.riskScore}/100`);

  if (riskAssessment.warnings.length > 0) {
    console.log(`   🚨 Warnings: ${riskAssessment.warnings.join(', ')}`);
  }

  if (riskAssessment.priceTolerance) {
    const pt = riskAssessment.priceTolerance;
    console.log(`   💰 Price Check: Entry $${pt.entryPrice} vs Current $${pt.currentPrice}`);
    console.log(`   📏 Price Difference: ${pt.priceDifference.toFixed(2)}% (Tolerance: ${pt.tolerance}%)`);
    console.log(`   ✅ Price Tolerance: ${pt.reason}`);
  }
}

/**
 * 转换 FollowPlan 为 TradingPlan
 */
export function convertToTradingPlan(plan: FollowPlan): TradingPlan {
  return {
    id: `${plan.agent}_${plan.symbol}_${plan.timestamp}`,
    symbol: plan.symbol,
    side: plan.side,
    type: plan.type,
    quantity: plan.quantity,
    leverage: plan.leverage,
    timestamp: plan.timestamp
  };
}

/**
 * 评估风险(支持价格容差检查)
 */
export function assessRiskWithTolerance(
  riskManager: RiskManager,
  plan: FollowPlan,
  tradingPlan: TradingPlan,
  priceTolerance?: number
): any {
  if (plan.action === "ENTER" && plan.entryPrice && plan.position?.current_price) {
    return riskManager.assessRiskWithPriceTolerance(
      tradingPlan,
      plan.entryPrice,
      plan.position.current_price,
      plan.symbol,
      priceTolerance
    );
  }
  return riskManager.assessRisk(tradingPlan);
}

/**
 * 执行交易并保存订单历史
 */
export async function executeTradeWithHistory(
  executor: TradingExecutor,
  tradingPlan: TradingPlan,
  followPlan: FollowPlan,
  orderHistoryManager?: OrderHistoryManager
): Promise<StopOrderExecutionResult> {
  let result: StopOrderExecutionResult;

  // 如果有 releasedMargin,使用它来计算交易数量
  if (followPlan.releasedMargin && followPlan.releasedMargin > 0 && followPlan.position) {
    const notionalValue = followPlan.releasedMargin * followPlan.leverage;
    const adjustedQuantity = notionalValue / followPlan.position.current_price;
    console.log(`   💰 Using released margin: $${followPlan.releasedMargin.toFixed(2)} (${followPlan.leverage}x leverage) → Quantity: ${adjustedQuantity.toFixed(4)}`);
    tradingPlan.quantity = adjustedQuantity;
  }

  // 如果是ENTER操作且有position信息,使用带止盈止损的执行方法
  if (followPlan.action === "ENTER" && followPlan.position) {
    console.log(`   🛡️ Setting up stop orders based on exit plan...`);
    result = await executor.executePlanWithStopOrders(tradingPlan, followPlan.position);

    if (result.success) {
      console.log(`   ✅ Trade executed successfully!`);
      console.log(`   📝 Main Order ID: ${result.orderId}`);
      if (result.takeProfitOrderId) {
        console.log(`   📈 Take Profit Order ID: ${result.takeProfitOrderId}`);
      }
      if (result.stopLossOrderId) {
        console.log(`   📉 Stop Loss Order ID: ${result.stopLossOrderId}`);
      }
    }
  } else {
    // 使用普通执行方法
    result = await executor.executePlan(tradingPlan);

    if (result.success) {
      console.log(`   ✅ Trade executed successfully!`);
      console.log(`   📝 Order ID: ${result.orderId}`);
    }
  }

  // 保存订单历史
  if (result.success && orderHistoryManager && followPlan.position?.entry_oid && result.orderId) {
    console.log(`   💾 Saving order to history: ${followPlan.symbol} (OID: ${followPlan.position.entry_oid})`);
    orderHistoryManager.saveProcessedOrder(
      followPlan.position.entry_oid,
      followPlan.symbol,
      followPlan.agent,
      followPlan.side,
      followPlan.quantity,
      followPlan.entryPrice,
      result.orderId.toString()
    );
  } else if (result.success) {
    // 调试信息：为什么没有保存订单历史
    if (!orderHistoryManager) {
      console.log(`   ⚠️ Order history not saved: orderHistoryManager is missing`);
    } else if (!followPlan.position?.entry_oid) {
      console.log(`   ⚠️ Order history not saved: entry_oid is missing (position: ${!!followPlan.position})`);
    } else if (!result.orderId) {
      console.log(`   ⚠️ Order history not saved: orderId is missing`);
    }
  }

  if (!result.success) {
    console.log(`   ❌ Trade execution failed: ${result.error}`);
  }

  return result;
}

/**
 * 统一错误处理
 */
export function handleError(error: unknown, context: string): never {
  console.error(`❌ ${context}:`, error instanceof Error ? error.message : error);
  process.exit(1);
}

/**
 * 从 package.json 读取版本号
 */
export function getVersion(): string {
  try {
    const packageJsonPath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    console.warn('Warning: Could not read version from package.json, defaulting to 1.0.0');
    return '1.0.0';
  }
}
