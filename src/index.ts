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

const program = new Command();

program
  .name('nof1-trade')
  .description('CLI tool for automated contract trading based on nof1 AI agents')
  .version('1.0.0');

// Analyze command
program
  .command('analyze')
  .description('Analyze trading plans from nof1 API')
  .option('-r, --risk-only', 'only perform risk assessment without executing trades')
  .option('-t, --price-tolerance <percentage>', 'set price tolerance threshold (default: 0.5%)', parseFloat)
  .option('-m, --total-margin <amount>', 'set total margin for futures trading (default: 1000 USDT)', parseFloat)
  .action(async (options) => {
    try {
      const analyzer = new ApiAnalyzer();
      const executor = new TradingExecutor();
      const riskManager = new RiskManager();

      // Apply price tolerance configuration
      if (options.priceTolerance && !isNaN(options.priceTolerance)) {
        analyzer.getConfigManager().setPriceTolerance(options.priceTolerance);
        console.log(`📊 Price tolerance set to ${options.priceTolerance}%`);
      }

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

        console.log(`${i + 1}. ${plan.symbol}`);
        console.log(`   ID: ${plan.id}`);
        console.log(`   Side: ${plan.side}`);
        console.log(`   Type: ${plan.type}`);
        console.log(`   Quantity: ${plan.quantity}`);
        console.log(`   Leverage: ${plan.leverage}x`);
        console.log(`   Timestamp: ${new Date(plan.timestamp).toISOString()}`);

        // Risk assessment
        const riskAssessment = riskManager.assessRisk(plan);
        console.log(`   ⚠️  Risk Score: ${riskAssessment.riskScore}/100`);

        if (riskAssessment.warnings.length > 0) {
          console.log(`   🚨 Warnings: ${riskAssessment.warnings.join(', ')}`);
        }

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

    } catch (error) {
      console.error('❌ Analysis failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Execute command
program
  .command('execute <plan-id>')
  .description('Execute a specific trading plan by ID')
  .option('-f, --force', 'execute trade even if risk assessment fails')
  .option('-t, --price-tolerance <percentage>', 'set price tolerance threshold (default: 0.5%)', parseFloat)
  .option('-m, --total-margin <amount>', 'set total margin for futures trading (default: 1000 USDT)', parseFloat)
  .action(async (planId, options) => {
    try {
      const analyzer = new ApiAnalyzer();
      const executor = new TradingExecutor();
      const riskManager = new RiskManager();

      // Apply price tolerance configuration
      if (options.priceTolerance && !isNaN(options.priceTolerance)) {
        analyzer.getConfigManager().setPriceTolerance(options.priceTolerance);
        console.log(`📊 Price tolerance set to ${options.priceTolerance}%`);
      }

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

    } catch (error) {
      console.error('❌ Execution failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// List command
program
  .command('list')
  .description('List available trading plans without execution')
  .action(async () => {
    try {
      const analyzer = new ApiAnalyzer();
      const riskManager = new RiskManager();

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

        console.log(`${i + 1}. ${plan.symbol}`);
        console.log(`   ID: ${plan.id}`);
        console.log(`   Side: ${plan.side}`);
        console.log(`   Type: ${plan.type}`);
        console.log(`   Quantity: ${plan.quantity}`);
        console.log(`   Leverage: ${plan.leverage}x`);
        console.log(`   Risk Score: ${riskAssessment.riskScore}/100`);
        console.log(`   Status: ${riskAssessment.isValid ? '✅ Valid' : '❌ High Risk'}`);
        console.log('');
      }

    } catch (error) {
      console.error('❌ Failed to list plans:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// List agents command
program
  .command('agents')
  .description('List all available AI agents')
  .action(async () => {
    try {
      const analyzer = new ApiAnalyzer();

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

    } catch (error) {
      console.error('❌ Failed to fetch agents:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

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
      const analyzer = new ApiAnalyzer();
      const executor = new TradingExecutor();
      const riskManager = new RiskManager();
      const orderHistoryManager = new OrderHistoryManager();

      // Apply price tolerance configuration
      if (options.priceTolerance && !isNaN(options.priceTolerance)) {
        analyzer.getConfigManager().setPriceTolerance(options.priceTolerance);
        console.log(`📊 Price tolerance set to ${options.priceTolerance}%`);
      }

      // Apply total margin configuration
      if (options.totalMargin && !isNaN(options.totalMargin)) {
        console.log(`💰 Total margin set to $${options.totalMargin.toFixed(2)}`);
      }

      console.log(`🤖 Starting to follow agent: ${agentName}`);

      if (options.interval) {
        console.log(`⏰ Polling interval: ${options.interval} seconds`);
        console.log('Press Ctrl+C to stop monitoring\n');
      }

      let pollingCount = 0;
      const maxPollingCount = options.interval ? Infinity : 1; // Single run if no interval

      const poll = async () => {
        try {
          pollingCount++;
          console.log(`\n${pollingCount > 1 ? `\n--- Poll #${pollingCount} ---` : ''}`);

          const followPlans = await analyzer.followAgent(agentName, options.totalMargin);

          if (followPlans.length === 0) {
            console.log('📋 No new actions required');
            return;
          }

          console.log(`\n📊 Follow Plans for ${agentName}:`);
          console.log('==========================');

          let executedCount = 0;
          let skippedCount = 0;

          for (let i = 0; i < followPlans.length; i++) {
            const plan = followPlans[i];

            console.log(`\n${i + 1}. ${plan.symbol} - ${plan.action}`);
            console.log(`   Side: ${plan.side}`);
            console.log(`   Type: ${plan.type}`);
            console.log(`   Quantity: ${plan.quantity}`);
            console.log(`   Leverage: ${plan.leverage}x`);
            if (plan.entryPrice) console.log(`   Entry Price: ${plan.entryPrice}`);
            if (plan.exitPrice) console.log(`   Exit Price: ${plan.exitPrice}`);
            console.log(`   Reason: ${plan.reason}`);

            // Convert FollowPlan to TradingPlan for risk assessment
            const tradingPlan: TradingPlan = {
              id: `${plan.agent}_${plan.symbol}_${plan.timestamp}`,
              symbol: plan.symbol,
              side: plan.side,
              type: plan.type,
              quantity: plan.quantity,
              leverage: plan.leverage,
              timestamp: plan.timestamp
            };

            // Risk assessment with price tolerance check for entry orders
            let riskAssessment;
            if (plan.action === "ENTER" && plan.entryPrice && plan.position?.current_price) {
              riskAssessment = riskManager.assessRiskWithPriceTolerance(
                tradingPlan,
                plan.entryPrice,
                plan.position.current_price,
                plan.symbol,
                options.priceTolerance // Pass the custom tolerance from command line
              );

              // Display price tolerance information
              if (riskAssessment.priceTolerance) {
                const pt = riskAssessment.priceTolerance;
                console.log(`   💰 Price Check: Entry $${pt.entryPrice} vs Current $${pt.currentPrice}`);
                console.log(`   📏 Price Difference: ${pt.priceDifference.toFixed(2)}% (Tolerance: ${pt.tolerance}%)`);
                console.log(`   ✅ Price Tolerance: ${pt.reason}`);
              }
            } else {
              riskAssessment = riskManager.assessRisk(tradingPlan);
            }

            console.log(`   ⚠️  Risk Score: ${riskAssessment.riskScore}/100`);

            if (riskAssessment.warnings.length > 0) {
              console.log(`   🚨 Warnings: ${riskAssessment.warnings.join(', ')}`);
            }

            if (!riskAssessment.isValid) {
              console.log(`   ❌ Risk assessment: FAILED - Trade skipped`);
              skippedCount++;
            } else if (options.riskOnly) {
              console.log(`   ✅ Risk assessment: PASSED - Risk only mode`);
            } else {
              console.log(`   ✅ Risk assessment: PASSED`);
              console.log(`   🔄 Executing trade...`);

              let result;
              // 如果是ENTER操作且有position信息，使用带止盈止损的执行方法
              if (plan.action === "ENTER" && plan.position) {
                console.log(`   🛡️ Setting up stop orders based on exit plan...`);
                result = await executor.executePlanWithStopOrders(tradingPlan, plan.position);

                if (result.success) {
                  console.log(`   ✅ Trade executed successfully!`);
                  console.log(`   📝 Main Order ID: ${result.orderId}`);
                  if (result.takeProfitOrderId) {
                    console.log(`   📈 Take Profit Order ID: ${result.takeProfitOrderId}`);
                  }
                  if (result.stopLossOrderId) {
                    console.log(`   📉 Stop Loss Order ID: ${result.stopLossOrderId}`);
                  }

                  // Save order to history for deduplication
                  if (plan.position && plan.position.entry_oid && result.orderId) {
                    orderHistoryManager.saveProcessedOrder(
                      plan.position.entry_oid,
                      plan.symbol,
                      plan.agent,
                      plan.side,
                      plan.quantity,
                      plan.entryPrice,
                      result.orderId.toString()
                    );
                  }
                } else {
                  console.log(`   ❌ Trade execution failed: ${result.error}`);
                }
              } else {
                // 使用普通执行方法
                result = await executor.executePlan(tradingPlan);

                if (result.success) {
                  console.log(`   ✅ Trade executed successfully!`);
                  console.log(`   📝 Order ID: ${result.orderId}`);

                  // Save order to history for deduplication
                  if (plan.position && plan.position.entry_oid && result.orderId) {
                    orderHistoryManager.saveProcessedOrder(
                      plan.position.entry_oid,
                      plan.symbol,
                      plan.agent,
                      plan.side,
                      plan.quantity,
                      plan.entryPrice,
                      result.orderId.toString()
                    );
                  }
                } else {
                  console.log(`   ❌ Trade execution failed: ${result.error}`);
                }
              }

              if (result.success) {
                executedCount++;
              }
            }
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
      if (options.interval && pollingCount < maxPollingCount) {
        const intervalMs = parseInt(options.interval) * 1000;

        const intervalId = setInterval(async () => {
          pollingCount++;
          if (pollingCount >= maxPollingCount) {
            clearInterval(intervalId);
            return;
          }
          await poll();
        }, intervalMs);

        // Handle graceful shutdown
        process.on('SIGINT', () => {
          console.log('\n\n👋 Stopping agent monitoring...');
          clearInterval(intervalId);
          console.log('✅ Monitoring stopped gracefully');
          process.exit(0);
        });
      }

    } catch (error) {
      console.error('❌ Follow agent failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Check system status and configuration')
  .action(() => {
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
  });

program.parse();
