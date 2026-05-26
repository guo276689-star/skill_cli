import { SkillMeta } from '../types';
/**
 * 扫描本地所有 Skills 目录，返回已安装的 Skills 列表
 */
export declare function scanLocalSkills(): SkillMeta[];
/**
 * 根据名称查找 Skill（按目录顺序匹配文件名前缀，命中即停止）
 */
export declare function findSkillByName(name: string): SkillMeta | null;
//# sourceMappingURL=scanner.d.ts.map