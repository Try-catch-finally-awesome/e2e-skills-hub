/**
 * 测试执行入口
 * 提供 URL 模式和描述模式两种输入方式
 */

import logger from '../utils/logger.js';
import {
  type UrlModeParams,
  parseUrl,
  validateUrl,
  buildUrlModePlan,
  extractRouteKeywords,
} from './url-mode.js';
import {
  type DescribeModeParams,
  extractKeywords,
  buildDescribeModePlan,
} from './describe-mode.js';

export {
  type UrlModeParams,
  parseUrl,
  validateUrl,
  buildUrlModePlan,
  extractRouteKeywords,
} from './url-mode.js';

export {
  type DescribeModeParams,
  extractKeywords,
  keywordToCodePatterns,
  buildSearchStrategies,
  buildDescribeModePlan,
} from './describe-mode.js';

/** 执行模式 */
export type ExecutionMode = 'url' | 'describe';

/** 执行参数（联合类型） */
export type ExecuteParams = UrlModeParams | DescribeModeParams;

/** 执行结果 */
export interface ExecuteResult {
  /** 是否成功 */
  success: boolean;
  /** 执行模式 */
  mode: ExecutionMode;
  /** 执行计划步骤 */
  plan: string[];
  /** 错误消息 */
  errors: string[];
}

/**
 * 判断参数属于哪种执行模式
 */
export function detectMode(params: ExecuteParams): ExecutionMode {
  if ('url' in params && params.url) return 'url';
  if ('description' in params && params.description) return 'describe';
  throw new Error('必须提供 url 或 description 参数');
}

/**
 * 执行入口 — 根据模式分发
 * 注意: 实际的 skill 调度由 Claude Code 的 Task 工具完成
 * 此函数只负责解析参数、构建执行计划
 */
export function execute(params: ExecuteParams): ExecuteResult {
  const errors: string[] = [];
  let mode: ExecutionMode;
  let plan: string[] = [];

  try {
    mode = detectMode(params);
  } catch (err) {
    return {
      success: false,
      mode: 'url',
      plan: [],
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }

  if (mode === 'url') {
    const urlParams = params as UrlModeParams;
    const validation = validateUrl(urlParams.url);

    if (!validation.valid) {
      errors.push(validation.error!);
      return { success: false, mode, plan: [], errors };
    }

    plan = buildUrlModePlan(urlParams);
    logger.info(`已构建 URL 模式执行计划，共 ${plan.length} 步`);
  } else {
    const descParams = params as DescribeModeParams;
    plan = buildDescribeModePlan(descParams);
    logger.info(`已构建描述模式执行计划，共 ${plan.length} 步`);
  }

  return {
    success: true,
    mode,
    plan,
    errors,
  };
}

/**
 * 格式化执行计划为可读文本
 */
export function formatPlan(result: ExecuteResult): string {
  const lines: string[] = [];
  lines.push(`执行模式: ${result.mode === 'url' ? 'URL 模式' : '描述模式'}`);
  lines.push('');
  lines.push('执行计划:');

  for (const step of result.plan) {
    lines.push(`  ${step}`);
  }

  if (result.errors.length > 0) {
    lines.push('');
    lines.push('错误:');
    for (const error of result.errors) {
      lines.push(`  - ${error}`);
    }
  }

  return lines.join('\n');
}
