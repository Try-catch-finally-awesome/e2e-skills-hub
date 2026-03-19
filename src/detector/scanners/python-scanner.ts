/**
 * Python 项目扫描器
 * 检测 requirements.txt / pyproject.toml 中的 Django、FastAPI、Flask 等
 */

import { join } from 'node:path';
import { readFileSafe, pathExists, findFiles } from '../../utils/file.js';
import type { ScannerResult } from '../types.js';
import logger from '../../utils/logger.js';

/** 从 requirements.txt 中提取包版本 */
function extractRequirementsVersion(content: string, packageName: string): string {
  const regex = new RegExp(`^${packageName}[=~><!]=*([\\d.]+)`, 'mi');
  const match = content.match(regex);
  return match ? match[1] : '';
}

/** 从 pyproject.toml 中提取包版本 */
function extractPyprojectVersion(content: string, packageName: string): string {
  // 匹配 dependencies 中的 "django>=4.2"
  const regex = new RegExp(`["']${packageName}[><=~!]*([\\d.]+)?["']`, 'i');
  const match = content.match(regex);
  return match && match[1] ? match[1] : '';
}

/** 检测 ORM */
function detectOrm(
  reqContent: string | null,
  pyprojectContent: string | null,
  projectPath: string,
): string {
  const combined = (reqContent ?? '') + (pyprojectContent ?? '');

  if (/\bsqlalchemy\b/i.test(combined)) {
    return 'sqlalchemy';
  }

  // Django ORM 通过 settings.py 中的 DATABASES 判断
  // 但如果有 django，也默认关联 django-orm
  if (/\bdjango\b/i.test(combined)) {
    return 'django-orm';
  }

  return '';
}

/** 检测数据库 */
function detectDatabase(reqContent: string | null, pyprojectContent: string | null): string {
  const combined = (reqContent ?? '') + (pyprojectContent ?? '');

  if (/\bpymysql\b/i.test(combined) || /\bmysqlclient\b/i.test(combined) || /\bmysql-connector\b/i.test(combined)) {
    return 'mysql';
  }
  if (/\bpsycopg2\b/i.test(combined) || /\bpsycopg\b/i.test(combined) || /\basyncpg\b/i.test(combined)) {
    return 'postgresql';
  }
  if (/\bsqlite3\b/i.test(combined) || /\baiosqlite\b/i.test(combined)) {
    return 'sqlite';
  }
  if (/\bpymongo\b/i.test(combined) || /\bmotor\b/i.test(combined)) {
    return 'mongodb';
  }
  if (/\bpyodbc\b/i.test(combined) || /\bpymssql\b/i.test(combined) || /\baioodbc\b/i.test(combined)) {
    return 'sqlserver';
  }
  if (/\bredis\b/i.test(combined)) {
    return 'redis';
  }

  return '';
}

/** 检测测试框架 */
function detectTestFramework(
  reqContent: string | null,
  pyprojectContent: string | null,
): string {
  const combined = (reqContent ?? '') + (pyprojectContent ?? '');

  if (/\bpytest\b/i.test(combined) || /\[tool\.pytest\]/i.test(pyprojectContent ?? '')) {
    return 'pytest';
  }
  // Django 自带 unittest
  if (/\bdjango\b/i.test(combined)) {
    return 'django-test';
  }
  return '';
}

/** 检测 Django 项目层级结构 */
async function detectDjangoLayers(
  projectPath: string,
): Promise<Partial<Record<string, string>>> {
  const layers: Record<string, string> = {};

  const viewFiles = await findFiles('**/views.py', projectPath);
  const viewsetFiles = await findFiles('**/viewsets.py', projectPath);
  if (viewFiles.length > 0 || viewsetFiles.length > 0) {
    layers.controller = '**/views.py, **/viewsets.py';
  }

  const serializerFiles = await findFiles('**/serializers.py', projectPath);
  if (serializerFiles.length > 0) {
    layers.service = '**/serializers.py';
  }

  const modelFiles = await findFiles('**/models.py', projectPath);
  if (modelFiles.length > 0) {
    layers.entity = '**/models.py';
    layers.repository = '**/models.py';
  }

  const urlFiles = await findFiles('**/urls.py', projectPath);
  if (urlFiles.length > 0) {
    layers.dto = '**/urls.py';
  }

  return layers;
}

/** 检测 FastAPI/Flask 项目层级结构 */
async function detectApiLayers(
  projectPath: string,
): Promise<Partial<Record<string, string>>> {
  const layers: Record<string, string> = {};

  const routeFiles = await findFiles('**/route*.py', projectPath);
  const apiFiles = await findFiles('**/api/**/*.py', projectPath);
  if (routeFiles.length > 0 || apiFiles.length > 0) {
    layers.controller = '**/routes/, **/api/';
  }

  const serviceFiles = await findFiles('**/service*.py', projectPath);
  if (serviceFiles.length > 0) {
    layers.service = '**/services/';
  }

  const modelFiles = await findFiles('**/model*.py', projectPath);
  if (modelFiles.length > 0) {
    layers.entity = '**/models/';
  }

  const schemaFiles = await findFiles('**/schema*.py', projectPath);
  if (schemaFiles.length > 0) {
    layers.dto = '**/schemas/';
  }

  return layers;
}

/** 扫描 Python 项目 */
export async function scan(projectPath: string): Promise<ScannerResult> {
  const warnings: string[] = [];

  const reqPath = join(projectPath, 'requirements.txt');
  const pyprojectPath = join(projectPath, 'pyproject.toml');
  const setupPath = join(projectPath, 'setup.py');
  const managePath = join(projectPath, 'manage.py');

  const reqContent = await readFileSafe(reqPath);
  const pyprojectContent = await readFileSafe(pyprojectPath);
  const setupContent = await readFileSafe(setupPath);
  const hasManagedPy = pathExists(managePath);

  if (!reqContent && !pyprojectContent && !setupContent && !hasManagedPy) {
    return { detected: false };
  }

  logger.info('检测到 Python 项目');

  const depText = (reqContent ?? '') + (pyprojectContent ?? '') + (setupContent ?? '');
  let framework = '';
  let frameworkVersion = '';

  // Django 检测
  if (hasManagedPy || /\bdjango\b/i.test(depText)) {
    framework = 'django';
    frameworkVersion =
      extractRequirementsVersion(reqContent ?? '', 'django') ||
      extractRequirementsVersion(reqContent ?? '', 'Django') ||
      extractPyprojectVersion(pyprojectContent ?? '', 'django') ||
      extractPyprojectVersion(pyprojectContent ?? '', 'Django');
    logger.info(`检测到 Django，版本: ${frameworkVersion || '未知'}`);
  }

  // FastAPI 检测
  if (!framework && /\bfastapi\b/i.test(depText)) {
    framework = 'fastapi';
    frameworkVersion =
      extractRequirementsVersion(reqContent ?? '', 'fastapi') ||
      extractPyprojectVersion(pyprojectContent ?? '', 'fastapi');
    logger.info(`检测到 FastAPI，版本: ${frameworkVersion || '未知'}`);
  }

  // Flask 检测
  if (!framework && /\bflask\b/i.test(depText)) {
    framework = 'flask';
    frameworkVersion =
      extractRequirementsVersion(reqContent ?? '', 'flask') ||
      extractRequirementsVersion(reqContent ?? '', 'Flask') ||
      extractPyprojectVersion(pyprojectContent ?? '', 'flask');
    logger.info(`检测到 Flask，版本: ${frameworkVersion || '未知'}`);
  }

  if (!framework) {
    warnings.push('检测到 Python 项目，但未识别到已知 Web 框架');
    framework = 'unknown';
  }

  const orm = detectOrm(reqContent, pyprojectContent, projectPath);
  const database = detectDatabase(reqContent, pyprojectContent);
  const testFramework = detectTestFramework(reqContent, pyprojectContent);
  const layerStructure =
    framework === 'django'
      ? await detectDjangoLayers(projectPath)
      : await detectApiLayers(projectPath);

  let buildCommand = '';
  let testCommand = '';
  if (framework === 'django') {
    buildCommand = 'python manage.py check';
    testCommand = testFramework === 'pytest' ? 'pytest' : 'python manage.py test';
  } else {
    buildCommand = 'python -m py_compile';
    testCommand = 'pytest';
  }

  return {
    detected: true,
    language: 'python',
    framework,
    frameworkVersion,
    orm,
    database,
    buildTool: pyprojectContent ? 'pyproject' : 'pip',
    buildCommand,
    testFramework,
    testCommand,
    port: framework === 'django' ? 8000 : 8000,
    layerStructure,
    warnings,
  };
}
