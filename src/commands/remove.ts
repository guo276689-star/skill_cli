import * as fs from 'fs';
import chalk from 'chalk';
import { findSkillByName } from '../core/scanner';

export async function removeCommand(name: string): Promise<void> {
  const skill = findSkillByName(name);

  if (!skill) {
    console.log(chalk.red(`未找到 Skill: ${name}`));
    console.log(chalk.dim('使用 skills list 查看已安装的 Skills'));
    return;
  }

  try {
    fs.unlinkSync(skill.filePath);
    console.log(chalk.green(`已移除 ${chalk.cyan(skill.name)}`));
    console.log(`  📄 ${chalk.dim(skill.filePath)}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(chalk.red(`移除失败: ${message}`));
  }
}
