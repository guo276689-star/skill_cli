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
exports.scanLocalSkills = scanLocalSkills;
exports.findSkillByName = findSkillByName;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const validator_1 = require("./validator");
/**
 * 扫描本地所有 Skills 目录，返回已安装的 Skills 列表
 */
function scanLocalSkills() {
    const skills = [];
    (0, validator_1.walkSkillFiles)((filePath) => {
        try {
            const meta = parseSkillFile(filePath);
            if (meta)
                skills.push(meta);
        }
        catch {
            // 解析失败的文件跳过，不阻塞其他 Skill 扫描
        }
    });
    return skills;
}
/**
 * 解析单个 SKILL.md 文件。
 * existingStat 可选：调用方如已执行 statSync 可传入以消除重复系统调用。
 */
function parseSkillFile(filePath, existingStat) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const stat = existingStat ?? fs.statSync(filePath);
    // 提取 frontmatter
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch)
        return null;
    const fm = yaml.load(fmMatch[1]);
    if (!fm || !fm.name)
        return null;
    return {
        name: String(fm.name),
        description: typeof fm.description === 'string' ? fm.description : '',
        runAs: fm.runAs,
        model: typeof fm.model === 'string' ? fm.model : undefined,
        allowedTools: Array.isArray(fm.allowedTools) ? fm.allowedTools.map(String) : undefined,
        maxIters: typeof fm.maxIters === 'number' ? fm.maxIters : undefined,
        filePath,
        size: stat.size,
    };
}
/**
 * 根据名称查找 Skill（按目录顺序匹配文件名前缀，命中即停止）
 */
function findSkillByName(name) {
    // 优先按文件名快速匹配，避免解析所有文件的 YAML
    let found = null;
    (0, validator_1.walkSkillFiles)((filePath) => {
        if (found)
            return; // 已找到，跳过后续
        // 快速文件名匹配
        const baseName = path.basename(filePath, '.md');
        if (baseName === name) {
            found = parseSkillFile(filePath);
            return;
        }
        // 目录模式：父目录名匹配
        const parentDir = path.basename(path.dirname(filePath));
        if (parentDir === name) {
            found = parseSkillFile(filePath);
        }
    });
    if (found)
        return found;
    // 回退：逐个解析 frontmatter 中的 name 字段
    (0, validator_1.walkSkillFiles)((filePath) => {
        if (found)
            return;
        const meta = parseSkillFile(filePath);
        if (meta && meta.name === name)
            found = meta;
    });
    return found;
}
//# sourceMappingURL=scanner.js.map