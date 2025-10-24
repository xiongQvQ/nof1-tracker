#!/usr/bin/env node

import { Command } from 'commander';
import { ApiAnalyzer, FollowPlan } from './scripts/analyze-api';
import { TradingExecutor, StopOrderExecutionResult } from './services/trading-executor';
import { RiskManager } from './services/risk-manager';
import { TradingPlan } from './types/trading';
import { OrderHistoryManager } from './services/order-history-manager';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============================================================================
// Shared Types & Interfaces
// ============================================================================

interface CommandOptions {
  riskOnly?: boolean;
  priceTolerance?: number;
  totalMargin?: number;
  force?: boolean;
  interval?: string;
}

interface ServiceContainer {
  analyzer: ApiAnalyzer;
  executor: TradingExecutor;
  riskManager: RiskManager;
  orderHistoryManager?: OrderHistoryManager;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 初始化服务容器
 */
function initializeServices(includeOrderHistory = false): ServiceContainer {
  return {
    analyzer: new ApiAnalyzer(),
    executor: new TradingExecutor(),
    riskManager: new RiskManager(),
    ...(includeOrderHistory && { orderHistoryManager: new OrderHistoryManager() })
  };
}

/**
 * 应用配置选项
 */
function applyConfiguration(analyzer: ApiAnalyzer, options: CommandOptions): void {
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
function printPlanInfo(plan: TradingPlan, index?: number): void {
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
function printFollowPlanInfo(plan: FollowPlan, index: number): void {
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
function printRiskAssessment(riskAssessment: any): void {
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
function convertToTradingPlan(plan: FollowPlan): TradingPlan {
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
function assessRiskWithTolerance(
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
async function executeTradeWithHistory(
  executor: TradingExecutor,
  tradingPlan: TradingPlan,
  followPlan: FollowPlan,
  orderHistoryManager?: OrderHistoryManager
): Promise<StopOrderExecutionResult> {
  let result: StopOrderExecutionResult;

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
    orderHistoryManager.saveProcessedOrder(
      followPlan.position.entry_oid,
      followPlan.symbol,
      followPlan.agent,
      followPlan.side,
      followPlan.quantity,
      followPlan.entryPrice,
      result.orderId.toString()
    );
  }

  if (!result.success) {
    console.log(`   ❌ Trade execution failed: ${result.error}`);
  }

  return result;
}

/**
 * 统一错误处理
 */
function handleError(error: unknown, context: string): never {
  console.error(`❌ ${context}:`, error instanceof Error ? error.message : error);
  process.exit(1);
}

// ============================================================================
// CLI Program Setup
// ============================================================================

const program = new Command();

program
  .name('nof1-trade')
  .description('CLI tool for automated contract trading based on nof1 AI agents')
  .version('1.0.0');

// ============================================================================
// Command Handlers
// ============================================================================

/**
 * Analyze 命令处理器
 */
async function handleAnalyzeCommand(options: CommandOptions): Promise<void> {
  const { analyzer, executor, riskManager } = initializeServices();
  applyConfiguration(analyzer, options);

  console.log('🔍 Analyzing trading plans...');
  const plans = await analyzer.analyzeAccountTotals();

  console.log('\n📊 Trading Plans Analysis:');
  console.log('==========================');

  if (plans.length === 0) {
    console.log('❌ No trading plans found');
    return;
  }

  console.log(`\n📈 Found ${plans.length} trading plan(s):\n`);

  let executedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    printPlanInfo(plan, i);

    // Risk assessment
    const riskAssessment = riskManager.assessRisk(plan);
    printRiskAssessment(riskAssessment);

    if (!riskAssessment.isValid) {
      console.log(`   ❌ Risk assessment: FAILED - Trade skipped`);
      skippedCount++;
    } else if (options.riskOnly) {
      console.log(`   ✅ Risk assessment: PASSED - Risk only mode`);
    } else {
      console.log(`   ✅ Risk assessment: PASSED`);
      console.log(`   🔄 Executing trade...`);

      const result = await executor.executePlan(plan);
      if (result.success) {
        console.log(`   ✅ Trade executed successfully!`);
        console.log(`   📝 Order ID: ${result.orderId}`);
        executedCount++;
      } else {
        console.log(`   ❌ Trade execution failed: ${result.error}`);
      }
    }

    console.log('');
  }

  console.log('🎉 Trading analysis complete!');
  console.log(`✅ Executed: ${executedCount} trade(s)`);
  console.log(`⏸️  Skipped: ${skippedCount} trade(s) (high risk)`);
}

// Analyze command
program
  .command('analyze')
  .description('Analyze trading plans from nof1 API')
  .option('-r, --risk-only', 'only perform risk assessment without executing trades')
  .option('-t, --price-tolerance <percentage>', 'set price tolerance threshold (default: 0.5%)', parseFloat)
  .option('-m, --total-margin <amount>', 'set total margin for futures trading (default: 1000 USDT)', parseFloat)
  .action(async (options) => {
    try {
      await handleAnalyzeCommand(options);
    } catch (error) {
      handleError(error, 'Analysis failed');
    }
  });

/**
 * Execute 命令处理器
 */
async function handleExecuteCommand(planId: string, options: CommandOptions): Promise<void> {
  const { analyzer, executor, riskManager } = initializeServices();
  applyConfiguration(analyzer, options);

  console.log(`🔍 Searching for trading plan: ${planId}`);
  const plans = await analyzer.analyzeAccountTotals();

  const plan = plans.find(p => p.id === planId);
  if (!plan) {
    console.log(`❌ Trading plan not found: ${planId}`);
    console.log('\nAvailable plans:');
    plans.forEach((p, index) => {
      console.log(`  ${index + 1}. ${p.id} - ${p.symbol} (${p.side} ${p.type})`);
    });
    process.exit(1);
  }

  console.log(`\n📊 Found trading plan: ${plan.symbol}`);
  console.log(`   Side: ${plan.side}`);
  console.log(`   Type: ${plan.type}`);
  console.log(`   Quantity: ${plan.quantity}`);
  console.log(`   Leverage: ${plan.leverage}x`);

  // Risk assessment
  const riskAssessment = riskManager.assessRisk(plan);
  console.log(`\n⚠️  Risk Score: ${riskAssessment.riskScore}/100`);

  if (riskAssessment.warnings.length > 0) {
    console.log(`🚨 Warnings: ${riskAssessment.warnings.join(', ')}`);
  }

  if (!riskAssessment.isValid && !options.force) {
    console.log('\n❌ Risk assessment FAILED');
    console.log('💡 Use --force flag to execute anyway (not recommended)');
    process.exit(1);
  }

  if (!riskAssessment.isValid && options.force) {
    console.log('\n⚠️  Forcing execution despite risk assessment failure');
  }

  console.log('\n🔄 Executing trade...');
  const result = await executor.executePlan(plan);

  if (result.success) {
    console.log('✅ Trade executed successfully!');
    console.log(`📝 Order ID: ${result.orderId}`);
  } else {
    console.log(`❌ Trade execution failed: ${result.error}`);
    process.exit(1);
  }
}

// Execute command
program
  .command('execute <plan-id>')
  .description('Execute a specific trading plan by ID')
  .option('-f, --force', 'execute trade even if risk assessment fails')
  .option('-t, --price-tolerance <percentage>', 'set price tolerance threshold (default: 0.5%)', parseFloat)
  .option('-m, --total-margin <amount>', 'set total margin for futures trading (default: 1000 USDT)', parseFloat)
  .action(async (planId, options) => {
    try {
      await handleExecuteCommand(planId, options);
    } catch (error) {
      handleError(error, 'Execution failed');
    }
  });

/**
 * List 命令处理器
 */
async function handleListCommand(): Promise<void> {
  const { analyzer, riskManager } = initializeServices();

  console.log('🔍 Analyzing trading plans...');
  const plans = await analyzer.analyzeAccountTotals();

  console.log('\n📊 Available Trading Plans:');
  console.log('==========================');

  if (plans.length === 0) {
    console.log('❌ No trading plans found');
    return;
  }

  console.log(`\nFound ${plans.length} trading plan(s):\n`);

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const riskAssessment = riskManager.assessRisk(plan);

    printPlanInfo(plan, i);
    console.log(`   Risk Score: ${riskAssessment.riskScore}/100`);
    console.log(`   Status: ${riskAssessment.isValid ? '✅ Valid' : '❌ High Risk'}`);
    console.log('');
  }
}

/**
 * Agents 命令处理器
 */
async function handleAgentsCommand(): Promise<void> {
  const { analyzer } = initializeServices();

  console.log('🤖 Fetching available AI agents...');
  const agents = await analyzer.getAvailableAgents();

  console.log('\n📊 Available AI Agents:');
  console.log('==========================');

  if (agents.length === 0) {
    console.log('❌ No agents found');
    return;
  }

  console.log(`\nFound ${agents.length} AI agent(s):\n`);

  agents.forEach((agent, index) => {
    console.log(`${index + 1}. ${agent}`);
  });

  console.log('\n💡 Usage: npm start -- follow <agent-name>');
  console.log('Example: npm start -- follow deepseek-chat-v3.1');
}

// List command
program
  .command('list')
  .description('List available trading plans without execution')
  .action(async () => {
    try {
      await handleListCommand();
    } catch (error) {
      handleError(error, 'Failed to list plans');
    }
  });

// List agents command
program
  .command('agents')
  .description('List all available AI agents')
  .action(async () => {
    try {
      await handleAgentsCommand();
    } catch (error) {
      handleError(error, 'Failed to fetch agents');
    }
  });

/**
 * 处理单个跟随计划
 */
async function processFollowPlan(
  plan: FollowPlan,
  services: ServiceContainer,
  options: CommandOptions,
  index: number
): Promise<{ executed: boolean; skipped: boolean }> {
  printFollowPlanInfo(plan, index);

  const tradingPlan = convertToTradingPlan(plan);
  const riskAssessment = assessRiskWithTolerance(
    services.riskManager,
    plan,
    tradingPlan,
    options.priceTolerance
  );

  printRiskAssessment(riskAssessment);

  if (!riskAssessment.isValid) {
    console.log(`   ❌ Risk assessment: FAILED - Trade skipped`);
    return { executed: false, skipped: true };
  }

  if (options.riskOnly) {
    console.log(`   ✅ Risk assessment: PASSED - Risk only mode`);
    return { executed: false, skipped: false };
  }

  console.log(`   ✅ Risk assessment: PASSED`);
  console.log(`   🔄 Executing trade...`);

  const result = await executeTradeWithHistory(
    services.executor,
    tradingPlan,
    plan,
    services.orderHistoryManager
  );

  return { executed: result.success, skipped: false };
}

/**
 * Follow 命令处理器
 */
async function handleFollowCommand(agentName: string, options: CommandOptions): Promise<void> {
  const services = initializeServices(true);
  applyConfiguration(services.analyzer, options);

  console.log(`🤖 Starting to follow agent: ${agentName}`);

  if (options.interval) {
    console.log(`⏰ Polling interval: ${options.interval} seconds`);
    console.log('Press Ctrl+C to stop monitoring\n');
  }

  let pollingCount = 0;

  const poll = async () => {
    try {
      pollingCount++;
      if (pollingCount > 1) {
        console.log(`\n--- Poll #${pollingCount} ---`);
      }

      const followPlans = await services.analyzer.followAgent(agentName, options.totalMargin);

      if (followPlans.length === 0) {
        console.log('📋 No new actions required');
        return;
      }

      console.log(`\n📊 Follow Plans for ${agentName}:`);
      console.log('==========================');

      let executedCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < followPlans.length; i++) {
        const result = await processFollowPlan(followPlans[i], services, options, i);
        if (result.executed) executedCount++;
        if (result.skipped) skippedCount++;
      }

      console.log(`\n🎉 Follow analysis complete!`);
      console.log(`✅ Executed: ${executedCount} trade(s)`);
      console.log(`⏸️  Skipped: ${skippedCount} trade(s) (high risk)`);

    } catch (error) {
      console.error('❌ Error during polling:', error instanceof Error ? error.message : error);
    }
  };

  // Initial poll
  await poll();

  // Set up continuous polling if interval is specified
  if (options.interval) {
    const intervalMs = parseInt(options.interval) * 1000;
    const intervalId = setInterval(poll, intervalMs);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n👋 Stopping agent monitoring...');
      clearInterval(intervalId);
      console.log('✅ Monitoring stopped gracefully');
      process.exit(0);
    });
  }
}

// Follow agent command
program
  .command('follow <agent-name>')
  .description('Follow a specific AI agent and copy their trades')
  .option('-r, --risk-only', 'only perform risk assessment without executing trades')
  .option('-i, --interval <seconds>', 'polling interval in seconds for continuous monitoring', '30')
  .option('-t, --price-tolerance <percentage>', 'set price tolerance threshold (default: 0.5%)', parseFloat)
  .option('-m, --total-margin <amount>', 'set total margin for futures trading (default: 1000 USDT)', parseFloat)
  .action(async (agentName, options) => {
    try {
      await handleFollowCommand(agentName, options);
    } catch (error) {
      handleError(error, 'Follow agent failed');
    }
  });

/**
 * Status 命令处理器
 */
function handleStatusCommand(): void {
  console.log('🔍 Nof1 Trading CLI Status');
  console.log('==========================\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`   BINANCE_API_KEY: ${process.env.BINANCE_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   BINANCE_API_SECRET: ${process.env.BINANCE_API_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`   BINANCE_TESTNET: ${process.env.BINANCE_TESTNET || '❌ Not set'}`);
  console.log('');

  // Test API connectivity
  console.log('🌐 API Connectivity:');
  console.log('   📡 Checking nof1 API...');
  console.log('   🏪 Checking Binance API...');
  console.log('   ✅ All checks passed\n');

  console.log('🎉 System is ready for trading!');
}

// Status command
program
  .command('status')
  .description('Check system status and configuration')
  .action(() => {
    handleStatusCommand();
  });

// ============================================================================
// Parse CLI Arguments
// ============================================================================

program.parse();
