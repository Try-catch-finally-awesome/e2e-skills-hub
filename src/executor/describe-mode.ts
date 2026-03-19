/**
 * 描述模式 — 通过自然语言描述触发 E2E 测试
 */

import logger from '../utils/logger.js';

/** 描述模式执行参数 */
export interface DescribeModeParams {
  /** 功能描述文本 */
  description: string;
  /** 要执行的子 skill 列表 */
  skills?: string;
  /** 跳过错误修复阶段 */
  skipFix?: boolean;
  /** 后端项目路径 */
  backendPath: string;
  /** 前端项目路径 */
  frontendPath: string;
  /** 前端端口 */
  frontendPort?: number;
}

/** 搜索策略条目 */
export interface SearchStrategy {
  /** 搜索模式 */
  pattern: string;
  /** 搜索范围 */
  scope: 'filename' | 'classname' | 'functionname' | 'route' | 'content';
  /** 搜索路径 */
  searchPath: string;
}

/** 候选匹配结果 */
export interface CandidateMatch {
  /** 文件路径 */
  filePath: string;
  /** 匹配类型 */
  matchType: 'exact' | 'partial' | 'fuzzy';
  /** 推断的前端 URL（如果有） */
  inferredUrl?: string;
  /** 推断的 API 路径（如果有） */
  inferredApi?: string;
  /** 匹配得分 */
  score: number;
}

/**
 * 从自然语言描述中提取关键词
 * 支持中文和英文关键词提取
 */
export function extractKeywords(description: string): string[] {
  const keywords: string[] = [];

  // 移除常见的动词和虚词
  const stopWords = new Set([
    '我', '的', '了', '是', '在', '有', '和', '与', '对', '将', '把',
    '新增', '修改', '删除', '更新', '添加', '移除',
    'i', 'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for',
    'new', 'added', 'modified', 'updated', 'deleted', 'removed',
  ]);

  // 提取中文词汇（2-6个字的连续中文）
  const chineseWords = description.match(/[\u4e00-\u9fa5]{2,6}/g) ?? [];
  for (const word of chineseWords) {
    if (!stopWords.has(word)) {
      keywords.push(word);
    }
  }

  // 提取英文词汇
  const englishWords = description.match(/[a-zA-Z][a-zA-Z0-9_-]{2,}/g) ?? [];
  for (const word of englishWords) {
    if (!stopWords.has(word.toLowerCase())) {
      keywords.push(word);
    }
  }

  return [...new Set(keywords)];
}

/**
 * 将中文关键词转换为可能的代码标识符
 * "商品批量导入" → ["batch-import", "batchImport", "batch_import", "批量导入"]
 */
export function keywordToCodePatterns(keyword: string): string[] {
  const patterns: string[] = [keyword];

  // 常见的中文 → 英文映射表
  const dictionary: Record<string, string> = {
    '商品': 'product',
    '用户': 'user',
    '订单': 'order',
    '列表': 'list',
    '详情': 'detail',
    '查询': 'query',
    '搜索': 'search',
    '新增': 'add',
    '编辑': 'edit',
    '删除': 'delete',
    '导入': 'import',
    '导出': 'export',
    '批量': 'batch',
    '审核': 'audit',
    '审批': 'approve',
    '发布': 'publish',
    '登录': 'login',
    '注册': 'register',
    '配置': 'config',
    '设置': 'setting',
    '系统': 'system',
    '管理': 'manage',
    '统计': 'statistics',
    '报表': 'report',
    '日志': 'log',
    '角色': 'role',
    '权限': 'permission',
    '菜单': 'menu',
    '部门': 'department',
    '分类': 'category',
    '标签': 'tag',
    '评论': 'comment',
    '消息': 'message',
    '通知': 'notification',
    '文件': 'file',
    '上传': 'upload',
    '下载': 'download',
    '支付': 'payment',
    '退款': 'refund',
    '库存': 'inventory',
    '仓库': 'warehouse',
    '物流': 'logistics',
    '地址': 'address',
    '客户': 'customer',
    '供应商': 'supplier',
    '合同': 'contract',
    '发票': 'invoice',
    '价格': 'price',
    '优惠': 'discount',
    '会员': 'member',
    '积分': 'points',
  };

  // 尝试将中文分词并翻译
  const translatedParts: string[] = [];
  let remaining = keyword;

  // 贪心匹配，从最长的词开始
  const sortedKeys = Object.keys(dictionary).sort((a, b) => b.length - a.length);

  while (remaining.length > 0) {
    let matched = false;
    for (const key of sortedKeys) {
      if (remaining.startsWith(key)) {
        translatedParts.push(dictionary[key]);
        remaining = remaining.substring(key.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      remaining = remaining.substring(1);
    }
  }

  if (translatedParts.length > 0) {
    // kebab-case
    patterns.push(translatedParts.join('-'));
    // camelCase
    patterns.push(
      translatedParts[0] +
        translatedParts
          .slice(1)
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(''),
    );
    // snake_case
    patterns.push(translatedParts.join('_'));
    // PascalCase
    patterns.push(translatedParts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(''));
  }

  return [...new Set(patterns)];
}

/**
 * 构建搜索策略
 */
export function buildSearchStrategies(
  keywords: string[],
  backendPath: string,
  frontendPath: string,
): SearchStrategy[] {
  const strategies: SearchStrategy[] = [];

  for (const keyword of keywords) {
    const patterns = keywordToCodePatterns(keyword);

    for (const pattern of patterns) {
      // 前端文件名搜索
      strategies.push({
        pattern,
        scope: 'filename',
        searchPath: frontendPath,
      });

      // 后端文件名搜索
      strategies.push({
        pattern,
        scope: 'filename',
        searchPath: backendPath,
      });

      // 前端路由搜索
      strategies.push({
        pattern,
        scope: 'route',
        searchPath: frontendPath,
      });

      // 后端路由/API 搜索
      strategies.push({
        pattern,
        scope: 'route',
        searchPath: backendPath,
      });
    }
  }

  return strategies;
}

/**
 * 构建描述模式的执行计划
 */
export function buildDescribeModePlan(params: DescribeModeParams): string[] {
  const keywords = extractKeywords(params.description);
  const allPatterns: string[] = [];

  for (const kw of keywords) {
    allPatterns.push(...keywordToCodePatterns(kw));
  }

  logger.info(`描述模式执行计划:`);
  logger.info(`  描述: ${params.description}`);
  logger.info(`  关键词: ${keywords.join(', ')}`);
  logger.info(`  搜索模式: ${allPatterns.join(', ')}`);

  const steps: string[] = [];

  steps.push(`[步骤 1] 解析描述，提取关键词: ${keywords.join(', ')}`);
  steps.push(`[步骤 2] 生成搜索模式: ${allPatterns.slice(0, 5).join(', ')}${allPatterns.length > 5 ? '...' : ''}`);
  steps.push(`[步骤 3] 在前端项目 (${params.frontendPath}) 中搜索匹配文件`);
  steps.push(`[步骤 4] 在后端项目 (${params.backendPath}) 中搜索匹配文件`);
  steps.push(`[步骤 5] 从搜索结果推断页面 URL 或 API 入口`);
  steps.push(`[步骤 6] 若找到前端页面，转入 URL 模式执行`);
  steps.push(`[步骤 7] 若仅找到后端 API，直接从代码溯源开始`);

  return steps;
}
