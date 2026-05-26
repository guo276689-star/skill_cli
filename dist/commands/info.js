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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.infoCommand = infoCommand;
const chalk_1 = __importDefault(require("chalk"));
const scanner_1 = require("../core/scanner");
const fs = __importStar(require("fs"));
async function infoCommand(name) {
    if (!name) {
        // 无参数：列出所有 skills 让用户选
        const skills = (0, scanner_1.scanLocalSkills)();
        if (skills.length === 0) {
            console.log(chalk_1.default.dim('📭 本地没有安装任何 Skills'));
            return;
        }
        console.log(chalk_1.default.dim('使用 skills info <name> 查看详情:\n'));
        for (const s of skills) {
            console.log(`  ${chalk_1.default.cyan(s.name)}`);
        }
        return;
    }
    const skill = (0, scanner_1.findSkillByName)(name);
    if (!skill) {
        console.log(chalk_1.default.red(`未找到 Skill: ${name}`));
        console.log(chalk_1.default.dim('使用 skills list 查看已安装的 Skills'));
        return;
    }
    // 读取原始文件内容
    let rawContent = '';
    try {
        rawContent = fs.readFileSync(skill.filePath, 'utf-8');
    }
    catch {
        // ignore
    }
    // 解析 frontmatter
    const fmMatch = rawContent.match(/^---\n([\s\S]*?)\n---/);
    const bodyContent = fmMatch ? rawContent.slice(fmMatch[0].length).trim() : rawContent;
    console.log();
    console.log(chalk_1.default.bold.cyan(`  ${skill.name}`));
    console.log(chalk_1.default.dim(`  ${'─'.repeat(40)}`));
    // 基本信息
    console.log();
    console.log(`  ${chalk_1.default.dim('描述:')}  ${skill.description || '（无）'}`);
    console.log(`  ${chalk_1.default.dim('模式:')}  ${skill.runAs === 'subagent' ? '🧬 subagent' : '📋 inline'}`);
    if (skill.model) {
        console.log(`  ${chalk_1.default.dim('模型:')}  ${skill.model}`);
    }
    if (skill.maxIters) {
        console.log(`  ${chalk_1.default.dim('迭代上限:')}  ${skill.maxIters}`);
    }
    if (skill.allowedTools && skill.allowedTools.length > 0) {
        console.log(`  ${chalk_1.default.dim('工具白名单:')}  ${skill.allowedTools.join(', ')}`);
    }
    // 文件信息
    console.log();
    console.log(`  ${chalk_1.default.dim('文件:')}  ${skill.filePath}`);
    console.log(`  ${chalk_1.default.dim('大小:')}  ${(skill.size / 1024).toFixed(1)} KiB`);
    // Frontmatter 原文
    if (fmMatch) {
        console.log();
        console.log(chalk_1.default.dim('  ── frontmatter ──'));
        const fmLines = fmMatch[1].trim().split('\n');
        for (const line of fmLines) {
            console.log(chalk_1.default.dim(`  │ ${line}`));
        }
    }
    // Body 预览（前 5 行）
    if (bodyContent) {
        const bodyLines = bodyContent.split('\n').filter(l => l.trim());
        console.log();
        console.log(chalk_1.default.dim(`  ── body (${bodyLines.length} 行) ──`));
        const preview = bodyLines.slice(0, 8);
        for (const line of preview) {
            const trimmed = line.length > 60 ? line.slice(0, 60) + '...' : line;
            console.log(chalk_1.default.dim(`  │ ${trimmed}`));
        }
        if (bodyLines.length > 8) {
            const remaining = bodyContent.length - preview.join('\n').length;
            console.log(chalk_1.default.dim(`  │ ... 还有约 ${(remaining / 1024).toFixed(1)} KiB`));
        }
    }
    console.log();
}
//# sourceMappingURL=info.js.map