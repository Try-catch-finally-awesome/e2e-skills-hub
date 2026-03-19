---
name: e2e-skills-hub:remove
description: 删除指定的 E2E Skill 文件
allowed-tools: Read, Write, Glob, Grep, Bash
---

# /e2e-skills-hub:remove — 删除 Skill

## 用法

```
/e2e-skills-hub:remove e2e-code-tracer
/e2e-skills-hub:remove e2e-testcase-generator
```

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `<skill-name>` | string | 是 | - | 要删除的 skill 名称。合法值：`e2e-orchestrator`, `e2e-code-tracer`, `e2e-testcase-generator`, `e2e-playwright-runner`, `e2e-error-fixer`, `e2e-report-generator` |

## 执行步骤

### 步骤 1: 验证参数

1. 检查用户是否提供了 `<skill-name>` 参数
2. 如未提供：
   ```
   用法: /e2e-skills-hub:remove <skill-name>
   可用的 skill 名称:
     - e2e-orchestrator
     - e2e-code-tracer
     - e2e-testcase-generator
     - e2e-playwright-runner
     - e2e-error-fixer
     - e2e-report-generator
   ```
   终止执行。

3. 验证名称是否合法

### 步骤 2: 定位文件

1. 按优先级搜索 Skills 存储目录
2. 构造目标文件路径: `{skills_dir}/{skill-name}/SKILL.md`
3. 检查文件是否存在

4. 如文件不存在：
   ```
   Skill '{skill-name}' 不存在，无需删除。
   ```
   终止执行。

### 步骤 3: 确认删除

1. 如果目标是 `e2e-orchestrator`，额外警告：
   ```
   ⚠ 警告: e2e-orchestrator 是主编排器，删除后将无法通过 /e2e-skills-hub:run 执行测试。
   ```

2. 请求用户确认：
   ```
   确认删除 Skill '{skill-name}'？
   文件路径: {skills_dir}/{skill-name}/SKILL.md
   此操作不可撤销。确认? (y/n)
   ```

3. 等待用户回复：
   - 用户确认 → 继续步骤 4
   - 用户取消 → 输出 `已取消删除操作。` 终止执行

### 步骤 4: 执行删除

1. 删除 SKILL.md 文件：
   ```
   Bash: rm "{skills_dir}/{skill-name}/SKILL.md"
   ```

2. 删除空目录（如果该目录下无其他文件）：
   ```
   Bash: rmdir "{skills_dir}/{skill-name}" 2>/dev/null || true
   ```

### 步骤 5: 更新 metadata.json

1. 读取 metadata.json
2. 从 `skills` 数组中移除该 skill 的条目
3. 追加 updateHistory 记录：
   ```json
   {
     "timestamp": "<当前时间ISO>",
     "type": "remove",
     "description": "删除 {skill-name}",
     "changedSkills": ["{skill-name}"]
   }
   ```
4. 写入更新后的 metadata.json

### 步骤 6: 输出结果

```
✓ 已删除 Skill '{skill-name}'
  路径: {skills_dir}/{skill-name}/SKILL.md
  剩余 Skills: {remaining_count} 个

提示: 如需重新生成，请运行 /e2e-skills-hub:generate --only {skill-name}
```

## 输出

- 删除确认结果
- 更新后的 metadata.json

## 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| 未提供 skill-name 参数 | 列出所有可用的 skill 名称 |
| skill-name 不合法 | 输出 `错误: 未知的 skill 名称 '{name}'`，列出合法名称 |
| 文件不存在 | 提示无需删除 |
| 删除文件权限不足 | 输出 `错误: 无法删除文件，请检查文件权限` |
| metadata.json 不存在 | 仅删除文件，输出警告 `metadata.json 不存在，仅删除了文件` |
