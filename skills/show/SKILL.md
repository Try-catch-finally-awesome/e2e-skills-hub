---
name: e2e-skills-hub:show
description: 查看指定 E2E Skill 的详细内容
allowed-tools: Read, Glob, Grep, Bash
---

# /e2e-skills-hub:show — 查看 Skill 内容

## 用法

```
/e2e-skills-hub:show e2e-code-tracer
/e2e-skills-hub:show e2e-orchestrator
/e2e-skills-hub:show e2e-testcase-generator
```

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `<skill-name>` | string | 是 | - | 要查看的 skill 名称。合法值：`e2e-orchestrator`, `e2e-code-tracer`, `e2e-testcase-generator`, `e2e-playwright-runner`, `e2e-error-fixer`, `e2e-report-generator` |

## 执行步骤

### 步骤 1: 验证参数

1. 检查用户是否提供了 `<skill-name>` 参数
2. 如未提供：
   ```
   用法: /e2e-skills-hub:show <skill-name>
   可用的 skill 名称:
     - e2e-orchestrator        E2E 测试主编排器
     - e2e-code-tracer         代码溯源专家
     - e2e-testcase-generator  测试用例生成专家
     - e2e-playwright-runner   测试执行专家
     - e2e-error-fixer         错误归因与修复专家
     - e2e-report-generator    测试报告生成专家
   ```
   终止执行。

3. 验证名称是否合法（属于上述 6 个之一）

### 步骤 2: 定位文件

1. 按优先级搜索 Skills 存储目录：
   - 项目级: `{项目根目录}/.claude/skills/e2e/`
   - 用户级: `~/.claude/skills/e2e/{项目名}/`

2. 构造目标文件路径: `{skills_dir}/{skill-name}/SKILL.md`

3. 检查文件是否存在：
   ```
   Bash: test -f "{skills_dir}/{skill-name}/SKILL.md" && echo "EXISTS" || echo "NOT_FOUND"
   ```

4. 如文件不存在：
   ```
   错误: Skill '{skill-name}' 的文件不存在。
   路径: {skills_dir}/{skill-name}/SKILL.md
   请运行 /e2e-skills-hub:generate --only {skill-name} 生成此 skill。
   ```

### 步骤 3: 读取并展示文件内容

1. 读取 SKILL.md 文件的完整内容：
   ```
   Read: {skills_dir}/{skill-name}/SKILL.md
   ```

2. 从 metadata.json 中获取该 skill 的元数据（如有）：
   - 记录的哈希
   - 生成/更新时间

3. 计算当前文件的 SHA-256 哈希，与记录比较

### 步骤 4: 输出

输出文件元信息和完整内容：

```
Skill: {skill-name}
路径: {skills_dir}/{skill-name}/SKILL.md
状态: {正常 | 已修改 | 未注册}
最后更新: {时间}
哈希: {sha256 前 16 位}

--- 文件内容 ---
{SKILL.md 的完整内容}
--- 文件结束 ---
```

## 输出

- Skill 文件的元信息（名称、路径、状态、哈希）
- SKILL.md 的完整文本内容

## 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| 未提供 skill-name 参数 | 列出所有可用的 skill 名称 |
| skill-name 不合法 | 输出 `错误: 未知的 skill 名称 '{name}'`，列出合法名称 |
| 文件不存在 | 提示运行 `/e2e-skills-hub:generate --only {name}` 生成 |
| metadata.json 不存在 | 仍然展示文件内容，但元信息中标注"未注册" |
