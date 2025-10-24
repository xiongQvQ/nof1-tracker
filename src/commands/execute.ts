import { CommandOptions } from '../types/command';
import { initializeServices, applyConfiguration } from '../utils/command-helpers';

/**
 * Execute 命令处理器
 */
export async function handleExecuteCommand(planId: string, options: CommandOptions): Promise<void> {
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
