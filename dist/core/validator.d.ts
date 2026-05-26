import { DoctorResult } from '../types';
/** 遍历所有 Skill 文件，回调处理每个 .md 文件 */
export declare function walkSkillFiles(fn: (filePath: string) => void): void;
/**
 * 校验本地所有 Skills，返回诊断结果
 */
export declare function doctorCheck(): DoctorResult;
/**
 * 校验单个文件并返回是否通过。
 * existingContent 用于避免安装后重复读取磁盘（传已下载的内容即可）。
 */
export declare function validateFile(filePath: string, existingContent?: string): DoctorResult;
//# sourceMappingURL=validator.d.ts.map