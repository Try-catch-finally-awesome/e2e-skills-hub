---
name: e2e-skills-hub:list
description: 列出当前项目已生成的所有 E2E Skills 及其状态信息
allowed-tools: Read, Glob, Grep, Bash
---

# /e2e-skills-hub:list — 列出 Skills

## 用法

```
/e2e-skills-hub:list
```

## 参数

无参数。

## 执行步骤

### 步骤 1: 定位 Skills 存储目录

1. 按以下优先级搜索 `metadata.json`：
   - 项目级: `{项目根目录}/.claude/skills/e2e/metadata.json`
   - 用户级: `~/.claude/skills/e2e/{项目名}/metadata.json`

2. 如果未找到：
   ```
   当前项目未初始化 E2E Skills。
   请运行 /e2e-skills-hub:init 进行初始化。
   ```
   终止执行。

### 步骤 2: 读取元数据

1. 读取 `metadata.json`，提取：
   - `version`: 插件版本
   - `generatedAt`: 初始生成时间
   - `techStack`: 技术栈摘要
   - `skills`: 各 skill 的名称、路径、哈希
   - `updateHistory`: 更新历史（最近一条）

### 步骤 3: 扫描实际文件状态

1. 扫描 Skills 目录下的所有 SKILL.md 文件：
   ```
   Glob: {skills_dir}/*/SKILL.md
   ```

2. 对每个已注册的 skill，检查：
   - 文件是否存在
   - 计算当前文件的 SHA-256 哈希：
     ```
     Bash: sha256sum {skills_dir}/{skill-name}/SKILL.md
     ```
   - 与 metadata.json 中记录的哈希比较，判断是否被手动修改过
   - 获取文件最后修改时间：
     ```
     Bash: stat -c '%Y' {skills_dir}/{skill-name}/SKILL.md 2>/dev/null || stat -f '%m' {skills_dir}/{skill-name}/SKILL.md
     ```

3. 检查是否有未在 metadata.json 中注册的额外文件

### 步骤 4: 输出列表

以表格格式输出：

```
E2E Skills 列表 ({存储位置})
技术栈: {backend.language} {backend.framework} + {frontend.framework}
初始生成: {generatedAt}
最后更新: {lastUpdateTime} ({updateType})

| # | Skill 名称               | 路径                                    | 状态   | 最后更新时间        | 哈希(前8位) |
|---|--------------------------|----------------------------------------|--------|-------------------|------------|
| 1 | e2e-orchestrator         | e2e-orchestrator/SKILL.md              | 正常   | 2026-03-19 10:30  | abc12345   |
| 2 | e2e-code-tracer          | e2e-code-tracer/SKILL.md               | 正常   | 2026-03-19 10:30  | def67890   |
| 3 | e2e-testcase-generator   | e2e-testcase-generator/SKILL.md        | 已修改 | 2026-03-19 14:20  | ghi24680   |
| 4 | e2e-playwright-runner    | e2e-playwright-runner/SKILL.md         | 正常   | 2026-03-19 10:30  | jkl13579   |
| 5 | e2e-error-fixer          | e2e-error-fixer/SKILL.md               | 正常   | 2026-03-19 10:30  | mno97531   |
| 6 | e2e-report-generator     | e2e-report-generator/SKILL.md          | 缺失   | -                 | -          |

总计: 6 个 Skills (5 存在, 1 缺失, 1 已修改)
更新历史: 共 3 次更新 (2 次增量 + 1 次全量)
```

状态说明：
- **正常**: 文件存在且哈希匹配
- **已修改**: 文件存在但哈希不匹配（被手动编辑过）
- **缺失**: metadata.json 中有记录但文件不存在

## 输出

控制台表格，包含每个 skill 的名称、路径、状态、最后更新时间和内容哈希。

## 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| 未找到 metadata.json | 提示未初始化，建议运行 `/e2e-skills-hub:init` |
| metadata.json 格式错误 | 输出警告：`metadata.json 格式异常，建议运行 /e2e-skills-hub:init --force 重新初始化` |
| 部分 SKILL.md 文件缺失 | 在列表中标记为"缺失"，并在底部提示运行 `/e2e-skills-hub:generate` 补全 |
| 哈希计算失败 | 在对应行显示 "N/A"，不影响其他行的展示 |
