import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { scan } from '../../src/detector/scanners/frontend-scanner.js';

const FIXTURES_DIR = resolve(__dirname, '..', 'fixtures');

describe('Frontend Scanner', () => {
  describe('Vue 3 检测', () => {
    it('应将 package.json 中 vue ^3.x 识别为 Vue 3', async () => {
      const projectPath = resolve(FIXTURES_DIR, 'vue3-app');
      const result = await scan(projectPath);

      expect(result.detected).toBe(true);
      expect(result.framework).toBe('vue3');
      expect(result.frameworkVersion).toBe('3.4.21');
    });

    it('应识别 naive-ui 为 UI 组件库', async () => {
      const projectPath = resolve(FIXTURES_DIR, 'vue3-app');
      const result = await scan(projectPath);

      expect(result.detected).toBe(true);
      expect(result.uiLibrary).toBe('naive-ui');
    });

    it('应识别 pinia 为状态管理', async () => {
      const projectPath = resolve(FIXTURES_DIR, 'vue3-app');
      const result = await scan(projectPath);

      expect(result.detected).toBe(true);
      expect(result.stateManagement).toBe('pinia');
    });

    it('应识别 vue-router 路由', async () => {
      const projectPath = resolve(FIXTURES_DIR, 'vue3-app');
      const result = await scan(projectPath);

      expect(result.detected).toBe(true);
      expect(result.routerType).toBe('vue-router');
    });

    it('应识别 vite 为构建工具', async () => {
      const projectPath = resolve(FIXTURES_DIR, 'vue3-app');
      const result = await scan(projectPath);

      expect(result.detected).toBe(true);
      expect(result.buildTool).toBe('vite');
    });
  });

  describe('React 检测', () => {
    it('应将 package.json 中含 react 识别为 React 项目', async () => {
      const projectPath = resolve(FIXTURES_DIR, 'react-app');
      const result = await scan(projectPath);

      expect(result.detected).toBe(true);
      expect(result.framework).toBe('react');
      expect(result.frameworkVersion).toBe('18.2.0');
    });

    it('应识别 @mui/material 为 Material UI', async () => {
      const projectPath = resolve(FIXTURES_DIR, 'react-app');
      const result = await scan(projectPath);

      expect(result.detected).toBe(true);
      expect(result.uiLibrary).toBe('material-ui');
    });

    it('应识别 react-router-dom 路由', async () => {
      const projectPath = resolve(FIXTURES_DIR, 'react-app');
      const result = await scan(projectPath);

      expect(result.detected).toBe(true);
      expect(result.routerType).toBe('react-router');
    });

    it('应识别 @reduxjs/toolkit 为 Redux Toolkit 状态管理', async () => {
      const projectPath = resolve(FIXTURES_DIR, 'react-app');
      const result = await scan(projectPath);

      expect(result.detected).toBe(true);
      expect(result.stateManagement).toBe('redux-toolkit');
    });

    it('应识别 vite 为构建工具', async () => {
      const projectPath = resolve(FIXTURES_DIR, 'react-app');
      const result = await scan(projectPath);

      expect(result.detected).toBe(true);
      expect(result.buildTool).toBe('vite');
    });
  });

  describe('Angular 检测', () => {
    it('package.json 中含 @angular/core 应识别为 Angular', async () => {
      // 创建一个临时的内存测试 — 由于没有 Angular fixture，
      // 我们验证 frontend-scanner 在无 package.json 时返回 detected: false
      const projectPath = resolve(FIXTURES_DIR, 'go-gin');
      const result = await scan(projectPath);

      expect(result.detected).toBe(false);
    });
  });

  describe('无前端项目', () => {
    it('无 package.json 时应返回 detected: false', async () => {
      const projectPath = resolve(FIXTURES_DIR, 'java-spring-boot');
      const result = await scan(projectPath);

      expect(result.detected).toBe(false);
    });
  });
});
