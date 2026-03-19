/**
 * PHP 项目扫描器
 * 检测 composer.json 中的 ThinkPHP、Laravel、Swoole 等
 */

import { join } from 'node:path';
import { readFileSafe, pathExists, findFiles } from '../../utils/file.js';
import type { ScannerResult } from '../types.js';
import logger from '../../utils/logger.js';

interface ComposerJson {
  name?: string;
  require?: Record<string, string>;
  'require-dev'?: Record<string, string>;
  extra?: Record<string, unknown>;
}

/** 安全解析 composer.json */
function parseComposerJson(content: string): ComposerJson | null {
  try {
    return JSON.parse(content) as ComposerJson;
  } catch {
    return null;
  }
}

/** 获取依赖版本（去除 ^ ~ >= 等前缀） */
function getDependencyVersion(
  composer: ComposerJson,
  depName: string,
): string {
  const version =
    composer.require?.[depName] ??
    composer['require-dev']?.[depName] ??
    '';
  return version.replace(/^[\^~>=<|*\s]+/, '');
}

/** 检测框架 */
function detectFramework(composer: ComposerJson): {
  framework: string;
  frameworkVersion: string;
} {
  const deps = composer.require ?? {};

  // Swoole / Hyperf 检测（优先于其他框架，因为 Hyperf 可能同时依赖其他包）
  if (
    'swoole/swoole-src' in deps ||
    'hyperf/hyperf' in deps ||
    'hyperf/framework' in deps
  ) {
    const version =
      getDependencyVersion(composer, 'hyperf/hyperf') ||
      getDependencyVersion(composer, 'hyperf/framework') ||
      getDependencyVersion(composer, 'swoole/swoole-src');
    return { framework: 'swoole', frameworkVersion: version };
  }

  // Laravel 检测
  if ('laravel/framework' in deps) {
    const version = getDependencyVersion(composer, 'laravel/framework');
    return { framework: 'laravel', frameworkVersion: version };
  }

  // ThinkPHP 检测
  if ('topthink/framework' in deps) {
    const version = getDependencyVersion(composer, 'topthink/framework');
    return { framework: 'thinkphp', frameworkVersion: version };
  }

  return { framework: '', frameworkVersion: '' };
}

/** 检测 ORM */
function detectOrm(composer: ComposerJson, framework: string): string {
  const deps = composer.require ?? {};

  // Laravel 自带 Eloquent
  if (framework === 'laravel') {
    return 'eloquent';
  }

  // ThinkPHP ORM
  if ('topthink/think-orm' in deps) {
    return 'think-orm';
  }

  // Doctrine ORM
  if ('doctrine/orm' in deps) {
    return 'doctrine';
  }

  return '';
}

/** 检测数据库 */
function detectDatabase(composer: ComposerJson): string {
  const deps = { ...(composer.require ?? {}), ...(composer['require-dev'] ?? {}) };
  const depKeys = Object.keys(deps).join(' ');

  // MySQL
  if (
    depKeys.includes('mysql') ||
    depKeys.includes('pdo_mysql') ||
    'ext-pdo_mysql' in deps ||
    'ext-mysql' in deps
  ) {
    return 'mysql';
  }

  // PostgreSQL
  if (
    depKeys.includes('pgsql') ||
    depKeys.includes('pdo_pgsql') ||
    'ext-pdo_pgsql' in deps ||
    'ext-pgsql' in deps
  ) {
    return 'postgresql';
  }

  // SQL Server
  if (
    'ext-sqlsrv' in deps ||
    'ext-pdo_sqlsrv' in deps ||
    depKeys.includes('sqlsrv') ||
    depKeys.includes('pdo_sqlsrv')
  ) {
    return 'sqlserver';
  }

  // Redis
  if ('predis/predis' in deps || 'ext-redis' in deps) {
    return 'redis';
  }

  // MongoDB
  if ('mongodb/mongodb' in deps || 'ext-mongodb' in deps) {
    return 'mongodb';
  }

  return '';
}

/** 检测测试框架 */
function detectTestFramework(composer: ComposerJson): string {
  const devDeps = composer['require-dev'] ?? {};

  if ('phpunit/phpunit' in devDeps) {
    return 'phpunit';
  }

  // 也检查 require 中
  const deps = composer.require ?? {};
  if ('phpunit/phpunit' in deps) {
    return 'phpunit';
  }

  return '';
}

/** 检测 ThinkPHP 项目层级结构 */
async function detectThinkPhpLayers(
  projectPath: string,
): Promise<Partial<Record<string, string>>> {
  const layers: Record<string, string> = {};

  const controllerFiles = await findFiles('**/controller/**/*.php', projectPath);
  if (controllerFiles.length > 0) {
    layers.controller = 'app/controller/';
  }

  const modelFiles = await findFiles('**/model/**/*.php', projectPath);
  if (modelFiles.length > 0) {
    layers.entity = 'app/model/';
    layers.repository = 'app/model/';
  }

  const serviceFiles = await findFiles('**/service/**/*.php', projectPath);
  if (serviceFiles.length > 0) {
    layers.service = 'app/service/';
  }

  const validateFiles = await findFiles('**/validate/**/*.php', projectPath);
  if (validateFiles.length > 0) {
    layers.dto = 'app/validate/';
  }

  const routeFiles = await findFiles('route/**/*.php', projectPath);
  if (routeFiles.length > 0) {
    layers.vo = 'route/';
  }

  return layers;
}

/** 检测 Laravel 项目层级结构 */
async function detectLaravelLayers(
  projectPath: string,
): Promise<Partial<Record<string, string>>> {
  const layers: Record<string, string> = {};

  const controllerFiles = await findFiles('**/Http/Controllers/**/*.php', projectPath);
  if (controllerFiles.length > 0) {
    layers.controller = 'app/Http/Controllers/';
  }

  const modelFiles = await findFiles('**/Models/**/*.php', projectPath);
  if (modelFiles.length > 0) {
    layers.entity = 'app/Models/';
    layers.repository = 'app/Models/';
  }

  const serviceFiles = await findFiles('**/Services/**/*.php', projectPath);
  if (serviceFiles.length > 0) {
    layers.service = 'app/Services/';
  }

  const requestFiles = await findFiles('**/Http/Requests/**/*.php', projectPath);
  if (requestFiles.length > 0) {
    layers.dto = 'app/Http/Requests/';
  }

  const resourceFiles = await findFiles('**/Http/Resources/**/*.php', projectPath);
  if (resourceFiles.length > 0) {
    layers.vo = 'app/Http/Resources/';
  }

  return layers;
}

/** 检测 Swoole/Hyperf 项目层级结构 */
async function detectSwooleLayers(
  projectPath: string,
): Promise<Partial<Record<string, string>>> {
  const layers: Record<string, string> = {};

  // Hyperf 风格: app/Controller/
  const controllerFiles = await findFiles('**/Controller/**/*.php', projectPath);
  if (controllerFiles.length > 0) {
    layers.controller = 'app/Controller/';
  }

  const modelFiles = await findFiles('**/Model/**/*.php', projectPath);
  if (modelFiles.length > 0) {
    layers.entity = 'app/Model/';
    layers.repository = 'app/Model/';
  }

  const serviceFiles = await findFiles('**/Service/**/*.php', projectPath);
  if (serviceFiles.length > 0) {
    layers.service = 'app/Service/';
  }

  const requestFiles = await findFiles('**/Request/**/*.php', projectPath);
  if (requestFiles.length > 0) {
    layers.dto = 'app/Request/';
  }

  const processFiles = await findFiles('**/Process/**/*.php', projectPath);
  if (processFiles.length > 0) {
    layers.vo = 'app/Process/';
  }

  return layers;
}

/** 从配置文件检测端口 */
async function detectPort(
  projectPath: string,
  framework: string,
): Promise<number> {
  if (framework === 'laravel') {
    // Laravel 默认端口 8000 (php artisan serve)
    const envPath = join(projectPath, '.env');
    const envContent = await readFileSafe(envPath);
    if (envContent) {
      const match = envContent.match(/APP_PORT\s*=\s*(\d+)/);
      if (match) return parseInt(match[1], 10);
    }
    return 8000;
  }

  if (framework === 'thinkphp') {
    // ThinkPHP 默认端口 8000
    return 8000;
  }

  if (framework === 'swoole') {
    // Swoole/Hyperf 默认端口 9501
    const serverConfigPath = join(projectPath, 'config', 'autoload', 'server.php');
    const serverContent = await readFileSafe(serverConfigPath);
    if (serverContent) {
      const match = serverContent.match(/['"]port['"]\s*=>\s*(\d+)/);
      if (match) return parseInt(match[1], 10);
    }
    return 9501;
  }

  return 8000;
}

/** 扫描 PHP 项目 */
export async function scan(projectPath: string): Promise<ScannerResult> {
  const warnings: string[] = [];
  const composerPath = join(projectPath, 'composer.json');
  const composerContent = await readFileSafe(composerPath);

  if (!composerContent) {
    return { detected: false };
  }

  const composer = parseComposerJson(composerContent);
  if (!composer) {
    return { detected: false, warnings: ['composer.json 解析失败'] };
  }

  // 确保是 PHP 项目（有 require 段）
  if (!composer.require && !composer['require-dev']) {
    return { detected: false };
  }

  logger.info('检测到 PHP 项目');

  const { framework, frameworkVersion } = detectFramework(composer);

  if (!framework) {
    // 有 composer.json 但无已知框架，仍然标记为 PHP 项目
    warnings.push('检测到 PHP 项目，但未识别到已知 Web 框架');
  }

  const effectiveFramework = framework || 'unknown';

  if (framework) {
    logger.info(`检测到 ${framework}，版本: ${frameworkVersion || '未知'}`);
  }

  const orm = detectOrm(composer, effectiveFramework);
  const database = detectDatabase(composer);
  const testFramework = detectTestFramework(composer);

  // 根据框架检测层级结构
  let layerStructure: Partial<Record<string, string>> = {};
  if (effectiveFramework === 'thinkphp') {
    layerStructure = await detectThinkPhpLayers(projectPath);
  } else if (effectiveFramework === 'laravel') {
    layerStructure = await detectLaravelLayers(projectPath);
  } else if (effectiveFramework === 'swoole') {
    layerStructure = await detectSwooleLayers(projectPath);
  }

  // 构建/检查命令
  let buildCommand = 'php -l';
  if (effectiveFramework === 'laravel') {
    buildCommand = 'php artisan about';
  } else if (effectiveFramework === 'thinkphp') {
    buildCommand = 'php think version';
  } else if (effectiveFramework === 'swoole') {
    buildCommand = 'php -m | grep swoole';
  }

  // 测试命令
  let testCommand = '';
  if (testFramework === 'phpunit') {
    testCommand = 'vendor/bin/phpunit';
  }

  const port = await detectPort(projectPath, effectiveFramework);

  return {
    detected: true,
    language: 'php',
    framework: effectiveFramework,
    frameworkVersion,
    orm,
    database,
    buildTool: 'composer',
    buildCommand,
    testFramework,
    testCommand,
    port,
    layerStructure,
    warnings,
  };
}
