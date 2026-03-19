/**
 * Skills 生成引擎 — 入口
 * 根据技术栈检测结果，渲染 Handlebars 模板生成 SKILL.md 文件
 */

import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderAllSkills, type RendererConfig } from './renderer.js';
import { writeFileSafe } from '../utils/file.js';
import { hashStringFormatted } from '../utils/hash.js';
import logger from '../utils/logger.js';
import type {
  GenerateOptions,
  GenerateResult,
  GeneratedSkill,
  TemplateContext,
} from './types.js';
import { SKILL_TEMPLATE_NAMES } from './types.js';
import type { TechStackDetectionResult } from '../detector/types.js';

export type { GenerateOptions, GenerateResult, GeneratedSkill, TemplateContext } from './types.js';

/** 从插件安装路径推断模板根目录 */
function resolveRootDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  // src/generator/index.ts → 项目根目录
  return join(dirname(currentFile), '..', '..');
}

/** 根据后端框架推断健康检查端点 */
function inferHealthCheck(detection: TechStackDetectionResult): string {
  const { framework, port } = detection.backend;
  switch (framework) {
    case 'spring-boot':
      return `http://localhost:${port}/actuator/health`;
    case 'django':
      return `http://localhost:${port}/admin/`;
    case 'fastapi':
      return `http://localhost:${port}/docs`;
    case 'gin':
    case 'echo':
    case 'fiber':
      return `http://localhost:${port}/health`;
    case 'express':
    case 'nestjs':
    case 'koa':
      return `http://localhost:${port}/health`;
    case 'aspnet-core':
      return `http://localhost:${port}/health`;
    default:
      return `http://localhost:${port}/`;
  }
}

/** 根据前端框架推断构建命令 */
function inferFrontendBuildCommand(detection: TechStackDetectionResult): string {
  const { packageManager } = detection.frontend;
  const runCmd = packageManager === 'npm' ? 'npm run' : packageManager;
  return `${runCmd} build`;
}

/** 构建模板上下文数据 */
export function buildTemplateContext(
  detection: TechStackDetectionResult,
  configOverrides?: Record<string, unknown>,
): TemplateContext {
  const backendProjectName = basename(detection.backend.projectPath);
  const frontendProjectName = basename(detection.frontend.projectPath);

  return {
    backend: {
      language: detection.backend.language,
      framework: detection.backend.framework,
      frameworkVersion: detection.backend.frameworkVersion,
      orm: detection.backend.orm,
      database: detection.backend.database,
      buildTool: detection.backend.buildTool,
      buildCommand: detection.backend.buildCommand,
      testFramework: detection.backend.testFramework,
      testCommand: detection.backend.testCommand,
      projectPath: detection.backend.projectPath,
      projectName: backendProjectName,
      port: detection.backend.port,
      healthCheck: inferHealthCheck(detection),
      layerStructure: detection.backend.layerStructure,
    },
    frontend: {
      framework: detection.frontend.framework,
      frameworkVersion: detection.frontend.frameworkVersion,
      uiLibrary: detection.frontend.uiLibrary,
      buildTool: detection.frontend.buildTool,
      buildCommand: inferFrontendBuildCommand(detection),
      packageManager: detection.frontend.packageManager,
      typescript: detection.frontend.typescript,
      projectPath: detection.frontend.projectPath,
      projectName: frontendProjectName,
      port: detection.frontend.port,
      routerType: detection.frontend.routerType,
      stateManagement: detection.frontend.stateManagement,
    },
    mcp: {
      database: {
        available: detection.mcp.database,
        name: (configOverrides?.['mcp.database.name'] as string) ?? '',
        database: (configOverrides?.['mcp.database.database'] as string) ?? '',
      },
      playwright: {
        available: detection.mcp.playwright,
        name: 'playwright',
      },
    },
    config: {
      maxFixRounds: (configOverrides?.['execution.maxFixRounds'] as number) ?? 20,
      maxSingleFix: (configOverrides?.['execution.maxSingleFix'] as number) ?? 3,
      testDataPrefix: (configOverrides?.['execution.testDataPrefix'] as string) ?? 'TEST_',
      report: {
        outputPath: (configOverrides?.['report.outputPath'] as string) ?? 'doc/测试报告',
      },
      quality: {
        passScore: (configOverrides?.['quality.passScore'] as number) ?? 90,
        scoreWeights: {
          pageLoad: 15,
          crudCorrectness: 30,
          businessFlow: 25,
          exceptionHandling: 15,
          dataConsistency: 15,
        },
      },
    },
  };
}

/**
 * 生成 Skills
 * 渲染所有模板并写入目标目录
 */
export async function generate(options: GenerateOptions): Promise<GenerateResult> {
  const { detection, outputDir, force, only, configOverrides } = options;
  const errors: string[] = [];
  const skills: GeneratedSkill[] = [];

  logger.info(`开始生成 Skills，输出目录: ${outputDir}`);

  // 构建模板上下文
  const context = buildTemplateContext(detection, configOverrides);

  // 确定模板根目录
  const rootDir = resolveRootDir();
  const rendererConfig: RendererConfig = { rootDir };

  // 渲染所有模板
  let renderedSkills: Map<string, string>;
  try {
    renderedSkills = await renderAllSkills(rendererConfig, context, only);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
    return { success: false, skills: [], metadataPath: '', errors };
  }

  // 写入文件
  for (const [name, content] of renderedSkills) {
    const relativePath = `${name}/SKILL.md`;
    const absolutePath = join(outputDir, relativePath);

    try {
      await writeFileSafe(absolutePath, content);
      const hash = hashStringFormatted(content);
      skills.push({ name, relativePath, absolutePath, hash });
      logger.info(`已生成: ${relativePath}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`写入 ${relativePath} 失败: ${message}`);
    }
  }

  // 生成 metadata.json
  const metadataPath = join(outputDir, 'metadata.json');
  const metadata = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    generatedBy: 'e2e-skills-hub@1.0.0',
    techStack: {
      backend: {
        language: detection.backend.language,
        framework: detection.backend.framework,
        orm: detection.backend.orm,
      },
      frontend: {
        framework: detection.frontend.framework,
        uiLibrary: detection.frontend.uiLibrary,
      },
      database: detection.backend.database,
    },
    skills: skills.map((s) => ({
      name: s.name,
      path: s.relativePath,
      hash: s.hash,
    })),
    updateHistory: [
      {
        timestamp: new Date().toISOString(),
        type: 'full',
        description: '初始生成',
        changedSkills: ['all'],
      },
    ],
  };

  try {
    await writeFileSafe(metadataPath, JSON.stringify(metadata, null, 2));
    logger.info('已生成 metadata.json');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`写入 metadata.json 失败: ${message}`);
  }

  const success = errors.length === 0;
  if (success) {
    logger.info(`Skills 生成完成，共 ${skills.length} 个文件`);
  } else {
    logger.error(`Skills 生成出现 ${errors.length} 个错误`);
  }

  return { success, skills, metadataPath, errors };
}
