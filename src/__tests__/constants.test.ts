import {
  API_CONFIG,
  TIME_CONFIG,
  LOGGING_CONFIG,
  ENV_VARS,
  TRADING_CONFIG,
  CACHE_CONFIG,
  getCurrentLastHourlyMarker,
  buildAccountTotalsUrl
} from '../config/constants';

// Mock process.env
const originalEnv = process.env;

describe('Constants Configuration', () => {
  beforeEach(() => {
    // Reset process.env before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('API_CONFIG', () => {
    it('should have correct default values', () => {
      expect(API_CONFIG.BASE_URL).toBe('https://nof1.ai/api');
      expect(API_CONFIG.TIMEOUT).toBe(30000);
    });

    it('should have ENDPOINTS object', () => {
      expect(API_CONFIG.ENDPOINTS).toBeDefined();
      expect(API_CONFIG.ENDPOINTS.ACCOUNT_TOTALS).toBe('/account-totals');
    });

    it('should have timeout as number', () => {
      expect(typeof API_CONFIG.TIMEOUT).toBe('number');
      expect(API_CONFIG.TIMEOUT).toBeGreaterThan(0);
    });
  });

  describe('TIME_CONFIG', () => {
    it('should have correct time intervals', () => {
      expect(TIME_CONFIG.HOUR_IN_MS).toBe(1000 * 60 * 60);
      expect(TIME_CONFIG.VERIFICATION_DELAY).toBe(2000);
      expect(TIME_CONFIG.BETWEEN_OPERATIONS_DELAY).toBe(1000);
    });

    it('should have initial marker time', () => {
      expect(TIME_CONFIG.INITIAL_MARKER_TIME).toBeInstanceOf(Date);
      expect(TIME_CONFIG.INITIAL_MARKER_TIME.getTime()).toBe(new Date('2025-10-17T22:30:00.000Z').getTime());
    });

    it('should have delays as numbers', () => {
      expect(typeof TIME_CONFIG.VERIFICATION_DELAY).toBe('number');
      expect(typeof TIME_CONFIG.BETWEEN_OPERATIONS_DELAY).toBe('number');
      expect(typeof TIME_CONFIG.HOUR_IN_MS).toBe('number');
      expect(TIME_CONFIG.VERIFICATION_DELAY).toBeGreaterThan(0);
      expect(TIME_CONFIG.BETWEEN_OPERATIONS_DELAY).toBeGreaterThan(0);
      expect(TIME_CONFIG.HOUR_IN_MS).toBeGreaterThan(0);
    });
  });

  describe('LOGGING_CONFIG', () => {
    it('should have all required emoji properties', () => {
      expect(LOGGING_CONFIG.EMOJIS).toBeDefined();
      expect(LOGGING_CONFIG.EMOJIS.SUCCESS).toBe('✅');
      expect(LOGGING_CONFIG.EMOJIS.ERROR).toBe('❌');
      expect(LOGGING_CONFIG.EMOJIS.WARNING).toBe('⚠️');
      expect(LOGGING_CONFIG.EMOJIS.INFO).toBe('💡');
      expect(LOGGING_CONFIG.EMOJIS.DATA).toBe('📊');
      expect(LOGGING_CONFIG.EMOJIS.API).toBe('📡');
      expect(LOGGING_CONFIG.EMOJIS.ROBOT).toBe('🤖');
      expect(LOGGING_CONFIG.EMOJIS.TARGET).toBe('🎯');
      expect(LOGGING_CONFIG.EMOJIS.TREND_UP).toBe('📈');
      expect(LOGGING_CONFIG.EMOJIS.TREND_DOWN).toBe('📉');
      expect(LOGGING_CONFIG.EMOJIS.CLOSING).toBe('🔄');
      expect(LOGGING_CONFIG.EMOJIS.SEARCH).toBe('🔍');
      expect(LOGGING_CONFIG.EMOJIS.MONEY).toBe('💰');
      expect(LOGGING_CONFIG.EMOJIS.CHART).toBe('📊');
      expect(LOGGING_CONFIG.EMOJIS.TIMER).toBe('⏰');
    });
  });

  describe('ENV_VARS', () => {
    it('should have all required environment variable names', () => {
      expect(ENV_VARS.BINANCE_API_KEY).toBe('BINANCE_API_KEY');
      expect(ENV_VARS.BINANCE_API_SECRET).toBe('BINANCE_API_SECRET');
      expect(ENV_VARS.NOF1_API_BASE_URL).toBe('NOF1_API_BASE_URL');
    });
  });

  describe('getCurrentLastHourlyMarker', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      // Set a default time for tests
      jest.setSystemTime(new Date('2025-10-18T00:30:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return hours since initial marker time', () => {
      const initialTime = new Date('2025-10-17T22:30:00.000Z').getTime();
      const testTime = new Date('2025-10-18T00:30:00.000Z').getTime(); // 2 hours later
      jest.setSystemTime(testTime);

      const marker = getCurrentLastHourlyMarker();

      expect(marker).toBe(2); // 2 hours since initial time
    });

    it('should return different values at different times', () => {
      const time1 = new Date('2025-10-18T00:30:00.000Z').getTime(); // 2 hours after initial
      const time2 = new Date('2025-10-18T02:30:00.000Z').getTime(); // 4 hours after initial

      jest.setSystemTime(time1);
      const marker1 = getCurrentLastHourlyMarker();

      jest.setSystemTime(time2);
      const marker2 = getCurrentLastHourlyMarker();

      expect(marker1).toBe(2);
      expect(marker2).toBe(4);
      expect(marker2).toBeGreaterThan(marker1);
    });

    it('should handle edge cases', () => {
      // Test with initial marker time
      const initialTime = new Date('2025-10-17T22:30:00.000Z').getTime();
      jest.setSystemTime(initialTime);
      const initialMarker = getCurrentLastHourlyMarker();
      expect(initialMarker).toBe(0);

      // Test with time before initial marker
      const beforeInitial = new Date('2025-10-17T21:30:00.000Z').getTime(); // 1 hour before
      jest.setSystemTime(beforeInitial);
      const beforeMarker = getCurrentLastHourlyMarker();
      expect(beforeMarker).toBe(-1); // Should handle negative hours
    });
  });

  describe('buildAccountTotalsUrl', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      // Set a default time for tests
      jest.setSystemTime(new Date('2025-10-18T00:30:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should build URL with marker parameter', () => {
      const marker = 1705123456;
      const url = buildAccountTotalsUrl(marker);

      expect(url).toBe('https://nof1.ai/api/account-totals?lastHourlyMarker=1705123456');
    });

    it('should build URL without marker parameter', () => {
      // Fake timers are already enabled by beforeEach
      const fixedTime = new Date('2025-10-18T00:30:00.000Z').getTime();
      jest.setSystemTime(fixedTime);

      const url = buildAccountTotalsUrl();

      expect(url).toBe('https://nof1.ai/api/account-totals?lastHourlyMarker=2');
    });

    it('should handle zero marker', () => {
      const url = buildAccountTotalsUrl(0);

      expect(url).toBe('https://nof1.ai/api/account-totals?lastHourlyMarker=0');
    });

    it('should handle negative marker', () => {
      const url = buildAccountTotalsUrl(-1);

      expect(url).toBe('https://nof1.ai/api/account-totals?lastHourlyMarker=-1');
    });

    it('should handle very large marker', () => {
      const largeMarker = 9999999999;
      const url = buildAccountTotalsUrl(largeMarker);

      expect(url).toBe('https://nof1.ai/api/account-totals?lastHourlyMarker=9999999999');
    });
  });

  describe('TRADING_CONFIG', () => {
    it('should have trading configuration values', () => {
      expect(TRADING_CONFIG.DEFAULT_LEVERAGE).toBe(1);
      expect(TRADING_CONFIG.MIN_POSITION_SIZE).toBe(0.001);
    });

    it('should have numeric values', () => {
      expect(typeof TRADING_CONFIG.DEFAULT_LEVERAGE).toBe('number');
      expect(typeof TRADING_CONFIG.MIN_POSITION_SIZE).toBe('number');
      expect(TRADING_CONFIG.DEFAULT_LEVERAGE).toBeGreaterThan(0);
      expect(TRADING_CONFIG.MIN_POSITION_SIZE).toBeGreaterThan(0);
    });
  });

  describe('CACHE_CONFIG', () => {
    it('should have cache configuration values', () => {
      expect(CACHE_CONFIG.CACHE_TTL).toBe(60000);
      expect(CACHE_CONFIG.MAX_CACHE_SIZE).toBe(100);
    });

    it('should have numeric values', () => {
      expect(typeof CACHE_CONFIG.CACHE_TTL).toBe('number');
      expect(typeof CACHE_CONFIG.MAX_CACHE_SIZE).toBe('number');
      expect(CACHE_CONFIG.CACHE_TTL).toBeGreaterThan(0);
      expect(CACHE_CONFIG.MAX_CACHE_SIZE).toBeGreaterThan(0);
    });
  });

  describe('Configuration Integration', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      // Set a default time for tests
      jest.setSystemTime(new Date('2025-10-18T00:30:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should work together in realistic scenario', () => {
      // Set up environment
      process.env.BINANCE_API_KEY = 'test-key';
      process.env.BINANCE_API_SECRET = 'test-secret';
      process.env.NOF1_API_BASE_URL = 'https://test.api.com';

      // Get current marker - fake timers are already enabled by beforeEach
      const testTime = new Date('2025-10-18T00:30:00.000Z').getTime();
      jest.setSystemTime(testTime);
      const marker = getCurrentLastHourlyMarker();

      // Build URL
      const url = buildAccountTotalsUrl(marker);

      expect(marker).toBe(2); // 2 hours since initial time
      expect(url).toContain('lastHourlyMarker=2');
      expect(url).toContain(API_CONFIG.BASE_URL);
    });
  });
});