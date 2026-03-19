/**
 * URL 模式 — 通过前端页面 URL 触发 E2E 测试
 */

import logger from '../utils/logger.js';

/** URL 模式执行参数 */
export interface UrlModeParams {
  /** 前端页面 URL */
  url: string;
  /** 要执行的子 skill 列表（逗号分隔） */
  skills?: string;
  /** 跳过错误修复阶段 */
  skipFix?: boolean;
  /** 全局最大修复次数 */
  maxFixRounds?: number;
  /** 单用例最大修复次数 */
  maxSingleFix?: number;
  /** 前端端口 */
  frontendPort?: number;
}

/** 解析后的 URL 信息 */
export interface ParsedUrl {
  /** 完整 URL */
  fullUrl: string;
  /** 协议 */
  protocol: string;
  /** 主机名 */
  hostname: string;
  /** 端口 */
  port: number;
  /** 路由路径 */
  pathname: string;
  /** 查询参数 */
  search: string;
}

/**
 * 解析并补全用户输入的 URL
 * 支持三种格式:
 * - 完整 URL: http://localhost:5173/products
 * - 省略协议: localhost:5173/products
 * - 仅路径: /products
 */
export function parseUrl(input: string, defaultPort: number = 5173): ParsedUrl {
  let urlStr = input.trim();

  // 仅路径: /products
  if (urlStr.startsWith('/')) {
    urlStr = `http://localhost:${defaultPort}${urlStr}`;
  }
  // 省略协议: localhost:5173/products
  else if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
    urlStr = `http://${urlStr}`;
  }

  const parsed = new URL(urlStr);

  return {
    fullUrl: parsed.href,
    protocol: parsed.protocol.replace(':', ''),
    hostname: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port, 10) : defaultPort,
    pathname: parsed.pathname,
    search: parsed.search,
  };
}

/**
 * 从路径中提取路由关键词
 * /products/list → ['products', 'list']
 * /system/user-management → ['system', 'user-management', 'userManagement']
 */
export function extractRouteKeywords(pathname: string): string[] {
  const segments = pathname
    .split('/')
    .filter((s) => s.length > 0)
    .filter((s) => !s.match(/^\d+$/)); // 排除纯数字（可能是 ID）

  const keywords: string[] = [...segments];

  // 为短横线格式添加驼峰别名
  for (const seg of segments) {
    if (seg.includes('-')) {
      const camelCase = seg.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      keywords.push(camelCase);
    }
    if (seg.includes('_')) {
      const camelCase = seg.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
      keywords.push(camelCase);
    }
  }

  return [...new Set(keywords)];
}

/**
 * 构建 URL 模式的执行计划
 * 返回调度各子 skill 的指令
 */
export function buildUrlModePlan(params: UrlModeParams): string[] {
  const parsed = parseUrl(params.url, params.frontendPort);
  const keywords = extractRouteKeywords(parsed.pathname);

  logger.info(`URL 模式执行计划:`);
  logger.info(`  URL: ${parsed.fullUrl}`);
  logger.info(`  路由路径: ${parsed.pathname}`);
  logger.info(`  关键词: ${keywords.join(', ')}`);

  const steps: string[] = [];

  // 阶段 0: 环境检查
  steps.push(`[阶段 0] 环境检查 — 验证 ${parsed.hostname}:${parsed.port} 可达`);

  // 确定要执行的 skills
  const allSkills = [
    'e2e-code-tracer',
    'e2e-testcase-generator',
    'e2e-playwright-runner',
    'e2e-error-fixer',
    'e2e-report-generator',
  ];

  const selectedSkills = params.skills
    ? params.skills.split(',').map((s) => s.trim())
    : allSkills;

  if (params.skipFix) {
    const fixIndex = selectedSkills.indexOf('e2e-error-fixer');
    if (fixIndex !== -1) selectedSkills.splice(fixIndex, 1);
  }

  // 构建执行步骤
  let phase = 1;
  for (const skill of selectedSkills) {
    steps.push(`[阶段 ${phase}] 调用 ${skill}`);
    phase++;
  }

  return steps;
}

/**
 * 验证 URL 格式是否合法
 */
export function validateUrl(input: string): { valid: boolean; error?: string } {
  try {
    parseUrl(input);
    return { valid: true };
  } catch {
    return {
      valid: false,
      error: `无效的 URL 格式: "${input}"。支持的格式: http://localhost:5173/path, localhost:5173/path, /path`,
    };
  }
}
