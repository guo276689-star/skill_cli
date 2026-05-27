import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { SkillMeta } from '../types';
import { walkSkillFiles } from './validator';

/**
 * 扫描本地所有 Skills 目录，返回已安装的 Skills 列表
 */
export function scanLocalSkills(all = false): SkillMeta[] {
  const skills: SkillMeta[] = [];
  walkSkillFiles((filePath) => {
    try {
      const meta = parseSkillFile(filePath);
      if (meta) skills.push(meta);
    } catch {
      // 解析失败的文件跳过，不阻塞其他 Skill 扫描
    }
  }, all);
  return skills;
}

function parseSkillFile(filePath: string): SkillMeta | null {
  const content = fs.readFileSync(filePath, 'utf-8');
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
    size: fs.statSync(filePath).size,
  };
}

/** 缓存：name → SkillMeta，避免多轮 I/O */
let _nameCache: Map<string, SkillMeta> | null = null;

function ensureCache(): Map<string, SkillMeta> {
  if (_nameCache) return _nameCache;
  _nameCache = new Map();
  walkSkillFiles((filePath) => {
    try {
      const meta = parseSkillFile(filePath);
      if (meta) {
        _nameCache!.set(meta.name, meta);
        // 也注册文件名别名
        const baseName = filePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.md$/, '');
        if (baseName && baseName !== meta.name) {
          _nameCache!.set(baseName, meta);
        }
      }
    } catch { /* skip */ }
  });
  return _nameCache;
}

/** 根据名称查找 Skill（O(1) 缓存查找） */
export function findSkillByName(name: string): SkillMeta | null {
  return ensureCache().get(name) ?? null;
}
