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
exports.updateCommand = updateCommand;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const fs = __importStar(require("fs"));
const readline = __importStar(require("readline"));
const tracker_1 = require("../core/tracker");
const scanner_1 = require("../core/scanner");
const github_1 = require("../core/github");
const installer_1 = require("../core/installer");
const diff_1 = require("../core/diff");
async function updateCommand(name) {
    if (name) {
        await updateOneInteractive(name);
        return;
    }
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
    // 批量模式：逐一显示 diff 并确认
    let ok = 0;
    let skip = 0;
    let fail = 0;
    for (const u of updatable) {
        console.log(chalk_1.default.bold(`── ${chalk_1.default.cyan(u.name)} ──`));
        const result = await updateOneInteractive(u.name);
        if (result === 'updated')
            ok++;
        else if (result === 'skipped')
            skip++;
        else
            fail++;
    }
    console.log();
    const parts = [];
    if (ok > 0)
        parts.push(chalk_1.default.green(`${ok} 已更新`));
    if (skip > 0)
        parts.push(chalk_1.default.yellow(`${skip} 跳过`));
    if (fail > 0)
        parts.push(chalk_1.default.red(`${fail} 失败`));
    console.log(parts.join('  '));
}
async function updateOneInteractive(name) {
    const skill = (0, scanner_1.findSkillByName)(name);
    if (!skill) {
        console.log(chalk_1.default.red(`未找到 Skill: ${name}`));
        return 'failed';
    }
    const source = (0, tracker_1.getSource)(name);
    if (!source) {
        console.log(chalk_1.default.yellow(`无安装来源记录`));
        return 'failed';
    }
    // 获取远程内容
    const remoteContent = await fetchRemote(source);
    if (!remoteContent) {
        console.log(chalk_1.default.red(`无法获取远程版本`));
        return 'failed';
    }
    // 读取本地内容
    let localContent;
    try {
        localContent = fs.readFileSync(skill.filePath, 'utf-8');
    }
    catch {
        console.log(chalk_1.default.red('无法读取本地文件'));
        return 'failed';
    }
    // 对比是否相同
    if (localContent === remoteContent) {
        console.log(chalk_1.default.dim('  已是最新版本\n'));
        return 'skipped';
    }
    // 显示 diff
    console.log();
    const stats = (0, diff_1.printDiff)(localContent, remoteContent, 2);
    console.log();
    const parts = [];
    if (stats.added > 0)
        parts.push(chalk_1.default.green(`+${stats.added}`));
    if (stats.deleted > 0)
        parts.push(chalk_1.default.red(`-${stats.deleted}`));
    if (stats.modified > 0)
        parts.push(chalk_1.default.yellow(`~${stats.modified}`));
    console.log(`  变更: ${parts.join('  ')}`);
    // 交互式确认
    const answer = await askConfirm('\n  是否更新？(Y/n)');
    if (!answer) {
        console.log(chalk_1.default.dim('  已跳过\n'));
        return 'skipped';
    }
    // 执行更新
    const spinner = (0, ora_1.default)('  更新中...').start();
    try {
        const fm = (0, github_1.parseFrontmatterRaw)(remoteContent);
        const actualName = fm.name ?? name;
        const isGlobal = !skill.filePath.includes(process.cwd().replace(/\\/g, '/'));
        const result = (0, installer_1.installSkill)(remoteContent, actualName, isGlobal ? 'global' : 'project', true);
        if (!result.success) {
            spinner.fail(result.error);
            return 'failed';
        }
        spinner.succeed(`${chalk_1.default.cyan(name)} 已更新`);
        if (fm.description) {
            console.log(chalk_1.default.dim(`     ${fm.description.slice(0, 60)}`));
        }
        console.log();
        return 'updated';
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        spinner.fail(`更新失败: ${message}`);
        return 'failed';
    }
}
async function fetchRemote(source) {
    const safeName = (0, installer_1.sanitizeSkillName)(source.skillName);
    const urls = [
        `https://raw.githubusercontent.com/${source.repo}/main/skills/${safeName}/SKILL.md`,
        `https://raw.githubusercontent.com/${source.repo}/main/${safeName}/SKILL.md`,
    ];
    for (const url of urls) {
        try {
            return await (0, github_1.fetchSkillContent)(url);
        }
        catch {
            continue;
        }
    }
    return null;
}
function askConfirm(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            const trimmed = answer.trim().toLowerCase();
            resolve(trimmed === '' || trimmed === 'y' || trimmed === 'yes');
        });
    });
}
//# sourceMappingURL=update.js.map