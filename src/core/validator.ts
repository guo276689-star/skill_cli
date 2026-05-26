import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { DoctorResult, DoctorIssue } from '../types';
import { getSkillsDirs } from './installer';

/** Reasonix 有效的工具名列表 */
const VALID_REASONIX_TOOLS = [
  'read_file', 'write_file', 'edit_file', 'multi_edit',
  'search_content', 'search_files', 'glob', 'run_command',
  'run_background', 'web_search', 'web_fetch', 'get_file_info',
  'list_directory', 'directory_tree', 'find_in_code', 'get_symbols',
] as const;

/** 遍历所有 Skill 文件，回调处理每个 .md 文件 */
export function walkSkillFiles(fn: (filePath: string) => void): void {
  const dirs = getSkillsDirs();
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isFile() && entry.endsWith('.md')) {
        fn(fullPath);
      } else if (stat.isDirectory()) {
        const skillMd = path.join(fullPath, 'SKILL.md');
        if (fs.existsSync(skillMd)) fn(skillMd);
      }
    }
  }
}

/**
 * 校验本地所有 Skills，返回诊断结果
 */
export function doctorCheck(): DoctorResult {
  const issuesAccum: DoctorIssue[] = [];
  let total = 0;
  let ok = 0;

  walkSkillFiles((filePath) => {
    total++;
    const fileIssues = checkFile(filePath);
    if (fileIssues.length === 0) ok++;
    issuesAccum.push(...fileIssues);
  });

  return { total, ok, issues: issuesAccum };
}

// ──── checkFile 拆分为子函数 ────

function checkFile(filePath: string): DoctorIssue[] {
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return [{ filePath, severity: 'error', message: '无法读取文件' }];
  }

  const issues = checkFrontmatterSyntax(filePath, content);
  if (issues.length > 0) return issues;

  const fm = parseFrontmatter(filePath, content);
  if (!fm) return [];

  issues.push(...checkRequiredFields(filePath, fm));
  issues.push(...checkOptionalFields(filePath, fm));

  // 检查 body 是否为空
  const fmEnd = content.indexOf('\n---', 3);
  if (fmEnd !== -1 && content.slice(fmEnd + 4).trim() === '') {
    issues.push({ filePath, severity: 'warning', message: 'body 为空，Skill 不会有任何指令' });
  }

  return issues;
}

/** 校验 frontmatter 语法 */
function checkFrontmatterSyntax(filePath: string, content: string): DoctorIssue[] {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    return [{ filePath, severity: 'error', message: '缺少 YAML frontmatter (--- ... ---)' }];
  }
  return [];
}

/** 解析 frontmatter */
function parseFrontmatter(filePath: string, content: string): Record<string, unknown> | null {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  try {
    return yaml.load(fmMatch[1]) as Record<string, unknown> | null;
  } catch {
    return null;
  }
}

/** 校验必填字段 */
function checkRequiredFields(filePath: string, fm: Record<string, unknown>): DoctorIssue[] {
  const issues: DoctorIssue[] = [];

  if (!fm.name) {
    issues.push({ filePath, severity: 'error', message: '缺少必填字段: name' });
  } else if (typeof fm.name === 'string' && !/^[a-zA-Z0-9_\-.]{1,64}$/.test(fm.name)) {
    issues.push({
      filePath,
      severity: 'error',
      message: `name 格式非法: "${fm.name}"（允许字母/数字/_/-/.，1-64字符）`,
    });
  }

  if (!fm.description) {
    issues.push({ filePath, severity: 'warning', message: '建议填写 description 字段' });
  }

  return issues;
}

/** 校验可选字段 */
function checkOptionalFields(filePath: string, fm: Record<string, unknown>): DoctorIssue[] {
  const issues: DoctorIssue[] = [];

  if (fm.runAs && !['inline', 'subagent'].includes(fm.runAs as string)) {
    issues.push({
      filePath,
      severity: 'error',
      message: `runAs 值非法: "${fm.runAs}"（只允许 inline 或 subagent）`,
    });
  }

  if (fm.model && typeof fm.model === 'string' && !fm.model.startsWith('deepseek-')) {
    issues.push({
      filePath,
      severity: 'warning',
      message: `model 应为 deepseek-* 系列: "${fm.model}" 在 Reasonix 中不生效`,
    });
  }

  if (fm.maxIters !== undefined) {
    if (!Number.isInteger(fm.maxIters) || (fm.maxIters as number) < 1 || (fm.maxIters as number) > 32) {
      issues.push({
        filePath,
        severity: 'error',
        message: `maxIters 应在 1-32 之间: ${fm.maxIters}`,
      });
    }
  }

  if (fm.allowedTools) {
    if (!Array.isArray(fm.allowedTools)) {
      issues.push({ filePath, severity: 'error', message: 'allowedTools 应为数组' });
    } else {
      for (const tool of fm.allowedTools as string[]) {
        if (!VALID_REASONIX_TOOLS.includes(tool as typeof VALID_REASONIX_TOOLS[number])) {
          issues.push({
            filePath,
            severity: 'warning',
            message: `allowedTools 中 "${tool}" 可能不是有效的 Reasonix 工具名`,
          });
        }
      }
    }
  }

  return issues;
}

/**
 * 校验单个文件并返回是否通过。
 * existingContent 用于避免安装后重复读取磁盘（传已下载的内容即可）。
 */
export function validateFile(filePath: string, existingContent?: string): DoctorResult {
  if (!fs.existsSync(filePath)) {
    return {
      total: 1,
      ok: 0,
      issues: [{ filePath, severity: 'error', message: '文件不存在' }],
    };
  }

  const content = existingContent ?? fs.readFileSync(filePath, 'utf-8');
  const issues = checkFileWithContent(filePath, content);

  return {
    total: 1,
    ok: issues.length === 0 ? 1 : 0,
    issues,
  };
}

/** 用给定内容校验（不读磁盘） */
function checkFileWithContent(filePath: string, content: string): DoctorIssue[] {
  const issues = checkFrontmatterSyntax(filePath, content);
  if (issues.length > 0) return issues;

  const fm = parseFrontmatter(filePath, content);
  if (!fm) return [{ filePath, severity: 'error', message: 'frontmatter 解析失败' }];

  const all: DoctorIssue[] = [];
  all.push(...checkRequiredFields(filePath, fm));
  all.push(...checkOptionalFields(filePath, fm));

  const fmEnd = content.indexOf('\n---', 3);
  if (fmEnd !== -1 && content.slice(fmEnd + 4).trim() === '') {
    all.push({ filePath, severity: 'warning', message: 'body 为空，Skill 不会有任何指令' });
  }

  return all;
}
