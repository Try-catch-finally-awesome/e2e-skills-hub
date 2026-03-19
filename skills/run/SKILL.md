---
name: e2e-skills-hub:run
description: 执行 E2E 测试的主入口，支持 URL 模式和描述模式，自动调度 5 个子 skill 完成全链路测试
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# /e2e-skills-hub:run — 执行 E2E 测试

## 用法

**URL 模式**（直接指定页面地址）:
```
/e2e-skills-hub:run http://localhost:5173/products
/e2e-skills-hub:run /products
/e2e-skills-hub:run http://localhost:5173/products --skip-fix
/e2e-skills-hub:run http://localhost:5173/products --skills tracer,testcase
/e2e-skills-hub:run http://localhost:5173/products --max-fix-rounds 30
```

**描述模式**（自然语言描述功能）:
```
/e2e-skills-hub:run --describe "我新增了商品批量导入功能"
/e2e-skills-hub:run --describe "修改了订单列表页的查询条件"
```

## 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `<url>` | string | 与 `--describe` 二选一 | - | 前端页面 URL，支持完整 URL、省略协议、仅路径三种格式 |
| `--describe "<text>"` | string | 与 `<url>` 二选一 | - | 自然语言功能描述，系统将自动推断目标页面 |
| `--skip-fix` | boolean | 否 | false | 跳过错误修复阶段（阶段 4），测试失败后直接生成报告 |
| `--skills <names>` | string（逗号分隔） | 否 | all | 指定执行的子 skill，可选值：`tracer`, `testcase`, `runner`, `fixer`, `report` |
| `--max-fix-rounds <n>` | number | 否 | 20 | 全局最大修复次数，超过后暂停请求用户指导 |
| `--max-single-fix <n>` | number | 否 | 3 | 单用例最大修复次数，超过后标记"需人工介入" |

## 执行步骤

### 步骤 1: 前置检查

1. **检查 Skills 是否已生成**：
   - 搜索项目级 `.claude/skills/e2e/metadata.json`
   - 搜索用户级 `~/.claude/skills/e2e/{项目名}/metadata.json`
   - 如果未找到：
     ```
     错误: 未找到已生成的 E2E Skills。请先运行 /e2e-skills-hub:init 进行初始化。
     ```
     终止执行。

2. **读取 metadata.json**，确认所有 6 个 SKILL.md 文件存在：
   ```
   Glob: {skills_dir}/*/SKILL.md
   ```
   如有缺失，提示用户运行 `/e2e-skills-hub:generate` 补全。

3. **读取项目配置**：
   - 加载 `config/projects.yaml`
   - 加载用户配置 `.claude/e2e-skills-hub.yaml`（如有）
   - 合并配置（命令行参数 > 项目配置 > 用户配置 > 默认值）

### 步骤 2: 解析输入模式

#### 2A: URL 模式

1. 解析用户输入的 URL：
   - 完整 URL: `http://localhost:5173/xxx` → 直接使用
   - 省略协议: `localhost:5173/xxx` → 补全为 `http://localhost:5173/xxx`
   - 仅路径: `/xxx` → 补全为 `http://localhost:{frontend.port}/xxx`

2. 提取路由路径部分（去除协议、host、port）

#### 2B: 描述模式

1. **解析自然语言描述**，提取功能关键词：
   - 从描述中识别功能动词（新增、修改、删除、查询等）
   - 识别业务实体名称（商品、订单、用户等）
   - 转换为搜索关键词（中文 + 英文 + 驼峰 + 短横线格式）
   - 例："商品批量导入" → `batch-import`, `batchImport`, `批量导入`, `product`, `goods`

2. **在项目代码中搜索相关文件**：
   ```
   Grep: pattern="batchImport|batch-import|批量导入", path="{frontend.projectPath}/src"
   Grep: pattern="batchImport|batch-import", path="{backend.projectPath}/src"
   ```

3. **从搜索结果推断页面 URL**：
   - 查看匹配的前端路由配置，提取路由路径
   - 如找到唯一匹配 → 自动转入 URL 模式
   - 如找到多个候选 → 列出供用户选择：
     ```
     找到以下候选页面:
       1. /products/import  (src/views/products/import/index.vue)
       2. /goods/batch-import (src/views/goods/batch-import.vue)
     请选择目标页面 (输入编号):
     ```
   - 如未找到明确的前端页面但找到后端 API → 提示用户补充前端 URL 或仅从后端测试

4. 用户选择后，获得最终的目标 URL，转入统一流程

### 步骤 3: 环境检查（阶段 0）

1. **检查 Playwright MCP 可用性**：
   ```
   Bash: claude mcp get playwright 2>&1
   ```
   - 如果未配置 → 自动安装：
     ```
     Playwright MCP 未配置，正在自动安装...
     Bash: claude mcp add playwright -- npx -y @playwright/mcp@latest
     ```
   - 安装失败 → 终止并提示手动安装命令

2. **检查前端服务**：
   ```
   Bash: curl -s -o /dev/null -w "%{http_code}" http://localhost:{frontend.port}/ 2>/dev/null || echo "FAIL"
   ```
   - 如果不可达：
     ```
     警告: 前端服务 http://localhost:{frontend.port} 未响应。
     请确保前端开发服务器已启动（如: cd {frontend.projectPath} && npm run dev）
     ```
     等待用户确认服务已启动后继续。

2. **检查后端服务**：
   ```
   Bash: curl -s -o /dev/null -w "%{http_code}" http://localhost:{backend.port}/actuator/health 2>/dev/null || curl -s -o /dev/null -w "%{http_code}" http://localhost:{backend.port}/ 2>/dev/null || echo "FAIL"
   ```
   - 如果不可达，输出类似的启动提示。

3. **检查 Playwright MCP 可用性**：
   - 确认 Playwright MCP 工具已配置且可调用
   - 如不可用，输出配置指引

4. **检查数据库 MCP 可用性**（如需要数据库验证）：
   - 确认数据库 MCP 工具已配置
   - 如不可用，输出警告（不阻塞，但跳过数据库验证步骤）

### 步骤 4: 调度子 Skills 执行（阶段 1-5）

加载已生成的 `e2e-orchestrator/SKILL.md`，按其定义的调度链路依次执行 5 个子 skill。

#### 阶段 1: 代码溯源（e2e-code-tracer）

1. 读取 `{skills_dir}/e2e-code-tracer/SKILL.md`
2. 按其执行步骤运行，输入为目标 URL
3. 输出：代码溯源清单（前端组件链 + 后端分层代码 + 数据库表）
4. 显示阶段进度：
   ```
   [阶段 1/5] 代码溯源 ✓
     前端: router → 页面组件 → service API
     后端: Controller → Service → Mapper → Entity
     数据库表: {table1}, {table2}, ...
   ```

如用户指定 `--skills` 且不含 `tracer`，跳过此阶段。

#### 阶段 2: 生成测试用例（e2e-testcase-generator）

1. 读取 `{skills_dir}/e2e-testcase-generator/SKILL.md`
2. 按其执行步骤运行，输入为阶段 1 的溯源清单
3. 输出：完整测试用例表（TC-001 ~ TC-xxx）
4. 显示阶段进度：
   ```
   [阶段 2/5] 用例生成 ✓
     生成 {n} 个测试用例:
       页面加载类: TC-001 ~ TC-00x
       查询类: TC-010 ~ TC-0xx
       新增类: TC-030 ~ TC-0xx
       编辑类: TC-050 ~ TC-0xx
       删除类: TC-070 ~ TC-0xx
       业务流程类: TC-080 ~ TC-0xx
       异常场景类: TC-100 ~ TC-1xx
   ```

如用户指定 `--skills` 且不含 `testcase`，跳过此阶段。

#### 阶段 3: 执行测试（e2e-playwright-runner）

1. 读取 `{skills_dir}/e2e-playwright-runner/SKILL.md`
2. 按其执行步骤逐个执行测试用例
3. 使用 Playwright MCP 在浏览器中操作
4. 每个用例完成后输出结果：
   ```
   [阶段 3/5] 测试执行中...
     TC-001 页面正常加载 ✓
     TC-002 表格正确渲染 ✓
     TC-010 默认加载列表 ✓
     TC-030 正常新增 ✗ (后端返回 500)
     ...
   首轮结果: {passed}/{total} 通过
   ```
5. 收集所有失败用例的详细信息（错误信息、截图、控制台日志、网络请求）

如用户指定 `--skills` 且不含 `runner`，跳过此阶段。

#### 阶段 4: 错误修复循环（e2e-error-fixer + e2e-playwright-runner）

**如果指定了 `--skip-fix`，跳过此阶段。**

1. 初始化计数器：`globalFixCount = 0`，每个失败用例的 `fixCount = 0`
2. 获取失败用例列表

3. **修复循环**（while 存在失败用例 且 `globalFixCount < max-fix-rounds`）：

   a. 读取 `{skills_dir}/e2e-error-fixer/SKILL.md`
   b. 对每个失败用例：
      - 如果该用例 `fixCount >= max-single-fix` → 标记"需人工介入"，跳过
      - 分析错误原因（归因到前端/后端/数据库）
      - 定位问题代码
      - 修复代码
      - 编译验证
      - `fixCount++`，`globalFixCount++`

   c. 确定重测范围（根据修复层级）：
      - 修复前端 → 重测该用例 + 同页面用例
      - 修复后端 → 重测所有调用该接口的用例
      - 修复数据库 → 重测所有 CRUD 用例

   d. 使用 `e2e-playwright-runner` 重新执行受影响的用例

   e. 输出本轮修复进度：
      ```
      [阶段 4/5] 修复轮次 #{globalFixCount}
        修复: TC-030 后端 Controller 参数校验缺失 → 已修复
        重测: TC-030 ✓, TC-031 ✓
      ```

   f. 更新失败用例列表

4. **循环终止条件**：
   - 所有用例通过 → 输出 `全部用例已通过！` 进入阶段 5
   - `globalFixCount >= max-fix-rounds` → 输出当前进度，请求用户指导
   - 所有剩余失败用例均已标记"需人工介入" → 进入阶段 5

如用户指定 `--skills` 且不含 `fixer`，跳过此阶段。

#### 阶段 5: 生成报告（e2e-report-generator）

1. 读取 `{skills_dir}/e2e-report-generator/SKILL.md`
2. 汇总所有阶段数据：
   - 代码溯源链
   - 测试用例表
   - 执行结果（每个用例的通过/失败）
   - 修复记录
   - 数据库验证结果
3. 按报告模板生成完整的 E2E 测试报告（Markdown 格式）
4. 计算综合评分
5. 输出报告路径：
   ```
   [阶段 5/5] 报告生成 ✓
     报告路径: {report.outputPath}/{页面路径}_E2E测试报告_{YYYYMMDD}.md
     综合评分: {score}
     通过率: {passed}/{total} ({percentage}%)
   ```

如用户指定 `--skills` 且不含 `report`，跳过此阶段。

### 步骤 5: 输出最终结果

```
========================================
E2E 测试执行完成
========================================
目标页面: {url}
测试用例: {total} 个
  通过: {passed} ✓
  失败: {failed} ✗
  需人工介入: {manual} ⚠
修复次数: {globalFixCount}
综合评分: {score}
报告路径: {report_path}
========================================
```

## 输出

- 各阶段的执行进度和中间结果
- 代码修复（如有失败用例）
- 完整的 E2E 测试报告（Markdown 文件）
- 控制台最终结果摘要

## 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| 未找到已生成的 Skills | 提示运行 `/e2e-skills-hub:init` |
| SKILL.md 文件不完整（部分缺失） | 列出缺失文件，提示运行 `/e2e-skills-hub:generate` |
| 前端/后端服务未启动 | 输出启动命令提示，等待用户确认后重试 |
| Playwright MCP 不可用 | 输出配置指引，终止执行 |
| 数据库 MCP 不可用 | 输出警告，跳过数据库验证步骤（不终止） |
| URL 格式无效 | 输出格式要求：支持 `http://host:port/path`、`host:port/path`、`/path` |
| 描述模式未找到相关代码 | 提示用户提供更具体的描述或直接使用 URL 模式 |
| 单用例修复超限 | 标记"需人工介入"，继续处理其他用例 |
| 全局修复超限 | 暂停执行，输出当前进度和已修复记录，请求用户指导 |
| 修复代码后编译失败 | 回滚修复，标记该用例为"编译失败需人工介入" |
| 浏览器操作超时 | 重试一次，仍超时则标记为失败 |
