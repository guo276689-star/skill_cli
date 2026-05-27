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
exports.getSkillsDirs = getSkillsDirs;
exports.clearDirsCache = clearDirsCache;
exports.installSkill = installSkill;
exports.validateRepoFormat = validateRepoFormat;
exports.sanitizeSkillName = sanitizeSkillName;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
/** 单个 Skill 文件最大 1 MiB */
const MAX_SKILL_SIZE = 1 * 1024 * 1024;
/** 文件名安全净化 */
const SAFE_NAME_RE = /[^a-zA-Z0-9_\-]/g;
/** repo 格式：owner/name（禁止含 github.com 前缀） */
const REPO_FORMAT_RE = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;
const SKILLS_DIRS = [
    path.join(os.homedir(), '.reasonix', 'skills'),
    path.join(process.cwd(), '.reasonix', 'skills'),
];
/** 缓存的已存在 Skills 目录 */
let _cachedDirs = null;
function getSkillsDirs(all = false) {
    if (!all) {
        if (_cachedDirs)
            return _cachedDirs;
        _cachedDirs = SKILLS_DIRS.filter(d => fs.existsSync(d));
        return _cachedDirs;
    }
    // --all 模式：扫描所有 AI 工具的 skills 目录
    const dirs = new Set();
    const home = os.homedir();
    // 所有工具的全局 skills 目录
    const globalPatterns = [
        ['.reasonix', 'skills'],
        ['.claude', 'skills'],
        ['AppData', 'Roaming', 'npm', 'node_modules', '@anthropic', 'claude-code', 'skills'],
        ['.codex', 'skills'],
        ['.openai', 'skills'],
        ['.gemini', 'skills'],
        ['.agents', 'skills'],
        ['.antigravity', 'skills'],
        ['.cursor', 'skills'],
    ];
    for (const parts of globalPatterns) {
        const dir = path.join(home, ...parts);
        if (fs.existsSync(dir))
            dirs.add(dir);
    }
    // 当前项目的所有工具 skills 目录
    const cwd = process.cwd();
    const projectPatterns = [
        ['.reasonix', 'skills'],
        ['.claude', 'skills'],
        ['.codex', 'skills'],
        ['.gemini', 'skills'],
        ['.agents', 'skills'],
        ['.cursor', 'skills'],
    ];
    for (const parts of projectPatterns) {
        const dir = path.join(cwd, ...parts);
        if (fs.existsSync(dir))
            dirs.add(dir);
    }
    // Reasonix config.json 中记录的其他项目
    const configPath = path.join(home, '.reasonix', 'config.json');
    try {
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            if (config.projects) {
                for (const projectPath of Object.keys(config.projects)) {
                    if (projectPath === cwd)
                        continue; // 已扫描
                    for (const parts of projectPatterns) {
                        const subDir = path.join(projectPath, ...parts);
                        if (fs.existsSync(subDir))
                            dirs.add(subDir);
                    }
                }
            }
        }
    }
    catch { /* skip */ }
    return [...dirs];
}
/** 清除缓存（目录变化后调用） */
function clearDirsCache() {
    _cachedDirs = null;
}
/**
 * 安装一个 Skill。force=true 跳过已存在检查。
 */
function installSkill(content, skillName, scope = 'project', force = false) {
    if (content.length > MAX_SKILL_SIZE) {
        return {
            success: false,
            skillName,
            filePath: '',
            error: `文件过大 (${(content.length / 1024).toFixed(1)} KiB)，上限 ${MAX_SKILL_SIZE / 1024} KiB`,
        };
    }
    const dir = scope === 'global' ? SKILLS_DIRS[0] : SKILLS_DIRS[1];
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        clearDirsCache();
    }
    // Unicode 规范化 + 净化
    let safeName = skillName
        .normalize('NFKD')
        .replace(SAFE_NAME_RE, '-')
        .replace(/\./g, '-')
        .replace(/^-+/, '');
    if (!safeName)
        safeName = 'skill';
    const filePath = path.join(dir, `${safeName}.md`);
    if (!force && fs.existsSync(filePath)) {
        return {
            success: false,
            skillName,
            filePath,
            error: `已存在: ${filePath}。使用 --force 覆盖或先 remove。`,
        };
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true, skillName, filePath };
}
function validateRepoFormat(repo) {
    return REPO_FORMAT_RE.test(repo);
}
/** 净化 skillName 用于 URL 路径 */
function sanitizeSkillName(name) {
    return name.replace(SAFE_NAME_RE, '-').replace(/\./g, '-');
}
//# sourceMappingURL=installer.js.map