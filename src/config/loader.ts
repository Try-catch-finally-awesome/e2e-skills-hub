/**
 * 配置加载与合并
 * 优先级: 命令行参数 > 项目级配置 > 用户级配置 > 默认值
 */

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import yaml from 'js-yaml';
import { readFileSafe, pathExists, writeFileSafe } from '../utils/file.js';
import logger from '../utils/logger.js';

/** 配置结构 */
export interface E2EConfig {
  storage: {
    location: 'project' | 'user';
    projectPath: string;
    userPath: string;
  };
  detection: {
    autoDetect: boolean;
    backend: {
      language: string;
      framework: string;
      orm: string;
      projectPath: string;
      port: number;
      buildCommand: string;
      testCommand: string;
    };
    frontend: {
      framework: string;
      projectPath: string;
      port: number;
      packageManager: string;
    };
  };
  execution: {
    maxFixRounds: number;
    maxSingleFix: number;
    testDataPrefix: string;
    screenshotOnFailure: boolean;
    cleanTestData: boolean;
  };
  mcp: {
    database: {
      name: string;
      database: string;
    };
    playwright: {
      name: string;
      browser: string;
    };
  };
  testAccount: {
    username: string;
    password: string;
    loginType: string;
  };
  report: {
    outputPath: string;
    format: string;
    includeScreenshots: boolean;
  };
  quality: {
    passScore: number;
    scoreWeights: {
      pageLoad: number;
      crudCorrectness: number;
      businessFlow: number;
      exceptionHandling: number;
      dataConsistency: number;
    };
  };
}

/** 默认配置文件的路径 */
function getDefaultsPath(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return join(dirname(currentFile), 'defaults.yaml');
}

/** 用户级配置文件路径 */
function getUserConfigPath(): string {
  return join(homedir(), '.claude', 'e2e-skills-hub.yaml');
}

/** 项目级配置文件路径 */
function getProjectConfigPath(projectRoot: string): string {
  return join(projectRoot, '.claude', 'e2e-skills-hub.yaml');
}

/**
 * 加载 YAML 配置文件
 */
async function loadYamlConfig(filePath: string): Promise<Record<string, unknown> | null> {
  const content = await readFileSafe(filePath);
  if (content === null) return null;

  try {
    const parsed = yaml.load(content);
    return (parsed as Record<string, unknown>) ?? null;
  } catch (err) {
    logger.warn(`配置文件解析失败: ${filePath}`);
    return null;
  }
}

/**
 * 深度合并两个对象
 * source 的值会覆盖 target 的值
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = result[key];

    if (
      sourceVal !== null &&
      sourceVal !== undefined &&
      sourceVal !== '' &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      typeof targetVal === 'object' &&
      targetVal !== null &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      );
    } else if (sourceVal !== null && sourceVal !== undefined && sourceVal !== '') {
      result[key] = sourceVal;
    }
  }

  return result;
}

/**
 * 将扁平的 key.path 格式转换为嵌套对象
 * "execution.maxFixRounds" → { execution: { maxFixRounds: value } }
 */
function flatToNested(flat: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current) || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  return result;
}

/**
 * 加载并合并所有层级的配置
 */
export async function loadConfig(
  projectRoot?: string,
  cliOverrides?: Record<string, unknown>,
): Promise<E2EConfig> {
  // 1. 加载默认配置
  const defaultsPath = getDefaultsPath();
  const defaults = await loadYamlConfig(defaultsPath);

  if (!defaults) {
    throw new Error(`默认配置文件不存在或解析失败: ${defaultsPath}`);
  }

  let merged = { ...defaults };

  // 2. 加载用户级配置
  const userConfigPath = getUserConfigPath();
  const userConfig = await loadYamlConfig(userConfigPath);
  if (userConfig) {
    merged = deepMerge(merged, userConfig);
    logger.debug(`已加载用户级配置: ${userConfigPath}`);
  }

  // 3. 加载项目级配置
  if (projectRoot) {
    const projectConfigPath = getProjectConfigPath(projectRoot);
    const projectConfig = await loadYamlConfig(projectConfigPath);
    if (projectConfig) {
      merged = deepMerge(merged, projectConfig);
      logger.debug(`已加载项目级配置: ${projectConfigPath}`);
    }
  }

  // 4. 应用命令行覆盖
  if (cliOverrides && Object.keys(cliOverrides).length > 0) {
    const nestedOverrides = flatToNested(cliOverrides);
    merged = deepMerge(merged, nestedOverrides);
    logger.debug(`已应用命令行参数覆盖`);
  }

  return merged as unknown as E2EConfig;
}

/**
 * 设置配置项（写入项目级配置文件）
 */
export async function setConfigValue(
  projectRoot: string,
  key: string,
  value: unknown,
): Promise<void> {
  const configPath = getProjectConfigPath(projectRoot);

  // 读取已有配置
  let config = (await loadYamlConfig(configPath)) ?? {};

  // 设置值
  const nested = flatToNested({ [key]: value });
  config = deepMerge(config, nested);

  // 写入文件
  const yamlContent = yaml.dump(config, { indent: 2, lineWidth: 120 });
  await writeFileSafe(configPath, yamlContent);

  logger.info(`已设置配置: ${key} = ${JSON.stringify(value)}`);
}

/**
 * 重置配置（删除项目级配置文件）
 */
export async function resetConfig(projectRoot: string): Promise<void> {
  const configPath = getProjectConfigPath(projectRoot);
  if (pathExists(configPath)) {
    const { removeFile } = await import('../utils/file.js');
    await removeFile(configPath);
    logger.info(`已重置项目级配置: ${configPath}`);
  }
}

/**
 * 获取配置值（支持 dot notation）
 */
export function getConfigValue(config: E2EConfig, key: string): unknown {
  const parts = key.split('.');
  let current: unknown = config;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}
