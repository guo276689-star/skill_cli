import * as yaml from 'js-yaml';
import { SearchResult } from '../types';

const GITHUB_API = 'https://api.github.com';
const FETCH_TIMEOUT_MS = 15_000;

// ──── 类型 ────

interface GitHubRepoItem {
  full_name: string;
  stargazers_count: number;
  description: string | null;
  topics: string[];
  html_url: string;
  updated_at: string;
  pushed_at: string;
}

interface GitHubRepoSearchResponse {
  items: GitHubRepoItem[];
  total_count: number;
}

interface GitHubCodeItem {
  repository: { full_name: string; stargazers_count: number; description: string | null };
  path: string;
}

interface GitHubCodeSearchResponse {
  items: GitHubCodeItem[];
}

// ──── 请求工具 ────

function createGitHubHeaders(raw = false): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': raw ? 'application/vnd.github.v3.raw' : 'application/vnd.github.v3+json',
    'User-Agent': 'skills-cli',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function fetchWithTimeout(url: string, headers: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ──── 时效性计算 ────

/** 解析 "30d" / "2w" / "1m" / "2025-06" 为 ISO 日期 */
function parseTimeFilter(input: string): string | null {
  if (!input) return null;

  // 纯日期格式：2025-06 或 2025-06-01
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(input)) {
    return input.length === 7 ? `${input}-01` : input;
  }

  // 相对时间：30d / 2w / 1m / 1y
  const match = input.match(/^(\d+)\s*(d|w|m|y)$/i);
  if (!match) return null;

  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const now = new Date();

  switch (unit) {
    case 'd': now.setDate(now.getDate() - num); break;
    case 'w': now.setDate(now.getDate() - num * 7); break;
    case 'm': now.setMonth(now.getMonth() - num); break;
    case 'y': now.setFullYear(now.getFullYear() - num); break;
  }

  return now.toISOString().slice(0, 10);
}

/** 计算新鲜度得分 (0-1)，越新分越高 */
function freshnessScore(updatedAt: string): number {
  const updated = new Date(updatedAt).getTime();
  const now = Date.now();
  const ageDays = (now - updated) / (1000 * 60 * 60 * 24);

  if (ageDays <= 7) return 1.0;
  if (ageDays <= 30) return 0.8;
  if (ageDays <= 90) return 0.5;
  if (ageDays <= 180) return 0.3;
  if (ageDays <= 365) return 0.15;
  return 0.05;
}

// ──── 搜索：两阶段策略 ────

/**
 * Phase 1: Repository Search
 */
async function searchRepos(params: {
  keyword: string;
  minStars?: number;
  updatedWithin?: string;
  page?: number;
}): Promise<GitHubRepoItem[]> {
  const { keyword, minStars = 0, updatedWithin, page = 1 } = params;

  const parts: string[] = [];

  if (keyword.length <= 3) {
    parts.push('topic:agent-skills');
  }

  parts.push(keyword);
  parts.push('SKILL.md in:readme');

  if (minStars > 0) {
    parts.push(`stars:>=${minStars}`);
  }

  // 时效性过滤
  if (updatedWithin) {
    const since = parseTimeFilter(updatedWithin);
    if (since) {
      parts.push(`pushed:>=${since}`);
    }
  }

  const q = encodeURIComponent(parts.join(' '));
  const url = `${GITHUB_API}/search/repositories?q=${q}&sort=stars&order=desc&per_page=15&page=${page}`;

  const headers = createGitHubHeaders();
  const res = await fetchWithTimeout(url, headers);

  if (!res.ok) {
    // 降级：宽松搜索
    const fallback: string[] = [`SKILL.md ${keyword}`];
    if (minStars > 0) fallback.push(`stars:>=${minStars}`);
    if (updatedWithin) {
      const since = parseTimeFilter(updatedWithin);
      if (since) fallback.push(`pushed:>=${since}`);
    }
    const q2 = encodeURIComponent(fallback.join(' '));
    const url2 = `${GITHUB_API}/search/repositories?q=${q2}&sort=stars&order=desc&per_page=15`;
    const res2 = await fetchWithTimeout(url2, headers);
    if (!res2.ok) throw new Error(`GitHub API 错误: ${res2.status}`);
    const data2 = await res2.json() as GitHubRepoSearchResponse;
    return data2.items ?? [];
  }

  const data = await res.json() as GitHubRepoSearchResponse;
  return data.items ?? [];
}

/**
 * Phase 2: 查找 repo 中的 SKILL.md 文件
 */
async function findSkillFilesInRepo(repoFull: string): Promise<string[]> {
  const q = encodeURIComponent(`filename:SKILL.md repo:${repoFull}`);
  const url = `${GITHUB_API}/search/code?q=${q}&per_page=5`;
  const headers = createGitHubHeaders();

  try {
    const res = await fetchWithTimeout(url, headers);
    if (!res.ok) return [];
    const data = await res.json() as GitHubCodeSearchResponse;
    return (data.items ?? []).map(i => i.path);
  } catch {
    // Code Search API 限流或 repo 无 SKILL.md，返回空
    return [];
  }
}

// ──── 主搜索入口 ────

export interface SearchOptions {
  minStars?: number;
  updatedWithin?: string;
  page?: number;
}

export async function searchSkills(
  keyword: string,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const { minStars = 0, updatedWithin, page = 1 } = options;

  const repos = await searchRepos({ keyword, minStars, updatedWithin, page });
  if (repos.length === 0) return [];

  const results: SearchResult[] = [];

  await Promise.all(
    repos.map(async (repo) => {
      try {
        const skillFiles = await findSkillFilesInRepo(repo.full_name);

        if (skillFiles.length === 0) {
          results.push({
            repo: repo.full_name,
            repoStars: repo.stargazers_count,
            repoDesc: repo.description ?? '',
            repoUrl: repo.html_url,
            updatedAt: repo.pushed_at || repo.updated_at,
            skillName: repo.full_name.split('/')[1],
            skillDesc: '',
            skillPath: '',
            downloadUrl: '',
          });
          return;
        }

        for (const skillPath of skillFiles) {
          results.push({
            repo: repo.full_name,
            repoStars: repo.stargazers_count,
            repoDesc: repo.description ?? '',
            repoUrl: repo.html_url,
            updatedAt: repo.pushed_at || repo.updated_at,
            skillName: extractSkillName(skillPath, repo.full_name),
            skillDesc: '',
            skillPath,
            downloadUrl: `https://raw.githubusercontent.com/${repo.full_name}/main/${skillPath}`,
          });
        }
      } catch {
        // repo 被删除或 API 限流，跳过单个 repo 不影响整体结果
      }
    }),
  );

  // 综合排名：stars 归一化 + 新鲜度
  const maxStars = Math.max(1, ...results.map(r => r.repoStars));
  interface Scored extends SearchResult { _score: number }
  const scored = results.map(r => ({
    ...r,
    _score: (r.repoStars / maxStars) * 0.6 + freshnessScore(r.updatedAt) * 0.4,
  } as Scored));
  scored.sort((a, b) => b._score - a._score);

  return scored;
}

/**
 * 搜索 + 获取 frontmatter 描述
 */
export async function searchSkillsWithMeta(
  keyword: string,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const results = await searchSkills(keyword, options);
  if (results.length === 0) return [];

  // 去重
  const seen = new Set<string>();
  const deduped: SearchResult[] = [];
  for (const r of results) {
    const key = `${r.repo}|${r.skillName}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(r);
    }
  }

  // top 5 获取 frontmatter
  const top5 = deduped.filter(r => r.downloadUrl).slice(0, 5);
  const enriched = await Promise.all(
    top5.map(async (r) => {
      try {
        const content = await fetchSkillContent(r.downloadUrl);
        const fm = parseFrontmatterRaw(content);
        return {
          ...r,
          skillDesc: fm.description ?? r.repoDesc,
          skillName: fm.name ?? r.skillName,
        };
      } catch {
        return { ...r, skillDesc: r.repoDesc };
      }
    }),
  );

  const rest = deduped.filter(
    r => !enriched.some(e => e.repo === r.repo && e.skillName === r.skillName),
  );

  return [...enriched, ...rest].slice(0, 20);
}

// ──── 工具函数 ────

function extractSkillName(pathStr: string, repo: string): string {
  const match = pathStr.match(/(?:^|\/)([^/]+)\/SKILL\.md$/);
  if (match) return match[1];
  if (pathStr === 'SKILL.md') return repo.split('/')[1] ?? repo;
  return pathStr.replace('/SKILL.md', '').replace(/\//g, '-');
}

export async function fetchSkillContent(downloadUrl: string): Promise<string> {
  const headers = createGitHubHeaders(true);
  const res = await fetchWithTimeout(downloadUrl, headers);
  if (!res.ok) {
    const altUrl = downloadUrl.replace('/main/', '/master/');
    const res2 = await fetchWithTimeout(altUrl, headers);
    if (!res2.ok) throw new Error(`下载失败: ${res.status}`);
    return res2.text();
  }
  return res.text();
}

export function parseFrontmatterRaw(content: string): {
  name?: string;
  description?: string;
  runAs?: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  try {
    const fm = yaml.load(match[1]) as Record<string, unknown> | null;
    if (!fm || typeof fm !== 'object') return {};
    return {
      name: typeof fm.name === 'string' ? fm.name : undefined,
      description: typeof fm.description === 'string' ? fm.description : undefined,
      runAs: typeof fm.runAs === 'string' ? (fm.runAs as 'inline' | 'subagent') : undefined,
    };
  } catch {
    return {};
  }
}
