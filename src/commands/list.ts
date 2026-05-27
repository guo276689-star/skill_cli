import chalk from 'chalk';
import { scanLocalSkills } from '../core/scanner';
import { getSkillsDirs } from '../core/installer';

export async function listCommand(options?: { all?: boolean }): Promise<void> {
  const all = options?.all ?? false;
  const skills = scanLocalSkills(all);

  if (skills.length === 0) {
    const dirs = getSkillsDirs(all);
    console.log(chalk.dim('📭 本地没有安装任何 Skills'));
    console.log(chalk.dim(`  扫描目录: ${dirs.join(', ')}`));
    console.log(chalk.dim('\n使用 skills search <keyword> 搜索可用的 Skills'));
    console.log(chalk.dim('使用 skills install <repo> [skill-name] 安装'));
    return;
  }

  if (all) {
    console.log(chalk.bold(`\n全部 Skills (${skills.length}):\n`));
  } else {
    console.log(chalk.bold(`\n本地 Skills (${skills.length}):\n`));
  }

  for (const s of skills) {
    const runIcon = s.runAs === 'subagent' ? '🧬' : '📋';
    const model = s.model ? chalk.dim(` [${s.model}]`) : '';

    console.log(`  ${runIcon} ${chalk.cyan(s.name)}${model}`);
    console.log(`     ${chalk.dim(s.description || '（无描述）')}`);
    console.log(`     ${chalk.dim(s.filePath)}`);
    console.log();
  }

  const subagents = skills.filter(s => s.runAs === 'subagent').length;
  const inlines = skills.length - subagents;
  console.log(chalk.dim(`  ${skills.length} 个 Skills：${subagents} subagent · ${inlines} inline`));

  if (!all) {
    console.log(chalk.dim('\n💡 skills list --all  查看所有项目中的 Skills'));
  }
}
