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
exports.diffCommand = diffCommand;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const fs = __importStar(require("fs"));
const tracker_1 = require("../core/tracker");
const scanner_1 = require("../core/scanner");
const github_1 = require("../core/github");
const diff_1 = require("../core/diff");
async function diffCommand(name) {
    if (!name) {
        console.log(chalk_1.default.red('请指定 Skill 名称'));
        console.log(chalk_1.default.dim('用法: skills diff <name>'));
        return;
    }
    const skill = (0, scanner_1.findSkillByName)(name);
    if (!skill) {
        console.log(chalk_1.default.red(`未找到 Skill: ${name}`));
        return;
    }
    const source = (0, tracker_1.getSource)(name);
    if (!source) {
        console.log(chalk_1.default.yellow(`${name}: 无安装来源记录，无法对比远程版本`));
        console.log(chalk_1.default.dim('只有通过 skills install 安装的 Skill 才记录来源'));
        return;
    }
    const spinner = (0, ora_1.default)(`获取 ${name} 远程版本...`).start();
    try {
        // 获取远程内容
        const urls = [
            `https://raw.githubusercontent.com/${source.repo}/main/skills/${source.skillName}/SKILL.md`,
            `https://raw.githubusercontent.com/${source.repo}/main/${source.skillName}/SKILL.md`,
        ];
        let remoteContent = null;
        for (const url of urls) {
            try {
                remoteContent = await (0, github_1.fetchSkillContent)(url);
                break;
            }
            catch {
                continue;
            }
        }
        if (!remoteContent) {
            spinner.fail(`无法获取远程版本`);
            return;
        }
        // 读取本地内容
        const localContent = fs.readFileSync(skill.filePath, 'utf-8');
        spinner.succeed(`${chalk_1.default.cyan(name)} 本地 vs 远程\n`);
        // 显示基本信息
        const localFm = (0, github_1.parseFrontmatterRaw)(localContent);
        const remoteFm = (0, github_1.parseFrontmatterRaw)(remoteContent);
        console.log(chalk_1.default.bold('📋 版本信息'));
        console.log(`  本地: ${chalk_1.default.dim(localFm.description?.slice(0, 50) || '—')}`);
        console.log(`  远程: ${chalk_1.default.cyan(remoteFm.description?.slice(0, 50) || '—')}`);
        console.log(`  来源: ${chalk_1.default.dim(source.repo)}`);
        console.log();
        // 显示 diff
        console.log(chalk_1.default.bold('📄 变更内容'));
        console.log(chalk_1.default.dim(`  ${'─'.repeat(60)}`));
        const stats = (0, diff_1.printDiff)(localContent, remoteContent);
        console.log(chalk_1.default.dim(`  ${'─'.repeat(60)}`));
        console.log();
        const parts = [];
        if (stats.added > 0)
            parts.push(chalk_1.default.green(`+${stats.added} 行新增`));
        if (stats.deleted > 0)
            parts.push(chalk_1.default.red(`-${stats.deleted} 行删除`));
        if (stats.modified > 0)
            parts.push(chalk_1.default.yellow(`~${stats.modified} 行修改`));
        if (parts.length === 0) {
            console.log(chalk_1.default.dim('  无变化'));
        }
        else {
            console.log(`  ${parts.join('  ')}`);
        }
        console.log();
        console.log(chalk_1.default.dim('💡 执行 skills update ' + name + ' 来更新'));
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        spinner.fail(`对比失败: ${message}`);
    }
}
//# sourceMappingURL=diff.js.map