import { TelegramService, TradeNotificationData } from '../../services/telegram-service';
import TelegramBot from 'node-telegram-bot-api';

// Mock node-telegram-bot-api
jest.mock('node-telegram-bot-api');

describe('TelegramService', () => {
  let telegramService: TelegramService;
  let mockBot: jest.Mocked<TelegramBot>;
  const mockToken = 'test-token-123';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create a mock bot instance
    mockBot = {
      sendMessage: jest.fn().mockResolvedValue({ message_id: 1 }),
    } as any;

    // Mock the TelegramBot constructor
    (TelegramBot as jest.MockedClass<typeof TelegramBot>).mockImplementation(() => mockBot);

    // Create the service instance
    telegramService = new TelegramService(mockToken);
  });

  describe('Constructor', () => {
    it('should create TelegramService instance with token', () => {
      expect(telegramService).toBeInstanceOf(TelegramService);
      expect(TelegramBot).toHaveBeenCalledWith(mockToken, { polling: false });
    });

    it('should initialize TelegramBot with correct options', () => {
      new TelegramService('another-token');
      expect(TelegramBot).toHaveBeenCalledWith('another-token', { polling: false });
    });
  });

  describe('sendMessage', () => {
    const chatId = '123456789';
    const testMessage = 'Test message';

    it('should send message successfully', async () => {
      await telegramService.sendMessage(chatId, testMessage);

      expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId, testMessage, { parse_mode: 'HTML' });
    });

    it('should throw error when message sending fails', async () => {
      const error = new Error('Network error');
      mockBot.sendMessage.mockRejectedValueOnce(error);

      await expect(telegramService.sendMessage(chatId, testMessage)).rejects.toThrow('Network error');
      expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId, testMessage, { parse_mode: 'HTML' });
    });

    it('should handle different chat IDs', async () => {
      const chatId1 = '111111111';
      const chatId2 = '222222222';

      await telegramService.sendMessage(chatId1, testMessage);
      await telegramService.sendMessage(chatId2, testMessage);

      expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId1, testMessage, { parse_mode: 'HTML' });
      expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId2, testMessage, { parse_mode: 'HTML' });
      expect(mockBot.sendMessage).toHaveBeenCalledTimes(2);
    });

    it('should send different message types', async () => {
      const message1 = 'First message';
      const message2 = 'Second message';

      await telegramService.sendMessage(chatId, message1);
      await telegramService.sendMessage(chatId, message2);

      expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId, message1, { parse_mode: 'HTML' });
      expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId, message2, { parse_mode: 'HTML' });
    });
  });

  describe('formatTradeMessage', () => {
    it('should format BUY trade message correctly', () => {
      const data: TradeNotificationData = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: '1.5',
        price: '50000.00',
        orderId: '123456',
        status: 'FILLED',
        leverage: 10,
        marginType: 'ISOLATED'
      };

      const message = telegramService.formatTradeMessage(data);

      expect(message).toContain('✅');
      expect(message).toContain('<b>Trade Executed</b>');
      expect(message).toContain('📈');
      expect(message).toContain('<b>LONG</b>');
      expect(message).toContain('BTCUSDT');
      expect(message).toContain('💰');
      expect(message).toContain('<b>Quantity:</b> 1.5');
      expect(message).toContain('💵');
      expect(message).toContain('<b>Price:</b> 50000.00');
      expect(message).toContain('🆔');
      expect(message).toContain('<b>Order ID:</b> 123456');
      expect(message).toContain('📊');
      expect(message).toContain('<b>Status:</b> FILLED');
      expect(message).toContain('⚡');
      expect(message).toContain('<b>Leverage:</b> 10x');
      expect(message).toContain('🔒 Isolated');
    });

    it('should format SELL trade message correctly', () => {
      const data: TradeNotificationData = {
        symbol: 'ETHUSDT',
        side: 'SELL',
        quantity: '2.0',
        price: '3000.00',
        orderId: '789012',
        status: 'FILLED'
      };

      const message = telegramService.formatTradeMessage(data);

      expect(message).toContain('✅');
      expect(message).toContain('<b>Trade Executed</b>');
      expect(message).toContain('📉');
      expect(message).toContain('<b>SHORT</b>');
      expect(message).toContain('ETHUSDT');
      expect(message).toContain('💰');
      expect(message).toContain('<b>Quantity:</b> 2.0');
      expect(message).toContain('💵');
      expect(message).toContain('<b>Price:</b> 3000.00');
      expect(message).toContain('🆔');
      expect(message).toContain('<b>Order ID:</b> 789012');
      expect(message).toContain('📊');
      expect(message).toContain('<b>Status:</b> FILLED');
    });

    it('should include leverage when provided', () => {
      const data: TradeNotificationData = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: '1.0',
        price: '50000.00',
        orderId: '123',
        status: 'FILLED',
        leverage: 25
      };

      const message = telegramService.formatTradeMessage(data);

      expect(message).toContain('⚡');
      expect(message).toContain('<b>Leverage:</b> 25x');
    });

    it('should not include leverage when not provided', () => {
      const data: TradeNotificationData = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: '1.0',
        price: '50000.00',
        orderId: '123',
        status: 'FILLED'
      };

      const message = telegramService.formatTradeMessage(data);

      expect(message).not.toContain('⚡');
      expect(message).not.toContain('Leverage');
    });

    it('should include isolated margin type', () => {
      const data: TradeNotificationData = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: '1.0',
        price: '50000.00',
        orderId: '123',
        status: 'FILLED',
        marginType: 'ISOLATED'
      };

      const message = telegramService.formatTradeMessage(data);

      expect(message).toContain('🔒 Isolated');
    });

    it('should include cross margin type', () => {
      const data: TradeNotificationData = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: '1.0',
        price: '50000.00',
        orderId: '123',
        status: 'FILLED',
        marginType: 'CROSSED'
      };

      const message = telegramService.formatTradeMessage(data);

      expect(message).toContain('🔄 Cross');
    });

    it('should not include margin type when not provided', () => {
      const data: TradeNotificationData = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: '1.0',
        price: '50000.00',
        orderId: '123',
        status: 'FILLED'
      };

      const message = telegramService.formatTradeMessage(data);

      expect(message).not.toContain('🔒');
      expect(message).not.toContain('🔄');
    });

    it('should handle all fields with different values', () => {
      const data: TradeNotificationData = {
        symbol: 'ADAUSDT',
        side: 'SELL',
        quantity: '1000',
        price: '0.50',
        orderId: '999888',
        status: 'PARTIALLY_FILLED',
        leverage: 5,
        marginType: 'CROSSED'
      };

      const message = telegramService.formatTradeMessage(data);

      expect(message).toContain('ADAUSDT');
      expect(message).toContain('<b>SHORT</b>');
      expect(message).toContain('<b>Quantity:</b> 1000');
      expect(message).toContain('<b>Price:</b> 0.50');
      expect(message).toContain('<b>Order ID:</b> 999888');
      expect(message).toContain('<b>Status:</b> PARTIALLY_FILLED');
      expect(message).toContain('<b>Leverage:</b> 5x');
      expect(message).toContain('🔄 Cross');
    });
  });

  describe('formatStopOrderMessage', () => {
    it('should format take profit order message correctly', () => {
      const message = telegramService.formatStopOrderMessage(
        'take_profit',
        'BTCUSDT',
        '55000.00',
        'tp123'
      );

      expect(message).toContain('🎯');
      expect(message).toContain('<b>Take Profit Order Set</b>');
      expect(message).toContain('📊');
      expect(message).toContain('<b>Symbol:</b> BTCUSDT');
      expect(message).toContain('💵');
      expect(message).toContain('<b>Price:</b> 55000.00');
      expect(message).toContain('🆔');
      expect(message).toContain('<b>Order ID:</b> tp123');
    });

    it('should format stop loss order message correctly', () => {
      const message = telegramService.formatStopOrderMessage(
        'stop_loss',
        'ETHUSDT',
        '2800.00',
        'sl456'
      );

      expect(message).toContain('🛡️');
      expect(message).toContain('<b>Stop Loss Order Set</b>');
      expect(message).toContain('📊');
      expect(message).toContain('<b>Symbol:</b> ETHUSDT');
      expect(message).toContain('💵');
      expect(message).toContain('<b>Price:</b> 2800.00');
      expect(message).toContain('🆔');
      expect(message).toContain('<b>Order ID:</b> sl456');
    });

    it('should handle different symbols and prices', () => {
      const message = telegramService.formatStopOrderMessage(
        'take_profit',
        'ADAUSDT',
        '0.75',
        'tp789'
      );

      expect(message).toContain('ADAUSDT');
      expect(message).toContain('<b>Price:</b> 0.75');
      expect(message).toContain('<b>Order ID:</b> tp789');
    });
  });

  describe('Integration: sendMessage with formatTradeMessage', () => {
    it('should send a formatted trade message', async () => {
      const chatId = '123456789';
      const data: TradeNotificationData = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: '1.0',
        price: '50000.00',
        orderId: '123',
        status: 'FILLED',
        leverage: 10,
        marginType: 'ISOLATED'
      };

      const formattedMessage = telegramService.formatTradeMessage(data);
      await telegramService.sendMessage(chatId, formattedMessage);

      expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId, formattedMessage, { parse_mode: 'HTML' });
      expect(formattedMessage).toContain('Trade Executed');
      expect(formattedMessage).toContain('BTCUSDT');
    });
  });

  describe('Error handling in console', () => {
    let consoleErrorSpy: jest.SpyInstance;
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should log error when sending message fails', async () => {
      const error = new Error('Connection failed');
      mockBot.sendMessage.mockRejectedValueOnce(error);

      await expect(telegramService.sendMessage('123', 'test')).rejects.toThrow('Connection failed');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error sending message to Telegram:', error);
    });

    it('should log when sending message starts', async () => {
      await telegramService.sendMessage('123', 'test');

      expect(consoleLogSpy).toHaveBeenCalledWith('Sending message to Telegram...');
    });
  });
});

