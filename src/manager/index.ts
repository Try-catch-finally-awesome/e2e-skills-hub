/**
 * Skills 管理器 — 入口
 * 提供 list / show / remove / clean / export / import 操作
 */

import { join, basename } from 'node:path';
import { readFileSafe, pathExists } from '../utils/file.js';
import { hashFileFormatted } from '../utils/hash.js';
import logger from '../utils/logger.js';
import {
  type StorageConfig,
  resolveStoragePath,
  listSkillDirs,
  removeSkillDir,
  cleanStorage,
  exportSkills,
  importSkills,
  isStorageInitialized,
} from './storage.js';
import {
  readMetadata,
  removeSkillMeta,
  type Metadata,
  type SkillMeta,
} from './metadata.js';

/** Skill 状态信息 */
export interface SkillStatus {
  name: string;
  path: string;
  exists: boolean;
  hash: string;
  metaHash: string;
  outdated: boolean;
}

/**
 * 列出所有已生成的 skills 及其状态
 */
export async function list(config: StorageConfig): Promise<SkillStatus[]> {
  const storagePath = resolveStoragePath(config);

  if (!isStorageInitialized(config)) {
    logger.info('尚未初始化，没有已生成的 skills');
    return [];
  }

  const metadata = await readMetadata(storagePath);
  if (!metadata) {
    logger.warn('metadata.json 不存在或解析失败');
    return [];
  }

  const statuses: SkillStatus[] = [];

  for (const skillMeta of metadata.skills) {
    const skillPath = join(storagePath, skillMeta.path);
    const exists = pathExists(skillPath);
    let currentHash = '';
    let outdated = false;

    if (exists) {
      currentHash = await hashFileFormatted(skillPath);
      outdated = currentHash !== skillMeta.hash;
    }

    statuses.push({
      name: skillMeta.name,
      path: skillPath,
      exists,
      hash: currentHash,
      metaHash: skillMeta.hash,
      outdated,
    });
  }

  return statuses;
}

/**
 * 查看指定 skill 的内容
 */
export async function show(
  config: StorageConfig,
  skillName: string,
): Promise<string | null> {
  const storagePath = resolveStoragePath(config);
  const skillPath = join(storagePath, skillName, 'SKILL.md');

  const content = await readFileSafe(skillPath);
  if (content === null) {
    logger.warn(`skill 不存在: ${skillName}`);
    return null;
  }

  return content;
}

/**
 * 删除指定 skill
 */
export async function remove(
  config: StorageConfig,
  skillName: string,
): Promise<boolean> {
  const storagePath = resolveStoragePath(config);

  // 删除文件
  const removed = await removeSkillDir(config, skillName);
  if (!removed) return false;

  // 更新 metadata
  await removeSkillMeta(storagePath, skillName);

  logger.info(`已删除 skill: ${skillName}`);
  return true;
}

/**
 * 删除所有已生成的 skills
 */
export async function clean(config: StorageConfig): Promise<number> {
  const count = await cleanStorage(config);
  logger.info(`已清理所有 skills，共删除 ${count} 个`);
  return count;
}

/**
 * 导出 skills 到指定目录
 */
export async function exportTo(
  config: StorageConfig,
  targetDir: string,
): Promise<number> {
  return exportSkills(config, targetDir);
}

/**
 * 从指定目录导入 skills
 */
export async function importFrom(
  config: StorageConfig,
  sourceDir: string,
): Promise<number> {
  return importSkills(config, sourceDir);
}

/**
 * 获取当前项目的 metadata 信息
 */
export async function getMetadata(config: StorageConfig): Promise<Metadata | null> {
  const storagePath = resolveStoragePath(config);
  return readMetadata(storagePath);
}

/**
 * 格式化 skill 列表为可读文本
 */
export function formatSkillList(statuses: SkillStatus[]): string {
  if (statuses.length === 0) {
    return '没有已生成的 skills。';
  }

  const lines: string[] = ['已生成的 E2E Skills:', ''];

  for (const status of statuses) {
    const stateIcon = !status.exists
      ? '[缺失]'
      : status.outdated
        ? '[已修改]'
        : '[正常]';
    lines.push(`  ${stateIcon} ${status.name}`);
    lines.push(`         路径: ${status.path}`);
  }

  return lines.join('\n');
}
