/**
 * metadata.json 管理
 * 负责读写和更新 skills 的元数据索引文件
 */

import { join } from 'node:path';
import { readFileSafe, writeFileSafe, pathExists } from '../utils/file.js';
import logger from '../utils/logger.js';

/** 单个 skill 的元数据 */
export interface SkillMeta {
  name: string;
  path: string;
  hash: string;
}

/** 更新历史条目 */
export interface UpdateHistoryEntry {
  timestamp: string;
  type: 'full' | 'incremental';
  description: string;
  changedSkills: string[];
}

/** metadata.json 的完整结构 */
export interface Metadata {
  version: string;
  generatedAt: string;
  generatedBy: string;
  techStack: {
    backend: {
      language: string;
      framework: string;
      orm: string;
    };
    frontend: {
      framework: string;
      uiLibrary: string;
    };
    database: string;
  };
  skills: SkillMeta[];
  updateHistory: UpdateHistoryEntry[];
}

/** 创建默认的空 metadata */
function createDefaultMetadata(): Metadata {
  return {
    version: '1.0.0',
    generatedAt: '',
    generatedBy: 'e2e-skills-hub@1.0.0',
    techStack: {
      backend: { language: '', framework: '', orm: '' },
      frontend: { framework: '', uiLibrary: '' },
      database: '',
    },
    skills: [],
    updateHistory: [],
  };
}

/**
 * 读取 metadata.json
 * 如果文件不存在或解析失败，返回 null
 */
export async function readMetadata(metadataDir: string): Promise<Metadata | null> {
  const filePath = join(metadataDir, 'metadata.json');
  const content = await readFileSafe(filePath);

  if (content === null) {
    logger.debug(`metadata.json 不存在: ${filePath}`);
    return null;
  }

  try {
    return JSON.parse(content) as Metadata;
  } catch {
    logger.error(`metadata.json 解析失败: ${filePath}`);
    return null;
  }
}

/**
 * 写入 metadata.json
 */
export async function writeMetadata(
  metadataDir: string,
  metadata: Metadata,
): Promise<void> {
  const filePath = join(metadataDir, 'metadata.json');
  await writeFileSafe(filePath, JSON.stringify(metadata, null, 2));
  logger.debug(`已写入 metadata.json: ${filePath}`);
}

/**
 * 更新指定 skill 的哈希值
 */
export async function updateSkillHash(
  metadataDir: string,
  skillName: string,
  newHash: string,
): Promise<void> {
  const metadata = await readMetadata(metadataDir);
  if (!metadata) {
    logger.error('无法更新 skill 哈希: metadata.json 不存在');
    return;
  }

  const skill = metadata.skills.find((s) => s.name === skillName);
  if (skill) {
    skill.hash = newHash;
  } else {
    logger.warn(`skill 不存在于 metadata 中: ${skillName}`);
  }

  await writeMetadata(metadataDir, metadata);
}

/**
 * 移除指定 skill 的元数据记录
 */
export async function removeSkillMeta(
  metadataDir: string,
  skillName: string,
): Promise<void> {
  const metadata = await readMetadata(metadataDir);
  if (!metadata) return;

  metadata.skills = metadata.skills.filter((s) => s.name !== skillName);
  await writeMetadata(metadataDir, metadata);
  logger.info(`已从 metadata 中移除: ${skillName}`);
}

/**
 * 追加更新历史条目
 */
export async function appendUpdateHistory(
  metadataDir: string,
  entry: UpdateHistoryEntry,
): Promise<void> {
  const metadata = await readMetadata(metadataDir);
  if (!metadata) return;

  metadata.updateHistory.push(entry);
  await writeMetadata(metadataDir, metadata);
  logger.debug(`已追加更新历史: ${entry.description}`);
}

/**
 * 检查 skill 是否需要更新（通过哈希值比对）
 */
export async function isSkillOutdated(
  metadataDir: string,
  skillName: string,
  currentHash: string,
): Promise<boolean> {
  const metadata = await readMetadata(metadataDir);
  if (!metadata) return true;

  const skill = metadata.skills.find((s) => s.name === skillName);
  if (!skill) return true;

  return skill.hash !== currentHash;
}

/**
 * 检查技术栈是否发生了变化
 */
export function hasTechStackChanged(
  oldMetadata: Metadata,
  newTechStack: Metadata['techStack'],
): boolean {
  const old = oldMetadata.techStack;

  return (
    old.backend.language !== newTechStack.backend.language ||
    old.backend.framework !== newTechStack.backend.framework ||
    old.backend.orm !== newTechStack.backend.orm ||
    old.frontend.framework !== newTechStack.frontend.framework ||
    old.frontend.uiLibrary !== newTechStack.frontend.uiLibrary ||
    old.database !== newTechStack.database
  );
}
