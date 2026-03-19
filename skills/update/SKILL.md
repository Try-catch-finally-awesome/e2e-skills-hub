---
name: e2e-skills-hub:update
description: 增量更新已生成的 E2E Skills，根据变更描述分析影响范围并仅更新受影响的 skills
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# /e2e-skills-hub:update — 增量更新 Skills

## 用法

```
/e2e-skills-hub:update "新增了批量删除功能"
/e2e-skills-hub:update "数据库表 products 增加了 batch_no 字段"
/e2e-skills-hub:update "商品列表页新增了导出功能"
/e2e-skills-hub:update --force
```

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `"<变更描述>"` | string | 增量更新时必填 | - | 用自然语言描述项目代码的变更内容 |
| `--force` | boolean | 否 | false | 强制全量重新生成所有 skills，忽略增量分析 |

## 执行步骤

### 步骤 1: 前置检查

1. 查找并读取 `metadata.json`：
   - 项目级: `{项目根目录}/.claude/skills/e2e/metadata.json`
   - 用户级: `~/.claude/skills/e2e/{项目名}/metadata.json`

2. 如果未找到：
   ```
   错误: 未找到已生成的 E2E Skills 元数据。请先运行 /e2e-skills-hub:init 进行初始化。
   ```
   终止执行。

3. 从 metadata.json 中提取：
   - 上次记录的技术栈信息（`techStack`）
   - 各 skill 的内容哈希
   - 更新历史

### 步骤 2: 快速技术栈检测

1. 执行快速模式的技术栈检测（仅检查核心标识文件，不做完整扫描）：
   - 检查 `pom.xml` / `package.json` / `go.mod` / `*.csproj` 是否存在且核心依赖未变
   - 检查前端 `package.json` 的框架和 UI 库依赖版本

2. 与 `metadata.json` 中记录的技术栈比较：
   - **技术栈发生变更**（如框架升级、ORM 切换等）：
     ```
     检测到技术栈变更:
       ORM: MyBatis → MyBatis Plus
     技术栈变更需要全量重新生成。执行全量生成...
     ```
     自动转为全量重新生成（等同 `--force`）
   - **技术栈未变化** → 继续增量分析

### 步骤 3: 判断执行模式

- 如果指定了 `--force` 或步骤 2 检测到技术栈变更：
  - 跳转到步骤 6（全量重新生成）

- 否则继续步骤 4（增量更新）

### 步骤 4: 解析变更描述并定位受影响代码

1. **解析自然语言描述**，提取变更类型和关键词：
   - 功能动词：新增、修改、删除、优化、重构
   - 变更对象：页面、路由、接口、数据库表、查询条件、按钮等
   - 业务实体：将描述中的实体名转为搜索关键词

2. **在项目代码中搜索相关文件**：
   ```
   Grep: pattern="{关键词}", path="{frontend.projectPath}/src"
   Grep: pattern="{关键词}", path="{backend.projectPath}/src"
   ```

3. **分析代码变更范围**：
   - 识别受影响的 Controller / Service / Mapper（后端）
   - 识别受影响的页面组件 / Service API（前端）
   - 识别受影响的数据库表

### 步骤 5: 确定受影响的 Skills（影响矩阵）

根据变更类型，对照以下影响矩阵确定需要更新的 skills：

| 变更类型 | e2e-orchestrator | e2e-code-tracer | e2e-testcase-generator | e2e-playwright-runner | e2e-error-fixer | e2e-report-generator |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|
| 新增页面/路由 | 更新 | 更新 | 更新 | - | - | - |
| 修改查询条件 | - | - | 更新 | - | - | - |
| 修改 CRUD 逻辑 | - | - | 更新 | - | 更新 | - |
| 改数据库表结构 | - | 更新 | 更新 | - | 更新 | - |
| 改前端 UI 组件 | - | 更新 | 更新 | 更新 | - | - |
| 改前端路由 | - | 更新 | - | - | - | - |
| 切换技术栈 | 全量 | 全量 | 全量 | 全量 | 全量 | 全量 |

变更类型判断规则：
- 描述含"新增页面"、"新增路由"、"新页面" → 新增页面/路由
- 描述含"查询"、"搜索"、"筛选"、"过滤" → 修改查询条件
- 描述含"新增功能"、"修改"、"删除功能"、"CRUD" → 修改 CRUD 逻辑
- 描述含"数据库"、"表"、"字段"、"列" → 改数据库表结构
- 描述含"UI"、"组件"、"按钮"、"表单"、"弹窗" → 改前端 UI 组件
- 描述含"路由"、"跳转"、"导航" → 改前端路由
- 多种类型可叠加

输出分析结果：
```
变更分析:
  变更类型: {types}
  受影响 Skills:
    - e2e-testcase-generator (变更原因: 修改了查询条件)
    - e2e-code-tracer (变更原因: 新增了前端页面)
  不受影响 Skills:
    - e2e-orchestrator
    - e2e-playwright-runner
    - e2e-error-fixer
    - e2e-report-generator
```

### 步骤 6: 重新渲染受影响的 Skills

1. 加载模板和 Partials（与 generate 命令一致）
2. 仅对受影响的 skill 重新渲染模板
3. 如果是全量重新生成（`--force` 或技术栈变更），渲染全部 6 个
4. 将渲染结果写入对应的 SKILL.md 文件
5. 计算新的 SHA-256 哈希

### 步骤 7: 更新 metadata.json

1. 更新受影响 skill 的哈希值
2. 如果技术栈变更，更新 techStack 字段
3. 追加 updateHistory 记录：
   ```json
   {
     "timestamp": "<当前时间ISO>",
     "type": "incremental",
     "description": "<用户的变更描述>",
     "changedSkills": ["e2e-testcase-generator", "e2e-code-tracer"]
   }
   ```
   全量时 type 为 `"full"`，changedSkills 为 `["all"]`

4. 写入更新后的 metadata.json

### 步骤 8: 输出结果

```
✓ 增量更新完成
  变更描述: "{用户描述}"
  更新: e2e-testcase-generator, e2e-code-tracer (2 个)
  未变: e2e-orchestrator, e2e-playwright-runner, e2e-error-fixer, e2e-report-generator (4 个)
  更新历史: 第 {n} 次更新 ({m} 次增量 + {k} 次全量)
```

全量时：
```
✓ 全量重新生成完成
  原因: {--force 或 技术栈变更}
  更新: 全部 6 个 Skills
  更新历史: 第 {n} 次更新
```

## 输出

- 更新后的 SKILL.md 文件（仅受影响的 skills）
- 更新后的 metadata.json（含变更记录）
- 控制台输出更新结果摘要

## 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| 未找到 metadata.json | 提示运行 `/e2e-skills-hub:init` |
| 增量模式未提供变更描述 | 提示：`请提供变更描述，例如: /e2e-skills-hub:update "新增了批量导出功能"` |
| 变更描述无法匹配任何变更类型 | 输出警告，建议用更具体的描述或使用 `--force` 全量更新 |
| 模板文件缺失 | 输出错误，建议重新安装插件 |
| 技术栈检测结果与已知配置冲突 | 列出差异，请用户确认是否全量重新生成 |
