#!/usr/bin/env node

import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';

const DEFAULTS = {
  baseToken: 'RG2abEiE1ad0l7sdifNcK4O9n4c',
  tableId: 'tblRSWPUVpJ3gKQH',
  viewId: 'vewmUw99dF',
  dateField: '日期',
  contentField: '原始记录',
  outDir: '/Users/ydb/dongbo-Agent/02-内容素材库/日记原文',
  identity: 'user',
  limit: 200,
};

function parseArgs(argv) {
  const result = {
    baseToken: DEFAULTS.baseToken,
    tableId: DEFAULTS.tableId,
    viewId: DEFAULTS.viewId,
    dateField: DEFAULTS.dateField,
    contentField: DEFAULTS.contentField,
    outDir: DEFAULTS.outDir,
    identity: DEFAULTS.identity,
    limit: DEFAULTS.limit,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
      case '--base-token':
        result.baseToken = next;
        i += 1;
        break;
      case '--table-id':
        result.tableId = next;
        i += 1;
        break;
      case '--view-id':
        result.viewId = next;
        i += 1;
        break;
      case '--date-field':
        result.dateField = next;
        i += 1;
        break;
      case '--content-field':
        result.contentField = next;
        i += 1;
        break;
      case '--out-dir':
        result.outDir = next;
        i += 1;
        break;
      case '--as':
        result.identity = next;
        i += 1;
        break;
      case '--limit':
        result.limit = Number.parseInt(next, 10);
        i += 1;
        break;
      case '--help':
      case '-h':
        result.help = true;
        break;
      default:
        throw new Error(`未知参数: ${arg}`);
    }
  }

  return result;
}

function printHelp() {
  console.log(`
飞书多维表格日记导出器

用途:
  读取指定视图中的“日期”和“原始记录”两个字段，
  将每条记录保存为一个 Markdown 文件。

默认配置:
  base-token   ${DEFAULTS.baseToken}
  table-id     ${DEFAULTS.tableId}
  view-id      ${DEFAULTS.viewId}
  date-field   ${DEFAULTS.dateField}
  content-field ${DEFAULTS.contentField}
  out-dir      ${DEFAULTS.outDir}

使用方式:
  node scripts/export-feishu-diary-markdown.js
  node scripts/export-feishu-diary-markdown.js --date-field 日期 --content-field 原始记录
  node scripts/export-feishu-diary-markdown.js --out-dir "/Users/ydb/dongbo-Agent/02-内容素材库/日记原文"

前置条件:
  1. lark-cli 已安装
  2. 已运行 lark-cli config init --new
  3. 已运行 lark-cli auth login --domain base --recommend
`);
}

function parseJson(raw, label) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`无法解析 ${label} JSON 输出: ${error.message}`);
  }
}

function unwrapData(payload) {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  let { data } = payload;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return {};
    }
  }

  return data && typeof data === 'object' ? data : {};
}

function extractCliError(stdout, stderr) {
  const text = [stdout, stderr].filter(Boolean).join('\n').trim();
  if (!text) {
    return 'lark-cli 执行失败';
  }

  try {
    const payload = JSON.parse(text);
    if (payload?.error?.message) {
      return payload.error.message;
    }
    if (payload?.message) {
      return payload.message;
    }
  } catch {
    return text;
  }

  return text;
}

function runLarkCli(args) {
  const cliBin = process.env.LARK_CLI_BIN || 'lark-cli';

  try {
    const stdout = execFileSync(cliBin, args, {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const payload = parseJson(stdout, 'lark-cli');

    if (payload?.ok === false) {
      const message = payload?.error?.message || 'lark-cli 返回失败';
      throw new Error(message);
    }

    return payload;
  } catch (error) {
    if (error.stdout || error.stderr) {
      throw new Error(extractCliError(error.stdout?.toString(), error.stderr?.toString()));
    }
    throw error;
  }
}

function getArrayFromData(data, keys) {
  for (const key of keys) {
    if (Array.isArray(data[key])) {
      return data[key];
    }
  }

  if (Array.isArray(data)) {
    return data;
  }

  return [];
}

function getTotalFromData(data, fallback) {
  for (const key of ['total', 'count']) {
    if (typeof data[key] === 'number' && Number.isFinite(data[key])) {
      return data[key];
    }
  }

  return fallback;
}

function normalizeRecordRows(data) {
  const directRecords = getArrayFromData(data, ['items', 'records']);
  if (directRecords.length > 0) {
    return directRecords;
  }

  const rows = Array.isArray(data?.data) ? data.data : [];
  const fieldNames = Array.isArray(data?.fields) ? data.fields : [];
  const recordIds = Array.isArray(data?.record_id_list) ? data.record_id_list : [];

  if (rows.length === 0 || fieldNames.length === 0) {
    return [];
  }

  return rows.map((row, index) => {
    const fields = {};

    for (let i = 0; i < fieldNames.length; i += 1) {
      fields[fieldNames[i]] = row[i];
    }

    return {
      record_id: recordIds[index] || `row-${index + 1}`,
      fields,
    };
  });
}

function listFields(config) {
  const fields = [];
  let offset = 0;

  while (true) {
    const payload = runLarkCli([
      'base',
      '+field-list',
      '--base-token',
      config.baseToken,
      '--table-id',
      config.tableId,
      '--offset',
      String(offset),
      '--limit',
      String(config.limit),
      '--as',
      config.identity,
    ]);
    const data = unwrapData(payload);
    const page = getArrayFromData(data, ['items', 'fields']);
    const total = getTotalFromData(data, fields.length + page.length);

    fields.push(...page);
    offset += page.length;

    if (page.length === 0 || fields.length >= total || page.length < config.limit) {
      break;
    }
  }

  return fields;
}

function listRecords(config) {
  const records = [];
  let offset = 0;

  while (true) {
    const args = [
      'base',
      '+record-list',
      '--base-token',
      config.baseToken,
      '--table-id',
      config.tableId,
      '--offset',
      String(offset),
      '--limit',
      String(config.limit),
      '--as',
      config.identity,
    ];

    if (config.viewId) {
      args.push('--view-id', config.viewId);
    }

    const payload = runLarkCli(args);
    const data = unwrapData(payload);
    const page = normalizeRecordRows(data);
    const total = getTotalFromData(data, records.length + page.length);
    const hasMore = data?.has_more === true;

    records.push(...page);
    offset += page.length;

    if (page.length === 0 || (!hasMore && (records.length >= total || page.length < config.limit))) {
      break;
    }
  }

  return records;
}

function getFieldName(field) {
  return field?.field_name || field?.fieldName || field?.name || field?.title || '';
}

function extractFieldValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }
        if (item?.text) {
          return item.text;
        }
        if (typeof item?.value !== 'undefined') {
          return extractFieldValue(item.value);
        }
        if (item?.name) {
          return item.name;
        }
        return JSON.stringify(item);
      })
      .join('');
  }

  if (typeof value === 'object') {
    if (typeof value.timestamp === 'number') {
      return formatDate(new Date(value.timestamp));
    }
    if (typeof value.text === 'string') {
      return value.text;
    }
    if (typeof value.value !== 'undefined') {
      return extractFieldValue(value.value);
    }
    if (typeof value.name === 'string') {
      return value.name;
    }
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function pad(numberValue) {
  return String(numberValue).padStart(2, '0');
}

function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function normalizeDateKeyword(rawValue) {
  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    return formatDate(new Date(rawValue));
  }

  if (typeof rawValue === 'string') {
    const text = rawValue.trim();
    const match = text.match(/(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/);
    if (match) {
      return `${match[1]}-${pad(match[2])}-${pad(match[3])}`;
    }

    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDate(parsed);
    }

    return text;
  }

  if (rawValue && typeof rawValue === 'object') {
    if (typeof rawValue.timestamp === 'number') {
      return formatDate(new Date(rawValue.timestamp));
    }
    if (typeof rawValue.value !== 'undefined') {
      return normalizeDateKeyword(rawValue.value);
    }
  }

  const fallback = extractFieldValue(rawValue).trim();
  return fallback || null;
}

function sanitizeFileComponent(value) {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildFilePath(outDir, dateKeyword, recordId) {
  const baseName = sanitizeFileComponent(dateKeyword || `untitled-${recordId}`);
  let candidate = join(outDir, `${baseName}.md`);

  if (!existsSync(candidate)) {
    return candidate;
  }

  return join(outDir, `${baseName}-${recordId}.md`);
}

function renderMarkdown(dateKeyword, rawContent) {
  const body = rawContent.trim();

  return [
    `# ${dateKeyword}`,
    '',
    '## 原始记录',
    '',
    body,
    '',
  ].join('\n');
}

function ensureRequiredField(name, fields) {
  const field = fields.find((item) => getFieldName(item) === name);
  if (!field) {
    const available = fields.map(getFieldName).filter(Boolean).join('、');
    throw new Error(`找不到字段“${name}”。当前字段有：${available}`);
  }
  return field;
}

function main() {
  const config = parseArgs(process.argv.slice(2));
  if (config.help) {
    printHelp();
    return;
  }

  if (!config.baseToken || !config.tableId) {
    throw new Error('base-token 和 table-id 不能为空');
  }

  if (!Number.isInteger(config.limit) || config.limit <= 0 || config.limit > 200) {
    throw new Error('--limit 必须是 1 到 200 之间的整数');
  }

  const outDir = resolve(config.outDir);
  mkdirSync(outDir, { recursive: true });

  console.log('正在读取字段结构...');
  const fields = listFields(config);
  ensureRequiredField(config.dateField, fields);
  ensureRequiredField(config.contentField, fields);

  console.log('正在读取记录列表...');
  let records = listRecords(config);
  if (records.length === 0 && config.viewId) {
    console.warn(`视图 ${config.viewId} 没有返回记录，改为导出整张表。`);
    records = listRecords({
      ...config,
      viewId: '',
    });
  }
  console.log(`共读取 ${records.length} 条记录`);

  let exported = 0;
  let skipped = 0;

  for (const record of records) {
    const recordId = record?.record_id || record?.recordId || `row-${exported + skipped + 1}`;
    const rawDate = record?.fields?.[config.dateField];
    const rawContent = record?.fields?.[config.contentField];

    const dateKeyword = normalizeDateKeyword(rawDate);
    const content = extractFieldValue(rawContent).trim();

    if (!content) {
      skipped += 1;
      console.warn(`跳过 ${recordId}: “${config.contentField}”为空`);
      continue;
    }

    const titleKeyword = dateKeyword || `未命名日期-${recordId}`;
    const filePath = buildFilePath(outDir, titleKeyword, recordId);
    const markdown = renderMarkdown(titleKeyword, content);

    writeFileSync(filePath, markdown, 'utf8');
    exported += 1;
    console.log(`已导出 ${recordId} -> ${filePath}`);
  }

  console.log(`完成。导出 ${exported} 条，跳过 ${skipped} 条。`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('keychain entry not found')) {
    console.error('lark-cli 尚未完成应用配置。先运行:');
    console.error('  lark-cli config init --new');
    console.error('  lark-cli auth login --domain base --recommend');
    process.exit(1);
  }

  if (message.includes('permission denied')) {
    console.error('飞书权限不足。请为应用开通 Base 读取权限后重新授权 user 身份。');
    console.error('建议执行: lark-cli auth login --domain base --recommend');
    process.exit(1);
  }

  console.error(`导出失败: ${message}`);
  process.exit(1);
}
