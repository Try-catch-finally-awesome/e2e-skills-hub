/**
 * e2e-skills-hub — 插件入口
 *
 * 自动检测项目技术栈，生成定制化 E2E 全流程测试 Skills 的 Claude Code 插件。
 *
 * 核心模块:
 * - detector:  技术栈检测引擎 (3.A)
 * - generator: Skills 生成引擎 (3.B)
 * - manager:   Skills 管理器   (3.C)
 * - executor:  测试执行入口   (3.D)
 * - updater:   增量更新引擎   (3.E)
 * - config:    配置管理       (3.F)
 */

// ──── 技术栈检测引擎 ────
export { detect, type DetectOptions, type TechStackDetectionResult } from './detector/index.js';
export type {
  BackendDetection,
  FrontendDetection,
  Architecture,
  Confidence,
  LayerStructure,
  McpAvailability,
  ScannerResult,
  FrontendScannerResult,
} from './detector/types.js';

// ──── Skills 生成引擎 ────
export { generate, buildTemplateContext } from './generator/index.js';
export type {
  GenerateOptions,
  GenerateResult,
  GeneratedSkill,
  TemplateContext,
  SkillTemplateName,
} from './generator/types.js';
export { SKILL_TEMPLATE_NAMES } from './generator/types.js';
export { renderSkill, renderAllSkills, clearCache } from './generator/renderer.js';
export type { RendererConfig } from './generator/renderer.js';

// ──── Skills 管理器 ────
export {
  list,
  show,
  remove,
  clean,
  exportTo,
  importFrom,
  getMetadata,
  formatSkillList,
  type SkillStatus,
} from './manager/index.js';
export type { StorageConfig, StorageLocation } from './manager/storage.js';
export { resolveStoragePath, isStorageInitialized } from './manager/storage.js';
export type { Metadata, SkillMeta, UpdateHistoryEntry } from './manager/metadata.js';

// ──── 测试执行入口 ────
export {
  execute,
  detectMode,
  formatPlan,
  parseUrl,
  validateUrl,
  buildUrlModePlan,
  extractRouteKeywords,
  extractKeywords,
  keywordToCodePatterns,
  buildSearchStrategies,
  buildDescribeModePlan,
  type ExecutionMode,
  type ExecuteParams,
  type ExecuteResult,
  type UrlModeParams,
  type DescribeModeParams,
} from './executor/index.js';

// ──── 增量更新引擎 ────
export {
  update,
  formatUpdateResult,
  type UpdateOptions,
  type UpdateResult,
} from './updater/index.js';
export {
  getAffectedSkills,
  getAffectedSkillsForChanges,
  requiresFullRegeneration,
  inferChangeType,
  formatImpactAnalysis,
  type ChangeType,
  type ChangeDescription,
} from './updater/impact-matrix.js';
export {
  analyzeDescription,
  parseGitDiffOutput,
  fileChangesToDescriptions,
  type DiffAnalysisResult,
  type FileChange,
  type FileChangeKind,
} from './updater/diff-analyzer.js';

// ──── 配置管理 ────
export {
  loadConfig,
  setConfigValue,
  resetConfig,
  getConfigValue,
  formatConfig,
  configToOverrides,
  type E2EConfig,
} from './config/index.js';

// ──── 工具函数 ────
export { readFileSafe, writeFileSafe, pathExists, findFiles, ensureDir, removeDir } from './utils/file.js';
export { hashString, hashFile, hashStringFormatted, hashFileFormatted, formatHash } from './utils/hash.js';
export { default as logger, setLogLevel, LogLevel } from './utils/logger.js';
