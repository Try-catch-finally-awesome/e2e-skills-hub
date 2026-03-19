/**
 * 影响矩阵
 * 定义变更类型与受影响 skills 之间的映射关系
 */

import type { SkillTemplateName } from '../generator/types.js';

/** 变更类型 */
export type ChangeType =
  | 'new-page-route'
  | 'modify-query'
  | 'modify-crud'
  | 'modify-db-schema'
  | 'modify-frontend-ui'
  | 'modify-frontend-route'
  | 'switch-tech-stack';

/** 变更描述 */
export interface ChangeDescription {
  /** 变更类型 */
  type: ChangeType;
  /** 变更描述 */
  description: string;
  /** 受影响的文件路径 */
  affectedFiles: string[];
}

/** 影响矩阵定义 */
const IMPACT_MATRIX: Record<ChangeType, SkillTemplateName[]> = {
  'new-page-route': [
    'e2e-orchestrator',
    'e2e-code-tracer',
    'e2e-testcase-generator',
  ],
  'modify-query': [
    'e2e-testcase-generator',
  ],
  'modify-crud': [
    'e2e-testcase-generator',
    'e2e-error-fixer',
  ],
  'modify-db-schema': [
    'e2e-code-tracer',
    'e2e-testcase-generator',
    'e2e-error-fixer',
  ],
  'modify-frontend-ui': [
    'e2e-code-tracer',
    'e2e-testcase-generator',
    'e2e-playwright-runner',
  ],
  'modify-frontend-route': [
    'e2e-code-tracer',
  ],
  'switch-tech-stack': [
    'e2e-orchestrator',
    'e2e-code-tracer',
    'e2e-testcase-generator',
    'e2e-playwright-runner',
    'e2e-error-fixer',
    'e2e-report-generator',
  ],
};

/**
 * 根据变更类型获取受影响的 skills 列表
 */
export function getAffectedSkills(changeType: ChangeType): SkillTemplateName[] {
  return IMPACT_MATRIX[changeType] ?? [];
}

/**
 * 根据多个变更类型，合并去重后返回受影响的 skills 列表
 */
export function getAffectedSkillsForChanges(
  changes: ChangeDescription[],
): SkillTemplateName[] {
  const affectedSet = new Set<SkillTemplateName>();

  for (const change of changes) {
    const skills = getAffectedSkills(change.type);
    for (const skill of skills) {
      affectedSet.add(skill);
    }
  }

  return [...affectedSet];
}

/**
 * 判断是否需要全量重新生成
 */
export function requiresFullRegeneration(changes: ChangeDescription[]): boolean {
  return changes.some((c) => c.type === 'switch-tech-stack');
}

/**
 * 根据关键词推断变更类型
 */
export function inferChangeType(description: string, affectedFiles: string[]): ChangeType {
  const lower = description.toLowerCase();
  const filesStr = affectedFiles.join(' ').toLowerCase();

  // 技术栈切换
  if (
    lower.includes('切换') ||
    lower.includes('升级') ||
    lower.includes('迁移') ||
    lower.includes('switch') ||
    lower.includes('migrate')
  ) {
    if (
      lower.includes('框架') ||
      lower.includes('技术栈') ||
      lower.includes('framework') ||
      lower.includes('orm')
    ) {
      return 'switch-tech-stack';
    }
  }

  // 数据库变更
  if (
    lower.includes('数据库') ||
    lower.includes('表结构') ||
    lower.includes('migration') ||
    lower.includes('schema') ||
    lower.includes('字段')
  ) {
    return 'modify-db-schema';
  }

  // 新增页面/路由
  if (
    lower.includes('新增页面') ||
    lower.includes('新增路由') ||
    lower.includes('新页面') ||
    lower.includes('new page') ||
    lower.includes('new route')
  ) {
    return 'new-page-route';
  }

  // 前端路由变更
  if (
    filesStr.includes('router') ||
    filesStr.includes('routes') ||
    lower.includes('路由') ||
    lower.includes('route')
  ) {
    return 'modify-frontend-route';
  }

  // 前端 UI 变更
  if (
    filesStr.includes('.vue') ||
    filesStr.includes('.tsx') ||
    filesStr.includes('.jsx') ||
    lower.includes('ui') ||
    lower.includes('组件') ||
    lower.includes('页面') ||
    lower.includes('样式')
  ) {
    return 'modify-frontend-ui';
  }

  // 查询变更
  if (
    lower.includes('查询') ||
    lower.includes('搜索') ||
    lower.includes('筛选') ||
    lower.includes('过滤') ||
    lower.includes('query') ||
    lower.includes('search') ||
    lower.includes('filter')
  ) {
    return 'modify-query';
  }

  // CRUD 变更（默认）
  return 'modify-crud';
}

/**
 * 格式化影响分析结果
 */
export function formatImpactAnalysis(
  changes: ChangeDescription[],
  affectedSkills: SkillTemplateName[],
): string {
  const lines: string[] = ['变更影响分析:', ''];

  for (const change of changes) {
    lines.push(`  变更类型: ${change.type}`);
    lines.push(`  描述: ${change.description}`);
    if (change.affectedFiles.length > 0) {
      lines.push(`  影响文件:`);
      for (const file of change.affectedFiles.slice(0, 5)) {
        lines.push(`    - ${file}`);
      }
      if (change.affectedFiles.length > 5) {
        lines.push(`    ... 还有 ${change.affectedFiles.length - 5} 个文件`);
      }
    }
    lines.push('');
  }

  lines.push('受影响的 Skills:');
  for (const skill of affectedSkills) {
    lines.push(`  - ${skill}`);
  }

  return lines.join('\n');
}
