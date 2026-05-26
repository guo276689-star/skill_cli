#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const search_1 = require("./commands/search");
const install_1 = require("./commands/install");
const list_1 = require("./commands/list");
const doctor_1 = require("./commands/doctor");
const remove_1 = require("./commands/remove");
const info_1 = require("./commands/info");
const program = new commander_1.Command();
program
    .name('skills')
    .description('AI Agent Skills 包管理器 — 搜索/安装/管理 Reasonix & Claude Code Skills')
    .version('0.1.0');
program
    .command('search <keyword>')
    .description('搜索 GitHub 上的 Skills')
    .option('-s, --min-stars <number>', '最小 star 数（如 100）', '0')
    .action(async (keyword, options) => {
    const minStars = parseInt(options?.minStars ?? '0', 10) || 0;
    await (0, search_1.searchCommand)(keyword, { minStars });
});
program
    .command('install <repo> [skill-name]')
    .description('从 GitHub 仓库安装 Skill')
    .option('-f, --force', '强制覆盖已存在的 Skill')
    .option('-g, --global', '安装到全局 (~/.reasonix/skills)', false)
    .action(async (repo, skillName, options) => {
    await (0, install_1.installCommand)(repo, skillName, {
        force: options?.force,
        scope: options?.global ? 'global' : 'project',
    });
});
program
    .command('list')
    .alias('ls')
    .description('列出本地已安装的 Skills')
    .action(async () => {
    await (0, list_1.listCommand)();
});
program
    .command('info [name]')
    .description('查看 Skill 详细信息（frontmatter + body 预览）')
    .action(async (name) => {
    await (0, info_1.infoCommand)(name ?? '');
});
program
    .command('doctor [name]')
    .description('检查 Skills 格式和兼容性')
    .action(async (name) => {
    await (0, doctor_1.doctorCommand)(name);
});
program
    .command('remove <name>')
    .alias('rm')
    .description('移除已安装的 Skill')
    .action(async (name) => {
    await (0, remove_1.removeCommand)(name);
});
// 无参数时显示帮助
if (process.argv.length <= 2) {
    console.log(chalk_1.default.bold.cyan('\n🧩 Skills CLI — AI Agent Skills 包管理器\n'));
    console.log(chalk_1.default.dim('命令:'));
    console.log(`  ${chalk_1.default.cyan('search <keyword>')}    搜索 GitHub 上的 Skills`);
    console.log(`  ${chalk_1.default.cyan('install <repo> [name]')}  安装 Skill`);
    console.log(`  ${chalk_1.default.cyan('list')}                  列出本地已安装`);
    console.log(`  ${chalk_1.default.cyan('info [name]')}           查看 Skill 详细信息`);
    console.log(`  ${chalk_1.default.cyan('doctor [name]')}         健康检查`);
    console.log(`  ${chalk_1.default.cyan('remove <name>')}          移除 Skill`);
    console.log();
    console.log(chalk_1.default.dim('示例:'));
    console.log(`  skills search \"code review\"`);
    console.log(`  skills install addyosmani/agent-skills code-review-quality`);
    console.log(`  skills list`);
    console.log(`  skills info audit-security`);
    console.log(`  skills doctor`);
    console.log();
    process.exit(0);
}
program.parse();
//# sourceMappingURL=index.js.map