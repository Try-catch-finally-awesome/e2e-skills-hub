---
name: e2e-skills-hub:config
description: 查看或修改 e2e-skills-hub 的配置，支持查看合并配置、设置单项值和重置为默认值
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# /e2e-skills-hub:config — 配置管理

## 用法

```
/e2e-skills-hub:config
/e2e-skills-hub:config set execution.maxFixRounds 30
/e2e-skills-hub:config set storage.location user
/e2e-skills-hub:config set testAccount.username admin
/e2e-skills-hub:config reset
```

## 参数

| 子命令/参数 | 类型 | 必填 | 说明 |
|------------|------|------|------|
| （无参数） | - | - | 显示当前生效的合并配置 |
| `set <key> <value>` | string string | 是（使用 set 时） | 修改指定配置项的值 |
| `reset` | - | - | 将配置重置为插件默认值 |

### 可配置项列表

| 配置键 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `storage.location` | `project` \| `user` | `project` | Skills 存储位置 |
| `storage.projectPath` | string | `.claude/skills/e2e` | 项目级存储子路径 |
| `storage.userPath` | string | `~/.claude/skills/e2e` | 用户级存储路径 |
| `detection.autoDetect` | boolean | `true` | 是否自动检测技术栈 |
| `detection.backend.language` | string | `""` | 手动指定后端语言 |
| `detection.backend.framework` | string | `""` | 手动指定后端框架 |
| `detection.backend.orm` | string | `""` | 手动指定 ORM |
| `detection.backend.projectPath` | string | `""` | 后端项目路径 |
| `detection.backend.port` | number | `8080` | 后端服务端口 |
| `detection.backend.buildCommand` | string | `""` | 后端编译命令 |
| `detection.backend.testCommand` | string | `""` | 后端测试命令 |
| `detection.frontend.framework` | string | `""` | 手动指定前端框架 |
| `detection.frontend.projectPath` | string | `""` | 前端项目路径 |
| `detection.frontend.port` | number | `5173` | 前端服务端口 |
| `detection.frontend.packageManager` | string | `""` | 包管理器 |
| `execution.maxFixRounds` | number | `20` | 全局最大修复次数 |
| `execution.maxSingleFix` | number | `3` | 单用例最大修复次数 |
| `execution.testDataPrefix` | string | `TEST_` | 测试数据前缀 |
| `execution.screenshotOnFailure` | boolean | `true` | 失败时自动截图 |
| `execution.cleanTestData` | boolean | `true` | 测试后清理测试数据 |
| `mcp.database.name` | string | `""` | 数据库 MCP 工具名称 |
| `mcp.database.database` | string | `""` | 默认数据库名 |
| `mcp.playwright.name` | string | `playwright` | Playwright MCP 名称 |
| `mcp.playwright.browser` | string | `chromium` | 浏览器类型 |
| `testAccount.username` | string | `""` | 测试账号用户名 |
| `testAccount.password` | string | `""` | 测试账号密码 |
| `testAccount.loginType` | string | `""` | 登录类型 |
| `report.outputPath` | string | `doc/测试报告` | 报告输出路径 |
| `report.format` | string | `markdown` | 报告格式 |
| `report.includeScreenshots` | boolean | `true` | 报告是否包含截图 |
| `quality.passScore` | number | `90` | 综合评分通过线 |
| `quality.scoreWeights.pageLoad` | number | `15` | 页面加载权重 (%) |
| `quality.scoreWeights.crudCorrectness` | number | `30` | CRUD 正确性权重 (%) |
| `quality.scoreWeights.businessFlow` | number | `25` | 业务流程权重 (%) |
| `quality.scoreWeights.exceptionHandling` | number | `15` | 异常处理权重 (%) |
| `quality.scoreWeights.dataConsistency` | number | `15` | 数据一致性权重 (%) |

## 执行步骤

### 子命令 A: 无参数 — 查看当前配置

#### 步骤 1: 加载各层级配置

1. 加载插件默认配置：
   ```
   Read: {插件目录}/src/config/defaults.yaml
   ```

2. 加载用户级配置（如存在）：
   ```
   Read: ~/.claude/e2e-skills-hub.yaml
   ```

3. 加载项目级配置（如存在）：
   ```
   Read: {项目根目录}/.claude/e2e-skills-hub.yaml
   ```

#### 步骤 2: 合并配置

按优先级合并（高覆盖低）：
```
项目级配置 > 用户级配置 > 插件默认值
```

#### 步骤 3: 输出合并后的配置

```
e2e-skills-hub 当前配置:
(项: 项目级 | 用: 用户级 | 默: 默认值)

storage:
  location: project                    [默]
  projectPath: .claude/skills/e2e      [默]

detection:
  autoDetect: true                     [默]
  backend:
    language: java                     [项]
    framework: spring-boot             [项]
    orm: mybatis-plus                  [项]
    port: 8080                         [默]
  frontend:
    framework: vue3                    [项]
    port: 5173                         [默]

execution:
  maxFixRounds: 30                     [用]
  maxSingleFix: 3                      [默]
  testDataPrefix: TEST_                [默]

mcp:
  database:
    name: mysql-bos-service            [项]
  playwright:
    name: playwright                   [默]

testAccount:
  username: admin                      [项]
  password: ****                       [项]

report:
  outputPath: doc/测试报告              [默]

quality:
  passScore: 90                        [默]
```

### 子命令 B: `set <key> <value>` — 修改配置

#### 步骤 1: 验证配置键

1. 检查 `<key>` 是否在可配置项列表中
2. 如不存在：
   ```
   错误: 未知的配置键 '{key}'。
   运行 /e2e-skills-hub:config 查看所有可用配置项。
   ```

#### 步骤 2: 验证配置值

1. 根据配置键的类型验证 `<value>` 格式：
   - number 类型: 确保为有效数字
   - boolean 类型: 接受 `true`/`false`
   - 枚举类型（如 `storage.location`）: 确保在合法值范围内

2. 如类型不匹配：
   ```
   错误: '{key}' 的值应为 {type} 类型，收到: '{value}'
   ```

#### 步骤 3: 写入配置文件

1. 确定写入位置（默认写入项目级配置）：
   - 配置文件路径: `{项目根目录}/.claude/e2e-skills-hub.yaml`

2. 读取现有配置文件（如存在）

3. 更新指定键的值（保持 YAML 结构）：
   - 将点分隔的键路径（如 `execution.maxFixRounds`）解析为嵌套结构
   - 更新对应节点的值

4. 写入更新后的配置文件：
   ```
   Write: {项目根目录}/.claude/e2e-skills-hub.yaml
   ```

#### 步骤 4: 输出结果

```
✓ 配置已更新
  {key}: {old_value} → {new_value}
  配置文件: {config_file_path}
```

### 子命令 C: `reset` — 重置配置

#### 步骤 1: 确认重置

```
⚠ 此操作将删除项目级和用户级的自定义配置，恢复为插件默认值。
确认重置? (y/n)
```

#### 步骤 2: 执行重置

1. 删除项目级配置文件：
   ```
   Bash: rm -f "{项目根目录}/.claude/e2e-skills-hub.yaml"
   ```

2. 删除用户级配置文件（可选，询问用户）：
   ```
   是否同时重置用户级配置? (y/n)
   ```
   用户确认后：
   ```
   Bash: rm -f ~/.claude/e2e-skills-hub.yaml
   ```

#### 步骤 3: 输出结果

```
✓ 配置已重置为默认值
  已删除: {项目根目录}/.claude/e2e-skills-hub.yaml
  已删除: ~/.claude/e2e-skills-hub.yaml (如用户确认)
```

## 输出

- 无参数: 当前合并配置的结构化展示（标注各项来源）
- set: 修改确认信息
- reset: 重置确认信息

## 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| 未知的配置键 | 列出所有合法配置键 |
| 配置值类型不匹配 | 输出期望类型和实际值 |
| 配置文件写入失败 | 输出错误，提示检查文件权限 |
| 配置文件格式错误（YAML 解析失败） | 输出警告，建议手动检查或使用 reset 重置 |
| `quality.scoreWeights` 各项之和不为 100 | 输出警告：`评分权重总和应为 100%，当前为 {sum}%` |
