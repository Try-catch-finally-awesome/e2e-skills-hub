---
name: e2e-skills-hub:export
description: 将当前项目已生成的 E2E Skills 复制到指定目录，便于备份或分享
allowed-tools: Read, Glob, Grep, Bash
---

# /e2e-skills-hub:export — 导出 Skills

## 用法

```
/e2e-skills-hub:export ./backup/e2e-skills
/e2e-skills-hub:export /path/to/shared/skills
/e2e-skills-hub:export ~/Desktop/my-e2e-skills
```

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `<dir>` | string | 是 | - | 导出目标目录路径，如目录不存在则自动创建 |

## 执行步骤

### 步骤 1: 验证参数

1. 检查用户是否提供了 `<dir>` 参数
2. 如未提供：
   ```
   用法: /e2e-skills-hub:export <dir>
   示例: /e2e-skills-hub:export ./backup/e2e-skills
   ```
   终止执行。

### 步骤 2: 定位源文件

1. 按优先级搜索已生成的 Skills：
   - 项目级: `{项目根目录}/.claude/skills/e2e/`
   - 用户级: `~/.claude/skills/e2e/{项目名}/`

2. 如果未找到：
   ```
   错误: 当前项目没有已生成的 E2E Skills。请先运行 /e2e-skills-hub:init。
   ```
   终止执行。

3. 盘点源目录中的文件：
   ```
   Glob: {skills_dir}/**/*
   ```

### 步骤 3: 检查目标目录

1. 检查目标目录是否已存在：
   ```
   Bash: test -d "<dir>" && echo "EXISTS" || echo "NOT_EXISTS"
   ```

2. 如已存在且非空：
   ```
   目标目录 '<dir>' 已存在且不为空。
   继续导出将覆盖同名文件。确认? (y/n)
   ```
   用户取消则终止。

3. 如不存在，创建目标目录：
   ```
   Bash: mkdir -p "<dir>"
   ```

### 步骤 4: 执行复制

1. 复制所有 Skill 文件和目录结构：
   ```
   Bash: cp -r "{skills_dir}/e2e-orchestrator" "<dir>/"
   Bash: cp -r "{skills_dir}/e2e-code-tracer" "<dir>/"
   Bash: cp -r "{skills_dir}/e2e-testcase-generator" "<dir>/"
   Bash: cp -r "{skills_dir}/e2e-playwright-runner" "<dir>/"
   Bash: cp -r "{skills_dir}/e2e-error-fixer" "<dir>/"
   Bash: cp -r "{skills_dir}/e2e-report-generator" "<dir>/"
   ```

2. 复制配置文件：
   ```
   Bash: cp -r "{skills_dir}/config" "<dir>/"
   ```

3. 复制元数据文件：
   ```
   Bash: cp "{skills_dir}/metadata.json" "<dir>/"
   ```

### 步骤 5: 验证导出结果

1. 确认目标目录中的文件完整性：
   ```
   Glob: <dir>/**/*
   ```

2. 对比源文件和目标文件数量是否一致

### 步骤 6: 输出结果

```
✓ 导出完成
  源路径: {skills_dir}
  目标路径: <dir>
  导出文件:
    {n} 个 SKILL.md 文件
    config/projects.yaml
    metadata.json
  共 {total} 个文件
```

## 输出

- 导出确认结果和文件清单

## 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| 未提供目标目录参数 | 输出用法说明 |
| 源 Skills 不存在 | 提示运行 `/e2e-skills-hub:init` |
| 目标目录创建失败（权限不足） | 输出 `错误: 无法创建目录 '<dir>'，请检查权限` |
| 文件复制失败 | 列出成功和失败的文件，提示检查磁盘空间和权限 |
| 源目录中部分文件缺失 | 输出警告，仅复制存在的文件 |
