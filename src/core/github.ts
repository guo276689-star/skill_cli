import * as yaml from 'js-yaml';
import { SearchResult } from '../types';

const GITHUB_API = 'https://api.github.com';
const FETCH_TIMEOUT_MS = 15_000;

export interface GitHubSearchItem {
  repository: { full_name: string; stargazers_count: number; description: string | null };
  path: string;
}

interface GitHubSearchResponse {
  items: GitHubSearchItem[];
}

/** 创建 GitHub API 请求头（统一工厂） */
function createGitHubHeaders(raw = false): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': raw ? 'application/vnd.github.v3.raw' : 'application/vnd.github.v3+json',
    'User-Agent': 'skills-cli',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/** 带超时的 fetch 封装 */
async function fetchWithTimeout(url: string, headers: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 搜索 GitHub 上包含 SKILL.md 的仓库
 */
export async function searchSkills(keyword: string, page = 1): Promise<SearchResult[]> {
  const q = encodeURIComponent(`filename:SKILL.md ${keyword} agent skills`);
  const url = `${GITHUB_API}/search/code?q=${q}&sort=stars&order=desc&per_page=10&page=${page}`;
  const headers = createGitHubHeaders();

  const res = await fetchWithTimeout(url, headers);
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error('GitHub API 限流。设置 GITHUB_TOKEN 环境变量可提升限制。');
    }
    if (res.status === 422) {
      // 搜索语法错误，放宽条件再试
      const q2 = encodeURIComponent(`SKILL.md ${keyword}`);
      const url2 = `${GITHUB_API}/search/code?q=${q2}&sort=stars&order=desc&per_page=10`;
      const res2 = await fetchWithTimeout(url2, headers);
      if (!res2.ok) throw new Error(`GitHub API 错误: ${res2.status}`);
      const data2 = await res2.json() as GitHubSearchResponse;
      return parseSearchResults(data2);
    }
    throw new Error(`GitHub API 错误: ${res.status}`);
  }

  const data = await res.json() as GitHubSearchResponse;
  return parseSearchResults(data);
}

function parseSearchResults(data: GitHubSearchResponse): SearchResult[] {
  if (!data.items || data.items.length === 0) return [];

  return data.items.map((item: GitHubSearchItem) => {
    const repoFull = item.repository.full_name;
    const skillPath = item.path;
    const skillName = extractSkillName(skillPath, repoFull);

    return {
      repo: repoFull,
      repoStars: item.repository.stargazers_count ?? 0,
      repoDesc: item.repository.description ?? '',
      skillName,
      skillDesc: '',
      skillPath,
      downloadUrl: `https://raw.githubusercontent.com/${repoFull}/main/${skillPath}`,
    };
  });
}

/** 从路径提取可读的 skill 名称（正则简化版） */
function extractSkillName(pathStr: string, repo: string): string {
  const match = pathStr.match(/(?:^|\/)([^/]+)\/SKILL\.md$/);
  if (match) return match[1];
  if (pathStr === 'SKILL.md') return repo.split('/')[1] ?? repo;
  return pathStr.replace('/SKILL.md', '').replace(/\//g, '-');
}

/**
 * 获取单个 SKILL.md 的原始内容
 */
export async function fetchSkillContent(downloadUrl: string): Promise<string> {
  const headers = createGitHubHeaders(true);

  const res = await fetchWithTimeout(downloadUrl, headers);
  if (!res.ok) {
    // 回退：尝试其他分支
    const altUrl = downloadUrl.replace('/main/', '/master/');
    const res2 = await fetchWithTimeout(altUrl, headers);
    if (!res2.ok) throw new Error(`下载失败: ${res.status}`);
    return res2.text();
  }
  return res.text();
}

/**
 * 搜索 Skills 时同时获取每个 skill 的 frontmatter（用于展示描述）
 */
export async function searchSkillsWithMeta(keyword: string, page = 1): Promise<SearchResult[]> {
  const results = await searchSkills(keyword, page);
  // 只取前 5 个获取描述，避免请求过多
  const top5 = results.slice(0, 5);

  const enriched = await Promise.all(
    top5.map(async (r) => {
      try {
        const content = await fetchSkillContent(r.downloadUrl);
        const frontmatter = parseFrontmatterRaw(content);
        return {
          ...r,
          skillDesc: frontmatter.description ?? r.skillDesc,
          skillName: frontmatter.name ?? r.skillName,
        };
      } catch {
        return r;
      }
    })
  );

  return [...enriched, ...results.slice(5)];
}

/** 解析 YAML frontmatter */
export function parseFrontmatterRaw(content: string): { name?: string; description?: string; runAs?: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  try {
    const fm = yaml.load(match[1]) as Record<string, unknown> | null;
    if (!fm || typeof fm !== 'object') return {};
    return {
      name: typeof fm.name === 'string' ? fm.name : undefined,
      description: typeof fm.description === 'string' ? fm.description : undefined,
      runAs: typeof fm.runAs === 'string' ? fm.runAs as 'inline' | 'subagent' : undefined,
    };
  } catch {
    return {};
  }
}
