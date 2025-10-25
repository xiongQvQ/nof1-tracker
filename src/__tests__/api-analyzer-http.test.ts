import { ApiAnalyzer } from "../scripts/analyze-api";
import { ApiClient } from '../services/api-client';

// Mock ApiClient to avoid real network calls
jest.mock('../services/api-client');
const MockedApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;

describe("ApiAnalyzer HTTP Requests", () => {
  let mockApiClient: jest.Mocked<ApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiClient = new MockedApiClient() as jest.Mocked<ApiClient>;
  });

  it("should make HTTP request to nof1 API", async () => {
    // Mock successful API response with correct structure
    const mockResponse = {
      accountTotals: [
        {
          id: "test-model-1",
          model_id: "gpt-5",
          since_inception_hourly_marker: 134,
          positions: {
            "BTC": {
              symbol: "BTC",
              entry_price: 109538,
              quantity: 0.05,
              leverage: 10,
              current_price: 109089.5,
              unrealized_pnl: -22.65,
              confidence: 0.62,
              exit_plan: {
                profit_target: 112880.2,
                stop_loss: 108089.81,
                invalidation_condition: "Test condition"
              }
            }
          }
        }
      ]
    };
    mockApiClient.getAccountTotals.mockResolvedValue(mockResponse as any);

    const analyzer = new ApiAnalyzer(undefined, mockApiClient);
    const result = await analyzer.analyzeAccountTotals();

    expect(mockApiClient.getAccountTotals).toHaveBeenCalled();
    expect(Array.isArray(result)).toBe(true);
    
    analyzer.destroy();
  });

  it("should parse API response into TradingPlan objects", async () => {
    // Mock successful API response with realistic structure
    const mockResponse = {
      accountTotals: [
        {
          id: "test-model-1",
          model_id: "gpt-5",
          since_inception_hourly_marker: 134,
          positions: {
            "BTC": {
              symbol: "BTC",
              entry_price: 109538,
              quantity: 0.05,
              leverage: 10,
              current_price: 109089.5,
              unrealized_pnl: -22.65,
              confidence: 0.62,
              exit_plan: {
                profit_target: 112880.2,
                stop_loss: 108089.81,
                invalidation_condition: "Test condition"
              }
            },
            "ETH": {
              symbol: "ETH",
              entry_price: 3891.1,
              quantity: -1.4,
              leverage: 20,
              current_price: 3845.25,
              unrealized_pnl: -64.26,
              confidence: 0.62,
              exit_plan: {
                profit_target: 4021.33,
                stop_loss: 3834.52,
                invalidation_condition: "Test condition"
              }
            }
          }
        }
      ]
    };
    mockApiClient.getAccountTotals.mockResolvedValue(mockResponse as any);

    const analyzer = new ApiAnalyzer(undefined, mockApiClient);
    const result = await analyzer.analyzeAccountTotals();

    expect(mockApiClient.getAccountTotals).toHaveBeenCalled();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);

    // Validate first trading plan (BTC BUY)
    expect(result[0]).toMatchObject({
      id: "gpt-5_BTC_134",
      symbol: "BTC",
      side: "BUY",
      type: "MARKET",
      quantity: 0.05,
      leverage: 10
    });
    expect(result[0].timestamp).toBeGreaterThan(0);

    // Validate second trading plan (ETH SELL)
    expect(result[1]).toMatchObject({
      id: "gpt-5_ETH_134",
      symbol: "ETH",
      side: "SELL",
      type: "MARKET",
      quantity: 1.4,
      leverage: 20
    });
    expect(result[1].timestamp).toBeGreaterThan(0);
    
    analyzer.destroy();
  });
});
