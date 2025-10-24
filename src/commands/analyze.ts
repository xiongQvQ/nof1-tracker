import { CommandOptions } from '../types/command';
import {
  initializeServices,
  applyConfiguration,
  printPlanInfo,
  printRiskAssessment
} from '../utils/command-helpers';

/**
 * Analyze 命令处理器
 */
export async function handleAnalyzeCommand(options: CommandOptions): Promise<void> {
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
