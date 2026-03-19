/**
 * 日志工具 — 提供分级日志输出
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

let currentLevel: LogLevel = LogLevel.INFO;

/** 设置全局日志级别 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/** 获取当前日志级别 */
export function getLogLevel(): LogLevel {
  return currentLevel;
}

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

/** 调试日志 */
export function debug(message: string, ...args: unknown[]): void {
  if (currentLevel <= LogLevel.DEBUG) {
    console.debug(`[${timestamp()}] [DEBUG] ${message}`, ...args);
  }
}

/** 信息日志 */
export function info(message: string, ...args: unknown[]): void {
  if (currentLevel <= LogLevel.INFO) {
    console.info(`[${timestamp()}] [INFO]  ${message}`, ...args);
  }
}

/** 警告日志 */
export function warn(message: string, ...args: unknown[]): void {
  if (currentLevel <= LogLevel.WARN) {
    console.warn(`[${timestamp()}] [WARN]  ${message}`, ...args);
  }
}

/** 错误日志 */
export function error(message: string, ...args: unknown[]): void {
  if (currentLevel <= LogLevel.ERROR) {
    console.error(`[${timestamp()}] [ERROR] ${message}`, ...args);
  }
}

const logger = { debug, info, warn, error, setLogLevel, getLogLevel };
export default logger;
