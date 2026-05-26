/** 解析后的 SKILL.md frontmatter */
export interface SkillMeta {
  name: string;
  description: string;
  runAs?: 'inline' | 'subagent';
  model?: string;
  allowedTools?: string[];
  maxIters?: number;
  /** 文件路径 */
  filePath: string;
  /** 文件大小 (bytes) */
  size: number;
}

/** GitHub 搜索结果 */
export interface SearchResult {
  repo: string;        // "sickn33/antigravity-awesome-skills"
  repoStars: number;
  repoDesc: string;
  skillName: string;
  skillDesc: string;
  skillPath: string;   // "skills/code-review-quality/SKILL.md"
  downloadUrl: string; // raw URL
}

/** 安装结果 */
export interface InstallResult {
  success: boolean;
  skillName: string;
  filePath: string;
  error?: string;
}

/** doctor 检查结果 */
export interface DoctorIssue {
  filePath: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface DoctorResult {
  total: number;
  ok: number;
  issues: DoctorIssue[];
}
