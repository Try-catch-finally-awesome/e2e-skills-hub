/**
 * Skills 生成引擎 — 类型定义
 */

import type { TechStackDetectionResult } from '../detector/types.js';

/** 生成的单个 Skill 信息 */
export interface GeneratedSkill {
  /** Skill 名称，如 e2e-orchestrator */
  name: string;
  /** 相对输出目录的路径，如 e2e-orchestrator/SKILL.md */
  relativePath: string;
  /** 生成的文件绝对路径 */
  absolutePath: string;
  /** 文件内容的 SHA-256 哈希 */
  hash: string;
}

/** 生成选项 */
export interface GenerateOptions {
  /** 技术栈检测结果 */
  detection: TechStackDetectionResult;
  /** 输出目录的绝对路径 */
  outputDir: string;
  /** 是否强制覆盖已有文件 */
  force?: boolean;
  /** 只生成指定的 skill 名称列表 */
  only?: string[];
  /** 用户自定义配置覆盖 */
  configOverrides?: Record<string, unknown>;
}

/** 生成结果 */
export interface GenerateResult {
  /** 是否成功 */
  success: boolean;
  /** 生成的 skill 文件列表 */
  skills: GeneratedSkill[];
  /** metadata.json 路径 */
  metadataPath: string;
  /** 错误消息（如有） */
  errors: string[];
}

/** Handlebars 模板的上下文数据 */
export interface TemplateContext {
  /** 后端信息 */
  backend: {
    language: string;
    framework: string;
    frameworkVersion: string;
    orm: string;
    database: string;
    buildTool: string;
    buildCommand: string;
    testFramework: string;
    testCommand: string;
    projectPath: string;
    projectName: string;
    port: number;
    healthCheck: string;
    layerStructure: {
      controller: string;
      service: string;
      repository: string;
      entity: string;
      dto: string;
      vo: string;
    };
  };
  /** 前端信息 */
  frontend: {
    framework: string;
    frameworkVersion: string;
    uiLibrary: string;
    buildTool: string;
    buildCommand: string;
    packageManager: string;
    typescript: boolean;
    projectPath: string;
    projectName: string;
    port: number;
    routerType: string;
    stateManagement: string;
  };
  /** MCP 工具信息 */
  mcp: {
    database: {
      available: boolean;
      name: string;
      database: string;
    };
    playwright: {
      available: boolean;
      name: string;
    };
  };
  /** 配置 */
  config: {
    maxFixRounds: number;
    maxSingleFix: number;
    testDataPrefix: string;
    report: {
      outputPath: string;
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
  };
  /** 测试账号 */
  testAccount?: {
    username: string;
    password: string;
    loginType: string;
  };
}

/** 六个 skill 模板名称 */
export const SKILL_TEMPLATE_NAMES = [
  'e2e-orchestrator',
  'e2e-code-tracer',
  'e2e-testcase-generator',
  'e2e-playwright-runner',
  'e2e-error-fixer',
  'e2e-report-generator',
] as const;

export type SkillTemplateName = (typeof SKILL_TEMPLATE_NAMES)[number];
