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
exports.walkSkillFiles = walkSkillFiles;
exports.doctorProCheck = doctorProCheck;
exports.doctorCheck = doctorCheck;
exports.computeScore = computeScore;
exports.scanSecurity = scanSecurity;
exports.checkCompatibility = checkCompatibility;
exports.validateFile = validateFile;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const installer_1 = require("./installer");
const scanner_1 = require("./scanner");
// ──── 工具名映射表 ────
/** Reasonix 有效的工具名列表 */
const REASONIX_TOOLS = [
    'read_file', 'write_file', 'edit_file', 'multi_edit',
    'search_content', 'search_files', 'glob', 'run_command',
    'run_background', 'web_search', 'web_fetch', 'get_file_info',
    'list_directory', 'directory_tree', 'find_in_code', 'get_symbols',
    'run_skill', 'remember', 'forget', 'recall_memory',
    'ask_choice', 'submit_plan', 'todo_write',
];
const CLAUDE_CODE_TOOLS = [
    'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep',
    'WebSearch', 'WebFetch', 'Task', 'AskUserQuestion',
    'TodoWrite', 'NotebookEdit',
];
const CURSOR_TOOLS = [
    'read_file', 'search_content', 'search_files', 'list_directory',
    'run_terminal_cmd', 'edit_file', 'write_file', 'delete_file',
];
/** 危险 pattern 列表 */
const DANGEROUS_PATTERNS = [
    { pattern: /\b(exec|spawn|execSync|spawnSync)\s*\(/, label: '命令执行', severity: 'error' },
    { pattern: /\beval\s*\(/, label: 'eval 调用', severity: 'error' },
    { pattern: /\bnew\s+Function\s*\(/, label: 'Function 构造器', severity: 'error' },
    { pattern: /\brm\s+-rf\b/, label: 'rm -rf 危险删除', severity: 'error' },
    { pattern: /\bfs\.(unlink|rmdir|rm)Sync?\s*\(/, label: '文件删除', severity: 'warning' },
    { pattern: /\bfs\.(writeFile|appendFile)Sync?\s*\(/, label: '任意文件写入', severity: 'warning' },
    { pattern: /\bprocess\.env\b/, label: '环境变量读取', severity: 'warning' },
    { pattern: /\bcurl\b.*\|.*\b(?:ba)?sh\b/, label: 'curl | sh 模式', severity: 'error' },
    { pattern: /\bwget\b.*\|.*\b(?:ba)?sh\b/, label: 'wget | sh 模式', severity: 'error' },
];
// ──── 公共遍历 ────
function walkSkillFiles(fn) {
    const dirs = (0, installer_1.getSkillsDirs)();
    for (const dir of dirs) {
        if (!fs.existsSync(dir))
            continue;
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
            const fullPath = path.join(dir, entry);
            const stat = fs.statSync(fullPath);
            if (stat.isFile() && entry.endsWith('.md')) {
                fn(fullPath);
            }
            else if (stat.isDirectory()) {
                const skillMd = path.join(fullPath, 'SKILL.md');
                if (fs.existsSync(skillMd))
                    fn(skillMd);
            }
        }
    }
}
function doctorProCheck() {
    const base = doctorCheck();
    const scores = computeAllScores();
    const duplicates = detectDuplicates();
    return { ...base, scores, duplicates };
}
// ──── 基础 doctor ────
function doctorCheck() {
    const issuesAccum = [];
    let total = 0;
    let ok = 0;
    walkSkillFiles((filePath) => {
        total++;
        const fileIssues = checkFile(filePath);
        if (fileIssues.length === 0)
            ok++;
        issuesAccum.push(...fileIssues);
    });
    return { total, ok, issues: issuesAccum };
}
function checkFile(filePath) {
    let content;
    try {
        content = fs.readFileSync(filePath, 'utf-8');
    }
    catch {
        return [{ filePath, severity: 'error', message: '无法读取文件' }];
    }
    const issues = checkFrontmatterSyntax(filePath, content);
    if (issues.length > 0)
        return issues;
    const fm = parseFrontmatter(filePath, content);
    if (!fm)
        return [];
    issues.push(...checkRequiredFields(filePath, fm));
    issues.push(...checkOptionalFields(filePath, fm));
    const fmEnd = content.indexOf('\n---', 3);
    if (fmEnd !== -1 && content.slice(fmEnd + 4).trim() === '') {
        issues.push({ filePath, severity: 'warning', message: 'body 为空，Skill 不会有任何指令' });
    }
    return issues;
}
function checkFrontmatterSyntax(filePath, content) {
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) {
        return [{ filePath, severity: 'error', message: '缺少 YAML frontmatter (--- ... ---)' }];
    }
    return [];
}
function parseFrontmatter(_filePath, content) {
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch)
        return null;
    try {
        return yaml.load(fmMatch[1]);
    }
    catch {
        return null;
    }
}
function checkRequiredFields(filePath, fm) {
    const issues = [];
    if (!fm.name) {
        issues.push({ filePath, severity: 'error', message: '缺少必填字段: name' });
    }
    else if (typeof fm.name === 'string' && !/^[a-zA-Z0-9_\-.]{1,64}$/.test(fm.name)) {
        issues.push({
            filePath,
            severity: 'error',
            message: `name 格式非法: "${fm.name}"（允许字母/数字/_/-/.，1-64字符）`,
        });
    }
    if (!fm.description) {
        issues.push({ filePath, severity: 'warning', message: '建议填写 description 字段' });
    }
    return issues;
}
function checkOptionalFields(filePath, fm) {
    const issues = [];
    if (fm.runAs && !['inline', 'subagent'].includes(fm.runAs)) {
        issues.push({
            filePath,
            severity: 'error',
            message: `runAs 值非法: "${fm.runAs}"（只允许 inline 或 subagent）`,
        });
    }
    if (fm.model && typeof fm.model === 'string' && !fm.model.startsWith('deepseek-')) {
        issues.push({
            filePath,
            severity: 'warning',
            message: `model 应为 deepseek-* 系列: "${fm.model}" 在 Reasonix 中不生效`,
        });
    }
    if (fm.maxIters !== undefined) {
        if (!Number.isInteger(fm.maxIters) || fm.maxIters < 1 || fm.maxIters > 32) {
            issues.push({
                filePath,
                severity: 'error',
                message: `maxIters 应在 1-32 之间: ${fm.maxIters}`,
            });
        }
    }
    if (fm.allowedTools) {
        if (!Array.isArray(fm.allowedTools)) {
            issues.push({ filePath, severity: 'error', message: 'allowedTools 应为数组' });
        }
        else {
            for (const tool of fm.allowedTools) {
                if (!REASONIX_TOOLS.includes(tool)) {
                    issues.push({
                        filePath,
                        severity: 'warning',
                        message: `allowedTools 中 "${tool}" 不是有效的 Reasonix 工具名`,
                    });
                }
            }
        }
    }
    return issues;
}
// ──── 质量评分 ────
function computeScore(filePath, content) {
    const raw = content ?? (() => { try {
        return fs.readFileSync(filePath, 'utf-8');
    }
    catch {
        return '';
    } })();
    if (!raw)
        return null;
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    const fm = fmMatch ? (() => { try {
        return yaml.load(fmMatch[1]);
    }
    catch {
        return null;
    } })() : null;
    const body = fmMatch ? raw.slice(fmMatch[0].length).trim() : raw;
    const name = fm?.name ?? path.basename(filePath, '.md');
    const breakdown = [];
    let score = 0;
    // 1. frontmatter 完整性 (30)
    if (fmMatch) {
        score += 10;
        breakdown.push({ category: 'frontmatter 存在', points: 10, max: 10 });
    }
    else {
        breakdown.push({ category: 'frontmatter 存在', points: 0, max: 10 });
        return { name, filePath, score: 0, grade: 'F', breakdown };
    }
    if (fm?.name) {
        score += 8;
        breakdown.push({ category: 'name 字段', points: 8, max: 8 });
    }
    else
        breakdown.push({ category: 'name 字段', points: 0, max: 8 });
    if (fm?.description) {
        score += 7;
        breakdown.push({ category: 'description 字段', points: 7, max: 7 });
    }
    else
        breakdown.push({ category: 'description 字段', points: 0, max: 7 });
    if (fm?.runAs === 'subagent' || fm?.runAs === 'inline') {
        score += 5;
        breakdown.push({ category: 'runAs 字段', points: 5, max: 5 });
    }
    else
        breakdown.push({ category: 'runAs 字段', points: 0, max: 5 });
    // 2. body 质量 (30)
    const bodyLines = body.split('\n').filter(l => l.trim());
    if (bodyLines.length >= 5) {
        score += 10;
        breakdown.push({ category: 'body 行数 ≥5', points: 10, max: 10 });
    }
    else {
        score += Math.min(bodyLines.length * 2, 10);
        breakdown.push({ category: 'body 行数', points: Math.min(bodyLines.length * 2, 10), max: 10 });
    }
    const hasSteps = /##\s*(步骤|执行|Steps?|Instructions?|任务)/i.test(body);
    if (hasSteps) {
        score += 10;
        breakdown.push({ category: '有结构化步骤', points: 10, max: 10 });
    }
    else
        breakdown.push({ category: '有结构化步骤', points: 0, max: 10 });
    const hasChecklist = /[-*]\s+(\*\*|__)?[^\n]+(\*\*|__)?/.test(body);
    if (hasChecklist) {
        score += 10;
        breakdown.push({ category: '有检查清单', points: 10, max: 10 });
    }
    else
        breakdown.push({ category: '有检查清单', points: 0, max: 10 });
    // 3. 配置质量 (15)
    if (fm?.model && typeof fm.model === 'string' && fm.model.startsWith('deepseek-')) {
        score += 5;
        breakdown.push({ category: 'model 配置', points: 5, max: 5 });
    }
    else if (!fm?.model) {
        score += 3;
        breakdown.push({ category: 'model 配置 (默认)', points: 3, max: 5 });
    }
    else
        breakdown.push({ category: 'model 配置', points: 0, max: 5 });
    if (fm?.allowedTools && Array.isArray(fm.allowedTools) && fm.allowedTools.length > 0) {
        score += 10;
        breakdown.push({ category: 'allowedTools 配置', points: 10, max: 10 });
    }
    else {
        score += 5;
        breakdown.push({ category: 'allowedTools 配置 (全部可用)', points: 5, max: 10 });
    }
    // 4. 安全性 (25) — 从满分倒扣
    const secResult = scanSecurity(body);
    const secPenalty = secResult.filter(s => s.severity === 'error').length * 8
        + secResult.filter(s => s.severity === 'warning').length * 4;
    const secScore = Math.max(0, 25 - secPenalty);
    score += secScore;
    breakdown.push({ category: '安全性', points: secScore, max: 25 });
    const grade = score >= 90 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : score >= 30 ? 'D' : 'F';
    return { name, filePath, score, grade, breakdown };
}
function computeAllScores() {
    const skills = (0, scanner_1.scanLocalSkills)();
    return skills
        .map(s => computeScore(s.filePath))
        .filter((s) => s !== null)
        .sort((a, b) => b.score - a.score);
}
function scanSecurity(body) {
    return DANGEROUS_PATTERNS
        .filter(dp => dp.pattern.test(body))
        .map(dp => ({ pattern: dp.pattern.source, label: dp.label, severity: dp.severity }));
}
function checkCompatibility(tools) {
    return {
        reasonix: matchTools(tools, REASONIX_TOOLS),
        claudeCode: matchTools(tools, CLAUDE_CODE_TOOLS),
        cursor: matchTools(tools, CURSOR_TOOLS),
    };
}
function matchTools(tools, valid) {
    const ok = [];
    const bad = [];
    for (const t of tools) {
        (valid.includes(t) ? ok : bad).push(t);
    }
    return { ok: ok.length, bad };
}
// ──── 去重 ────
function detectDuplicates() {
    const skills = (0, scanner_1.scanLocalSkills)();
    const groups = [];
    for (let i = 0; i < skills.length; i++) {
        for (let j = i + 1; j < skills.length; j++) {
            const a = skills[i];
            const b = skills[j];
            // 相同名称，或描述前 30 字雷同
            const sameName = a.name.toLowerCase() === b.name.toLowerCase();
            const descA = (a.description || '').slice(0, 30).toLowerCase();
            const descB = (b.description || '').slice(0, 30).toLowerCase();
            const similarDesc = descA && descB && descA === descB;
            if (sameName || similarDesc) {
                // 查找已有组
                let added = false;
                for (const g of groups) {
                    if (g.includes(a.name) || g.includes(b.name)) {
                        if (!g.includes(a.name))
                            g.push(a.name);
                        if (!g.includes(b.name))
                            g.push(b.name);
                        added = true;
                        break;
                    }
                }
                if (!added)
                    groups.push([a.name, b.name]);
            }
        }
    }
    return groups;
}
// ──── validateFile（兼容旧接口） ────
function validateFile(filePath, existingContent) {
    if (!fs.existsSync(filePath)) {
        return {
            total: 1,
            ok: 0,
            issues: [{ filePath, severity: 'error', message: '文件不存在' }],
        };
    }
    const content = existingContent ?? fs.readFileSync(filePath, 'utf-8');
    const issues = checkFileWithContent(filePath, content);
    return { total: 1, ok: issues.length === 0 ? 1 : 0, issues };
}
function checkFileWithContent(filePath, content) {
    const issues = checkFrontmatterSyntax(filePath, content);
    if (issues.length > 0)
        return issues;
    const fm = parseFrontmatter(filePath, content);
    if (!fm)
        return [{ filePath, severity: 'error', message: 'frontmatter 解析失败' }];
    const all = [];
    all.push(...checkRequiredFields(filePath, fm));
    all.push(...checkOptionalFields(filePath, fm));
    const fmEnd = content.indexOf('\n---', 3);
    if (fmEnd !== -1 && content.slice(fmEnd + 4).trim() === '') {
        all.push({ filePath, severity: 'warning', message: 'body 为空，Skill 不会有任何指令' });
    }
    return all;
}
//# sourceMappingURL=validator.js.map