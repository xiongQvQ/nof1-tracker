
import TelegramBot from 'node-telegram-bot-api';

export interface TradeNotificationData {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: string;
  price: string;
  orderId: string;
  status: string;
  leverage?: number;
  marginType?: string;
}

export class TelegramService {
  private bot: TelegramBot;

  constructor(token: string) {
    this.bot = new TelegramBot(token, { polling: false });
  }

  async sendMessage(chatId: string, message: string): Promise<void> {
    try {
      console.log('Sending message to Telegram...');
      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Error sending message to Telegram:', error);
      throw error;
    }
  }

  /**
   * Format trade execution message with rich formatting
   */
  formatTradeMessage(data: TradeNotificationData): string {
    const { symbol, side, quantity, price, orderId, status, leverage, marginType } = data;
    
    // Determine emoji based on side
    const sideEmoji = side === 'BUY' ? '📈' : '📉';
    const sideText = side === 'BUY' ? 'LONG' : 'SHORT';
    
    // Build message with rich formatting
    let message = `✅ <b>Trade Executed</b>\n\n`;
    message += `${sideEmoji} <b>${sideText}</b> ${symbol}\n`;
    message += `💰 <b>Quantity:</b> ${quantity}\n`;
    message += `💵 <b>Price:</b> ${price}\n`;
    message += `🆔 <b>Order ID:</b> ${orderId}\n`;
    message += `📊 <b>Status:</b> ${status}\n`;
    
    if (leverage) {
      message += `⚡ <b>Leverage:</b> ${leverage}x\n`;
    }
    
    if (marginType) {
      const marginTypeText = marginType === 'ISOLATED' ? '🔒 Isolated' : '🔄 Cross';
      message += `${marginTypeText}\n`;
    }
    
    return message;
  }

  /**
   * Format stop order notification message
   */
  formatStopOrderMessage(type: 'take_profit' | 'stop_loss', symbol: string, price: string, orderId: string): string {
    const emoji = type === 'take_profit' ? '🎯' : '🛡️';
    const label = type === 'take_profit' ? 'Take Profit' : 'Stop Loss';
    
    let message = `${emoji} <b>${label} Order Set</b>\n\n`;
    message += `📊 <b>Symbol:</b> ${symbol}\n`;
    message += `💵 <b>Price:</b> ${price}\n`;
    message += `🆔 <b>Order ID:</b> ${orderId}\n`;
    
    return message;
  }
}
