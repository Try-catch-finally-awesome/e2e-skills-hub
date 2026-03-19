import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { scan } from '../../src/detector/scanners/java-scanner.js';

const FIXTURES_DIR = resolve(__dirname, '..', 'fixtures');

describe('Java Scanner', () => {
  it('应识别包含 spring-boot-starter 的 pom.xml 为 Spring Boot 项目', async () => {
    const projectPath = resolve(FIXTURES_DIR, 'java-spring-boot');
    const result = await scan(projectPath);

    expect(result.detected).toBe(true);
    expect(result.language).toBe('java');
    expect(result.framework).toBe('spring-boot');
    expect(result.frameworkVersion).toBe('3.2.4');
    expect(result.buildTool).toBe('maven');
    expect(result.buildCommand).toBe('mvn compile');
  });

  it('应识别 mybatis-plus-boot-starter 依赖为 MyBatis Plus ORM', async () => {
    const projectPath = resolve(FIXTURES_DIR, 'java-spring-boot');
    const result = await scan(projectPath);

    expect(result.detected).toBe(true);
    expect(result.orm).toBe('mybatis-plus');
  });

  it('应识别 mysql-connector-j 为 MySQL 数据库', async () => {
    const projectPath = resolve(FIXTURES_DIR, 'java-spring-boot');
    const result = await scan(projectPath);

    expect(result.detected).toBe(true);
    expect(result.database).toBe('mysql');
  });

  it('应识别 junit-jupiter-api 为 JUnit 5 测试框架', async () => {
    const projectPath = resolve(FIXTURES_DIR, 'java-spring-boot');
    const result = await scan(projectPath);

    expect(result.detected).toBe(true);
    expect(result.testFramework).toBe('junit5');
    expect(result.testCommand).toBe('mvn test');
  });

  it('无 pom.xml 和 build.gradle 时应返回 detected: false', async () => {
    const projectPath = resolve(FIXTURES_DIR, 'react-app');
    const result = await scan(projectPath);

    expect(result.detected).toBe(false);
  });

  it('对空目录应返回 detected: false', async () => {
    const projectPath = resolve(FIXTURES_DIR, 'go-gin');
    const result = await scan(projectPath);

    expect(result.detected).toBe(false);
  });
});
