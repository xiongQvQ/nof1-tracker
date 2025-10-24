import { handleStatusCommand } from '../../commands/status';

describe('Status Command', () => {
  let consoleLogSpy: jest.SpyInstance;
  const originalEnv = process.env;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    process.env = originalEnv;
  });

  it('should be defined', () => {
    expect(handleStatusCommand).toBeDefined();
    expect(typeof handleStatusCommand).toBe('function');
  });

  it('should display system status', () => {
    process.env.BINANCE_API_KEY = 'test-key';
    process.env.BINANCE_API_SECRET = 'test-secret';
    process.env.BINANCE_TESTNET = 'true';

    handleStatusCommand();

    expect(consoleLogSpy).toHaveBeenCalledWith('🔍 Nof1 Trading CLI Status');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Environment Variables'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Set'));
  });

  it('should show missing environment variables', () => {
    delete process.env.BINANCE_API_KEY;
    delete process.env.BINANCE_API_SECRET;

    handleStatusCommand();

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('❌ Missing'));
  });

  it('should display API connectivity status', () => {
    handleStatusCommand();

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('API Connectivity'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('nof1 API'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Binance API'));
  });
});
