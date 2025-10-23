export interface TradingPlan {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT" | "STOP";
  quantity: number;
  leverage: number;
  timestamp: number;
}
