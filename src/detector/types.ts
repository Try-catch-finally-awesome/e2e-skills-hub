/**
 * 技术栈检测引擎 — 类型定义
 */

/** 后端语言 */
export type BackendLanguage = 'java' | 'python' | 'go' | 'dotnet' | 'nodejs' | 'php';

/** 项目架构类型 */
export type Architecture = 'monolith' | 'separated' | 'microservice';

/** 检测置信度 */
export type Confidence = 'high' | 'medium' | 'low';

/** 后端项目层级结构 */
export interface LayerStructure {
  controller: string;
  service: string;
  repository: string;
  entity: string;
  dto: string;
  vo: string;
}

/** 后端检测结果 */
export interface BackendDetection {
  language: BackendLanguage;
  framework: string;
  frameworkVersion: string;
  orm: string;
  database: string;
  buildTool: string;
  buildCommand: string;
  testFramework: string;
  testCommand: string;
  projectPath: string;
  port: number;
  layerStructure: LayerStructure;
}

/** 前端检测结果 */
export interface FrontendDetection {
  framework: string;
  frameworkVersion: string;
  uiLibrary: string;
  buildTool: string;
  packageManager: string;
  typescript: boolean;
  projectPath: string;
  port: number;
  routerType: string;
  stateManagement: string;
}

/** MCP 工具可用性 */
export interface McpAvailability {
  database: boolean;
  playwright: boolean;
}

/** 技术栈检测完整结果 */
export interface TechStackDetectionResult {
  projectName: string;
  projectRoot: string;
  architecture: Architecture;
  backend: BackendDetection;
  frontend: FrontendDetection;
  mcp: McpAvailability;
  confidence: Confidence;
  warnings: string[];
}

/** 单个扫描器的返回结果（部分检测结果） */
export interface ScannerResult {
  detected: boolean;
  language?: BackendLanguage;
  framework?: string;
  frameworkVersion?: string;
  orm?: string;
  database?: string;
  buildTool?: string;
  buildCommand?: string;
  testFramework?: string;
  testCommand?: string;
  port?: number;
  layerStructure?: Partial<LayerStructure>;
  warnings?: string[];
}

/** 前端扫描器的返回结果 */
export interface FrontendScannerResult {
  detected: boolean;
  framework?: string;
  frameworkVersion?: string;
  uiLibrary?: string;
  buildTool?: string;
  packageManager?: string;
  typescript?: boolean;
  port?: number;
  routerType?: string;
  stateManagement?: string;
  warnings?: string[];
}
