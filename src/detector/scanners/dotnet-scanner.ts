/**
 * .NET 项目扫描器
 * 检测 *.csproj 中的 ASP.NET Core、Entity Framework 等
 */

import { join } from 'node:path';
import { readFileSafe, findFiles, pathExists } from '../../utils/file.js';
import type { ScannerResult } from '../types.js';
import logger from '../../utils/logger.js';

/** 从 .csproj 中提取 PackageReference 版本 */
function extractPackageVersion(content: string, packageName: string): string {
  const regex = new RegExp(
    `<PackageReference\\s+Include=["']${packageName}["'][^>]*Version=["']([^"']+)["']`,
    'i',
  );
  const match = content.match(regex);
  return match ? match[1] : '';
}

/** 从 .csproj 中提取 TargetFramework 版本 */
function extractTargetFramework(content: string): string {
  const match = content.match(/<TargetFramework>([^<]+)<\/TargetFramework>/);
  return match ? match[1] : '';
}

/** 检测 ORM */
function detectOrm(content: string): string {
  if (content.includes('Microsoft.EntityFrameworkCore')) {
    return 'entity-framework';
  }
  if (content.includes('Dapper')) {
    return 'dapper';
  }
  return '';
}

/** 检测数据库驱动 */
function detectDatabase(content: string): string {
  if (
    content.includes('Pomelo.EntityFrameworkCore.MySql') ||
    content.includes('MySql.Data') ||
    content.includes('MySqlConnector')
  ) {
    return 'mysql';
  }
  if (content.includes('Npgsql') || content.includes('EntityFrameworkCore.PostgreSQL')) {
    return 'postgresql';
  }
  if (content.includes('Microsoft.EntityFrameworkCore.Sqlite')) {
    return 'sqlite';
  }
  if (content.includes('MongoDB.Driver')) {
    return 'mongodb';
  }
  if (
    content.includes('Microsoft.EntityFrameworkCore.SqlServer') ||
    content.includes('System.Data.SqlClient') ||
    content.includes('Microsoft.Data.SqlClient')
  ) {
    return 'sqlserver';
  }
  if (content.includes('StackExchange.Redis')) {
    return 'redis';
  }
  return '';
}

/** 检测测试框架 */
function detectTestFramework(csprojFiles: string[], allContent: string): string {
  if (allContent.includes('xunit')) {
    return 'xunit';
  }
  if (allContent.includes('NUnit')) {
    return 'nunit';
  }
  if (allContent.includes('MSTest')) {
    return 'mstest';
  }
  return '';
}

/** 检测 .NET 项目层级结构 */
async function detectLayerStructure(
  projectPath: string,
): Promise<Partial<Record<string, string>>> {
  const layers: Record<string, string> = {};

  const controllerFiles = await findFiles('**/Controllers/**/*.cs', projectPath);
  if (controllerFiles.length > 0) {
    layers.controller = '**/Controllers/';
  }

  const serviceFiles = await findFiles('**/Services/**/*.cs', projectPath);
  const bllFiles = await findFiles('**/BLL/**/*.cs', projectPath);
  if (serviceFiles.length > 0) {
    layers.service = '**/Services/';
  } else if (bllFiles.length > 0) {
    layers.service = '**/BLL/';
  }

  const repoFiles = await findFiles('**/Repositories/**/*.cs', projectPath);
  const dalFiles = await findFiles('**/DAL/**/*.cs', projectPath);
  if (repoFiles.length > 0) {
    layers.repository = '**/Repositories/';
  } else if (dalFiles.length > 0) {
    layers.repository = '**/DAL/';
  }

  const modelFiles = await findFiles('**/Models/**/*.cs', projectPath);
  const entityFiles = await findFiles('**/Entities/**/*.cs', projectPath);
  if (entityFiles.length > 0) {
    layers.entity = '**/Entities/';
  } else if (modelFiles.length > 0) {
    layers.entity = '**/Models/';
  }

  const dtoFiles = await findFiles('**/DTOs/**/*.cs', projectPath);
  if (dtoFiles.length > 0) {
    layers.dto = '**/DTOs/';
  }

  const voFiles = await findFiles('**/ViewModels/**/*.cs', projectPath);
  if (voFiles.length > 0) {
    layers.vo = '**/ViewModels/';
  }

  return layers;
}

/** 检测端口 — 从 launchSettings.json 或 appsettings.json */
async function detectPort(projectPath: string): Promise<number> {
  const launchSettingsPath = join(projectPath, 'Properties', 'launchSettings.json');
  const launchContent = await readFileSafe(launchSettingsPath);

  if (launchContent) {
    const urlMatch = launchContent.match(/"applicationUrl"\s*:\s*"[^"]*:(\d+)/);
    if (urlMatch) return parseInt(urlMatch[1], 10);
  }

  return 5000;
}

/** 扫描 .NET 项目 */
export async function scan(projectPath: string): Promise<ScannerResult> {
  const warnings: string[] = [];

  const csprojFiles = await findFiles('**/*.csproj', projectPath);
  const slnFiles = await findFiles('*.sln', projectPath);

  if (csprojFiles.length === 0 && slnFiles.length === 0) {
    return { detected: false };
  }

  logger.info('检测到 .NET 项目');

  // 读取所有 csproj 内容
  let allCsprojContent = '';
  for (const file of csprojFiles) {
    const content = await readFileSafe(file);
    if (content) allCsprojContent += content + '\n';
  }

  let framework = '';
  let frameworkVersion = '';

  // ASP.NET Core 检测
  if (allCsprojContent.includes('Microsoft.AspNetCore')) {
    framework = 'aspnet-core';
    const targetFw = extractTargetFramework(allCsprojContent);
    frameworkVersion = targetFw;
    logger.info(`检测到 ASP.NET Core, Target: ${targetFw || '未知'}`);
  } else if (allCsprojContent.includes('Microsoft.AspNet.Mvc')) {
    framework = 'aspnet-mvc';
    warnings.push('检测到 ASP.NET MVC（非 Core），部分功能可能受限');
  }

  if (!framework) {
    warnings.push('检测到 .NET 项目，但未识别到已知 Web 框架');
    framework = 'unknown';
  }

  const orm = detectOrm(allCsprojContent);
  const database = detectDatabase(allCsprojContent);
  const testFramework = detectTestFramework(csprojFiles, allCsprojContent);
  const layerStructure = await detectLayerStructure(projectPath);
  const port = await detectPort(projectPath);

  return {
    detected: true,
    language: 'dotnet',
    framework,
    frameworkVersion,
    orm,
    database,
    buildTool: 'dotnet-cli',
    buildCommand: 'dotnet build',
    testFramework,
    testCommand: 'dotnet test',
    port,
    layerStructure,
    warnings,
  };
}
