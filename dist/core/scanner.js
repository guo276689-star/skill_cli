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
const yaml = __importStar(require("js-yaml"));
const validator_1 = require("./validator");
/**
 * 扫描本地所有 Skills 目录，返回已安装的 Skills 列表
 */
function scanLocalSkills(all = false) {
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
    }, all);
    return skills;
}
function parseSkillFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
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
        size: fs.statSync(filePath).size,
    };
}
/** 缓存：name → SkillMeta，避免多轮 I/O */
let _nameCache = null;
function ensureCache() {
    if (_nameCache)
        return _nameCache;
    _nameCache = new Map();
    (0, validator_1.walkSkillFiles)((filePath) => {
        try {
            const meta = parseSkillFile(filePath);
            if (meta) {
                _nameCache.set(meta.name, meta);
                // 也注册文件名别名
                const baseName = filePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.md$/, '');
                if (baseName && baseName !== meta.name) {
                    _nameCache.set(baseName, meta);
                }
            }
        }
        catch { /* skip */ }
    });
    return _nameCache;
}
/** 根据名称查找 Skill（O(1) 缓存查找） */
function findSkillByName(name) {
    return ensureCache().get(name) ?? null;
}
//# sourceMappingURL=scanner.js.map