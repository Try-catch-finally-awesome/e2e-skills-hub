/**
 * 文件操作工具
 */

import { readFile, writeFile, mkdir, readdir, stat, rm, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { glob } from 'glob';

/** 安全地读取文件内容，文件不存在时返回 null */
export async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/** 写入文件，自动创建父目录 */
export async function writeFileSafe(filePath: string, content: string): Promise<void> {
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, content, 'utf-8');
}

/** 检查文件或目录是否存在 */
export function pathExists(filePath: string): boolean {
  return existsSync(filePath);
}

/** 递归查找匹配模式的文件 */
export async function findFiles(pattern: string, cwd: string): Promise<string[]> {
  return glob(pattern, { cwd, absolute: true, nodir: true });
}

/** 获取文件的扩展名（不含点号） */
export function getExtension(filePath: string): string {
  return extname(filePath).slice(1);
}

/** 确保目录存在 */
export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

/** 递归删除目录 */
export async function removeDir(dirPath: string): Promise<void> {
  if (existsSync(dirPath)) {
    await rm(dirPath, { recursive: true, force: true });
  }
}

/** 删除单个文件 */
export async function removeFile(filePath: string): Promise<void> {
  if (existsSync(filePath)) {
    await rm(filePath, { force: true });
  }
}

/** 复制文件，自动创建目标目录 */
export async function copyFileSafe(src: string, dest: string): Promise<void> {
  await ensureDir(dirname(dest));
  await copyFile(src, dest);
}

/** 列出目录中的直接子条目 */
export async function listDir(dirPath: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath);
    return entries.map((e) => join(dirPath, e));
  } catch {
    return [];
  }
}

/** 判断路径是否为目录 */
export async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const s = await stat(filePath);
    return s.isDirectory();
  } catch {
    return false;
  }
}

/** 将路径转为绝对路径 */
export function toAbsolute(filePath: string, basePath: string): string {
  return resolve(basePath, filePath);
}
