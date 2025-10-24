import { initializeServices } from '../utils/command-helpers';

/**
 * Agents 命令处理器
 */
export async function handleAgentsCommand(): Promise<void> {
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
