import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { scan } from '../../src/detector/scanners/php-scanner.js';

const FIXTURES_DIR = resolve(__dirname, '..', 'fixtures');

describe('PHP Scanner', () => {
  it('应识别包含 laravel/framework 的 composer.json 为 Laravel 项目', async () => {
    const projectPath = resolve(FIXTURES_DIR, 'php-laravel');
    const result = await scan(projectPath);

    expect(result.detected).toBe(true);
    expect(result.language).toBe('php');
    expect(result.framework).toBe('laravel');
    expect(result.frameworkVersion).toBe('11.0');
  });

  it('应将 Laravel 项目的 ORM 识别为 eloquent', async () => {
    const projectPath = resolve(FIXTURES_DIR, 'php-laravel');
    const result = await scan(projectPath);

    expect(result.detected).toBe(true);
    expect(result.orm).toBe('eloquent');
  });

  it('应识别 ext-pdo_mysql 为 MySQL 数据库', async () => {
    const projectPath = resolve(FIXTURES_DIR, 'php-laravel');
    const result = await scan(projectPath);

    expect(result.detected).toBe(true);
    expect(result.database).toBe('mysql');
  });

  it('应识别 phpunit/phpunit 为 PHPUnit 测试框架', async () => {
    const projectPath = resolve(FIXTURES_DIR, 'php-laravel');
    const result = await scan(projectPath);

    expect(result.detected).toBe(true);
    expect(result.testFramework).toBe('phpunit');
    expect(result.testCommand).toBe('vendor/bin/phpunit');
  });

  it('应为 Laravel 项目生成正确的构建工具和命令', async () => {
    const projectPath = resolve(FIXTURES_DIR, 'php-laravel');
    const result = await scan(projectPath);

    expect(result.detected).toBe(true);
    expect(result.buildTool).toBe('composer');
    expect(result.buildCommand).toBe('php artisan about');
    expect(result.port).toBe(8000);
  });

  it('无 composer.json 时应返回 detected: false', async () => {
    const projectPath = resolve(FIXTURES_DIR, 'react-app');
    const result = await scan(projectPath);

    expect(result.detected).toBe(false);
  });

  it('对 Java 项目应返回 detected: false', async () => {
    const projectPath = resolve(FIXTURES_DIR, 'java-spring-boot');
    const result = await scan(projectPath);

    expect(result.detected).toBe(false);
  });
});
