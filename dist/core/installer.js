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
exports.installSkill = installSkill;
exports.forceInstallSkill = forceInstallSkill;
exports.validateRepoFormat = validateRepoFormat;
exports.getSkillsDirs = getSkillsDirs;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
/** 单个 Skill 文件最大 1 MiB，防止恶意超大文件 */
const MAX_SKILL_SIZE = 1 * 1024 * 1024;
/** 文件名安全净化：只保留字母数字和连字符 */
const SAFE_NAME_RE = /[^a-zA-Z0-9_\-]/g;
/** repo 格式校验：owner/name，禁止 query/fragment */
const REPO_FORMAT_RE = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;
const SKILLS_DIRS = [
    path.join(os.homedir(), '.reasonix', 'skills'), // 全局
    path.join(process.cwd(), '.reasonix', 'skills'), // 项目级
];
/**
 * 安装一个 Skill：将 SKILL.md 内容写入本地。
 * force=true 时跳过已存在检查，强制覆盖。
 */
function installSkill(content, skillName, scope = 'project', force = false) {
    // 内容大小检查
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
    }
    // 文件名安全净化：不允许 `.` 防止隐藏文件，不允许以 `-` 开头
    let safeName = skillName.replace(SAFE_NAME_RE, '-').replace(/\./g, '-').replace(/^-+/, '');
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
    return {
        success: true,
        skillName,
        filePath,
    };
}
/** @deprecated 使用 installSkill(content, name, scope, true) 代替 */
function forceInstallSkill(content, skillName, scope = 'project') {
    return installSkill(content, skillName, scope, true);
}
/** 校验 repo 参数格式 */
function validateRepoFormat(repo) {
    return REPO_FORMAT_RE.test(repo);
}
/**
 * 获取本地 Skills 目录（按优先级：项目级 > 全局）
 */
function getSkillsDirs() {
    return SKILLS_DIRS.filter(d => fs.existsSync(d));
}
//# sourceMappingURL=installer.js.map