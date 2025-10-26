export interface TradingPlan {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT" | "STOP";
  quantity: number;
  leverage: number;
  timestamp: number;
  marginType?: 'ISOLATED' | 'CROSSED'; // 保证金模式: ISOLATED(逐仓) 或 CROSSED(全仓), 默认全仓
}
