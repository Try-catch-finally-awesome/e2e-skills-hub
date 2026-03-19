/**
 * Java 项目扫描器
 * 检测 pom.xml / build.gradle 中的 Spring Boot、Spring MVC、MyBatis Plus 等
 */

import { join } from 'node:path';
import { readFileSafe, pathExists, findFiles } from '../../utils/file.js';
import type { ScannerResult } from '../types.js';
import logger from '../../utils/logger.js';

/** 从 pom.xml 中提取版本号 */
function extractPomVersion(content: string, artifactId: string): string {
  // 匹配 <artifactId>xxx</artifactId> 后面的 <version>yyy</version>
  const regex = new RegExp(
    `<artifactId>${artifactId}</artifactId>[\\s\\S]*?<version>([^<]+)</version>`,
  );
  const match = content.match(regex);
  if (match) return match[1];

  // 尝试 parent 中的版本
  const parentRegex = new RegExp(
    `<parent>[\\s\\S]*?<artifactId>[^<]*spring-boot[^<]*</artifactId>[\\s\\S]*?<version>([^<]+)</version>[\\s\\S]*?</parent>`,
  );
  const parentMatch = content.match(parentRegex);
  return parentMatch ? parentMatch[1] : '';
}

/** 从 build.gradle 中提取 Spring Boot 版本 */
function extractGradleSpringBootVersion(content: string): string {
  const pluginMatch = content.match(
    /id\s+['"]org\.springframework\.boot['"]\s+version\s+['"]([^'"]+)['"]/,
  );
  if (pluginMatch) return pluginMatch[1];

  const classpathMatch = content.match(
    /org\.springframework\.boot:spring-boot-gradle-plugin:([^\s'"]+)/,
  );
  return classpathMatch ? classpathMatch[1] : '';
}

/** 检测 ORM */
function detectOrm(content: string): string {
  if (content.includes('mybatis-plus-boot-starter') || content.includes('mybatis-plus-spring-boot3-starter')) {
    return 'mybatis-plus';
  }
  if (content.includes('mybatis-spring-boot-starter')) {
    return 'mybatis';
  }
  if (content.includes('spring-boot-starter-data-jpa')) {
    return 'jpa-hibernate';
  }
  return '';
}

/** 检测数据库驱动 */
function detectDatabase(content: string): string {
  if (content.includes('mysql-connector') || content.includes('mysql:mysql')) {
    return 'mysql';
  }
  if (content.includes('postgresql') || content.includes('org.postgresql')) {
    return 'postgresql';
  }
  if (content.includes('sqlite')) {
    return 'sqlite';
  }
  if (content.includes('mongodb') || content.includes('spring-boot-starter-data-mongodb')) {
    return 'mongodb';
  }
  if (content.includes('mssql-jdbc') || content.includes('sqlserver')) {
    return 'sqlserver';
  }
  if (content.includes('spring-boot-starter-data-redis') || content.includes('jedis') || content.includes('lettuce-core')) {
    return 'redis';
  }
  return '';
}

/** 检测测试框架 */
function detectTestFramework(content: string): string {
  if (content.includes('junit-jupiter') || content.includes('junit-jupiter-api')) {
    return 'junit5';
  }
  if (content.includes('junit') && !content.includes('junit-jupiter')) {
    return 'junit4';
  }
  return '';
}

/** 检测 Java 项目的层级结构 */
async function detectLayerStructure(
  projectPath: string,
): Promise<Partial<Record<string, string>>> {
  const layers: Record<string, string> = {};
  const srcMain = join(projectPath, 'src', 'main', 'java');

  const controllerFiles = await findFiles('**/controller/**/*.java', srcMain);
  if (controllerFiles.length > 0) {
    layers.controller = 'src/main/java/**/controller/';
  }

  const serviceFiles = await findFiles('**/service/**/*.java', srcMain);
  if (serviceFiles.length > 0) {
    layers.service = 'src/main/java/**/service/';
  }

  const mapperFiles = await findFiles('**/mapper/**/*.java', srcMain);
  const repoFiles = await findFiles('**/repository/**/*.java', srcMain);
  if (mapperFiles.length > 0) {
    layers.repository = 'src/main/java/**/mapper/';
  } else if (repoFiles.length > 0) {
    layers.repository = 'src/main/java/**/repository/';
  }

  const entityFiles = await findFiles('**/entity/**/*.java', srcMain);
  const modelFiles = await findFiles('**/model/**/*.java', srcMain);
  if (entityFiles.length > 0) {
    layers.entity = 'src/main/java/**/entity/';
  } else if (modelFiles.length > 0) {
    layers.entity = 'src/main/java/**/model/';
  }

  const dtoFiles = await findFiles('**/dto/**/*.java', srcMain);
  if (dtoFiles.length > 0) {
    layers.dto = 'src/main/java/**/dto/';
  }

  const voFiles = await findFiles('**/vo/**/*.java', srcMain);
  if (voFiles.length > 0) {
    layers.vo = 'src/main/java/**/vo/';
  }

  return layers;
}

/** 从 application.yml / application.properties 检测端口 */
async function detectPort(projectPath: string): Promise<number> {
  const ymlPath = join(projectPath, 'src', 'main', 'resources', 'application.yml');
  const yamlPath = join(projectPath, 'src', 'main', 'resources', 'application.yaml');
  const propsPath = join(projectPath, 'src', 'main', 'resources', 'application.properties');

  for (const configPath of [ymlPath, yamlPath]) {
    const content = await readFileSafe(configPath);
    if (content) {
      const match = content.match(/port\s*:\s*(\d+)/);
      if (match) return parseInt(match[1], 10);
    }
  }

  const propsContent = await readFileSafe(propsPath);
  if (propsContent) {
    const match = propsContent.match(/server\.port\s*=\s*(\d+)/);
    if (match) return parseInt(match[1], 10);
  }

  return 8080;
}

/** 扫描 Java 项目 */
export async function scan(projectPath: string): Promise<ScannerResult> {
  const warnings: string[] = [];
  const pomPath = join(projectPath, 'pom.xml');
  const gradlePath = join(projectPath, 'build.gradle');
  const gradleKtsPath = join(projectPath, 'build.gradle.kts');

  const pomContent = await readFileSafe(pomPath);
  const gradleContent = await readFileSafe(gradlePath) ?? await readFileSafe(gradleKtsPath);

  if (!pomContent && !gradleContent) {
    return { detected: false };
  }

  logger.info('检测到 Java 项目');

  const depContent = pomContent ?? gradleContent ?? '';
  let framework = '';
  let frameworkVersion = '';
  let buildTool = '';
  let buildCommand = '';

  // 检测构建工具
  if (pomContent) {
    buildTool = 'maven';
    buildCommand = 'mvn compile';
  } else {
    buildTool = 'gradle';
    buildCommand = pathExists(join(projectPath, 'gradlew')) ? './gradlew build' : 'gradle build';
  }

  // 检测框架
  if (
    depContent.includes('spring-boot-starter') ||
    depContent.includes('org.springframework.boot')
  ) {
    framework = 'spring-boot';
    if (pomContent) {
      frameworkVersion =
        extractPomVersion(pomContent, 'spring-boot-starter-parent') ||
        extractPomVersion(pomContent, 'spring-boot-dependencies');
    } else if (gradleContent) {
      frameworkVersion = extractGradleSpringBootVersion(gradleContent);
    }
    logger.info(`检测到 Spring Boot，版本: ${frameworkVersion || '未知'}`);
  } else if (depContent.includes('spring-webmvc')) {
    framework = 'spring-mvc';
    warnings.push('检测到 Spring MVC（非 Spring Boot），部分功能可能需要额外配置');
  }

  if (!framework) {
    warnings.push('检测到 Java 项目，但未识别到已知框架');
    framework = 'unknown';
  }

  const orm = detectOrm(depContent);
  const database = detectDatabase(depContent);
  const testFramework = detectTestFramework(depContent);
  const layerStructure = await detectLayerStructure(projectPath);
  const port = await detectPort(projectPath);

  return {
    detected: true,
    language: 'java',
    framework,
    frameworkVersion,
    orm,
    database,
    buildTool,
    buildCommand,
    testFramework,
    testCommand: buildTool === 'maven' ? 'mvn test' : './gradlew test',
    port,
    layerStructure,
    warnings,
  };
}
