---
name: e2e-skills-hub:clean
description: 删除当前项目所有已生成的 E2E Skills 和相关配置文件
allowed-tools: Read, Glob, Grep, Bash
---

# /e2e-skills-hub:clean — 清理所有 Skills

## 用法

```
/e2e-skills-hub:clean
/e2e-skills-hub:clean --confirm
```

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `--confirm` | boolean | 否 | false | 跳过交互式确认，直接执行清理 |

## 执行步骤

### 步骤 1: 定位 Skills 存储目录

1. 按优先级搜索已生成的 Skills：
   - 项目级: `{项目根目录}/.claude/skills/e2e/`
   - 用户级: `~/.claude/skills/e2e/{项目名}/`

2. 如果两个位置都未找到：
   ```
   当前项目没有已生成的 E2E Skills，无需清理。
   ```
   终止执行。

### 步骤 2: 盘点待清理内容

1. 扫描目录下所有文件：
   ```
   Glob: {skills_dir}/**/*
   ```

2. 统计待清理内容：
   - SKILL.md 文件数量
   - config/projects.yaml 是否存在
   - metadata.json 是否存在
   - 其他文件

3. 展示待清理内容清单：
   ```
   以下文件将被删除:
     {skills_dir}/e2e-orchestrator/SKILL.md
     {skills_dir}/e2e-code-tracer/SKILL.md
     {skills_dir}/e2e-testcase-generator/SKILL.md
     {skills_dir}/e2e-playwright-runner/SKILL.md
     {skills_dir}/e2e-error-fixer/SKILL.md
     {skills_dir}/e2e-report-generator/SKILL.md
     {skills_dir}/config/projects.yaml
     {skills_dir}/metadata.json

   共 {n} 个文件，{m} 个目录将被清理。
   ```

### 步骤 3: 确认清理

1. 如果未指定 `--confirm`：
   ```
   ⚠ 此操作将删除当前项目所有已生成的 E2E Skills 和配置文件。
   此操作不可撤销。确认清理? (y/n)
   ```

   等待用户回复：
   - 用户确认 → 继续步骤 4
   - 用户取消 → 输出 `已取消清理操作。` 终止执行

2. 如果指定了 `--confirm`，直接继续

### 步骤 4: 执行清理

1. 删除所有 SKILL.md 文件和空目录：
   ```
   Bash: rm -rf "{skills_dir}/e2e-orchestrator"
   Bash: rm -rf "{skills_dir}/e2e-code-tracer"
   Bash: rm -rf "{skills_dir}/e2e-testcase-generator"
   Bash: rm -rf "{skills_dir}/e2e-playwright-runner"
   Bash: rm -rf "{skills_dir}/e2e-error-fixer"
   Bash: rm -rf "{skills_dir}/e2e-report-generator"
   ```

2. 删除配置文件：
   ```
   Bash: rm -rf "{skills_dir}/config"
   ```

3. 删除元数据文件：
   ```
   Bash: rm -f "{skills_dir}/metadata.json"
   ```

4. 如果 skills 目录为空，删除目录本身：
   ```
   Bash: rmdir "{skills_dir}" 2>/dev/null || true
   ```

### 步骤 5: 输出结果

```
✓ 清理完成
  已删除 {n} 个 SKILL.md 文件
  已删除配置文件 (projects.yaml, metadata.json)
  已清理目录 {skills_dir}

提示: 如需重新初始化，请运行 /e2e-skills-hub:init
```

## 输出

- 清理确认结果和已删除文件清单

## 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| 未找到已生成的 Skills | 提示无需清理 |
| 部分文件删除失败（权限不足） | 输出已成功删除和失败的文件列表，提示检查权限 |
| 目录不为空（含非 e2e-skills-hub 生成的文件） | 仅删除已知的 e2e 相关文件，保留其他文件，输出警告 |
