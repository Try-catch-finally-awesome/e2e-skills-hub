/**
 * Handlebars 渲染器
 * 加载 templates/ 和 partials/ 目录的模板文件，渲染生成 SKILL.md
 */

import Handlebars from 'handlebars';
import { join, basename, relative } from 'node:path';
import { readFileSafe, findFiles, pathExists } from '../utils/file.js';
import logger from '../utils/logger.js';
import type { TemplateContext, SkillTemplateName } from './types.js';

/** 渲染器配置 */
export interface RendererConfig {
  /** 模板根目录 (包含 templates/ 和 partials/) */
  rootDir: string;
}

/** 已编译的模板缓存 */
const compiledTemplates = new Map<string, Handlebars.TemplateDelegate>();

/** Handlebars 实例 */
let hbsInstance: typeof Handlebars | null = null;

/**
 * 初始化 Handlebars 实例并注册所有 partials
 */
async function initHandlebars(rootDir: string): Promise<typeof Handlebars> {
  if (hbsInstance) return hbsInstance;

  hbsInstance = Handlebars.create();

  // 注册自定义 helper
  registerHelpers(hbsInstance);

  // 加载并注册所有 partials
  await loadPartials(hbsInstance, rootDir);

  return hbsInstance;
}

/**
 * 注册自定义 Handlebars helpers
 */
function registerHelpers(hbs: typeof Handlebars): void {
  // 条件判断: {{#ifEq a b}} ... {{/ifEq}}
  hbs.registerHelper('ifEq', function (this: unknown, a: unknown, b: unknown, options: Handlebars.HelperOptions) {
    return a === b ? options.fn(this) : options.inverse(this);
  });

  // 条件判断: {{#ifNotEq a b}} ... {{/ifNotEq}}
  hbs.registerHelper('ifNotEq', function (this: unknown, a: unknown, b: unknown, options: Handlebars.HelperOptions) {
    return a !== b ? options.fn(this) : options.inverse(this);
  });

  // 条件判断: {{#ifIn value array}} ... {{/ifIn}}
  hbs.registerHelper('ifIn', function (this: unknown, value: unknown, arr: unknown, options: Handlebars.HelperOptions) {
    if (Array.isArray(arr) && arr.includes(value)) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  // 大写首字母: {{capitalize str}}
  hbs.registerHelper('capitalize', function (str: string) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  // 短横线转驼峰: {{camelCase str}}
  hbs.registerHelper('camelCase', function (str: string) {
    if (!str) return '';
    return str.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  });

  // 连接数组: {{join array separator}}
  hbs.registerHelper('join', function (arr: unknown[], sep: string) {
    if (!Array.isArray(arr)) return '';
    return arr.join(typeof sep === 'string' ? sep : ', ');
  });
}

/**
 * 递归加载 partials/ 目录下所有 .hbs 文件并注册
 * partial 名称使用相对路径（去掉 .hbs 后缀），如 backend/java-spring-boot
 */
async function loadPartials(hbs: typeof Handlebars, rootDir: string): Promise<void> {
  const partialsDir = join(rootDir, 'partials');

  if (!pathExists(partialsDir)) {
    logger.warn(`partials 目录不存在: ${partialsDir}`);
    return;
  }

  const partialFiles = await findFiles('**/*.hbs', partialsDir);
  let loadedCount = 0;

  for (const filePath of partialFiles) {
    const content = await readFileSafe(filePath);
    if (content === null) continue;

    // 计算 partial 名称: backend/java-spring-boot (去掉 .hbs 后缀)
    const relPath = relative(partialsDir, filePath).replace(/\\/g, '/');
    const partialName = relPath.replace(/\.hbs$/, '');

    hbs.registerPartial(partialName, content);
    loadedCount++;
    logger.debug(`注册 partial: ${partialName}`);
  }

  logger.info(`已加载 ${loadedCount} 个 partials`);
}

/**
 * 加载并编译指定模板
 */
async function loadTemplate(
  hbs: typeof Handlebars,
  rootDir: string,
  templateName: string,
): Promise<Handlebars.TemplateDelegate> {
  const cached = compiledTemplates.get(templateName);
  if (cached) return cached;

  const templatePath = join(rootDir, 'templates', `${templateName}.md.hbs`);
  const content = await readFileSafe(templatePath);

  if (content === null) {
    throw new Error(`模板文件不存在: ${templatePath}`);
  }

  const compiled = hbs.compile(content, { noEscape: true });
  compiledTemplates.set(templateName, compiled);
  logger.debug(`编译模板: ${templateName}`);

  return compiled;
}

/**
 * 渲染单个 skill 模板
 */
export async function renderSkill(
  config: RendererConfig,
  templateName: SkillTemplateName,
  context: TemplateContext,
): Promise<string> {
  const hbs = await initHandlebars(config.rootDir);
  const template = await loadTemplate(hbs, config.rootDir, templateName);

  try {
    const rendered = template(context);
    logger.info(`渲染完成: ${templateName}`);
    return rendered;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`渲染模板 ${templateName} 失败: ${message}`);
    throw new Error(`渲染模板 ${templateName} 失败: ${message}`);
  }
}

/**
 * 批量渲染所有 skill 模板
 * 返回 Map<模板名称, 渲染结果>
 */
export async function renderAllSkills(
  config: RendererConfig,
  context: TemplateContext,
  only?: string[],
): Promise<Map<string, string>> {
  const { SKILL_TEMPLATE_NAMES } = await import('./types.js');

  const templateNames = only
    ? SKILL_TEMPLATE_NAMES.filter((n) => only.includes(n))
    : [...SKILL_TEMPLATE_NAMES];

  const results = new Map<string, string>();

  for (const name of templateNames) {
    const rendered = await renderSkill(config, name, context);
    results.set(name, rendered);
  }

  return results;
}

/**
 * 清除编译缓存（用于需要重新加载模板的场景）
 */
export function clearCache(): void {
  compiledTemplates.clear();
  hbsInstance = null;
  logger.debug('已清除模板缓存');
}
