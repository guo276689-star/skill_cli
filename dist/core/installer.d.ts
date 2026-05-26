import { InstallResult } from '../types';
/**
 * 安装一个 Skill：将 SKILL.md 内容写入本地。
 * force=true 时跳过已存在检查，强制覆盖。
 */
export declare function installSkill(content: string, skillName: string, scope?: 'global' | 'project', force?: boolean): InstallResult;
/** @deprecated 使用 installSkill(content, name, scope, true) 代替 */
export declare function forceInstallSkill(content: string, skillName: string, scope?: 'global' | 'project'): InstallResult;
/** 校验 repo 参数格式 */
export declare function validateRepoFormat(repo: string): boolean;
/**
 * 获取本地 Skills 目录（按优先级：项目级 > 全局）
 */
export declare function getSkillsDirs(): string[];
//# sourceMappingURL=installer.d.ts.map