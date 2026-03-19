/**
 * 技术栈检测引擎 — 入口
 * 协调各 scanner 完成项目技术栈的全面检测
 */

import { basename, join } from 'node:path';
import { scan as scanJava } from './scanners/java-scanner.js';
import { scan as scanPython } from './scanners/python-scanner.js';
import { scan as scanGo } from './scanners/go-scanner.js';
import { scan as scanDotnet } from './scanners/dotnet-scanner.js';
import { scan as scanNodejs } from './scanners/nodejs-scanner.js';
import { scan as scanFrontend } from './scanners/frontend-scanner.js';
import { pathExists } from '../utils/file.js';
import logger from '../utils/logger.js';
import type {
  TechStackDetectionResult,
  BackendDetection,
  FrontendDetection,
  Architecture,
  Confidence,
  ScannerResult,
  FrontendScannerResult,
  LayerStructure,
} from './types.js';

export type { TechStackDetectionResult } from './types.js';

/** 检测选项 */
export interface DetectOptions {
  /** 项目根路径 */
  projectPath: string;
  /** 前端项目路径（分离式项目时指定） */
  frontendPath?: string;
  /** 后端项目路径（分离式项目时指定） */
  backendPath?: string;
}

/** 默认的层级结构 */
function defaultLayerStructure(): LayerStructure {
  return {
    controller: '',
    service: '',
    repository: '',
    entity: '',
    dto: '',
    vo: '',
  };
}

/** 默认后端检测结果 */
function defaultBackendDetection(projectPath: string): BackendDetection {
  return {
    language: 'java',
    framework: '',
    frameworkVersion: '',
    orm: '',
    database: '',
    buildTool: '',
    buildCommand: '',
    testFramework: '',
    testCommand: '',
    projectPath,
    port: 8080,
    layerStructure: defaultLayerStructure(),
  };
}

/** 默认前端检测结果 */
function defaultFrontendDetection(projectPath: string): FrontendDetection {
  return {
    framework: '',
    frameworkVersion: '',
    uiLibrary: '',
    buildTool: '',
    packageManager: 'npm',
    typescript: false,
    projectPath,
    port: 3000,
    routerType: '',
    stateManagement: '',
  };
}

/** 将 ScannerResult 转换为 BackendDetection */
function scannerResultToBackend(
  result: ScannerResult,
  projectPath: string,
): BackendDetection {
  const layer = result.layerStructure ?? {};
  return {
    language: result.language ?? 'java',
    framework: result.framework ?? '',
    frameworkVersion: result.frameworkVersion ?? '',
    orm: result.orm ?? '',
    database: result.database ?? '',
    buildTool: result.buildTool ?? '',
    buildCommand: result.buildCommand ?? '',
    testFramework: result.testFramework ?? '',
    testCommand: result.testCommand ?? '',
    projectPath,
    port: result.port ?? 8080,
    layerStructure: {
      controller: layer.controller ?? '',
      service: layer.service ?? '',
      repository: layer.repository ?? '',
      entity: layer.entity ?? '',
      dto: layer.dto ?? '',
      vo: layer.vo ?? '',
    },
  };
}

/** 将 FrontendScannerResult 转换为 FrontendDetection */
function frontendResultToDetection(
  result: FrontendScannerResult,
  projectPath: string,
): FrontendDetection {
  return {
    framework: result.framework ?? '',
    frameworkVersion: result.frameworkVersion ?? '',
    uiLibrary: result.uiLibrary ?? '',
    buildTool: result.buildTool ?? '',
    packageManager: result.packageManager ?? 'npm',
    typescript: result.typescript ?? false,
    projectPath,
    port: result.port ?? 3000,
    routerType: result.routerType ?? '',
    stateManagement: result.stateManagement ?? '',
  };
}

/** 推断项目架构类型 */
function inferArchitecture(
  options: DetectOptions,
  hasBackend: boolean,
  hasFrontend: boolean,
): Architecture {
  // 用户指定了前后端分离路径
  if (options.frontendPath && options.backendPath) {
    return 'separated';
  }
  // 一个目录里同时有前端和后端
  if (hasBackend && hasFrontend && !options.frontendPath && !options.backendPath) {
    return 'monolith';
  }
  return 'separated';
}

/** 评估检测置信度 */
function evaluateConfidence(
  backend: BackendDetection,
  frontend: FrontendDetection,
): Confidence {
  let score = 0;

  if (backend.framework && backend.framework !== 'unknown') score += 2;
  if (backend.orm) score += 1;
  if (backend.database) score += 1;
  if (backend.testFramework) score += 1;
  if (frontend.framework) score += 2;
  if (frontend.uiLibrary) score += 1;
  if (frontend.buildTool) score += 1;

  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

/** 检测 MCP 工具可用性 */
function detectMcpAvailability(): { database: boolean; playwright: boolean } {
  // MCP 工具可用性在运行时由 Claude Code 环境决定
  // 这里返回默认值，实际使用时由配置覆盖
  return {
    database: false,
    playwright: false,
  };
}

/**
 * 执行项目技术栈检测
 * 协调所有 scanner 并汇总结果
 */
export async function detect(options: DetectOptions): Promise<TechStackDetectionResult> {
  const { projectPath, frontendPath, backendPath } = options;
  const allWarnings: string[] = [];

  logger.info(`开始检测项目技术栈: ${projectPath}`);

  const effectiveBackendPath = backendPath ?? projectPath;
  const effectiveFrontendPath = frontendPath ?? projectPath;

  // 并行运行所有后端 scanner
  const [javaResult, pythonResult, goResult, dotnetResult, nodejsResult] =
    await Promise.all([
      scanJava(effectiveBackendPath),
      scanPython(effectiveBackendPath),
      scanGo(effectiveBackendPath),
      scanDotnet(effectiveBackendPath),
      scanNodejs(effectiveBackendPath),
    ]);

  // 运行前端 scanner
  const frontendResult = await scanFrontend(effectiveFrontendPath);

  // 选取检测到的后端结果
  const backendResults: { result: ScannerResult; path: string }[] = [];
  if (javaResult.detected)
    backendResults.push({ result: javaResult, path: effectiveBackendPath });
  if (pythonResult.detected)
    backendResults.push({ result: pythonResult, path: effectiveBackendPath });
  if (goResult.detected)
    backendResults.push({ result: goResult, path: effectiveBackendPath });
  if (dotnetResult.detected)
    backendResults.push({ result: dotnetResult, path: effectiveBackendPath });
  if (nodejsResult.detected)
    backendResults.push({ result: nodejsResult, path: effectiveBackendPath });

  // 合并警告
  for (const { result } of backendResults) {
    if (result.warnings) allWarnings.push(...result.warnings);
  }
  if (frontendResult.warnings) allWarnings.push(...frontendResult.warnings);

  // 多个后端被检测到时发出警告
  if (backendResults.length > 1) {
    allWarnings.push(
      `检测到多种后端技术栈 (${backendResults.map((r) => r.result.language).join(', ')})，将使用第一个检测结果`,
    );
  }

  // 构建后端检测结果
  let backend: BackendDetection;
  if (backendResults.length > 0) {
    const primaryBackend = backendResults[0];
    backend = scannerResultToBackend(primaryBackend.result, primaryBackend.path);
  } else {
    allWarnings.push('未检测到任何已知的后端技术栈');
    backend = defaultBackendDetection(effectiveBackendPath);
  }

  // 构建前端检测结果
  let frontend: FrontendDetection;
  if (frontendResult.detected) {
    frontend = frontendResultToDetection(frontendResult, effectiveFrontendPath);
  } else {
    allWarnings.push('未检测到任何已知的前端框架');
    frontend = defaultFrontendDetection(effectiveFrontendPath);
  }

  const hasBackend = backendResults.length > 0;
  const hasFrontend = frontendResult.detected;
  const architecture = inferArchitecture(options, hasBackend, hasFrontend);
  const confidence = evaluateConfidence(backend, frontend);
  const mcp = detectMcpAvailability();

  const result: TechStackDetectionResult = {
    projectName: basename(projectPath),
    projectRoot: projectPath,
    architecture,
    backend,
    frontend,
    mcp,
    confidence,
    warnings: allWarnings,
  };

  logger.info(`技术栈检测完成，置信度: ${confidence}`);
  if (hasBackend) {
    logger.info(`  后端: ${backend.language} / ${backend.framework} / ${backend.orm || '无 ORM'}`);
  }
  if (hasFrontend) {
    logger.info(`  前端: ${frontend.framework} / ${frontend.uiLibrary || '无 UI 库'}`);
  }

  return result;
}
