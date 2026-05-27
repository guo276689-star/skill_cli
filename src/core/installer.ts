import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { InstallResult } from '../types';

/** 单个 Skill 文件最大 1 MiB */
const MAX_SKILL_SIZE = 1 * 1024 * 1024;

/** 文件名安全净化 */
const SAFE_NAME_RE = /[^a-zA-Z0-9_\-]/g;

/** repo 格式：owner/name（禁止含 github.com 前缀） */
const REPO_FORMAT_RE = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;

const SKILLS_DIRS = [
  path.join(os.homedir(), '.reasonix', 'skills'),
  path.join(process.cwd(), '.reasonix', 'skills'),
] as const;

/** 缓存的已存在 Skills 目录 */
let _cachedDirs: string[] | null = null;

export function getSkillsDirs(all = false): string[] {
  if (!all) {
    if (_cachedDirs) return _cachedDirs;
    _cachedDirs = SKILLS_DIRS.filter(d => fs.existsSync(d));
    return _cachedDirs;
  }

  // --all 模式：扫描全局 + 所有已知项目
  const dirs = new Set<string>();

  // 全局
  if (fs.existsSync(SKILLS_DIRS[0])) dirs.add(SKILLS_DIRS[0]);

  // 当前项目
  if (fs.existsSync(SKILLS_DIRS[1])) dirs.add(SKILLS_DIRS[1]);

  // 从 config.json 读取其他项目
  const configPath = path.join(os.homedir(), '.reasonix', 'config.json');
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.projects) {
        for (const projectPath of Object.keys(config.projects)) {
          const skillsDir = path.join(projectPath, '.reasonix', 'skills');
          if (fs.existsSync(skillsDir)) dirs.add(skillsDir);
        }
      }
    }
  } catch { /* config 解析失败则跳过 */ }

  // 扫描 ~/.reasonix/skills/ 中的子目录（目录式 Skill）
  const globalSkillsDir = SKILLS_DIRS[0];
  try {
    if (fs.existsSync(globalSkillsDir)) {
      const entries = fs.readdirSync(globalSkillsDir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory()) {
          const subDir = path.join(globalSkillsDir, e.name);
          if (fs.existsSync(path.join(subDir, 'SKILL.md'))) {
            dirs.add(globalSkillsDir); // 已在列表中
          }
        }
      }
    }
  } catch { /* skip */ }

  return [...dirs];
}

/** 清除缓存（目录变化后调用） */
export function clearDirsCache(): void {
  _cachedDirs = null;
}

/**
 * 安装一个 Skill。force=true 跳过已存在检查。
 */
export function installSkill(
  content: string,
  skillName: string,
  scope: 'global' | 'project' = 'project',
  force = false,
): InstallResult {
  if (content.length > MAX_SKILL_SIZE) {
    return {
      success: false,
      skillName,
      filePath: '',
      error: `文件过大 (${(content.length / 1024).toFixed(1)} KiB)，上限 ${MAX_SKILL_SIZE / 1024} KiB`,
    };
  }

  const dir = scope === 'global' ? SKILLS_DIRS[0] : SKILLS_DIRS[1];
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    clearDirsCache();
  }

  // Unicode 规范化 + 净化
  let safeName = skillName
    .normalize('NFKD')
    .replace(SAFE_NAME_RE, '-')
    .replace(/\./g, '-')
    .replace(/^-+/, '');
  if (!safeName) safeName = 'skill';
  const filePath = path.join(dir, `${safeName}.md`);

  if (!force && fs.existsSync(filePath)) {
    return {
      success: false,
      skillName,
      filePath,
      error: `已存在: ${filePath}。使用 --force 覆盖或先 remove。`,
    };
  }

  fs.writeFileSync(filePath, content, 'utf-8');

  return { success: true, skillName, filePath };
}

export function validateRepoFormat(repo: string): boolean {
  return REPO_FORMAT_RE.test(repo);
}

/** 净化 skillName 用于 URL 路径 */
export function sanitizeSkillName(name: string): string {
  return name.replace(SAFE_NAME_RE, '-').replace(/\./g, '-');
}
