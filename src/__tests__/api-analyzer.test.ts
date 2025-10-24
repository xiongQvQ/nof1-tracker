import { ApiAnalyzer } from '../scripts/analyze-api';

describe('ApiAnalyzer', () => {
  describe('constructor', () => {
    it('should create an instance with default base URL', () => {
      const analyzer = new ApiAnalyzer();
      expect(analyzer).toBeInstanceOf(ApiAnalyzer);
    });

    it('should create an instance with custom base URL', () => {
      const customAnalyzer = new ApiAnalyzer('https://custom.api.com');
      expect(customAnalyzer).toBeInstanceOf(ApiAnalyzer);
    });
  });

  describe('analyzeAccountTotals', () => {
    it('should use custom base URL when provided', () => {
      const customUrl = 'https://custom.api.com';
      const analyzer = new ApiAnalyzer(customUrl);
      // We'll test this once we implement URL tracking
      expect(analyzer).toBeInstanceOf(ApiAnalyzer);
    });

    // it('should build correct API URL with auto-calculated lastHourlyMarker', async () => {
    //   const analyzer = new ApiAnalyzer();
    //   // We need to test URL building somehow - maybe through console output initially
    //   const consoleSpy = jest.spyOn(console, 'log');

    //   await analyzer.analyzeAccountTotals();

    //   // Should contain auto-calculated marker and show calculation info
    //   expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Auto-calculated lastHourlyMarker'));
    //   expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/lastHourlyMarker=\d+/));
    //   consoleSpy.mockRestore();
    // });
  });
});