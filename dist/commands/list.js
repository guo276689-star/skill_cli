"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCommand = listCommand;
const chalk_1 = __importDefault(require("chalk"));
const scanner_1 = require("../core/scanner");
async function listCommand() {
    const skills = (0, scanner_1.scanLocalSkills)();
    if (skills.length === 0) {
        console.log(chalk_1.default.dim('📭 本地没有安装任何 Skills'));
        console.log(chalk_1.default.dim('\n使用 skills search <keyword> 搜索可用的 Skills'));
        console.log(chalk_1.default.dim('使用 skills install <repo> [skill-name] 安装'));
        return;
    }
    console.log(chalk_1.default.bold(`\n本地 Skills (${skills.length}):\n`));
    for (const s of skills) {
        const runIcon = s.runAs === 'subagent' ? '🧬' : '📋';
        const model = s.model ? chalk_1.default.dim(` [${s.model}]`) : '';
        console.log(`  ${runIcon} ${chalk_1.default.cyan(s.name)}${model}`);
        console.log(`     ${chalk_1.default.dim(s.description || '（无描述）')}`);
        console.log(`     ${chalk_1.default.dim(s.filePath)}`);
        console.log();
    }
    // 统计：显式计算避免扩展性 bug
    const subagents = skills.filter(s => s.runAs === 'subagent').length;
    const inlines = skills.length - subagents;
    console.log(chalk_1.default.dim(`  ${skills.length} 个 Skills：${subagents} subagent · ${inlines} inline`));
}
//# sourceMappingURL=list.js.map