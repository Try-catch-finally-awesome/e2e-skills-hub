import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { scan } from '../../src/detector/scanners/python-scanner.js';

const FIXTURES_DIR = resolve(__dirname, '..', 'fixtures');

describe('Python Scanner', () => {
  it('应识别包含 Django 的 requirements.txt 为 Django 项目', async () => {
    const projectPath = resolve(FIXTURES_DIR, 'python-django');
    const result = await scan(projectPath);

    expect(result.detected).toBe(true);
    expect(result.language).toBe('python');
    expect(result.framework).toBe('django');
    expect(result.frameworkVersion).toBe('5.0');
  });

  it('应将 Django 项目的 ORM 识别为 django-orm', async () => {
    const projectPath = resolve(FIXTURES_DIR, 'python-django');
    const result = await scan(projectPath);

    expect(result.detected).toBe(true);
    expect(result.orm).toBe('django-orm');
  });

  it('应识别 psycopg2-binary 为 PostgreSQL 数据库', async () => {
    const projectPath = resolve(FIXTURES_DIR, 'python-django');
    const result = await scan(projectPath);

    expect(result.detected).toBe(true);
    expect(result.database).toBe('postgresql');
  });

  it('应将 Django 项目的测试框架识别为 django-test', async () => {
    const projectPath = resolve(FIXTURES_DIR, 'python-django');
    const result = await scan(projectPath);

    expect(result.detected).toBe(true);
    expect(result.testFramework).toBe('django-test');
    expect(result.testCommand).toBe('python manage.py test');
  });

  it('应为 Django 项目生成正确的构建命令', async () => {
    const projectPath = resolve(FIXTURES_DIR, 'python-django');
    const result = await scan(projectPath);

    expect(result.detected).toBe(true);
    expect(result.buildTool).toBe('pip');
    expect(result.buildCommand).toBe('python manage.py check');
    expect(result.port).toBe(8000);
  });

  it('存在 manage.py 时应识别为 Django 项目', async () => {
    const projectPath = resolve(FIXTURES_DIR, 'python-django');
    const result = await scan(projectPath);

    // manage.py 的存在足以触发 Django 检测
    expect(result.detected).toBe(true);
    expect(result.framework).toBe('django');
  });

  it('无 Python 项目文件时应返回 detected: false', async () => {
    const projectPath = resolve(FIXTURES_DIR, 'react-app');
    const result = await scan(projectPath);

    expect(result.detected).toBe(false);
  });
});
