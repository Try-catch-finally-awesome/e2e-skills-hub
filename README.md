# e2e-skills-hub

Claude Code 插件，自动检测项目技术栈，生成定制化 E2E 全流程测试 Skills。

通过分析项目的构建文件、依赖清单和目录结构，自动识别后端框架（Spring Boot、Django、FastAPI、Express、NestJS、Gin、ASP.NET Core、ThinkPHP、Laravel、Swoole）、前端框架（Vue 2/3、React、Angular、Next.js、Nuxt）、ORM 和数据库等技术要素，然后基于 Handlebars 模板引擎生成六个高度定制的 E2E 测试 Skill 文件，覆盖从代码追踪、用例生成、Playwright 执行到错误修复和报告生成的完整链路。

## 功能特点

- **零配置启动** — 运行 `/e2e-skills-hub:init` 即可完成技术栈检测和 Skills 生成，无需手动编写配置文件
- **通用技术栈支持** — 覆盖 Java、Python、Go、.NET、Node.js、PHP 后端以及 Vue、React、Angular 等主流前端框架
- **MCP 自动配置** — 初始化时自动检测并安装 Playwright MCP，无需手动配置浏览器测试环境
- **完整 E2E 流程** — 从接口追踪、测试用例生成、Playwright 自动化执行、失败修复到测试报告，形成闭环
- **增量更新** — 代码变更后无需全量重新生成，通过 `/e2e-skills-hub:update` 仅更新受影响的 Skills

## 安装

### 方式一：通过 Claude Code 安装

```bash
claude install e2e-skills-hub
```

### 方式二：手动 Git Clone

```bash
git clone https://github.com/Try-catch-finally-awesome/e2e-skills-hub.git
cd e2e-skills-hub
npm install
npm run build
```

## 快速开始

**第一步：初始化**

在项目根目录下运行初始化命令，自动检测技术栈并生成 Skills：

```
/e2e-skills-hub:init
```

**第二步：执行测试**

指定页面 URL 或功能描述，启动 E2E 全流程测试：

```
/e2e-skills-hub:run url=http://localhost:5173/user/list
```

或通过功能描述模式：

```
/e2e-skills-hub:run describe=用户管理模块的增删改查
```

## 命令列表

| 命令 | 说明 |
|------|------|
| `/e2e-skills-hub:init` | 首次初始化，自动检测技术栈并生成 E2E Skills |
| `/e2e-skills-hub:run` | 执行 E2E 测试，支持 URL 模式和描述模式 |
| `/e2e-skills-hub:generate` | 仅生成 Skills（跳过检测，适用于手动配置场景） |
| `/e2e-skills-hub:update` | 增量更新受影响的 Skills |
| `/e2e-skills-hub:list` | 列出当前项目已生成的所有 Skills 及状态 |
| `/e2e-skills-hub:show` | 查看指定 Skill 的详细内容 |
| `/e2e-skills-hub:remove` | 删除指定的 Skill 文件 |
| `/e2e-skills-hub:clean` | 删除所有已生成的 Skills 和配置文件 |
| `/e2e-skills-hub:config` | 查看或修改配置 |
| `/e2e-skills-hub:export` | 将 Skills 导出到指定目录 |
| `/e2e-skills-hub:import` | 从指定目录导入 Skills |
| `/e2e-skills-hub:detect` | 仅执行技术栈检测（不生成 Skills） |
| `/e2e-skills-hub:status` | 查看当前项目的初始化状态和技术栈摘要 |

## 支持的技术栈

### 后端

| 语言 | 框架 | ORM | 数据库 |
|------|------|-----|--------|
| Java | Spring Boot, Spring MVC | MyBatis Plus, MyBatis, JPA/Hibernate | MySQL, PostgreSQL, MongoDB |
| Python | Django, FastAPI, Flask | Django ORM, SQLAlchemy | MySQL, PostgreSQL, SQLite, MongoDB |
| Go | Gin | GORM | MySQL, PostgreSQL, SQLite |
| .NET | ASP.NET Core | Entity Framework, Dapper | SQL Server, PostgreSQL, MySQL |
| Node.js | Express, NestJS | TypeORM, Prisma | MySQL, PostgreSQL, MongoDB |
| PHP | ThinkPHP, Laravel, Swoole | Eloquent, think-orm | MySQL, PostgreSQL, Redis, MongoDB |

### 前端

| 框架 | UI 组件库 | 构建工具 | 状态管理 |
|------|-----------|----------|----------|
| Vue 3 | Naive UI, Element Plus, Ant Design Vue, Arco Design | Vite, Webpack | Pinia, Vuex |
| Vue 2 | Element UI, Ant Design Vue, Vuetify | Webpack | Vuex |
| React | Material UI, Ant Design, Chakra UI, Arco Design | Vite, Webpack | Redux Toolkit, Zustand, Jotai, Recoil |
| Angular | - | Webpack | NgRx |
| Next.js | (同 React) | Next.js 内置 | (同 React) |
| Nuxt | (同 Vue) | Nuxt 内置 | (同 Vue) |

## 项目结构

```
e2e-skills-hub/
  src/
    detector/         # 技术栈检测引擎
      scanners/       # 各语言/框架扫描器
    generator/        # Handlebars 模板渲染引擎
    manager/          # Skills 存储与元数据管理
    executor/         # 测试执行调度（URL 模式 / 描述模式）
    updater/          # 增量更新（diff 分析 + 影响矩阵）
    config/           # 配置加载与合并
    utils/            # 工具函数
  templates/          # 6 个 Skill 的 Handlebars 模板
  partials/           # 可复用的模板片段（按技术栈分组）
  skills/             # 11 个管理型 slash command
  tests/              # 测试用例与夹具
```

## 许可证

[MIT](LICENSE)
