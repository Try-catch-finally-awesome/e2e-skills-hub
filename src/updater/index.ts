/**
 * 增量更新引擎 — 入口
 * 分析变更影响范围，仅更新受影响的 skills
 */

import logger from '../utils/logger.js';
import { detect, type DetectOptions } from '../detector/index.js';
import { generate, buildTemplateContext } from '../generator/index.js';
import { readMetadata, appendUpdateHistory, hasTechStackChanged, type Metadata } from '../manager/metadata.js';
import { analyzeDescription, type DiffAnalysisResult } from './diff-analyzer.js';
import {
  getAffectedSkillsForChanges,
  requiresFullRegeneration,
  formatImpactAnalysis,
} from './impact-matrix.js';
import type { SkillTemplateName } from '../generator/types.js';

/** 更新选项 */
export interface UpdateOptions {
  /** 变更描述 */
  description: string;
  /** 是否强制全量重新生成 */
  force?: boolean;
  /** 后端项目路径 */
  backendPath: string;
  /** 前端项目路径 */
  frontendPath: string;
  /** skills 存储目录 */
  storageDir: string;
  /** 配置覆盖 */
  configOverrides?: Record<string, unknown>;
}

/** 更新结果 */
export interface UpdateResult {
  /** 是否成功 */
  success: boolean;
  /** 更新类型 */
  type: 'full' | 'incremental';
  /** 更新的 skills 列表 */
  updatedSkills: string[];
  /** 影响分析结果 */
  impactAnalysis: string;
  /** 错误消息 */
  errors: string[];
}

/**
 * 执行增量更新
 */
export async function update(options: UpdateOptions): Promise<UpdateResult> {
  const { description, force, backendPath, frontendPath, storageDir, configOverrides } = options;
  const errors: string[] = [];

  logger.info(`开始增量更新: "${description}"`);

  // 1. 读取当前 metadata
  const currentMetadata = await readMetadata(storageDir);
  if (!currentMetadata && !force) {
    return {
      success: false,
      type: 'full',
      updatedSkills: [],
      impactAnalysis: '',
      errors: ['未找到 metadata.json，请先运行 init 生成 skills'],
    };
  }

  // 2. 重新运行技术栈检测
  const detectOptions: DetectOptions = {
    projectPath: backendPath,
    backendPath,
    frontendPath,
  };

  let detection;
  try {
    detection = await detect(detectOptions);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      type: 'full',
      updatedSkills: [],
      impactAnalysis: '',
      errors: [`技术栈检测失败: ${msg}`],
    };
  }

  // 3. 检查技术栈是否变化
  let needFullRegeneration = force ?? false;

  if (currentMetadata && !force) {
    const newTechStack: Metadata['techStack'] = {
      backend: {
        language: detection.backend.language,
        framework: detection.backend.framework,
        orm: detection.backend.orm,
      },
      frontend: {
        framework: detection.frontend.framework,
        uiLibrary: detection.frontend.uiLibrary,
      },
      database: detection.backend.database,
    };

    if (hasTechStackChanged(currentMetadata, newTechStack)) {
      logger.warn('技术栈发生变化，将执行全量重新生成');
      needFullRegeneration = true;
    }
  }

  // 4. 分析变更影响
  let diffResult: DiffAnalysisResult;
  try {
    diffResult = await analyzeDescription(description, backendPath, frontendPath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`变更分析失败: ${msg}`);
    diffResult = { changes: [], affectedFiles: [], forceRegenerate: false };
  }

  if (diffResult.forceRegenerate) {
    needFullRegeneration = true;
  }

  // 5. 确定要更新的 skills
  let skillsToUpdate: string[];
  let updateType: 'full' | 'incremental';

  if (needFullRegeneration) {
    skillsToUpdate = [
      'e2e-orchestrator',
      'e2e-code-tracer',
      'e2e-testcase-generator',
      'e2e-playwright-runner',
      'e2e-error-fixer',
      'e2e-report-generator',
    ];
    updateType = 'full';
  } else {
    const affectedSkills = getAffectedSkillsForChanges(diffResult.changes);
    skillsToUpdate = affectedSkills;
    updateType = 'incremental';
  }

  const impactAnalysis = formatImpactAnalysis(diffResult.changes, skillsToUpdate as SkillTemplateName[]);

  logger.info(`更新类型: ${updateType}, 需更新 ${skillsToUpdate.length} 个 skills`);

  // 6. 执行生成（只更新受影响的 skills）
  if (skillsToUpdate.length > 0) {
    try {
      const result = await generate({
        detection,
        outputDir: storageDir,
        force: true,
        only: skillsToUpdate,
        configOverrides,
      });

      if (!result.success) {
        errors.push(...result.errors);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`生成失败: ${msg}`);
    }
  }

  // 7. 更新 metadata 中的 updateHistory
  try {
    await appendUpdateHistory(storageDir, {
      timestamp: new Date().toISOString(),
      type: updateType,
      description,
      changedSkills: skillsToUpdate,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`更新 metadata 失败: ${msg}`);
  }

  const success = errors.length === 0;

  if (success) {
    logger.info(`增量更新完成，已更新 ${skillsToUpdate.length} 个 skills`);
  } else {
    logger.error(`增量更新出现 ${errors.length} 个错误`);
  }

  return {
    success,
    type: updateType,
    updatedSkills: skillsToUpdate,
    impactAnalysis,
    errors,
  };
}

/**
 * 格式化更新结果为可读文本
 */
export function formatUpdateResult(result: UpdateResult): string {
  const lines: string[] = [];

  lines.push(`更新类型: ${result.type === 'full' ? '全量重新生成' : '增量更新'}`);
  lines.push(`更新结果: ${result.success ? '成功' : '失败'}`);
  lines.push('');

  if (result.updatedSkills.length > 0) {
    lines.push('已更新的 Skills:');
    for (const skill of result.updatedSkills) {
      lines.push(`  - ${skill}`);
    }
  } else {
    lines.push('没有需要更新的 Skills');
  }

  if (result.impactAnalysis) {
    lines.push('');
    lines.push(result.impactAnalysis);
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
