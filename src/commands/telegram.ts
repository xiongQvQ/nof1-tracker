import { CommandOptions } from '../types/command';
import { ConfigManager } from '../services/config-manager';
import { TelegramService } from '../services/telegram-service';

export async function handleTelegramCommand(options: CommandOptions): Promise<void> {
  console.log('🚀 Attempting to send a test Telegram message...');

  const configManager = new ConfigManager();
  configManager.loadFromEnvironment();

  const telegramConfig = configManager.getConfig().telegram;

  if (!telegramConfig.enabled) {
    console.log('❌ Telegram notifications are not enabled in your configuration. Set TELEGRAM_ENABLED=true in your .env file.');
    return;
  }

  if (!telegramConfig.token) {
    console.log('❌ Telegram API Token is not set. Please set TELEGRAM_API_TOKEN in your .env file.');
    return;
  }

  if (!telegramConfig.chatId) {
    console.log('❌ Telegram Chat ID is not set. Please set TELEGRAM_CHAT_ID in your .env file.');
    return;
  }

  try {
    const telegramService = new TelegramService(telegramConfig.token);
    const testMessage = '🤖 Nof1 Tracker: This is a test message from your bot!';
    await telegramService.sendMessage(telegramConfig.chatId, testMessage);
    console.log('✅ Test Telegram message sent successfully!');
  } catch (error) {
    console.error('❌ Failed to send test Telegram message:', error instanceof Error ? error.message : error);
  }
}
