#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { searchCommand } from './commands/search';
import { installCommand } from './commands/install';
import { listCommand } from './commands/list';
import { doctorCommand } from './commands/doctor';
import { removeCommand } from './commands/remove';
import { infoCommand } from './commands/info';

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
  .action(async () => {
    await listCommand();
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
  .action(async (name?: string) => {
    await doctorCommand(name);
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
  console.log(`  ${chalk.cyan('list')}                  列出本地已安装`);
  console.log(`  ${chalk.cyan('info [name]')}           查看 Skill 详细信息`);
  console.log(`  ${chalk.cyan('doctor [name]')}         健康检查`);
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
