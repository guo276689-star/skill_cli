"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCommand = updateCommand;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const tracker_1 = require("../core/tracker");
const scanner_1 = require("../core/scanner");
const github_1 = require("../core/github");
const installer_1 = require("../core/installer");
async function updateCommand(name) {
    if (name) {
        await updateOne(name);
        return;
    }
    // 无参数：列出可更新的 Skill 并全部更新
    const updatable = (0, tracker_1.listUpdatable)();
    if (updatable.length === 0) {
        console.log(chalk_1.default.dim('📭 没有可更新的 Skill（只有通过 skills install 安装的才记录来源）'));
        return;
    }
    console.log(chalk_1.default.bold(`\n🔄 可更新: ${updatable.length} 个\n`));
    for (const u of updatable) {
        console.log(`  ${chalk_1.default.cyan(u.name)}  ←  ${chalk_1.default.dim(u.source.repo)}`);
    }
    console.log();
    // 逐一更新
    let ok = 0;
    let fail = 0;
    for (const u of updatable) {
        const result = await updateOne(u.name, true);
        if (result)
            ok++;
        else
            fail++;
    }
    console.log();
    console.log(chalk_1.default.green(`${ok} 已更新`) + (fail > 0 ? chalk_1.default.red(`  ${fail} 失败`) : ''));
}
async function updateOne(name, silent = false) {
    // 检查本地是否存在
    const skill = (0, scanner_1.findSkillByName)(name);
    if (!skill) {
        if (!silent)
            console.log(chalk_1.default.red(`未找到 Skill: ${name}`));
        return false;
    }
    // 获取来源
    const source = (0, tracker_1.getSource)(name);
    if (!source) {
        if (!silent) {
            console.log(chalk_1.default.yellow(`${name}: 无安装来源记录，无法更新`));
            console.log(chalk_1.default.dim('  只有通过 skills install 安装的 Skill 才记录来源'));
        }
        return false;
    }
    const spinner = (0, ora_1.default)(`更新 ${name}...`).start();
    try {
        // 构建 URL
        const safeName = (0, installer_1.sanitizeSkillName)(source.skillName);
        const urls = [
            `https://raw.githubusercontent.com/${source.repo}/main/skills/${safeName}/SKILL.md`,
            `https://raw.githubusercontent.com/${source.repo}/main/${safeName}/SKILL.md`,
        ];
        let content = null;
        for (const url of urls) {
            try {
                content = await (0, github_1.fetchSkillContent)(url);
                break;
            }
            catch {
                continue;
            }
        }
        if (!content) {
            throw new Error(`无法从 ${source.repo} 下载最新版本`);
        }
        // 提取 actual name
        const fm = (0, github_1.parseFrontmatterRaw)(content);
        const actualName = fm.name ?? name;
        // 覆盖安装（force=true）
        const scope = skill.filePath.includes('AppData') || skill.filePath.includes('.reasonix')
            ? (skill.filePath.includes(process.cwd()) ? 'project' : 'global')
            : 'project';
        // 简单的 scope 判断
        const isGlobal = !skill.filePath.includes(process.cwd().replace(/\\/g, '/'));
        const result = (0, installer_1.installSkill)(content, actualName, isGlobal ? 'global' : 'project', true);
        if (!result.success) {
            spinner.fail(result.error);
            return false;
        }
        spinner.succeed(`${chalk_1.default.cyan(name)} 已更新`);
        if (fm.description && fm.description !== skill.description) {
            console.log(`  📝 ${chalk_1.default.dim(fm.description.slice(0, 60))}`);
        }
        return true;
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        spinner.fail(`更新失败: ${message}`);
        return false;
    }
}
//# sourceMappingURL=update.js.map