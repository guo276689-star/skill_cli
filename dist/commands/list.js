"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCommand = listCommand;
const chalk_1 = __importDefault(require("chalk"));
const scanner_1 = require("../core/scanner");
const installer_1 = require("../core/installer");
async function listCommand(options) {
    const all = options?.all ?? false;
    const skills = (0, scanner_1.scanLocalSkills)(all);
    if (skills.length === 0) {
        const dirs = (0, installer_1.getSkillsDirs)(all);
        console.log(chalk_1.default.dim('📭 本地没有安装任何 Skills'));
        console.log(chalk_1.default.dim(`  扫描目录: ${dirs.join(', ')}`));
        console.log(chalk_1.default.dim('\n使用 skills search <keyword> 搜索可用的 Skills'));
        console.log(chalk_1.default.dim('使用 skills install <repo> [skill-name] 安装'));
        return;
    }
    if (all) {
        console.log(chalk_1.default.bold(`\n全部 Skills (${skills.length}):\n`));
    }
    else {
        console.log(chalk_1.default.bold(`\n本地 Skills (${skills.length}):\n`));
    }
    for (const s of skills) {
        const runIcon = s.runAs === 'subagent' ? '🧬' : '📋';
        const model = s.model ? chalk_1.default.dim(` [${s.model}]`) : '';
        console.log(`  ${runIcon} ${chalk_1.default.cyan(s.name)}${model}`);
        console.log(`     ${chalk_1.default.dim(s.description || '（无描述）')}`);
        console.log(`     ${chalk_1.default.dim(s.filePath)}`);
        console.log();
    }
    const subagents = skills.filter(s => s.runAs === 'subagent').length;
    const inlines = skills.length - subagents;
    console.log(chalk_1.default.dim(`  ${skills.length} 个 Skills：${subagents} subagent · ${inlines} inline`));
    if (!all) {
        console.log(chalk_1.default.dim('\n💡 skills list --all  查看所有项目中的 Skills'));
    }
}
//# sourceMappingURL=list.js.map