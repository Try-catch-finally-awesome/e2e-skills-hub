/**
 * Go 项目扫描器
 * 检测 go.mod 中的 Gin、Echo、Fiber 等
 */

import { join } from 'node:path';
import { readFileSafe, findFiles } from '../../utils/file.js';
import type { ScannerResult } from '../types.js';
import logger from '../../utils/logger.js';

/** 从 go.mod 的 require 块中提取模块版本 */
function extractGoModVersion(content: string, modulePath: string): string {
  const regex = new RegExp(`${modulePath.replace(/\//g, '\\/')}\\s+(v[\\d.]+)`, 'i');
  const match = content.match(regex);
  return match ? match[1] : '';
}

/** 检测 ORM */
function detectOrm(content: string): string {
  if (content.includes('gorm.io/gorm')) {
    return 'gorm';
  }
  if (content.includes('github.com/jmoiron/sqlx')) {
    return 'sqlx';
  }
  if (content.includes('entgo.io/ent')) {
    return 'ent';
  }
  return '';
}

/** 检测数据库驱动 */
function detectDatabase(content: string): string {
  if (content.includes('go-sql-driver/mysql') || content.includes('gorm.io/driver/mysql')) {
    return 'mysql';
  }
  if (content.includes('lib/pq') || content.includes('jackc/pgx') || content.includes('gorm.io/driver/postgres')) {
    return 'postgresql';
  }
  if (content.includes('mattn/go-sqlite3') || content.includes('gorm.io/driver/sqlite')) {
    return 'sqlite';
  }
  if (content.includes('go.mongodb.org/mongo-driver')) {
    return 'mongodb';
  }
  if (content.includes('denisenkom/go-mssqldb') || content.includes('microsoft/go-mssqldb') || content.includes('gorm.io/driver/sqlserver')) {
    return 'sqlserver';
  }
  if (content.includes('go-redis/redis') || content.includes('redis/go-redis')) {
    return 'redis';
  }
  return '';
}

/** 检测 Go 项目层级结构 */
async function detectLayerStructure(
  projectPath: string,
): Promise<Partial<Record<string, string>>> {
  const layers: Record<string, string> = {};

  const handlerFiles = await findFiles('**/handler/**/*.go', projectPath);
  const controllerFiles = await findFiles('**/controller/**/*.go', projectPath);
  const apiFiles = await findFiles('**/api/**/*.go', projectPath);
  if (handlerFiles.length > 0) {
    layers.controller = '**/handler/';
  } else if (controllerFiles.length > 0) {
    layers.controller = '**/controller/';
  } else if (apiFiles.length > 0) {
    layers.controller = '**/api/';
  }

  const serviceFiles = await findFiles('**/service/**/*.go', projectPath);
  if (serviceFiles.length > 0) {
    layers.service = '**/service/';
  }

  const repoFiles = await findFiles('**/repository/**/*.go', projectPath);
  const daoFiles = await findFiles('**/dao/**/*.go', projectPath);
  if (repoFiles.length > 0) {
    layers.repository = '**/repository/';
  } else if (daoFiles.length > 0) {
    layers.repository = '**/dao/';
  }

  const modelFiles = await findFiles('**/model/**/*.go', projectPath);
  if (modelFiles.length > 0) {
    layers.entity = '**/model/';
  }

  const dtoFiles = await findFiles('**/dto/**/*.go', projectPath);
  const requestFiles = await findFiles('**/request/**/*.go', projectPath);
  if (dtoFiles.length > 0) {
    layers.dto = '**/dto/';
  } else if (requestFiles.length > 0) {
    layers.dto = '**/request/';
  }

  const voFiles = await findFiles('**/vo/**/*.go', projectPath);
  const responseFiles = await findFiles('**/response/**/*.go', projectPath);
  if (voFiles.length > 0) {
    layers.vo = '**/vo/';
  } else if (responseFiles.length > 0) {
    layers.vo = '**/response/';
  }

  return layers;
}

/** 检测是否有测试文件 */
async function hasTestFiles(projectPath: string): Promise<boolean> {
  const testFiles = await findFiles('**/*_test.go', projectPath);
  return testFiles.length > 0;
}

/** 扫描 Go 项目 */
export async function scan(projectPath: string): Promise<ScannerResult> {
  const warnings: string[] = [];
  const goModPath = join(projectPath, 'go.mod');
  const goModContent = await readFileSafe(goModPath);

  if (!goModContent) {
    return { detected: false };
  }

  logger.info('检测到 Go 项目');

  let framework = '';
  let frameworkVersion = '';

  // Gin 检测
  if (goModContent.includes('github.com/gin-gonic/gin')) {
    framework = 'gin';
    frameworkVersion = extractGoModVersion(goModContent, 'github.com/gin-gonic/gin');
    logger.info(`检测到 Gin，版本: ${frameworkVersion || '未知'}`);
  }

  // Echo 检测
  if (!framework && goModContent.includes('github.com/labstack/echo')) {
    framework = 'echo';
    frameworkVersion = extractGoModVersion(goModContent, 'github.com/labstack/echo');
    logger.info(`检测到 Echo，版本: ${frameworkVersion || '未知'}`);
  }

  // Fiber 检测
  if (!framework && goModContent.includes('github.com/gofiber/fiber')) {
    framework = 'fiber';
    frameworkVersion = extractGoModVersion(goModContent, 'github.com/gofiber/fiber');
    logger.info(`检测到 Fiber，版本: ${frameworkVersion || '未知'}`);
  }

  if (!framework) {
    warnings.push('检测到 Go 项目，但未识别到已知 Web 框架');
    framework = 'unknown';
  }

  const orm = detectOrm(goModContent);
  const database = detectDatabase(goModContent);
  const hasTests = await hasTestFiles(projectPath);
  const layerStructure = await detectLayerStructure(projectPath);

  return {
    detected: true,
    language: 'go',
    framework,
    frameworkVersion,
    orm,
    database,
    buildTool: 'go-modules',
    buildCommand: 'go build ./...',
    testFramework: hasTests ? 'go-testing' : '',
    testCommand: 'go test ./...',
    port: 8080,
    layerStructure,
    warnings,
  };
}
