import { ConfigManager } from '../services/config-manager';

describe('ConfigManager', () => {
  it('should create ConfigManager instance', () => {
    const configManager = new ConfigManager();
    expect(configManager).toBeInstanceOf(ConfigManager);
  });

  it('should use default price tolerance when no config provided', () => {
    const configManager = new ConfigManager();
    expect(configManager.getPriceTolerance()).toBe(1.0);
  });

  it('should set and get price tolerance', () => {
    const configManager = new ConfigManager();
    configManager.setPriceTolerance(1.0);
    expect(configManager.getPriceTolerance()).toBe(1.0);
  });

  it('should validate price tolerance values', () => {
    const configManager = new ConfigManager();

    // Valid values
    expect(() => configManager.setPriceTolerance(0.1)).not.toThrow();
    expect(() => configManager.setPriceTolerance(5.0)).not.toThrow();

    // Invalid values
    expect(() => configManager.setPriceTolerance(-0.1)).toThrow('Price tolerance must be positive');
    expect(() => configManager.setPriceTolerance(0)).toThrow('Price tolerance must be positive');
  });

  it('should handle symbol-specific tolerance', () => {
    const configManager = new ConfigManager();

    // Set symbol-specific tolerance
    configManager.setSymbolTolerance('BTCUSDT', 1.0);
    configManager.setSymbolTolerance('ETHUSDT', 0.3);

    expect(configManager.getPriceTolerance('BTCUSDT')).toBe(1.0);
    expect(configManager.getPriceTolerance('ETHUSDT')).toBe(0.3);
    expect(configManager.getPriceTolerance('ADAUSDT')).toBe(1.0); // Default
  });

  it('should load config from environment variables', () => {
    // Mock environment variables
    process.env.PRICE_TOLERANCE = '0.8';
    process.env.BTCUSDT_TOLERANCE = '1.2';

    const configManager = new ConfigManager();
    configManager.loadFromEnvironment();

    expect(configManager.getPriceTolerance()).toBe(0.8);
    expect(configManager.getPriceTolerance('BTCUSDT')).toBe(1.2);

    // Clean up
    delete process.env.PRICE_TOLERANCE;
    delete process.env.BTCUSDT_TOLERANCE;
  });

  it('should export and import configuration', () => {
    const configManager1 = new ConfigManager();
    configManager1.setPriceTolerance(0.7);
    configManager1.setSymbolTolerance('BTCUSDT', 1.0);

    const config = configManager1.exportConfig();

    const configManager2 = new ConfigManager();
    configManager2.importConfig(config);

    expect(configManager2.getPriceTolerance()).toBe(0.7);
    expect(configManager2.getPriceTolerance('BTCUSDT')).toBe(1.0);
  });
});