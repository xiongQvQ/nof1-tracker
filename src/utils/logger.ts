/**
 * 日志工具
 * 提供基于日志级别的条件日志输出
 */

import { LOGGING_CONFIG, LogLevel } from '../config/constants';

/**
 * 根据日志级别输出日志
 */
export function log(level: LogLevel, message: string): void {
  if (level <= LOGGING_CONFIG.LEVEL) {
    console.log(message);
  }
}

/**
 * 错误日志 (总是显示)
 */
export function logError(message: string): void {
  log(LogLevel.ERROR, message);
}

/**
 * 警告日志 (WARN 及以上级别显示)
 */
export function logWarn(message: string): void {
  log(LogLevel.WARN, message);
}

/**
 * 信息日志 (INFO 及以上级别显示)
 */
export function logInfo(message: string): void {
  log(LogLevel.INFO, message);
}

/**
 * 调试日志 (DEBUG 及以上级别显示)
 */
export function logDebug(message: string): void {
  log(LogLevel.DEBUG, message);
}

/**
 * 详细日志 (VERBOSE 级别显示)
 */
export function logVerbose(message: string): void {
  log(LogLevel.VERBOSE, message);
}
