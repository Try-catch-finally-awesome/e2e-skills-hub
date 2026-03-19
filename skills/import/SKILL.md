---
name: e2e-skills-hub:import
description: 从指定目录导入 E2E Skills 到当前项目
allowed-tools: Read, Write, Glob, Grep, Bash
---

# /e2e-skills-hub:import — 导入 Skills

## 用法

```
/e2e-skills-hub:import ./backup/e2e-skills
/e2e-skills-hub:import /path/to/shared/skills
/e2e-skills-hub:import ~/Desktop/my-e2e-skills
```

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `<dir>` | string | 是 | - | 要导入的源目录路径，需包含有效的 E2E Skills 文件 |

## 执行步骤

### 步骤 1: 验证参数

1. 检查用户是否提供了 `<dir>` 参数
2. 如未提供：
   ```
   用法: /e2e-skills-hub:import <dir>
   示例: /e2e-skills-hub:import ./backup/e2e-skills
   ```
   终止执行。

### 步骤 2: 验证源目录

1. 检查源目录是否存在：
   ```
   Bash: test -d "<dir>" && echo "EXISTS" || echo "NOT_EXISTS"
   ```

2. 如不存在：
   ```
   错误: 源目录 '<dir>' 不存在。
   ```
   终止执行。

3. 扫描源目录内容，检查是否包含有效的 E2E Skills：
   ```
   Glob: <dir>/*/SKILL.md
   ```

4. 验证必要文件：
   - 至少存在 1 个 SKILL.md 文件
   - 检查 metadata.json 是否存在（可选，如无则后续自动生成）
   - 检查 config/projects.yaml 是否存在（可选）

5. 如果没有找到任何 SKILL.md：
   ```
   错误: 源目录 '<dir>' 中未找到有效的 SKILL.md 文件。
   请确认目录结构正确（应包含 e2e-*/SKILL.md 文件）。
   ```
   终止执行。

### 步骤 3: 盘点导入内容

1. 列出源目录中的所有 Skills 和配置文件：
   ```
   源目录 '<dir>' 包含:
     SKILL.md 文件:
       e2e-orchestrator/SKILL.md
       e2e-code-tracer/SKILL.md
       ...
     配置文件:
       config/projects.yaml (存在/不存在)
       metadata.json (存在/不存在)
   ```

2. 如果源目录中有 metadata.json，读取其中的技术栈信息并展示：
   ```
   源 Skills 技术栈: {backend.language} {backend.framework} + {frontend.framework}
   生成时间: {generatedAt}
   ```

### 步骤 4: 检查目标目录

1. 确定目标存储目录：
   - 读取当前项目的配置确定存储位置（项目级/用户级）
   - 默认: `{项目根目录}/.claude/skills/e2e/`

2. 检查目标目录中是否已有 Skills：
   ```
   Glob: {target_dir}/*/SKILL.md
   ```

3. 如已有 Skills：
   ```
   ⚠ 当前项目已存在 E2E Skills:
     {existing_skills_list}
   导入将覆盖同名文件。确认? (y/n)
   ```
   用户取消则终止。

### 步骤 5: 执行导入

1. 确保目标目录存在：
   ```
   Bash: mkdir -p "{target_dir}"
   ```

2. 复制 Skill 文件：
   ```
   Bash: cp -r "<dir>/e2e-orchestrator" "{target_dir}/" 2>/dev/null || true
   Bash: cp -r "<dir>/e2e-code-tracer" "{target_dir}/" 2>/dev/null || true
   Bash: cp -r "<dir>/e2e-testcase-generator" "{target_dir}/" 2>/dev/null || true
   Bash: cp -r "<dir>/e2e-playwright-runner" "{target_dir}/" 2>/dev/null || true
   Bash: cp -r "<dir>/e2e-error-fixer" "{target_dir}/" 2>/dev/null || true
   Bash: cp -r "<dir>/e2e-report-generator" "{target_dir}/" 2>/dev/null || true
   ```

3. 复制配置文件（如存在）：
   ```
   Bash: cp -r "<dir>/config" "{target_dir}/" 2>/dev/null || true
   ```

4. 处理 metadata.json：
   - 如果源目录有 metadata.json → 复制并更新时间戳
   - 如果源目录无 metadata.json → 为导入的 Skills 生成新的 metadata.json

### 步骤 6: 更新 metadata.json

1. 为每个导入的 SKILL.md 计算 SHA-256 哈希：
   ```
   Bash: sha256sum {target_dir}/{skill-name}/SKILL.md
   ```

2. 创建或更新 metadata.json：
   - 更新 skills 数组中各条目的路径和哈希
   - 追加 updateHistory 记录：
     ```json
     {
       "timestamp": "<当前时间ISO>",
       "type": "import",
       "description": "从 <dir> 导入 Skills",
       "changedSkills": ["<导入的 skill 名称列表>"]
     }
     ```

3. 写入 metadata.json

### 步骤 7: 验证导入结果

1. 验证目标目录中的文件完整性：
   ```
   Glob: {target_dir}/*/SKILL.md
   ```

2. 确认所有源文件已正确复制

### 步骤 8: 输出结果

```
✓ 导入完成
  源路径: <dir>
  目标路径: {target_dir}
  导入 Skills:
    e2e-orchestrator/SKILL.md      ✓
    e2e-code-tracer/SKILL.md       ✓
    e2e-testcase-generator/SKILL.md ✓
    ...
  共导入 {n} 个 Skills

⚠ 注意: 导入的 Skills 可能基于不同的技术栈生成。
  如当前项目技术栈与源项目不同，建议运行 /e2e-skills-hub:update --force 重新适配。
```

## 输出

- 导入确认结果和文件清单
- 更新后的 metadata.json

## 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| 未提供源目录参数 | 输出用法说明 |
| 源目录不存在 | 输出 `错误: 源目录不存在` |
| 源目录中无有效 SKILL.md | 输出 `错误: 未找到有效的 Skills 文件` |
| 目标目录创建失败 | 输出 `错误: 无法创建目标目录`，提示检查权限 |
| 文件复制失败 | 列出成功和失败的文件 |
| 导入后技术栈不匹配 | 输出警告，建议运行 `update --force` 重新适配 |
| metadata.json 格式不兼容 | 忽略源 metadata.json，为导入文件生成新的元数据 |
