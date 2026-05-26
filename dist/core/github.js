"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchSkills = searchSkills;
exports.searchSkillsWithMeta = searchSkillsWithMeta;
exports.fetchSkillContent = fetchSkillContent;
exports.parseFrontmatterRaw = parseFrontmatterRaw;
const yaml = __importStar(require("js-yaml"));
const GITHUB_API = 'https://api.github.com';
const FETCH_TIMEOUT_MS = 15_000;
// ──── 请求工具 ────
function createGitHubHeaders(raw = false) {
    const headers = {
        'Accept': raw ? 'application/vnd.github.v3.raw' : 'application/vnd.github.v3+json',
        'User-Agent': 'skills-cli',
    };
    const token = process.env.GITHUB_TOKEN;
    if (token)
        headers['Authorization'] = `Bearer ${token}`;
    return headers;
}
async function fetchWithTimeout(url, headers) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        return await fetch(url, { headers, signal: controller.signal });
    }
    finally {
        clearTimeout(timer);
    }
}
// ──── 搜索：两阶段策略 ────
/**
 * Phase 1: Repository Search — 搜索包含 SKILL.md 的仓库，按 ⭐ 排序
 */
async function searchRepos(params) {
    const { keyword, minStars = 0, page = 1 } = params;
    // 构建查询：topic 优先 + 关键词 + 最小 stars
    const parts = [];
    // 用 topic 过滤（skills 相关仓库通常带这些标签）
    if (keyword.length <= 3) {
        // 短关键词用 topic
        parts.push('topic:agent-skills');
    }
    parts.push(keyword);
    parts.push('SKILL.md in:readme');
    // stars 过滤
    if (minStars > 0) {
        parts.push(`stars:>=${minStars}`);
    }
    const q = encodeURIComponent(parts.join(' '));
    const url = `${GITHUB_API}/search/repositories?q=${q}&sort=stars&order=desc&per_page=15&page=${page}`;
    const headers = createGitHubHeaders();
    const res = await fetchWithTimeout(url, headers);
    if (!res.ok) {
        // 降级：去掉 topic 和 in:readme 约束
        const q2 = encodeURIComponent(`SKILL.md ${keyword}${minStars > 0 ? ` stars:>=${minStars}` : ''}`);
        const url2 = `${GITHUB_API}/search/repositories?q=${q2}&sort=stars&order=desc&per_page=15`;
        const res2 = await fetchWithTimeout(url2, headers);
        if (!res2.ok)
            throw new Error(`GitHub API 错误: ${res2.status}`);
        const data2 = await res2.json();
        return data2.items ?? [];
    }
    const data = await res.json();
    return data.items ?? [];
}
/**
 * Phase 2: 对指定仓库查找其中的 SKILL.md 文件
 */
async function findSkillFilesInRepo(repoFull) {
    const q = encodeURIComponent(`filename:SKILL.md repo:${repoFull}`);
    const url = `${GITHUB_API}/search/code?q=${q}&per_page=5`;
    const headers = createGitHubHeaders();
    try {
        const res = await fetchWithTimeout(url, headers);
        if (!res.ok)
            return [];
        const data = await res.json();
        return (data.items ?? []).map(i => i.path);
    }
    catch {
        return [];
    }
}
async function searchSkills(keyword, options = {}) {
    const { minStars = 0, page = 1 } = options;
    // Phase 1: repo 搜索
    const repos = await searchRepos({ keyword, minStars, page });
    if (repos.length === 0)
        return [];
    // Phase 2: 并行查找每个仓库的 SKILL.md 文件
    const results = [];
    await Promise.all(repos.map(async (repo) => {
        try {
            const skillFiles = await findSkillFilesInRepo(repo.full_name);
            if (skillFiles.length === 0) {
                // 没有找到确切文件，仍显示仓库作为候选
                results.push({
                    repo: repo.full_name,
                    repoStars: repo.stargazers_count,
                    repoDesc: repo.description ?? '',
                    repoUrl: repo.html_url,
                    skillName: repo.full_name.split('/')[1],
                    skillDesc: '',
                    skillPath: '',
                    downloadUrl: '',
                });
                return;
            }
            for (const skillPath of skillFiles) {
                const skillName = extractSkillName(skillPath, repo.full_name);
                results.push({
                    repo: repo.full_name,
                    repoStars: repo.stargazers_count,
                    repoDesc: repo.description ?? '',
                    repoUrl: repo.html_url,
                    skillName,
                    skillDesc: '',
                    skillPath,
                    downloadUrl: `https://raw.githubusercontent.com/${repo.full_name}/main/${skillPath}`,
                });
            }
        }
        catch {
            // 跳过失败的 repo
        }
    }));
    // 按 stars 排序
    results.sort((a, b) => b.repoStars - a.repoStars);
    return results;
}
/**
 * 搜索 + 获取 frontmatter 描述（只取 top 5 详细获取）
 */
async function searchSkillsWithMeta(keyword, options = {}) {
    const results = await searchSkills(keyword, options);
    if (results.length === 0)
        return [];
    // 去重（同 repo 的多个 skill 合并展示）
    const seen = new Set();
    const deduped = [];
    for (const r of results) {
        const key = `${r.repo}|${r.skillName}`;
        if (!seen.has(key)) {
            seen.add(key);
            deduped.push(r);
        }
    }
    // 取 top 5 获取实际 frontmatter
    const top5 = deduped.filter(r => r.downloadUrl).slice(0, 5);
    const enriched = await Promise.all(top5.map(async (r) => {
        try {
            const content = await fetchSkillContent(r.downloadUrl);
            const fm = parseFrontmatterRaw(content);
            return { ...r, skillDesc: fm.description ?? r.repoDesc, skillName: fm.name ?? r.skillName };
        }
        catch {
            return { ...r, skillDesc: r.repoDesc };
        }
    }));
    // 合并：enriched top5 + 剩余 deduped
    const rest = deduped.filter(r => !enriched.some(e => e.repo === r.repo && e.skillName === r.skillName));
    return [...enriched, ...rest].slice(0, 20);
}
// ──── 工具函数 ────
function extractSkillName(pathStr, repo) {
    const match = pathStr.match(/(?:^|\/)([^/]+)\/SKILL\.md$/);
    if (match)
        return match[1];
    if (pathStr === 'SKILL.md')
        return repo.split('/')[1] ?? repo;
    return pathStr.replace('/SKILL.md', '').replace(/\//g, '-');
}
async function fetchSkillContent(downloadUrl) {
    const headers = createGitHubHeaders(true);
    const res = await fetchWithTimeout(downloadUrl, headers);
    if (!res.ok) {
        const altUrl = downloadUrl.replace('/main/', '/master/');
        const res2 = await fetchWithTimeout(altUrl, headers);
        if (!res2.ok)
            throw new Error(`下载失败: ${res.status}`);
        return res2.text();
    }
    return res.text();
}
function parseFrontmatterRaw(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match)
        return {};
    try {
        const fm = yaml.load(match[1]);
        if (!fm || typeof fm !== 'object')
            return {};
        return {
            name: typeof fm.name === 'string' ? fm.name : undefined,
            description: typeof fm.description === 'string' ? fm.description : undefined,
            runAs: typeof fm.runAs === 'string' ? fm.runAs : undefined,
        };
    }
    catch {
        return {};
    }
}
//# sourceMappingURL=github.js.map