/**
 * 前端框架扫描器
 * 检测 package.json 中的 Vue/React/Angular/Svelte/Next.js/Nuxt 等
 */

import { join } from 'node:path';
import { readFileSafe, pathExists } from '../../utils/file.js';
import type { FrontendScannerResult } from '../types.js';
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

/** 判断 Vue 的主版本号 */
function getVueMajorVersion(versionStr: string): number {
  const match = versionStr.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/** 检测前端框架 */
function detectFramework(
  pkg: PackageJson,
): { framework: string; frameworkVersion: string } {
  const deps = pkg.dependencies ?? {};

  // Next.js (React 系)
  if ('next' in deps) {
    return { framework: 'nextjs', frameworkVersion: getDependencyVersion(pkg, 'next') };
  }

  // Nuxt (Vue 系)
  if ('nuxt' in deps || 'nuxt3' in deps) {
    return {
      framework: 'nuxt',
      frameworkVersion: getDependencyVersion(pkg, 'nuxt') || getDependencyVersion(pkg, 'nuxt3'),
    };
  }

  // Angular
  if ('@angular/core' in deps) {
    return { framework: 'angular', frameworkVersion: getDependencyVersion(pkg, '@angular/core') };
  }

  // Vue
  if ('vue' in deps) {
    const vueVersion = getDependencyVersion(pkg, 'vue');
    const major = getVueMajorVersion(vueVersion);
    if (major >= 3) {
      return { framework: 'vue3', frameworkVersion: vueVersion };
    }
    return { framework: 'vue2', frameworkVersion: vueVersion };
  }

  // React
  if ('react' in deps) {
    return { framework: 'react', frameworkVersion: getDependencyVersion(pkg, 'react') };
  }

  // Svelte
  if ('svelte' in deps) {
    return { framework: 'svelte', frameworkVersion: getDependencyVersion(pkg, 'svelte') };
  }

  return { framework: '', frameworkVersion: '' };
}

/** 检测 UI 组件库 */
function detectUiLibrary(pkg: PackageJson): string {
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

  if ('naive-ui' in deps) return 'naive-ui';
  if ('element-plus' in deps) return 'element-plus';
  if ('element-ui' in deps) return 'element-ui';
  if ('antd' in deps) return 'antd';
  if ('ant-design-vue' in deps) return 'ant-design-vue';
  if ('vuetify' in deps) return 'vuetify';
  if ('@mui/material' in deps) return 'material-ui';
  if ('@chakra-ui/react' in deps) return 'chakra-ui';
  if ('@arco-design/web-vue' in deps) return 'arco-design';
  if ('@arco-design/web-react' in deps) return 'arco-design';

  return '';
}

/** 检测构建工具 */
function detectBuildTool(pkg: PackageJson, projectPath: string): string {
  const devDeps = pkg.devDependencies ?? {};
  const deps = pkg.dependencies ?? {};

  if ('vite' in devDeps || 'vite' in deps) return 'vite';

  if (
    pathExists(join(projectPath, 'webpack.config.js')) ||
    pathExists(join(projectPath, 'webpack.config.ts')) ||
    'webpack' in devDeps
  ) {
    return 'webpack';
  }

  if ('esbuild' in devDeps) return 'esbuild';
  if ('rollup' in devDeps) return 'rollup';
  if ('parcel' in devDeps) return 'parcel';

  return '';
}

/** 检测包管理器 */
function detectPackageManager(projectPath: string): string {
  if (pathExists(join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (pathExists(join(projectPath, 'yarn.lock'))) return 'yarn';
  if (pathExists(join(projectPath, 'package-lock.json'))) return 'npm';
  if (pathExists(join(projectPath, 'bun.lockb'))) return 'bun';
  return 'npm';
}

/** 检测路由类型 */
function detectRouterType(pkg: PackageJson, framework: string): string {
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

  if ('vue-router' in deps) return 'vue-router';
  if ('react-router' in deps || 'react-router-dom' in deps) return 'react-router';
  if ('@angular/router' in deps) return 'angular-router';

  // Next.js / Nuxt 使用基于文件的路由
  if (framework === 'nextjs' || framework === 'nuxt') return 'file-based';

  return '';
}

/** 检测状态管理 */
function detectStateManagement(pkg: PackageJson): string {
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

  if ('pinia' in deps) return 'pinia';
  if ('vuex' in deps) return 'vuex';
  if ('@reduxjs/toolkit' in deps) return 'redux-toolkit';
  if ('redux' in deps) return 'redux';
  if ('zustand' in deps) return 'zustand';
  if ('jotai' in deps) return 'jotai';
  if ('recoil' in deps) return 'recoil';
  if ('mobx' in deps) return 'mobx';
  if ('@ngrx/store' in deps) return 'ngrx';

  return '';
}

/** 检测端口号 — 从 vite.config 或 vue.config 等配置文件推断 */
async function detectPort(projectPath: string, buildTool: string): Promise<number> {
  if (buildTool === 'vite') {
    for (const configFile of ['vite.config.ts', 'vite.config.js']) {
      const content = await readFileSafe(join(projectPath, configFile));
      if (content) {
        const match = content.match(/port\s*:\s*(\d+)/);
        if (match) return parseInt(match[1], 10);
      }
    }
    return 5173;
  }

  if (buildTool === 'webpack') {
    const vueConfigContent = await readFileSafe(join(projectPath, 'vue.config.js'));
    if (vueConfigContent) {
      const match = vueConfigContent.match(/port\s*:\s*(\d+)/);
      if (match) return parseInt(match[1], 10);
    }
    return 8080;
  }

  return 3000;
}

/** 扫描前端项目 */
export async function scan(projectPath: string): Promise<FrontendScannerResult> {
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

  const { framework, frameworkVersion } = detectFramework(pkg);

  if (!framework) {
    return { detected: false };
  }

  logger.info(`检测到前端框架: ${framework}，版本: ${frameworkVersion || '未知'}`);

  const uiLibrary = detectUiLibrary(pkg);
  const buildTool = detectBuildTool(pkg, projectPath);
  const packageManager = detectPackageManager(projectPath);
  const typescript = pathExists(join(projectPath, 'tsconfig.json'));
  const routerType = detectRouterType(pkg, framework);
  const stateManagement = detectStateManagement(pkg);
  const port = await detectPort(projectPath, buildTool);

  if (uiLibrary) {
    logger.info(`检测到 UI 组件库: ${uiLibrary}`);
  }

  return {
    detected: true,
    framework,
    frameworkVersion,
    uiLibrary,
    buildTool,
    packageManager,
    typescript,
    port,
    routerType,
    stateManagement,
    warnings,
  };
}
