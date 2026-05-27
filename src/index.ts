#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { searchCommand } from './commands/search';
import { installCommand } from './commands/install';
import { listCommand } from './commands/list';
import { doctorCommand } from './commands/doctor';
import { removeCommand } from './commands/remove';
import { infoCommand } from './commands/info';
import { envCommand } from './commands/env';
import { newCommand } from './commands/new';
import { reviewCommand } from './commands/review';
import { updateCommand } from './commands/update';
import { diffCommand } from './commands/diff';
import { serveCommand } from './commands/serve';

const program = new Command();

program
  .name('skills')
  .description('AI Agent Skills 包管理器 — 搜索/安装/管理 Reasonix & Claude Code Skills')
  .version('0.1.0');

program
  .command('search <keyword>')
  .description('搜索 GitHub 上的 Skills')
  .option('-s, --min-stars <number>', '最小 star 数（如 100）', '0')
  .option('-u, --updated-within <time>', '最近更新时间（如 30d, 2w, 3m, 1y）')
  .action(async (keyword: string, options?: { minStars?: string; updatedWithin?: string }) => {
    const minStars = parseInt(options?.minStars ?? '0', 10) || 0;
    await searchCommand(keyword, { minStars, updatedWithin: options?.updatedWithin });
  });

program
  .command('install <repo> [skill-name]')
  .description('从 GitHub 仓库安装 Skill')
  .option('-f, --force', '强制覆盖已存在的 Skill')
  .option('-g, --global', '安装到全局 (~/.reasonix/skills)', false)
  .action(async (repo: string, skillName?: string, options?: { force?: boolean; global?: boolean }) => {
    await installCommand(repo, skillName, {
      force: options?.force,
      scope: options?.global ? 'global' : 'project',
    });
  });

program
  .command('list')
  .alias('ls')
  .description('列出本地已安装的 Skills')
  .option('-a, --all', '扫描所有项目中的 Skills（全局 + 所有已知项目）')
  .action(async (options?: { all?: boolean }) => {
    await listCommand({ all: options?.all });
  });

program
  .command('new <name>')
  .description('创建新 Skill 脚手架')
  .option('-d, --desc <text>', 'Skill 描述')
  .option('-r, --run-as <mode>', '运行模式: inline | subagent')
  .option('-g, --global', '创建到全局 (~/.reasonix/skills)')
  .option('-m, --model <name>', '模型（如 deepseek-v4-flash）')
  .option('-t, --tools <list>', '工具白名单（逗号分隔）')
  .action(async (name: string, options?: { desc?: string; runAs?: string; global?: boolean; model?: string; tools?: string }) => {
    await newCommand(name, {
      desc: options?.desc,
      runAs: options?.runAs,
      scope: options?.global ? 'global' : 'project',
      model: options?.model,
      tools: options?.tools,
    });
  });

program
  .command('env')
  .description('环境诊断：检查 Node/Git/Token/Skills/Reasonix 状态')
  .action(async () => {
    await envCommand();
  });

program
  .command('info [name]')
  .description('查看 Skill 详细信息（frontmatter + body 预览）')
  .action(async (name?: string) => {
    await infoCommand(name ?? '');
  });

program
  .command('doctor [name]')
  .description('检查 Skills 格式和兼容性')
  .option('-d, --deep', '深度检查：质量评分 + 安全扫描 + 兼容矩阵 + 去重')
  .action(async (name?: string, options?: { deep?: boolean }) => {
    await doctorCommand(name, { deep: options?.deep });
  });

program
  .command('review <name>')
  .description('AI 评审 Skill 能力（规则分析 + 提示 AI 深度评审）')
  .action(async (name: string) => {
    await reviewCommand(name);
  });

program
  .command('diff <name>')
  .description('对比本地 Skill 与远程最新版本')
  .action(async (name: string) => {
    await diffCommand(name);
  });

program
  .command('update [name]')
  .description('更新 Skill（单文件先 diff 再确认，无参数批量更新）')
  .action(async (name?: string) => {
    await updateCommand(name);
  });

program
  .command('serve')
  .alias('ui')
  .description('启动图形化界面（浏览器打开）')
  .action(async () => {
    await serveCommand();
  });

program
  .command('remove <name>')
  .alias('rm')
  .description('移除已安装的 Skill')
  .action(async (name: string) => {
    await removeCommand(name);
  });

// 无参数时显示帮助
if (process.argv.length <= 2) {
  console.log(chalk.bold.cyan('\n🧩 Skills CLI — AI Agent Skills 包管理器\n'));
  console.log(chalk.dim('命令:'));
  console.log(`  ${chalk.cyan('search <keyword>')}    搜索 GitHub 上的 Skills`);
  console.log(`  ${chalk.cyan('install <repo> [name]')}  安装 Skill`);
  console.log(`  ${chalk.cyan('diff <name>')}           对比本地 vs 远程`);
  console.log(`  ${chalk.cyan('update [name]')}          更新 Skill（先 diff 再确认）`);
  console.log(`  ${chalk.cyan('new <name>')}            创建新 Skill 脚手架`);
  console.log(`  ${chalk.cyan('list')}                  列出本地已安装`);
  console.log(`  ${chalk.cyan('env')}                   环境诊断`);
  console.log(`  ${chalk.cyan('info [name]')}           查看 Skill 详细信息`);
  console.log(`  ${chalk.cyan('review <name>')}         AI 评审 Skill 能力`);
  console.log(`  ${chalk.cyan('doctor [name]')}         健康检查（--deep 深度）`);
  console.log(`  ${chalk.cyan('serve')}                 启动图形化界面 🆕`);
  console.log(`  ${chalk.cyan('remove <name>')}          移除 Skill`);
  console.log();
  console.log(chalk.dim('示例:'));
  console.log(`  skills search \"code review\"`);
  console.log(`  skills install addyosmani/agent-skills code-review-quality`);
  console.log(`  skills list`);
  console.log(`  skills info audit-security`);
  console.log(`  skills doctor`);
  console.log();
  process.exit(0);
}

program.parse();
