/**
 * 变更分析器
 * 分析用户描述的变更内容，定位受影响的代码文件
 */

import { findFiles, readFileSafe } from '../utils/file.js';
import logger from '../utils/logger.js';
import {
  type ChangeDescription,
  type ChangeType,
  inferChangeType,
} from './impact-matrix.js';
import { extractKeywords, keywordToCodePatterns } from '../executor/describe-mode.js';

/** 文件变更类型 */
export type FileChangeKind = 'added' | 'modified' | 'deleted';

/** 文件变更条目 */
export interface FileChange {
  filePath: string;
  kind: FileChangeKind;
}

/** 分析结果 */
export interface DiffAnalysisResult {
  /** 推断的变更描述列表 */
  changes: ChangeDescription[];
  /** 受影响的文件列表 */
  affectedFiles: string[];
  /** 是否需要全量重新生成 */
  forceRegenerate: boolean;
}

/**
 * 根据用户描述分析变更
 */
export async function analyzeDescription(
  description: string,
  backendPath: string,
  frontendPath: string,
): Promise<DiffAnalysisResult> {
  logger.info(`分析变更描述: ${description}`);

  const keywords = extractKeywords(description);
  const allPatterns: string[] = [];

  for (const kw of keywords) {
    allPatterns.push(...keywordToCodePatterns(kw));
  }

  logger.debug(`关键词: ${keywords.join(', ')}`);
  logger.debug(`搜索模式: ${allPatterns.join(', ')}`);

  // 在项目中搜索匹配的文件
  const affectedFiles: string[] = [];

  for (const pattern of allPatterns) {
    // 搜索后端文件
    const backendFiles = await findFiles(`**/*${pattern}*`, backendPath);
    affectedFiles.push(...backendFiles);

    // 搜索前端文件
    const frontendFiles = await findFiles(`**/*${pattern}*`, frontendPath);
    affectedFiles.push(...frontendFiles);
  }

  // 去重
  const uniqueFiles = [...new Set(affectedFiles)];

  // 推断变更类型
  const changeType = inferChangeType(description, uniqueFiles);

  const changes: ChangeDescription[] = [
    {
      type: changeType,
      description,
      affectedFiles: uniqueFiles,
    },
  ];

  const forceRegenerate = changeType === 'switch-tech-stack';

  logger.info(`变更分析完成: 类型=${changeType}, 影响文件=${uniqueFiles.length}个, 需全量重生成=${forceRegenerate}`);

  return {
    changes,
    affectedFiles: uniqueFiles,
    forceRegenerate,
  };
}

/**
 * 从 Git diff 分析变更（辅助方法）
 * 解析 git diff --name-status 的输出
 */
export function parseGitDiffOutput(diffOutput: string): FileChange[] {
  const changes: FileChange[] = [];
  const lines = diffOutput.trim().split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) continue;

    const status = parts[0];
    const filePath = parts[1];

    let kind: FileChangeKind;
    switch (status) {
      case 'A':
        kind = 'added';
        break;
      case 'D':
        kind = 'deleted';
        break;
      case 'M':
      default:
        kind = 'modified';
        break;
    }

    changes.push({ filePath, kind });
  }

  return changes;
}

/**
 * 从文件变更列表推断 ChangeDescription
 */
export function fileChangesToDescriptions(
  fileChanges: FileChange[],
  description: string,
): ChangeDescription[] {
  const affectedFiles = fileChanges.map((fc) => fc.filePath);
  const changeType = inferChangeType(description, affectedFiles);

  // 按文件类型进一步细分
  const frontendFiles = affectedFiles.filter(
    (f) =>
      f.endsWith('.vue') ||
      f.endsWith('.tsx') ||
      f.endsWith('.jsx') ||
      f.includes('/views/') ||
      f.includes('/pages/') ||
      f.includes('/components/'),
  );

  const backendFiles = affectedFiles.filter(
    (f) =>
      f.endsWith('.java') ||
      f.endsWith('.py') ||
      f.endsWith('.go') ||
      f.endsWith('.cs') ||
      f.includes('/controller/') ||
      f.includes('/service/') ||
      f.includes('/mapper/'),
  );

  const dbFiles = affectedFiles.filter(
    (f) =>
      f.includes('migration') ||
      f.includes('schema') ||
      f.includes('.sql') ||
      f.endsWith('models.py') ||
      f.includes('/entity/'),
  );

  const changes: ChangeDescription[] = [];

  if (frontendFiles.length > 0) {
    changes.push({
      type: frontendFiles.some((f) => f.includes('router'))
        ? 'modify-frontend-route'
        : 'modify-frontend-ui',
      description: `前端变更: ${description}`,
      affectedFiles: frontendFiles,
    });
  }

  if (backendFiles.length > 0) {
    changes.push({
      type: changeType === 'modify-query' ? 'modify-query' : 'modify-crud',
      description: `后端变更: ${description}`,
      affectedFiles: backendFiles,
    });
  }

  if (dbFiles.length > 0) {
    changes.push({
      type: 'modify-db-schema',
      description: `数据库变更: ${description}`,
      affectedFiles: dbFiles,
    });
  }

  // 如果以上分类都为空，使用默认
  if (changes.length === 0) {
    changes.push({
      type: changeType,
      description,
      affectedFiles,
    });
  }

  return changes;
}
