import { initializeServices, printPlanInfo } from '../utils/command-helpers';

/**
 * List 命令处理器
 */
export async function handleListCommand(): Promise<void> {
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
