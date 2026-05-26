import { SearchResult } from '../types';
export interface GitHubSearchItem {
    repository: {
        full_name: string;
        stargazers_count: number;
        description: string | null;
    };
    path: string;
}
/**
 * 搜索 GitHub 上包含 SKILL.md 的仓库
 */
export declare function searchSkills(keyword: string, page?: number): Promise<SearchResult[]>;
/**
 * 获取单个 SKILL.md 的原始内容
 */
export declare function fetchSkillContent(downloadUrl: string): Promise<string>;
/**
 * 搜索 Skills 时同时获取每个 skill 的 frontmatter（用于展示描述）
 */
export declare function searchSkillsWithMeta(keyword: string, page?: number): Promise<SearchResult[]>;
/** 解析 YAML frontmatter */
export declare function parseFrontmatterRaw(content: string): {
    name?: string;
    description?: string;
    runAs?: string;
};
//# sourceMappingURL=github.d.ts.map