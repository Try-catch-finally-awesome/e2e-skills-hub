/**
 * 配置管理 — 入口
 * 管理插件运行所需的各层级配置
 */

export {
  type E2EConfig,
  loadConfig,
  setConfigValue,
  resetConfig,
  getConfigValue,
} from './loader.js';

import {
  type E2EConfig,
  loadConfig,
  getConfigValue,
} from './loader.js';
import logger from '../utils/logger.js';

/**
 * 格式化配置为可读文本
 */
export function formatConfig(config: E2EConfig): string {
  const lines: string[] = [];

  lines.push('当前生效配置:');
  lines.push('');

  lines.push('[存储策略]');
  lines.push(`  位置: ${config.storage.location}`);
  lines.push(`  项目级路径: ${config.storage.projectPath}`);
  lines.push(`  用户级路径: ${config.storage.userPath}`);
  lines.push('');

  lines.push('[技术栈检测]');
  lines.push(`  自动检测: ${config.detection.autoDetect}`);
  if (config.detection.backend.language) {
    lines.push(`  后端语言: ${config.detection.backend.language}`);
  }
  if (config.detection.backend.framework) {
    lines.push(`  后端框架: ${config.detection.backend.framework}`);
  }
  if (config.detection.backend.port) {
    lines.push(`  后端端口: ${config.detection.backend.port}`);
  }
  if (config.detection.frontend.framework) {
    lines.push(`  前端框架: ${config.detection.frontend.framework}`);
  }
  if (config.detection.frontend.port) {
    lines.push(`  前端端口: ${config.detection.frontend.port}`);
  }
  lines.push('');

  lines.push('[测试执行]');
  lines.push(`  全局最大修复次数: ${config.execution.maxFixRounds}`);
  lines.push(`  单用例最大修复次数: ${config.execution.maxSingleFix}`);
  lines.push(`  测试数据前缀: ${config.execution.testDataPrefix}`);
  lines.push(`  失败截图: ${config.execution.screenshotOnFailure}`);
  lines.push(`  清理测试数据: ${config.execution.cleanTestData}`);
  lines.push('');

  lines.push('[MCP 工具]');
  lines.push(`  数据库 MCP: ${config.mcp.database.name || '未配置'}`);
  lines.push(`  Playwright: ${config.mcp.playwright.name}`);
  lines.push('');

  if (config.testAccount.username) {
    lines.push('[测试账号]');
    lines.push(`  用户名: ${config.testAccount.username}`);
    lines.push(`  登录类型: ${config.testAccount.loginType}`);
    lines.push('');
  }

  lines.push('[报告输出]');
  lines.push(`  输出路径: ${config.report.outputPath}`);
  lines.push(`  格式: ${config.report.format}`);
  lines.push('');

  lines.push('[质量门禁]');
  lines.push(`  通过分数: ${config.quality.passScore}`);
  lines.push(`  权重 — 页面加载: ${config.quality.scoreWeights.pageLoad}%`);
  lines.push(`  权重 — CRUD 正确性: ${config.quality.scoreWeights.crudCorrectness}%`);
  lines.push(`  权重 — 业务流程: ${config.quality.scoreWeights.businessFlow}%`);
  lines.push(`  权重 — 异常处理: ${config.quality.scoreWeights.exceptionHandling}%`);
  lines.push(`  权重 — 数据一致性: ${config.quality.scoreWeights.dataConsistency}%`);

  return lines.join('\n');
}

/**
 * 将配置转换为 generator 所需的 configOverrides 格式
 */
export function configToOverrides(config: E2EConfig): Record<string, unknown> {
  return {
    'execution.maxFixRounds': config.execution.maxFixRounds,
    'execution.maxSingleFix': config.execution.maxSingleFix,
    'execution.testDataPrefix': config.execution.testDataPrefix,
    'report.outputPath': config.report.outputPath,
    'quality.passScore': config.quality.passScore,
    'mcp.database.name': config.mcp.database.name,
    'mcp.database.database': config.mcp.database.database,
  };
}
