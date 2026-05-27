import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import { getSource } from '../core/tracker';
import { findSkillByName } from '../core/scanner';
import { fetchSkillContent, parseFrontmatterRaw } from '../core/github';
import { printDiff } from '../core/diff';

export async function diffCommand(name: string): Promise<void> {
  if (!name) {
    console.log(chalk.red('请指定 Skill 名称'));
    console.log(chalk.dim('用法: skills diff <name>'));
    return;
  }

  const skill = findSkillByName(name);
  if (!skill) {
    console.log(chalk.red(`未找到 Skill: ${name}`));
    return;
  }

  const source = getSource(name);
  if (!source) {
    console.log(chalk.yellow(`${name}: 无安装来源记录，无法对比远程版本`));
    console.log(chalk.dim('只有通过 skills install 安装的 Skill 才记录来源'));
    return;
  }

  const spinner = ora(`获取 ${name} 远程版本...`).start();

  try {
    // 获取远程内容
    const urls = [
      `https://raw.githubusercontent.com/${source.repo}/main/skills/${source.skillName}/SKILL.md`,
      `https://raw.githubusercontent.com/${source.repo}/main/${source.skillName}/SKILL.md`,
    ];

    let remoteContent: string | null = null;
    for (const url of urls) {
      try {
        remoteContent = await fetchSkillContent(url);
        break;
      } catch {
        continue;
      }
    }

    if (!remoteContent) {
      spinner.fail(`无法获取远程版本`);
      return;
    }

    // 读取本地内容
    const localContent = fs.readFileSync(skill.filePath, 'utf-8');

    spinner.succeed(`${chalk.cyan(name)} 本地 vs 远程\n`);

    // 显示基本信息
    const localFm = parseFrontmatterRaw(localContent);
    const remoteFm = parseFrontmatterRaw(remoteContent);

    console.log(chalk.bold('📋 版本信息'));
    console.log(`  本地: ${chalk.dim(localFm.description?.slice(0, 50) || '—')}`);
    console.log(`  远程: ${chalk.cyan(remoteFm.description?.slice(0, 50) || '—')}`);
    console.log(`  来源: ${chalk.dim(source.repo)}`);
    console.log();

    // 显示 diff
    console.log(chalk.bold('📄 变更内容'));
    console.log(chalk.dim(`  ${'─'.repeat(60)}`));
    const stats = printDiff(localContent, remoteContent);
    console.log(chalk.dim(`  ${'─'.repeat(60)}`));

    console.log();
    const parts: string[] = [];
    if (stats.added > 0) parts.push(chalk.green(`+${stats.added} 行新增`));
    if (stats.deleted > 0) parts.push(chalk.red(`-${stats.deleted} 行删除`));
    if (stats.modified > 0) parts.push(chalk.yellow(`~${stats.modified} 行修改`));
    if (parts.length === 0) {
      console.log(chalk.dim('  无变化'));
    } else {
      console.log(`  ${parts.join('  ')}`);
    }

    console.log();
    console.log(chalk.dim('💡 执行 skills update ' + name + ' 来更新'));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    spinner.fail(`对比失败: ${message}`);
  }
}
