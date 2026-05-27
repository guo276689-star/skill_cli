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
exports.reviewCommand = reviewCommand;
const chalk_1 = __importDefault(require("chalk"));
const scanner_1 = require("../core/scanner");
const fs = __importStar(require("fs"));
async function reviewCommand(name) {
    if (!name) {
        console.log(chalk_1.default.red('请指定 Skill 名称'));
        console.log(chalk_1.default.dim('用法: skills review <name>'));
        return;
    }
    const skill = (0, scanner_1.findSkillByName)(name);
    if (!skill) {
        console.log(chalk_1.default.red(`未找到 Skill: ${name}`));
        console.log(chalk_1.default.dim('使用 skills list 查看已安装的 Skills'));
        return;
    }
    // 读取内容
    let content;
    try {
        content = fs.readFileSync(skill.filePath, 'utf-8');
    }
    catch {
        console.log(chalk_1.default.red('无法读取文件'));
        return;
    }
    // 基本信息
    console.log(chalk_1.default.bold(`\n📋 AI 评审: ${chalk_1.default.cyan(skill.name)}\n`));
    console.log(chalk_1.default.dim(`  文件: ${skill.filePath}`));
    console.log(chalk_1.default.dim(`  body: ${content.length} 字符`));
    console.log();
    // 提取 body
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    const body = fmMatch ? content.slice(fmMatch[0].length).trim() : content;
    // 规则快速分析（本地）
    console.log(chalk_1.default.bold('🔍 规则快速分析\n'));
    // 分析维度
    const analysis = quickAnalyze(body);
    console.log(`  ${chalk_1.default.dim('清晰度:')}  ${analysis.clarity}`);
    console.log(`  ${chalk_1.default.dim('覆盖度:')}  ${analysis.coverage}`);
    console.log(`  ${chalk_1.default.dim('约束力:')}  ${analysis.constraints}`);
    console.log(`  ${chalk_1.default.dim('可验证性:')}  ${analysis.verifiability}`);
    console.log(`  ${chalk_1.default.dim('复用性:')}  ${analysis.reusability}`);
    // 提示 AI 深度评审
    console.log();
    console.log(chalk_1.default.bold('🧠 AI 深度评审'));
    console.log();
    console.log(chalk_1.default.dim('  在 Reasonix 中运行:'));
    console.log(chalk_1.default.cyan(`  /skill review-skill ${skill.filePath}`));
    console.log();
}
function quickAnalyze(body) {
    const bodyLines = body.split('\n').filter(l => l.trim());
    // 清晰度：基于步骤和动词
    const stepCount = (body.match(/^\d+\.\s+/gm) || []).length;
    const verbCount = (body.match(/\b(读取|检查|验证|写入|运行|搜索|分析|审查|生成|执行|调用|返回|read|check|verify|write|run|search|analyze|review|generate|execute|call|return)\b/gi) || []).length;
    let clarity;
    if (stepCount >= 3 && verbCount >= 8)
        clarity = '🟢 高 — 步骤明确，动词丰富';
    else if (stepCount >= 1 || verbCount >= 4)
        clarity = '🟡 中 — 有基本指令，可进一步细化';
    else
        clarity = '🔴 低 — 缺少结构化步骤和具体动词';
    // 覆盖度：基于章节和检查项
    const sectionCount = (body.match(/^##\s+/gm) || []).length;
    const checklistItems = (body.match(/^[-*]\s+/gm) || []).length;
    let coverage;
    if (sectionCount >= 4 && checklistItems >= 5)
        coverage = '🟢 高 — 章节丰富，检查项充足';
    else if (sectionCount >= 2 || checklistItems >= 3)
        coverage = '🟡 中 — 有一定覆盖，可补充边界场景';
    else
        coverage = '🔴 低 — 建议增加章节和检查清单';
    // 约束力：基于限制词和反模式
    const constraintCount = (body.match(/\b(不要|禁止|只允许|必须|避免|切勿|优先|do not|must not|never|only|must|avoid)\b/gi) || []).length;
    let constraints;
    if (constraintCount >= 5)
        constraints = '🟢 强 — 约束明确，边界清楚';
    else if (constraintCount >= 2)
        constraints = '🟡 中 — 有基本约束，建议补充反模式';
    else
        constraints = '🔴 弱 — 缺少约束，agent 可能偏离预期';
    // 可验证性：基于验证/检查点
    const verifyCount = (body.match(/\b(验证|确认|检查|verify|confirm|check|assert|expect|确保|ensure)\b/gi) || []).length;
    let verifiability;
    if (verifyCount >= 5)
        verifiability = '🟢 强 — 有明确验证步骤';
    else if (verifyCount >= 2)
        verifiability = '🟡 中 — 有验证概念，可加具体检查点';
    else
        verifiability = '🔴 弱 — 缺少验证，无法判断任务是否完成';
    // 复用性：基于具体领域关键词 vs 通用性
    const specificTerms = (body.match(/\b(React|Next\.js|Python|Docker|AWS|MySQL|Kubernetes|TypeScript|GitHub|Slack)\b/gi) || []).length;
    const genericTerms = (body.match(/\b(代码|文件|项目|仓库|接口|API|数据|函数|模块|code|file|project|repo|data|function|module)\b/gi) || []).length;
    let reusability;
    if (genericTerms > specificTerms && sectionCount >= 3)
        reusability = '🟢 高 — 通用设计，可跨场景复用';
    else if (specificTerms <= 3)
        reusability = '🟡 中 — 基本通用，少数领域特化';
    else
        reusability = '🔴 低 — 领域耦合度高，复用受限';
    return { clarity, coverage, constraints, verifiability, reusability };
}
//# sourceMappingURL=review.js.map