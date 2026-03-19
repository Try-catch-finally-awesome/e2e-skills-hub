/**
 * SHA-256 哈希计算工具
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

/** 计算字符串的 SHA-256 哈希值 */
export function hashString(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

/** 计算文件的 SHA-256 哈希值 */
export async function hashFile(filePath: string): Promise<string> {
  const content = await readFile(filePath, 'utf-8');
  return hashString(content);
}

/** 返回带前缀的哈希值，格式为 sha256:xxxxxxxx */
export function formatHash(hash: string): string {
  return `sha256:${hash}`;
}

/** 计算字符串的带前缀 SHA-256 哈希 */
export function hashStringFormatted(content: string): string {
  return formatHash(hashString(content));
}

/** 计算文件的带前缀 SHA-256 哈希 */
export async function hashFileFormatted(filePath: string): Promise<string> {
  const hash = await hashFile(filePath);
  return formatHash(hash);
}
