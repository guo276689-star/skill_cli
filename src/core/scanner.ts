import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { SkillMeta } from '../types';
import { walkSkillFiles } from './validator';

/**
 * 扫描本地所有 Skills 目录，返回已安装的 Skills 列表
 */
export function scanLocalSkills(): SkillMeta[] {
  const skills: SkillMeta[] = [];

  walkSkillFiles((filePath) => {
    try {
      const meta = parseSkillFile(filePath);
      if (meta) skills.push(meta);
    } catch {
      // 解析失败的文件跳过，不阻塞其他 Skill 扫描
    }
  });

  return skills;
}

/**
 * 解析单个 SKILL.md 文件。
 * existingStat 可选：调用方如已执行 statSync 可传入以消除重复系统调用。
 */
function parseSkillFile(filePath: string, existingStat?: fs.Stats): SkillMeta | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  const stat = existingStat ?? fs.statSync(filePath);

  // 提取 frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;

  const fm = yaml.load(fmMatch[1]) as Record<string, unknown> | null;
  if (!fm || !fm.name) return null;

  return {
    name: String(fm.name),
    description: typeof fm.description === 'string' ? fm.description : '',
    runAs: fm.runAs as 'inline' | 'subagent' | undefined,
    model: typeof fm.model === 'string' ? fm.model : undefined,
    allowedTools: Array.isArray(fm.allowedTools) ? fm.allowedTools.map(String) : undefined,
    maxIters: typeof fm.maxIters === 'number' ? fm.maxIters : undefined,
    filePath,
    size: stat.size,
  };
}

/**
 * 根据名称查找 Skill（按目录顺序匹配文件名前缀，命中即停止）
 */
export function findSkillByName(name: string): SkillMeta | null {
  // 优先按文件名快速匹配，避免解析所有文件的 YAML
  let found: SkillMeta | null = null;
  walkSkillFiles((filePath) => {
    if (found) return; // 已找到，跳过后续
    // 快速文件名匹配
    const baseName = path.basename(filePath, '.md');
    if (baseName === name) {
      found = parseSkillFile(filePath);
      return;
    }
    // 目录模式：父目录名匹配
    const parentDir = path.basename(path.dirname(filePath));
    if (parentDir === name) {
      found = parseSkillFile(filePath);
    }
  });
  if (found) return found;

  // 回退：逐个解析 frontmatter 中的 name 字段
  walkSkillFiles((filePath) => {
    if (found) return;
    const meta = parseSkillFile(filePath);
    if (meta && meta.name === name) found = meta;
  });
  return found;
}
