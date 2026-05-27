import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface SourceRecord {
  repo: string;
  skillName: string;
  installedAt: string;
}

type SourceMap = Record<string, SourceRecord>;

/** 获取 sources.json 文件路径 */
function getSourcesPath(scope: 'global' | 'project'): string {
  const dir = scope === 'global'
    ? path.join(os.homedir(), '.reasonix')
    : path.join(process.cwd(), '.reasonix');
  return path.join(dir, 'sources.json');
}

/** 读取来源映射 */
export function loadSources(scope: 'global' | 'project'): SourceMap {
  const p = getSourcesPath(scope);
  try {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    }
  } catch { /* 文件损坏则重置 */ }
  return {};
}

/** 保存来源映射 */
function saveSources(scope: 'global' | 'project', map: SourceMap): void {
  const p = getSourcesPath(scope);
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, JSON.stringify(map, null, 2), 'utf-8');
}

/** 记录安装来源 */
export function trackInstall(
  scope: 'global' | 'project',
  skillName: string,
  repo: string,
  originalSkillName: string,
): void {
  const map = loadSources(scope);
  map[skillName] = {
    repo,
    skillName: originalSkillName,
    installedAt: new Date().toISOString(),
  };
  saveSources(scope, map);
}

/** 记录移除 */
export function trackRemove(scope: 'global' | 'project', skillName: string): void {
  const map = loadSources(scope);
  delete map[skillName];
  saveSources(scope, map);
}

/** 获取某个 Skill 的安装来源 */
export function getSource(skillName: string): SourceRecord | null {
  // 先查项目级，再查全局
  const project = loadSources('project');
  if (project[skillName]) return project[skillName];

  const global = loadSources('global');
  return global[skillName] ?? null;
}

/** 列出所有可更新的 Skill */
export function listUpdatable(): { name: string; source: SourceRecord }[] {
  const result: { name: string; source: SourceRecord }[] = [];

  for (const scope of ['project', 'global'] as const) {
    const map = loadSources(scope);
    for (const [name, src] of Object.entries(map)) {
      result.push({ name, source: src });
    }
  }

  return result;
}
