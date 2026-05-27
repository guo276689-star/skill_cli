import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as readline from 'readline';
import { getSource, listUpdatable } from '../core/tracker';
import { findSkillByName } from '../core/scanner';
import { fetchSkillContent, parseFrontmatterRaw } from '../core/github';
import { installSkill, sanitizeSkillName } from '../core/installer';
import { printDiff } from '../core/diff';

export async function updateCommand(name?: string): Promise<void> {
  if (name) {
    await updateOneInteractive(name);
    return;
  }

  const updatable = listUpdatable();
  if (updatable.length === 0) {
    console.log(chalk.dim('📭 没有可更新的 Skill（只有通过 skills install 安装的才记录来源）'));
    return;
  }

  console.log(chalk.bold(`\n🔄 可更新: ${updatable.length} 个\n`));
  for (const u of updatable) {
    console.log(`  ${chalk.cyan(u.name)}  ←  ${chalk.dim(u.source.repo)}`);
  }
  console.log();

  // 批量模式：逐一显示 diff 并确认
  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const u of updatable) {
    console.log(chalk.bold(`── ${chalk.cyan(u.name)} ──`));
    const result = await updateOneInteractive(u.name);

    if (result === 'updated') ok++;
    else if (result === 'skipped') skip++;
    else fail++;
  }

  console.log();
  const parts: string[] = [];
  if (ok > 0) parts.push(chalk.green(`${ok} 已更新`));
  if (skip > 0) parts.push(chalk.yellow(`${skip} 跳过`));
  if (fail > 0) parts.push(chalk.red(`${fail} 失败`));
  console.log(parts.join('  '));
}

type UpdateResult = 'updated' | 'skipped' | 'failed';

async function updateOneInteractive(name: string): Promise<UpdateResult> {
  const skill = findSkillByName(name);
  if (!skill) {
    console.log(chalk.red(`未找到 Skill: ${name}`));
    return 'failed';
  }

  const source = getSource(name);
  if (!source) {
    console.log(chalk.yellow(`无安装来源记录`));
    return 'failed';
  }

  // 获取远程内容
  const remoteContent = await fetchRemote(source);
  if (!remoteContent) {
    console.log(chalk.red(`无法获取远程版本`));
    return 'failed';
  }

  // 读取本地内容
  let localContent: string;
  try {
    localContent = fs.readFileSync(skill.filePath, 'utf-8');
  } catch {
    console.log(chalk.red('无法读取本地文件'));
    return 'failed';
  }

  // 对比是否相同
  if (localContent === remoteContent) {
    console.log(chalk.dim('  已是最新版本\n'));
    return 'skipped';
  }

  // 显示 diff
  console.log();
  const stats = printDiff(localContent, remoteContent, 2);
  console.log();

  const parts: string[] = [];
  if (stats.added > 0) parts.push(chalk.green(`+${stats.added}`));
  if (stats.deleted > 0) parts.push(chalk.red(`-${stats.deleted}`));
  if (stats.modified > 0) parts.push(chalk.yellow(`~${stats.modified}`));
  console.log(`  变更: ${parts.join('  ')}`);

  // 交互式确认
  const answer = await askConfirm('\n  是否更新？(Y/n)');
  if (!answer) {
    console.log(chalk.dim('  已跳过\n'));
    return 'skipped';
  }

  // 执行更新
  const spinner = ora('  更新中...').start();
  try {
    const fm = parseFrontmatterRaw(remoteContent);
    const actualName = fm.name ?? name;
    const isGlobal = !skill.filePath.includes(process.cwd().replace(/\\/g, '/'));
    const result = installSkill(remoteContent, actualName, isGlobal ? 'global' : 'project', true);

    if (!result.success) {
      spinner.fail(result.error);
      return 'failed';
    }

    spinner.succeed(`${chalk.cyan(name)} 已更新`);
    if (fm.description) {
      console.log(chalk.dim(`     ${fm.description.slice(0, 60)}`));
    }
    console.log();
    return 'updated';
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    spinner.fail(`更新失败: ${message}`);
    return 'failed';
  }
}

async function fetchRemote(source: { repo: string; skillName: string }): Promise<string | null> {
  const safeName = sanitizeSkillName(source.skillName);
  const urls = [
    `https://raw.githubusercontent.com/${source.repo}/main/skills/${safeName}/SKILL.md`,
    `https://raw.githubusercontent.com/${source.repo}/main/${safeName}/SKILL.md`,
  ];

  for (const url of urls) {
    try {
      return await fetchSkillContent(url);
    } catch {
      continue;
    }
  }
  return null;
}

function askConfirm(question: string): Promise<boolean> {
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
