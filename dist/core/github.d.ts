import { SearchResult } from '../types';
export interface SearchOptions {
    minStars?: number;
    page?: number;
}
export declare function searchSkills(keyword: string, options?: SearchOptions): Promise<SearchResult[]>;
/**
 * 搜索 + 获取 frontmatter 描述（只取 top 5 详细获取）
 */
export declare function searchSkillsWithMeta(keyword: string, options?: SearchOptions): Promise<SearchResult[]>;
export declare function fetchSkillContent(downloadUrl: string): Promise<string>;
export declare function parseFrontmatterRaw(content: string): {
    name?: string;
    description?: string;
    runAs?: string;
};
//# sourceMappingURL=github.d.ts.map