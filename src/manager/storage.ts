/**
 * 存储策略
 * 管理 Skills 的存储位置（项目级 vs 用户级）
 */

import { join } from 'node:path';
import { homedir } from 'node:os';
import { ensureDir, pathExists, removeDir, removeFile, copyFileSafe, findFiles, listDir, isDirectory } from '../utils/file.js';
import logger from '../utils/logger.js';

/** 存储位置类型 */
export type StorageLocation = 'project' | 'user';

/** 存储配置 */
export interface StorageConfig {
  /** 存储位置 */
  location: StorageLocation;
  /** 项目级存储的项目根目录 */
  projectRoot?: string;
  /** 项目级存储子路径 */
  projectSubPath?: string;
  /** 用户级存储路径 */
  userPath?: string;
  /** 项目名称（用户级存储时的子目录名） */
  projectName?: string;
}

/** 默认的项目级子路径 */
const DEFAULT_PROJECT_SUB_PATH = '.claude/skills/e2e';

/** 默认的用户级路径前缀 */
const DEFAULT_USER_PATH_PREFIX = '.claude/skills/e2e';

/**
 * 解析最终的存储路径
 */
export function resolveStoragePath(config: StorageConfig): string {
  if (config.location === 'project') {
    const projectRoot = config.projectRoot ?? process.cwd();
    const subPath = config.projectSubPath ?? DEFAULT_PROJECT_SUB_PATH;
    return join(projectRoot, subPath);
  }

  const userHome = homedir();
  const userPrefix = config.userPath ?? join(userHome, DEFAULT_USER_PATH_PREFIX);
  const projectName = config.projectName ?? 'default';
  return join(userPrefix, projectName);
}

/**
 * 确保存储目录存在
 */
export async function ensureStorageDir(config: StorageConfig): Promise<string> {
  const storagePath = resolveStoragePath(config);
  await ensureDir(storagePath);
  logger.debug(`存储目录已就绪: ${storagePath}`);
  return storagePath;
}

/**
 * 检查存储目录是否已初始化（包含 metadata.json）
 */
export function isStorageInitialized(config: StorageConfig): boolean {
  const storagePath = resolveStoragePath(config);
  return pathExists(join(storagePath, 'metadata.json'));
}

/**
 * 获取存储目录中所有 skill 目录
 */
export async function listSkillDirs(config: StorageConfig): Promise<string[]> {
  const storagePath = resolveStoragePath(config);
  const entries = await listDir(storagePath);
  const dirs: string[] = [];

  for (const entry of entries) {
    if (await isDirectory(entry)) {
      const skillFile = join(entry, 'SKILL.md');
      if (pathExists(skillFile)) {
        dirs.push(entry);
      }
    }
  }

  return dirs;
}

/**
 * 删除指定 skill 目录
 */
export async function removeSkillDir(
  config: StorageConfig,
  skillName: string,
): Promise<boolean> {
  const storagePath = resolveStoragePath(config);
  const skillDir = join(storagePath, skillName);

  if (!pathExists(skillDir)) {
    logger.warn(`skill 目录不存在: ${skillDir}`);
    return false;
  }

  await removeDir(skillDir);
  logger.info(`已删除 skill 目录: ${skillDir}`);
  return true;
}

/**
 * 删除所有 skills（清理存储）
 */
export async function cleanStorage(config: StorageConfig): Promise<number> {
  const skillDirs = await listSkillDirs(config);
  let removedCount = 0;

  for (const dir of skillDirs) {
    await removeDir(dir);
    removedCount++;
  }

  // 同时删除 metadata.json
  const storagePath = resolveStoragePath(config);
  const metadataPath = join(storagePath, 'metadata.json');
  if (pathExists(metadataPath)) {
    await removeFile(metadataPath);
  }

  // 删除 config 目录
  const configDir = join(storagePath, 'config');
  if (pathExists(configDir)) {
    await removeDir(configDir);
  }

  logger.info(`已清理 ${removedCount} 个 skills`);
  return removedCount;
}

/**
 * 导出 skills 到指定目录
 */
export async function exportSkills(
  config: StorageConfig,
  targetDir: string,
): Promise<number> {
  const storagePath = resolveStoragePath(config);
  const files = await findFiles('**/*', storagePath);
  let copiedCount = 0;

  for (const file of files) {
    const relativePath = file.substring(storagePath.length);
    const targetPath = join(targetDir, relativePath);
    await copyFileSafe(file, targetPath);
    copiedCount++;
  }

  logger.info(`已导出 ${copiedCount} 个文件到: ${targetDir}`);
  return copiedCount;
}

/**
 * 从指定目录导入 skills
 */
export async function importSkills(
  config: StorageConfig,
  sourceDir: string,
): Promise<number> {
  const storagePath = resolveStoragePath(config);
  const files = await findFiles('**/*', sourceDir);
  let importedCount = 0;

  for (const file of files) {
    const relativePath = file.substring(sourceDir.length);
    const targetPath = join(storagePath, relativePath);
    await copyFileSafe(file, targetPath);
    importedCount++;
  }

  logger.info(`已导入 ${importedCount} 个文件从: ${sourceDir}`);
  return importedCount;
}
