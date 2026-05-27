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
    const filters = [];
    if (options?.minStars)
        filters.push(`≥${options.minStars}⭐`);
    if (options?.updatedWithin)
        filters.push(`最近${options.updatedWithin}`);
    const filterStr = filters.length > 0 ? ` (${filters.join(', ')})` : '';
    const spinner = (0, ora_1.default)(`搜索 "${keyword}"${filterStr}...`).start();
    try {
        const results = await (0, github_1.searchSkillsWithMeta)(keyword, options);
        if (results.length === 0) {
            spinner.warn(`未找到与 "${keyword}" 相关的 Skills`);
            console.log(chalk_1.default.dim('\n提示：放宽 --min-stars 或去掉 --updated-within 试试'));
            return;
        }
        spinner.succeed(`找到 ${results.length} 个相关 Skills\n`);
        // 表头
        console.log(chalk_1.default.dim(`  ${'Skill'.padEnd(26)} ${'⭐'.padStart(7)}  ${'更新'.padEnd(11)} Repo`));
        console.log(chalk_1.default.dim(`  ${'─'.repeat(78)}`));
        for (const r of results) {
            printResult(r);
        }
        console.log();
        console.log(chalk_1.default.dim('💡 安装: skills install <owner/repo> [skill-name]'));
        console.log(chalk_1.default.dim('💡 精选: skills search "keyword" --min-stars 500 --updated-within 3m'));
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
    // stars
    const stars = r.repoStars >= 1000
        ? chalk_1.default.yellow(String(r.repoStars / 1000).slice(0, 4) + 'K').padStart(7)
        : String(r.repoStars).padStart(7);
    // 更新时间
    const updatedStr = formatTimeAgo(r.updatedAt);
    const freshnessColor = getFreshnessColor(r.updatedAt);
    const updated = freshnessColor(updatedStr.padEnd(11));
    // 名称
    const name = r.downloadUrl
        ? chalk_1.default.cyan(r.skillName.padEnd(26).slice(0, 26))
        : chalk_1.default.gray(r.skillName.padEnd(26).slice(0, 26));
    // repo
    const repo = chalk_1.default.dim(r.repo);
    console.log(`  ${name} ${stars}  ${updated} ${repo}`);
    // 描述
    const desc = r.skillDesc || r.repoDesc;
    if (desc) {
        const short = desc.length > 68 ? desc.slice(0, 68) + '...' : desc;
        console.log(chalk_1.default.dim(`  ${' '.repeat(2)}${short}`));
    }
}
function formatTimeAgo(iso) {
    if (!iso)
        return '未知';
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days < 1)
        return '今天';
    if (days < 7)
        return `${days}天前`;
    if (days < 30)
        return `${Math.floor(days / 7)}周前`;
    if (days < 365)
        return `${Math.floor(days / 30)}月前`;
    return `${Math.floor(days / 365)}年前`;
}
function getFreshnessColor(iso) {
    if (!iso)
        return chalk_1.default.dim;
    const diff = Date.now() - new Date(iso).getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    if (days < 30)
        return chalk_1.default.green;
    if (days < 365)
        return chalk_1.default.yellow;
    return chalk_1.default.red;
}
//# sourceMappingURL=search.js.map