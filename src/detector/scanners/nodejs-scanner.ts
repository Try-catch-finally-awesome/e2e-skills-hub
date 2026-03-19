/**
 * Node.js 项目扫描器
 * 检测 package.json 中的 Express、NestJS、Koa 等后端框架
 */

import { join } from 'node:path';
import { readFileSafe, pathExists, findFiles } from '../../utils/file.js';
import type { ScannerResult } from '../types.js';
import logger from '../../utils/logger.js';

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

/** 安全解析 package.json */
function parsePackageJson(content: string): PackageJson | null {
  try {
    return JSON.parse(content) as PackageJson;
  } catch {
    return null;
  }
}

/** 获取依赖版本（去除 ^ ~ >= 等前缀） */
function getDependencyVersion(pkg: PackageJson, depName: string): string {
  const version =
    pkg.dependencies?.[depName] ?? pkg.devDependencies?.[depName] ?? '';
  return version.replace(/^[\^~>=<]+/, '');
}

/** 判断是否为 Node.js 后端项目（非纯前端） */
function isBackendProject(pkg: PackageJson): boolean {
  const deps = pkg.dependencies ?? {};
  const backendDeps = [
    'express',
    '@nestjs/core',
    'koa',
    'fastify',
    'hapi',
    '@hapi/hapi',
  ];
  return backendDeps.some((dep) => dep in deps);
}

/** 检测 ORM */
function detectOrm(pkg: PackageJson): string {
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

  if ('prisma' in deps || '@prisma/client' in deps) {
    return 'prisma';
  }
  if ('drizzle-orm' in deps) {
    return 'drizzle';
  }
  if ('typeorm' in deps) {
    return 'typeorm';
  }
  if ('sequelize' in deps) {
    return 'sequelize';
  }
  if ('mongoose' in deps) {
    return 'mongoose';
  }
  if ('knex' in deps) {
    return 'knex';
  }

  return '';
}

/** 检测数据库 */
function detectDatabase(pkg: PackageJson): string {
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

  if ('mysql2' in deps || 'mysql' in deps) {
    return 'mysql';
  }
  if ('pg' in deps || 'postgres' in deps) {
    return 'postgresql';
  }
  if ('better-sqlite3' in deps || 'sqlite3' in deps) {
    return 'sqlite';
  }
  if ('mongodb' in deps || 'mongoose' in deps) {
    return 'mongodb';
  }
  if ('mssql' in deps || 'tedious' in deps) {
    return 'sqlserver';
  }
  if ('redis' in deps || 'ioredis' in deps) {
    return 'redis';
  }

  return '';
}

/** 检测测试框架 */
function detectTestFramework(pkg: PackageJson): string {
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

  if ('vitest' in deps) return 'vitest';
  if ('jest' in deps) return 'jest';
  if ('mocha' in deps) return 'mocha';
  if ('@playwright/test' in deps) return 'playwright';

  return '';
}

/** 检测 NestJS 项目层级结构 */
async function detectNestJsLayers(
  projectPath: string,
): Promise<Partial<Record<string, string>>> {
  const layers: Record<string, string> = {};

  const controllerFiles = await findFiles('**/*.controller.ts', projectPath);
  if (controllerFiles.length > 0) {
    layers.controller = '**/*.controller.ts';
  }

  const serviceFiles = await findFiles('**/*.service.ts', projectPath);
  if (serviceFiles.length > 0) {
    layers.service = '**/*.service.ts';
  }

  const moduleFiles = await findFiles('**/*.module.ts', projectPath);
  if (moduleFiles.length > 0) {
    layers.repository = '**/*.module.ts';
  }

  const entityFiles = await findFiles('**/*.entity.ts', projectPath);
  if (entityFiles.length > 0) {
    layers.entity = '**/*.entity.ts';
  }

  const dtoFiles = await findFiles('**/*.dto.ts', projectPath);
  if (dtoFiles.length > 0) {
    layers.dto = '**/*.dto.ts';
  }

  return layers;
}

/** 检测 Express 项目层级结构 */
async function detectExpressLayers(
  projectPath: string,
): Promise<Partial<Record<string, string>>> {
  const layers: Record<string, string> = {};

  const routeFiles = await findFiles('**/routes/**/*.{ts,js}', projectPath);
  if (routeFiles.length > 0) {
    layers.controller = '**/routes/';
  }

  const controllerFiles = await findFiles('**/controllers/**/*.{ts,js}', projectPath);
  if (controllerFiles.length > 0) {
    layers.controller = '**/controllers/';
  }

  const serviceFiles = await findFiles('**/services/**/*.{ts,js}', projectPath);
  if (serviceFiles.length > 0) {
    layers.service = '**/services/';
  }

  const modelFiles = await findFiles('**/models/**/*.{ts,js}', projectPath);
  if (modelFiles.length > 0) {
    layers.entity = '**/models/';
    layers.repository = '**/models/';
  }

  const middlewareFiles = await findFiles('**/middleware/**/*.{ts,js}', projectPath);
  if (middlewareFiles.length > 0) {
    layers.dto = '**/middleware/';
  }

  return layers;
}

/** 扫描 Node.js 后端项目 */
export async function scan(projectPath: string): Promise<ScannerResult> {
  const warnings: string[] = [];
  const pkgPath = join(projectPath, 'package.json');
  const pkgContent = await readFileSafe(pkgPath);

  if (!pkgContent) {
    return { detected: false };
  }

  const pkg = parsePackageJson(pkgContent);
  if (!pkg) {
    return { detected: false, warnings: ['package.json 解析失败'] };
  }

  if (!isBackendProject(pkg)) {
    return { detected: false };
  }

  logger.info('检测到 Node.js 后端项目');

  const deps = pkg.dependencies ?? {};
  let framework = '';
  let frameworkVersion = '';

  // NestJS 检测
  if ('@nestjs/core' in deps) {
    framework = 'nestjs';
    frameworkVersion = getDependencyVersion(pkg, '@nestjs/core');
    logger.info(`检测到 NestJS，版本: ${frameworkVersion || '未知'}`);
  }
  // Express 检测
  else if ('express' in deps) {
    framework = 'express';
    frameworkVersion = getDependencyVersion(pkg, 'express');
    logger.info(`检测到 Express，版本: ${frameworkVersion || '未知'}`);
  }
  // Koa 检测
  else if ('koa' in deps) {
    framework = 'koa';
    frameworkVersion = getDependencyVersion(pkg, 'koa');
    logger.info(`检测到 Koa，版本: ${frameworkVersion || '未知'}`);
  }
  // Fastify 检测
  else if ('fastify' in deps) {
    framework = 'fastify';
    frameworkVersion = getDependencyVersion(pkg, 'fastify');
    logger.info(`检测到 Fastify，版本: ${frameworkVersion || '未知'}`);
  }

  if (!framework) {
    warnings.push('检测到 Node.js 项目，但未识别到已知后端框架');
    framework = 'unknown';
  }

  const orm = detectOrm(pkg);
  const database = detectDatabase(pkg);
  const testFramework = detectTestFramework(pkg);

  const layerStructure =
    framework === 'nestjs'
      ? await detectNestJsLayers(projectPath)
      : await detectExpressLayers(projectPath);

  // 检测 TypeScript
  const hasTsConfig = pathExists(join(projectPath, 'tsconfig.json'));

  return {
    detected: true,
    language: 'nodejs',
    framework,
    frameworkVersion,
    orm,
    database,
    buildTool: hasTsConfig ? 'tsc' : 'node',
    buildCommand: hasTsConfig ? 'npx tsc --noEmit' : 'node --check',
    testFramework,
    testCommand: testFramework === 'vitest' ? 'npx vitest' : testFramework === 'jest' ? 'npx jest' : 'npm test',
    port: 3000,
    layerStructure,
    warnings,
  };
}
