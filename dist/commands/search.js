"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchCommand = searchCommand;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const github_1 = require("../core/github");
async function searchCommand(keyword) {
    const spinner = (0, ora_1.default)(`搜索 "${keyword}"...`).start();
    try {
        const results = await (0, github_1.searchSkillsWithMeta)(keyword);
        if (results.length === 0) {
            spinner.warn(`未找到与 "${keyword}" 相关的 Skills`);
            console.log(chalk_1.default.dim('\n提示：尝试更通用的关键词，或访问 openagentskill.com 浏览更多'));
            return;
        }
        spinner.succeed(`找到 ${results.length} 个相关 Skills\n`);
        for (const r of results) {
            printResult(r);
        }
        console.log(chalk_1.default.dim('\n💡 安装: skills install <repo> [skill-name]'));
        if (!process.env.GITHUB_TOKEN) {
            console.log(chalk_1.default.yellow('⚠️  未设置 GITHUB_TOKEN，API 限流较低。设置后可获得更多搜索次数。'));
        }
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        spinner.fail(`搜索失败: ${message}`);
    }
}
function printResult(r) {
    const stars = r.repoStars > 1000
        ? chalk_1.default.yellow(`${(r.repoStars / 1000).toFixed(1)}K ⭐`)
        : `${r.repoStars} ⭐`;
    console.log(`  ${chalk_1.default.cyan.bold(r.skillName)}`);
    console.log(`  ${chalk_1.default.dim(r.skillDesc || '（无描述）')}`);
    console.log(`  📦 ${r.repo}  ${stars}`);
    console.log(`  📄 ${chalk_1.default.dim(r.skillPath)}`);
    console.log();
}
//# sourceMappingURL=search.js.map