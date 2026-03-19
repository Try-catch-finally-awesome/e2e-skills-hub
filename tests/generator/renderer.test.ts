import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { renderSkill, clearCache } from '../../src/generator/renderer.js';
import type { RendererConfig } from '../../src/generator/renderer.js';
import type { TemplateContext } from '../../src/generator/types.js';

/** 项目根目录（templates/ 和 partials/ 所在目录） */
const ROOT_DIR = resolve(__dirname, '..', '..');

/** 构建一个完整的测试上下文 */
function createTestContext(): TemplateContext {
  return {
    backend: {
      language: 'java',
      framework: 'spring-boot',
      frameworkVersion: '3.2.4',
      orm: 'mybatis-plus',
      database: 'mysql',
      buildTool: 'maven',
      buildCommand: 'mvn compile',
      testFramework: 'junit5',
      testCommand: 'mvn test',
      projectPath: '/app/backend',
      projectName: 'demo-app',
      port: 8080,
      healthCheck: 'http://localhost:8080/actuator/health',
      layerStructure: {
        controller: 'src/main/java/**/controller/',
        service: 'src/main/java/**/service/',
        repository: 'src/main/java/**/mapper/',
        entity: 'src/main/java/**/entity/',
        dto: 'src/main/java/**/dto/',
        vo: 'src/main/java/**/vo/',
      },
    },
    frontend: {
      framework: 'vue3',
      frameworkVersion: '3.4.21',
      uiLibrary: 'naive-ui',
      buildTool: 'vite',
      buildCommand: 'npm run build',
      packageManager: 'npm',
      typescript: true,
      projectPath: '/app/frontend',
      projectName: 'demo-frontend',
      port: 5173,
      routerType: 'vue-router',
      stateManagement: 'pinia',
    },
    mcp: {
      database: {
        available: true,
        name: 'mysql-mcp',
        database: 'demo_db',
      },
      playwright: {
        available: true,
        name: 'playwright',
      },
    },
    config: {
      maxFixRounds: 20,
      maxSingleFix: 3,
      testDataPrefix: 'TEST_',
      report: {
        outputPath: 'doc/测试报告',
      },
      quality: {
        passScore: 90,
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

describe('Handlebars Renderer', () => {
  const config: RendererConfig = { rootDir: ROOT_DIR };

  beforeEach(() => {
    // 每个测试前清除缓存，确保隔离
    clearCache();
  });

  it('应能正确加载并渲染 e2e-orchestrator 模板', async () => {
    const context = createTestContext();
    const rendered = await renderSkill(config, 'e2e-orchestrator', context);

    expect(rendered).toBeTruthy();
    expect(typeof rendered).toBe('string');
    expect(rendered.length).toBeGreaterThan(100);
  });

  it('渲染结果应包含后端框架变量的正确替换', async () => {
    const context = createTestContext();
    const rendered = await renderSkill(config, 'e2e-orchestrator', context);

    // 验证模板中后端技术栈变量被正确替换
    expect(rendered).toContain('spring-boot');
    expect(rendered).toContain('mybatis-plus');
    expect(rendered).toContain('mysql');
  });

  it('渲染结果应包含前端框架变量的正确替换', async () => {
    const context = createTestContext();
    const rendered = await renderSkill(config, 'e2e-orchestrator', context);

    // 验证模板中前端技术栈变量被正确替换
    expect(rendered).toContain('vue3');
  });

  it('应能正确渲染 e2e-code-tracer 模板', async () => {
    const context = createTestContext();
    const rendered = await renderSkill(config, 'e2e-code-tracer', context);

    expect(rendered).toBeTruthy();
    expect(rendered.length).toBeGreaterThan(100);
  });

  it('应能正确渲染 e2e-testcase-generator 模板', async () => {
    const context = createTestContext();
    const rendered = await renderSkill(config, 'e2e-testcase-generator', context);

    expect(rendered).toBeTruthy();
    expect(rendered.length).toBeGreaterThan(100);
  });

  it('应能正确渲染 e2e-playwright-runner 模板', async () => {
    const context = createTestContext();
    const rendered = await renderSkill(config, 'e2e-playwright-runner', context);

    expect(rendered).toBeTruthy();
    expect(rendered.length).toBeGreaterThan(100);
  });

  it('应能正确渲染 e2e-error-fixer 模板', async () => {
    const context = createTestContext();
    const rendered = await renderSkill(config, 'e2e-error-fixer', context);

    expect(rendered).toBeTruthy();
    expect(rendered.length).toBeGreaterThan(100);
  });

  it('应能正确渲染 e2e-report-generator 模板', async () => {
    const context = createTestContext();
    const rendered = await renderSkill(config, 'e2e-report-generator', context);

    expect(rendered).toBeTruthy();
    expect(rendered.length).toBeGreaterThan(100);
  });

  it('模板不存在时应抛出错误', async () => {
    const context = createTestContext();

    await expect(
      renderSkill(config, 'non-existent-template' as any, context),
    ).rejects.toThrow('模板文件不存在');
  });
});
