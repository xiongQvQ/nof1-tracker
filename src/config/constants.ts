/**
 * 应用配置常量
 * 用于集中管理所有硬编码的配置值
 */

export const API_CONFIG = {
  // API 配置
  BASE_URL: process.env.NOF1_API_BASE_URL || 'https://nof1.ai/api',
  ENDPOINTS: {
    ACCOUNT_TOTALS: '/account-totals'
  },
  TIMEOUT: 30000, // 30秒超时
} as const;

export const TIME_CONFIG = {
  // 时间相关配置
  INITIAL_MARKER_TIME: new Date('2025-10-17T22:30:00.000Z'),
  HOUR_IN_MS: 1000 * 60 * 60,
  VERIFICATION_DELAY: 2000, // 2秒验证延迟
  BETWEEN_OPERATIONS_DELAY: 1000, // 1秒操作间延迟
} as const;

export const LOGGING_CONFIG = {
  // 日志配置
  EMOJIS: {
    API: '📡',
    DATA: '📊',
    SUCCESS: '✅',
    ERROR: '❌',
    WARNING: '⚠️',
    INFO: '💡',
    ROBOT: '🤖',
    TARGET: '🎯',
    TREND_UP: '📈',
    TREND_DOWN: '📉',
    CLOSING: '🔄',
    SEARCH: '🔍',
    MONEY: '💰',
    CHART: '📊',
    TIMER: '⏰',
  } as const,
} as const;

export const TRADING_CONFIG = {
  // 交易相关配置
  DEFAULT_LEVERAGE: 1,
  MIN_POSITION_SIZE: 0.001,
} as const;

export const CACHE_CONFIG = {
  // 缓存配置
  CACHE_TTL: 60000, // 1分钟缓存
  MAX_CACHE_SIZE: 100, // 最大缓存条目数
} as const;

export const ENV_VARS = {
  // 环境变量名称
  BINANCE_API_KEY: 'BINANCE_API_KEY',
  BINANCE_API_SECRET: 'BINANCE_API_SECRET',
  NOF1_API_BASE_URL: 'NOF1_API_BASE_URL',
} as const;

// 计算当前 marker 的辅助函数
export function getCurrentLastHourlyMarker(): number {
  const now = new Date();
  const hoursSinceInitial = Math.floor(
    (now.getTime() - TIME_CONFIG.INITIAL_MARKER_TIME.getTime()) / TIME_CONFIG.HOUR_IN_MS
  );
  return hoursSinceInitial;
}

// 构建 API URL 的辅助函数
export function buildAccountTotalsUrl(marker?: number): string {
  const currentMarker = marker !== undefined ? marker : getCurrentLastHourlyMarker();
  return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ACCOUNT_TOTALS}?lastHourlyMarker=${currentMarker}`;
}