import chalk from 'chalk';
import { scanLocalSkills } from '../core/scanner';

export async function listCommand(): Promise<void> {
  const skills = scanLocalSkills();

  if (skills.length === 0) {
    console.log(chalk.dim('📭 本地没有安装任何 Skills'));
    console.log(chalk.dim('\n使用 skills search <keyword> 搜索可用的 Skills'));
    console.log(chalk.dim('使用 skills install <repo> [skill-name] 安装'));
    return;
  }

  console.log(chalk.bold(`\n本地 Skills (${skills.length}):\n`));

  for (const s of skills) {
    const runIcon = s.runAs === 'subagent' ? '🧬' : '📋';
    const model = s.model ? chalk.dim(` [${s.model}]`) : '';

    console.log(`  ${runIcon} ${chalk.cyan(s.name)}${model}`);
    console.log(`     ${chalk.dim(s.description || '（无描述）')}`);
    console.log(`     ${chalk.dim(s.filePath)}`);
    console.log();
  }

  // 统计：显式计算避免扩展性 bug
  const subagents = skills.filter(s => s.runAs === 'subagent').length;
  const inlines = skills.length - subagents;
  console.log(chalk.dim(`  ${skills.length} 个 Skills：${subagents} subagent · ${inlines} inline`));
}
