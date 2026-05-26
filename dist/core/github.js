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
exports.fetchSkillContent = fetchSkillContent;
exports.searchSkillsWithMeta = searchSkillsWithMeta;
exports.parseFrontmatterRaw = parseFrontmatterRaw;
const yaml = __importStar(require("js-yaml"));
const GITHUB_API = 'https://api.github.com';
const FETCH_TIMEOUT_MS = 15_000;
/** 创建 GitHub API 请求头（统一工厂） */
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
/** 带超时的 fetch 封装 */
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
/**
 * 搜索 GitHub 上包含 SKILL.md 的仓库
 */
async function searchSkills(keyword, page = 1) {
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
            if (!res2.ok)
                throw new Error(`GitHub API 错误: ${res2.status}`);
            const data2 = await res2.json();
            return parseSearchResults(data2);
        }
        throw new Error(`GitHub API 错误: ${res.status}`);
    }
    const data = await res.json();
    return parseSearchResults(data);
}
function parseSearchResults(data) {
    if (!data.items || data.items.length === 0)
        return [];
    return data.items.map((item) => {
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
function extractSkillName(pathStr, repo) {
    const match = pathStr.match(/(?:^|\/)([^/]+)\/SKILL\.md$/);
    if (match)
        return match[1];
    if (pathStr === 'SKILL.md')
        return repo.split('/')[1] ?? repo;
    return pathStr.replace('/SKILL.md', '').replace(/\//g, '-');
}
/**
 * 获取单个 SKILL.md 的原始内容
 */
async function fetchSkillContent(downloadUrl) {
    const headers = createGitHubHeaders(true);
    const res = await fetchWithTimeout(downloadUrl, headers);
    if (!res.ok) {
        // 回退：尝试其他分支
        const altUrl = downloadUrl.replace('/main/', '/master/');
        const res2 = await fetchWithTimeout(altUrl, headers);
        if (!res2.ok)
            throw new Error(`下载失败: ${res.status}`);
        return res2.text();
    }
    return res.text();
}
/**
 * 搜索 Skills 时同时获取每个 skill 的 frontmatter（用于展示描述）
 */
async function searchSkillsWithMeta(keyword, page = 1) {
    const results = await searchSkills(keyword, page);
    // 只取前 5 个获取描述，避免请求过多
    const top5 = results.slice(0, 5);
    const enriched = await Promise.all(top5.map(async (r) => {
        try {
            const content = await fetchSkillContent(r.downloadUrl);
            const frontmatter = parseFrontmatterRaw(content);
            return {
                ...r,
                skillDesc: frontmatter.description ?? r.skillDesc,
                skillName: frontmatter.name ?? r.skillName,
            };
        }
        catch {
            return r;
        }
    }));
    return [...enriched, ...results.slice(5)];
}
/** 解析 YAML frontmatter */
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