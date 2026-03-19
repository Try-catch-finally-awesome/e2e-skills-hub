---
name: e2e-skills-hub:init
description: 首次使用的一站式初始化命令，自动检测项目技术栈并生成定制化 E2E 测试 Skills
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# /e2e-skills-hub:init — 初始化

## 用法

```
/e2e-skills-hub:init
/e2e-skills-hub:init --path /path/to/frontend --path /path/to/backend
/e2e-skills-hub:init --storage user
```

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `--path <dir>` | string（可多次指定） | 否 | 当前工作目录 | 目标项目路径，分离式项目可分别指定前端和后端路径 |
| `--storage` | `project` \| `user` | 否 | `project` | Skills 存储位置。`project` 存储在项目 `.claude/skills/e2e/`，`user` 存储在 `~/.claude/skills/e2e/{项目名}/` |

## 执行步骤

### 步骤 1: 确定目标项目路径

1. 如果用户提供了 `--path` 参数，使用指定路径
2. 否则使用当前工作目录作为项目根路径
3. 验证路径存在且可访问：
   ```
   Bash: ls -la <target_path>
   ```
4. 如果路径不存在，输出错误并终止

### 步骤 2: 运行技术栈检测（调用 detector 模块）

按以下顺序扫描项目文件，识别技术栈：

#### 2.1 扫描后端技术栈

1. **识别后端语言和框架**：
   - 搜索 `pom.xml` 或 `build.gradle`/`build.gradle.kts` → Java
     - 内含 `spring-boot-starter` → Spring Boot
     - 内含 `spring-webmvc`（无 spring-boot-starter） → Spring MVC
   - 搜索 `manage.py` + `requirements.txt`/`pyproject.toml` → Python Django
   - 搜索 `requirements.txt`/`pyproject.toml` 内含 `fastapi` → Python FastAPI
   - 搜索 `requirements.txt`/`pyproject.toml` 内含 `flask` → Python Flask
   - 搜索 `go.mod` → Go
     - 内含 `github.com/gin-gonic/gin` → Gin
     - 内含 `github.com/labstack/echo` → Echo
     - 内含 `github.com/gofiber/fiber` → Fiber
   - 搜索 `*.csproj` → .NET
     - 内含 `Microsoft.AspNetCore` → ASP.NET Core
     - 内含 `Microsoft.AspNet.Mvc` → ASP.NET MVC
   - 搜索 `package.json` dependencies 含 `express` → Node.js Express
   - 搜索 `package.json` dependencies 含 `@nestjs/core` → Node.js NestJS
   - 搜索 `package.json` dependencies 含 `koa` → Node.js Koa

2. **识别 ORM / 数据访问层**：
   - Java: `mybatis-plus-boot-starter` → MyBatis Plus; `mybatis-spring-boot-starter`（无 Plus） → MyBatis; `spring-boot-starter-data-jpa` → JPA/Hibernate
   - Python: `settings.py` 含 `DATABASES` → Django ORM; `sqlalchemy` → SQLAlchemy
   - Go: `gorm.io/gorm` → GORM
   - .NET: `Microsoft.EntityFrameworkCore` → Entity Framework; `Dapper` → Dapper
   - Node.js: `prisma` + `prisma/schema.prisma` → Prisma; `drizzle-orm` → Drizzle; `typeorm` → TypeORM; `sequelize` → Sequelize

3. **识别数据库**：
   - 依赖中含 `mysql`/`mysql2`/`mysql-connector`/`pymysql` → MySQL
   - 依赖中含 `pg`/`psycopg2`/`postgresql` → PostgreSQL
   - 依赖中含 `sqlite3`/`better-sqlite3` → SQLite
   - 依赖中含 `mongodb`/`mongoose`/`pymongo` → MongoDB
   - 依赖中含 `redis`/`ioredis` → Redis

4. **识别构建工具**：
   - `pom.xml` 存在 → Maven
   - `build.gradle`/`build.gradle.kts` 存在 → Gradle
   - `go.mod` 存在 → Go Modules
   - `*.sln`/`*.csproj` 存在 → dotnet CLI

5. **识别测试框架**：
   - `junit-jupiter` → JUnit 5
   - `pytest` 或 `[tool.pytest]` → pytest
   - `*_test.go` 文件存在 → Go testing
   - `xunit` → xUnit
   - `jest` → Jest
   - `vitest` → Vitest
   - `@playwright/test` → Playwright

6. **识别后端项目层级结构**：
   - Java: 搜索 `controller/`, `service/`, `mapper/`, `entity/`, `dto/`, `vo/` 目录
   - Python Django: 搜索 `views.py`, `models.py`, `serializers.py`, `urls.py`
   - Go: 搜索 `handler/`, `service/`, `repository/`, `model/` 目录
   - .NET: 搜索 `Controllers/`, `BLL/`, `DAL/`, `Models/` 目录
   - Node.js Express: 搜索 `routes/`, `controllers/`, `models/`, `middleware/` 目录
   - NestJS: 搜索 `*.controller.ts`, `*.service.ts`, `*.module.ts`

#### 2.2 扫描前端技术栈

1. **识别前端框架**：
   - `package.json` dependencies 含 `vue`（版本 ^3） → Vue 3
   - `package.json` dependencies 含 `vue`（版本 ^2） → Vue 2
   - `package.json` dependencies 含 `react` → React
   - `package.json` dependencies 含 `@angular/core` → Angular
   - `package.json` dependencies 含 `svelte` → Svelte
   - `package.json` dependencies 含 `next` → Next.js
   - `package.json` dependencies 含 `nuxt` → Nuxt

2. **识别 UI 组件库**：
   - `naive-ui` → Naive UI
   - `element-plus` → Element Plus
   - `antd` → Ant Design
   - `ant-design-vue` → Ant Design Vue
   - `vuetify` → Vuetify
   - `@mui/material` → Material UI
   - `components.json` 含 shadcn $schema → Shadcn UI
   - `@chakra-ui/react` → Chakra UI

3. **识别前端构建和包管理**：
   - devDependencies 含 `vite` → Vite
   - `webpack.config.js` 存在或含 `webpack` → Webpack
   - `package-lock.json` 存在 → npm
   - `pnpm-lock.yaml` 存在 → pnpm
   - `yarn.lock` 存在 → yarn

4. **识别前端路由和状态管理**：
   - `vue-router` → Vue Router
   - `react-router` / `react-router-dom` → React Router
   - `pinia` → Pinia
   - `redux` / `@reduxjs/toolkit` → Redux
   - `zustand` → Zustand

5. **检测 TypeScript**：
   - `tsconfig.json` 存在 → TypeScript 项目

#### 2.3 推断项目架构

- 两个独立的 `package.json`（一个含前端框架，一个含后端框架） → 前后端分离
- 一个 `package.json` 同时含前端和后端框架 → 全栈项目
- 多个后端项目配置文件 → 微服务架构
- 单一后端配置 → 单体应用

#### 2.4 检测 MCP 工具可用性

1. 检查 Playwright MCP 是否已配置：
   ```
   Bash: claude mcp get playwright 2>&1
   ```
   - 如果返回配置信息 → 已配置，记录 `mcp.playwright.available = true`
   - 如果返回错误/未找到 → 未配置，进入步骤 2.5 自动安装

2. 检查数据库 MCP 是否已配置：
   ```
   Bash: claude mcp list 2>&1
   ```
   - 从输出中搜索 `mysql`/`postgres`/`sqlite` 关键词
   - 找到则记录 MCP 名称和配置

#### 2.5 自动安装 Playwright MCP（如未配置）

如果步骤 2.4 检测到 Playwright MCP 未配置，自动安装：

1. 提示用户：
   ```
   检测到 Playwright MCP 未配置。Playwright MCP 是执行 E2E 测试的必要组件。
   正在自动配置...
   ```

2. 执行安装命令：
   ```
   Bash: claude mcp add playwright -- npx -y @playwright/mcp@latest
   ```

3. 验证安装成功：
   ```
   Bash: claude mcp get playwright 2>&1
   ```
   - 成功 → 输出 `✓ Playwright MCP 已配置`
   - 失败 → 输出警告 `警告: Playwright MCP 自动配置失败，请手动执行: claude mcp add playwright -- npx -y @playwright/mcp@latest`

4. 如果用户的项目使用了 MySQL 或 PostgreSQL 数据库，且数据库 MCP 未配置，提示用户（不自动安装，因为需要连接信息）：
   ```
   提示: 检测到项目使用 {database}，建议配置数据库 MCP 以启用数据验证功能。
   配置命令示例:
     claude mcp add mysql-db -- npx -y @anthropic-ai/mcp-mysql --host localhost --port 3306 --user root --database {dbname}
   不配置也可以使用，测试时将跳过数据库验证步骤。
   ```

### 步骤 3: 展示检测结果，请求用户确认

以结构化格式输出检测结果：

```
技术栈检测完成:
  项目架构: {architecture}
  后端: {language} / {framework} {frameworkVersion} / {orm} / {database}
    项目路径: {backend.projectPath}
    层级结构: {controller} → {service} → {repository} → {entity}
  前端: {frontend.framework} {frameworkVersion} / {uiLibrary} / {buildTool} / {typescript ? 'TypeScript' : 'JavaScript'}
    项目路径: {frontend.projectPath}
  MCP 工具:
    数据库: {mcp.database ? '已配置' : '未检测到'}
    Playwright: {mcp.playwright ? '已配置' : '未检测到'}

请确认以上结果是否正确，如有修正请直接说明（例如："ORM 应该是 MyBatis 而不是 MyBatis Plus"）。
```

等待用户响应：
- 用户回复"确认"或类似肯定 → 继续步骤 4
- 用户提出修正 → 根据反馈更新检测结果中的对应字段，然后继续步骤 4

### 步骤 4: 渲染并生成 6 个 SKILL.md（调用 generator 模块）

1. 确定输出目录：
   - `--storage project`（默认）: `{项目根目录}/.claude/skills/e2e/`
   - `--storage user`: `~/.claude/skills/e2e/{项目名}/`

2. 创建输出目录结构：
   ```
   Bash: mkdir -p <output_dir>/e2e-orchestrator
   Bash: mkdir -p <output_dir>/e2e-code-tracer
   Bash: mkdir -p <output_dir>/e2e-testcase-generator
   Bash: mkdir -p <output_dir>/e2e-playwright-runner
   Bash: mkdir -p <output_dir>/e2e-error-fixer
   Bash: mkdir -p <output_dir>/e2e-report-generator
   Bash: mkdir -p <output_dir>/config
   ```

3. 加载插件模板文件：
   - 读取 `templates/` 下的 6 个 `.md.hbs` 主模板
   - 读取 `partials/` 下对应技术栈的 `.hbs` 片段

4. 根据检测结果选择对应的 Partials：
   - 后端 partial: 根据 `backend.framework` 选择（如 `java-spring-boot.hbs`）
   - 前端 partial: 根据 `frontend.framework` 选择（如 `vue3.hbs`）
   - ORM partial: 根据 `backend.orm` 选择（如 `mybatis-plus.hbs`）
   - 数据库 partial: 根据 `backend.database` 选择（如 `mysql.hbs`）
   - 测试 partial: 根据 `backend.testFramework` 选择

5. 将 `TechStackDetectionResult` 作为模板上下文数据，逐一渲染 6 个主模板

6. 将渲染结果写入对应的 `SKILL.md` 文件

### 步骤 5: 生成配置和元数据文件

1. **生成 `config/projects.yaml`**：
   ```yaml
   # 项目配置（由 e2e-skills-hub:init 自动生成）
   projectName: {projectName}
   architecture: {architecture}
   backend:
     language: {language}
     framework: {framework}
     orm: {orm}
     database: {database}
     projectPath: {backend.projectPath}
     port: {backend.port}
     buildCommand: {backend.buildCommand}
   frontend:
     framework: {frontend.framework}
     uiLibrary: {frontend.uiLibrary}
     projectPath: {frontend.projectPath}
     port: {frontend.port}
     packageManager: {frontend.packageManager}
   mcp:
     database: {mcp.database.name}
     playwright: {mcp.playwright.name}
   ```

2. **生成 `metadata.json`**：
   - version: "1.0.0"
   - generatedAt: 当前时间 ISO 格式
   - generatedBy: "e2e-skills-hub@1.0.0"
   - techStack: 检测到的技术栈摘要
   - skills: 6 个 skill 的名称、路径、SHA-256 内容哈希
   - updateHistory: 初始记录 `{ type: "full", description: "初始生成" }`

   使用 Bash 计算每个 SKILL.md 的 SHA-256 哈希：
   ```
   Bash: sha256sum <output_dir>/e2e-orchestrator/SKILL.md
   ```

### 步骤 6: 输出生成结果摘要

输出格式：

```
✓ 技术栈检测完成
  后端: {language} / {framework} {version} / {orm} / {database}
  前端: {frontend.framework} / {uiLibrary} / {buildTool} / TypeScript

✓ 已生成 6 个 E2E Skills:
  {output_dir}/e2e-orchestrator/SKILL.md
  {output_dir}/e2e-code-tracer/SKILL.md
  {output_dir}/e2e-testcase-generator/SKILL.md
  {output_dir}/e2e-playwright-runner/SKILL.md
  {output_dir}/e2e-error-fixer/SKILL.md
  {output_dir}/e2e-report-generator/SKILL.md

✓ 已生成配置文件:
  {output_dir}/config/projects.yaml
  {output_dir}/metadata.json

下一步: 使用 /e2e-skills-hub:run <url> 执行 E2E 测试
```

## 输出

- 6 个定制化 `SKILL.md` 文件（写入到指定存储位置）
- `config/projects.yaml` 项目配置文件
- `metadata.json` 生成元数据
- 控制台输出生成结果摘要

## 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| 指定路径不存在 | 输出错误信息：`错误: 路径 <path> 不存在，请检查后重试` |
| 无法识别任何技术栈 | 输出警告并建议手动配置：`警告: 未能自动识别技术栈，请使用 /e2e-skills-hub:config set 手动配置` |
| 部分技术栈未识别（如只识别到后端没有前端） | 输出已识别部分，标注未识别项，请用户确认或补充 |
| 模板文件缺失 | 输出错误：`错误: 未找到模板文件 {template_name}，请检查插件安装是否完整` |
| 输出目录写入权限不足 | 输出错误：`错误: 无法写入目录 <dir>，请检查权限` |
| 已有 skills 存在（非首次初始化） | 提示用户：`检测到已存在的 E2E Skills，继续将覆盖现有文件。确认继续？(y/n)` |
| Playwright MCP 未配置 | 自动执行 `claude mcp add playwright -- npx -y @playwright/mcp@latest` 安装；若安装失败则输出手动安装命令 |
| 数据库 MCP 未配置 | 输出提示和配置命令示例，不阻塞流程（数据库验证为可选功能） |
