---
name: e2e-skills-hub:generate
description: 仅生成 E2E 测试 Skills（假设已有检测结果或手动配置），不执行技术栈检测
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# /e2e-skills-hub:generate — 生成 Skills

## 用法

```
/e2e-skills-hub:generate
/e2e-skills-hub:generate --force
/e2e-skills-hub:generate --only e2e-code-tracer,e2e-testcase-generator
```

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `--force` | boolean | 否 | false | 强制重新生成，覆盖已存在的 SKILL.md 文件（不提示确认） |
| `--only <skill-names>` | string（逗号分隔） | 否 | 全部 | 仅生成指定的 skills，可选值：`e2e-orchestrator`, `e2e-code-tracer`, `e2e-testcase-generator`, `e2e-playwright-runner`, `e2e-error-fixer`, `e2e-report-generator` |

## 执行步骤

### 步骤 1: 检查前置条件

1. 查找已有的技术栈配置，按以下优先级搜索：
   - 项目级: `{项目根目录}/.claude/skills/e2e/config/projects.yaml`
   - 用户级: `~/.claude/skills/e2e/{项目名}/config/projects.yaml`
   - 项目级配置文件: `{项目根目录}/.claude/e2e-skills-hub.yaml`
   - 用户级配置文件: `~/.claude/e2e-skills-hub.yaml`

2. 如果找不到任何技术栈配置：
   ```
   错误: 未找到技术栈配置。请先运行 /e2e-skills-hub:init 进行初始化，
   或使用 /e2e-skills-hub:config set 手动配置技术栈信息。
   ```
   终止执行。

3. 读取并解析配置文件，提取 `TechStackDetectionResult`

### 步骤 2: 确定生成范围

1. 如果指定了 `--only` 参数：
   - 解析逗号分隔的 skill 名称列表
   - 验证每个名称是否合法（必须是 6 个标准 skill 之一）
   - 不合法的名称输出警告并跳过

2. 如果未指定 `--only`，默认生成全部 6 个 skills

3. 确定输出目录（从配置中读取 `storage.location`）

### 步骤 3: 检查已有文件

1. 检查输出目录中是否已存在 SKILL.md 文件：
   ```
   Glob: {output_dir}/*/SKILL.md
   ```

2. 如果已有文件存在且未指定 `--force`：
   - 列出已存在的文件
   - 提示用户确认覆盖：`以下 Skills 已存在，是否覆盖？(y/n)`
   - 用户取消则终止

3. 如果指定了 `--force`，直接覆盖不提示

### 步骤 4: 加载模板和 Partials

1. 读取插件目录下的主模板：
   ```
   Read: {插件目录}/templates/e2e-orchestrator.md.hbs
   Read: {插件目录}/templates/e2e-code-tracer.md.hbs
   ... (仅读取 --only 指定的模板)
   ```

2. 根据技术栈配置选择对应的 Partials：
   - 后端: `partials/backend/{framework}.hbs`
   - 前端: `partials/frontend/{framework}.hbs`
   - ORM: `partials/orm/{orm}.hbs`
   - 数据库: `partials/database/{database}.hbs`
   - 测试: `partials/testing/{testFramework}.hbs`

3. 读取所有需要的 Partial 文件

### 步骤 5: 渲染模板

1. 将技术栈检测结果构造为模板上下文数据
2. 对每个待生成的主模板：
   - 注册所需的 Partials
   - 使用 Handlebars 渲染引擎执行渲染
   - 生成最终的 SKILL.md 内容

### 步骤 6: 写入文件

1. 确保输出目录存在：
   ```
   Bash: mkdir -p {output_dir}/{skill-name}
   ```

2. 将渲染结果写入文件：
   ```
   Write: {output_dir}/{skill-name}/SKILL.md
   ```

3. 对每个生成的文件计算 SHA-256 哈希：
   ```
   Bash: sha256sum {output_dir}/{skill-name}/SKILL.md
   ```

### 步骤 7: 更新元数据

1. 读取现有 `metadata.json`（如果存在）
2. 更新或创建 skills 列表中对应条目的路径和哈希
3. 追加 updateHistory 记录：
   ```json
   {
     "timestamp": "<当前时间ISO>",
     "type": "generate",
     "description": "生成 Skills",
     "changedSkills": ["<生成的 skill 名称列表>"]
   }
   ```
4. 写入更新后的 `metadata.json`

### 步骤 8: 输出结果

```
✓ 已生成 {n} 个 E2E Skills:
  {output_dir}/e2e-orchestrator/SKILL.md     (新建/覆盖)
  {output_dir}/e2e-code-tracer/SKILL.md      (新建/覆盖)
  ...

✓ 已更新 metadata.json
```

## 输出

- 指定范围内的 SKILL.md 文件
- 更新后的 `metadata.json`

## 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| 未找到技术栈配置 | 提示运行 `/e2e-skills-hub:init` 或手动配置 |
| `--only` 中包含无效 skill 名称 | 输出警告，列出合法名称，跳过无效项继续生成 |
| 模板文件缺失 | 输出错误：`错误: 未找到模板 {name}，请检查插件安装` |
| Partial 文件缺失（技术栈不支持） | 输出错误：`错误: 不支持的技术栈 {tech}，缺少 partial {path}` |
| 写入失败 | 输出错误并列出已成功写入的文件 |
