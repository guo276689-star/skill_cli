"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchCommand = searchCommand;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const github_1 = require("../core/github");
async function searchCommand(keyword, options) {
    const spinner = (0, ora_1.default)(`搜索 "${keyword}"${options?.minStars ? ` (≥${options.minStars} ⭐)` : ''}...`).start();
    try {
        const results = await (0, github_1.searchSkillsWithMeta)(keyword, options);
        if (results.length === 0) {
            spinner.warn(`未找到与 "${keyword}" 相关的 Skills`);
            console.log(chalk_1.default.dim('\n提示：尝试去掉 --min-stars 或换一个更通用的关键词'));
            return;
        }
        spinner.succeed(`找到 ${results.length} 个相关 Skills\n`);
        // 表头
        console.log(chalk_1.default.dim(`  ${'Skill'.padEnd(28)} ${'Repo'.padEnd(32)} ⭐`));
        console.log(chalk_1.default.dim(`  ${'─'.repeat(72)}`));
        for (const r of results) {
            printResult(r);
        }
        console.log();
        console.log(chalk_1.default.dim('💡 安装: skills install <owner/repo> [skill-name]'));
        console.log(chalk_1.default.dim('💡 过滤: skills search "keyword" --min-stars 100'));
        if (!process.env.GITHUB_TOKEN) {
            console.log(chalk_1.default.yellow('⚠️  未设置 GITHUB_TOKEN，API 限流较低。'));
        }
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        spinner.fail(`搜索失败: ${message}`);
    }
}
function printResult(r) {
    const stars = r.repoStars >= 1000
        ? chalk_1.default.yellow(`${(r.repoStars / 1000).toFixed(1)}K`)
        : String(r.repoStars);
    const name = r.downloadUrl ? chalk_1.default.cyan.bold(r.skillName.padEnd(28).slice(0, 28)) : chalk_1.default.gray(r.skillName.padEnd(28).slice(0, 28));
    const repo = chalk_1.default.dim(r.repo.padEnd(32).slice(0, 32));
    console.log(`  ${name} ${repo} ${stars}`);
    const desc = r.skillDesc || r.repoDesc;
    if (desc) {
        const short = desc.length > 64 ? desc.slice(0, 64) + '...' : desc;
        console.log(chalk_1.default.dim(`  ${' '.repeat(2)}${short}`));
    }
}
//# sourceMappingURL=search.js.map