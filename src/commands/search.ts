import chalk from 'chalk';
import ora from 'ora';
import { searchSkillsWithMeta, SearchOptions } from '../core/github';
import { SearchResult } from '../types';

export async function searchCommand(
  keyword: string,
  options?: SearchOptions,
): Promise<void> {
  const filters: string[] = [];
  if (options?.minStars) filters.push(`≥${options.minStars}⭐`);
  if (options?.updatedWithin) filters.push(`最近${options.updatedWithin}`);

  const filterStr = filters.length > 0 ? ` (${filters.join(', ')})` : '';
  const spinner = ora(`搜索 "${keyword}"${filterStr}...`).start();

  try {
    const results = await searchSkillsWithMeta(keyword, options);

    if (results.length === 0) {
      spinner.warn(`未找到与 "${keyword}" 相关的 Skills`);
      console.log(chalk.dim('\n提示：放宽 --min-stars 或去掉 --updated-within 试试'));
      return;
    }

    spinner.succeed(`找到 ${results.length} 个相关 Skills\n`);

    // 表头
    console.log(
      chalk.dim(
        `  ${'Skill'.padEnd(26)} ${'⭐'.padStart(7)}  ${'更新'.padEnd(11)} Repo`,
      ),
    );
    console.log(chalk.dim(`  ${'─'.repeat(78)}`));

    for (const r of results) {
      printResult(r);
    }

    console.log();
    console.log(chalk.dim('💡 安装: skills install <owner/repo> [skill-name]'));
    console.log(chalk.dim('💡 精选: skills search "keyword" --min-stars 500 --updated-within 3m'));
    if (!process.env.GITHUB_TOKEN) {
      console.log(chalk.yellow('⚠️  未设置 GITHUB_TOKEN，API 限流较低。'));
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    spinner.fail(`搜索失败: ${message}`);
  }
}

function printResult(r: SearchResult): void {
  // stars
  const stars = r.repoStars >= 1000
    ? chalk.yellow(String(r.repoStars / 1000).slice(0, 4) + 'K').padStart(7)
    : String(r.repoStars).padStart(7);

  // 更新时间
  const updatedStr = formatTimeAgo(r.updatedAt);
  const freshnessColor = getFreshnessColor(r.updatedAt);
  const updated = freshnessColor(updatedStr.padEnd(11));

  // 名称
  const name = r.downloadUrl
    ? chalk.cyan(r.skillName.padEnd(26).slice(0, 26))
    : chalk.gray(r.skillName.padEnd(26).slice(0, 26));

  // repo
  const repo = chalk.dim(r.repo);

  console.log(`  ${name} ${stars}  ${updated} ${repo}`);

  // 描述
  const desc = r.skillDesc || r.repoDesc;
  if (desc) {
    const short = desc.length > 68 ? desc.slice(0, 68) + '...' : desc;
    console.log(chalk.dim(`  ${' '.repeat(2)}${short}`));
  }
}

function formatTimeAgo(iso: string): string {
  if (!iso) return '未知';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days < 1) return '今天';
  if (days < 7) return `${days}天前`;
  if (days < 30) return `${Math.floor(days / 7)}周前`;
  if (days < 365) return `${Math.floor(days / 30)}月前`;
  return `${Math.floor(days / 365)}年前`;
}

function getFreshnessColor(iso: string): (s: string) => string {
  if (!iso) return chalk.dim;
  const diff = Date.now() - new Date(iso).getTime();
  const days = diff / (1000 * 60 * 60 * 24);

  if (days < 7) return chalk.green;
  if (days < 30) return chalk.green;
  if (days < 90) return chalk.yellow;
  if (days < 365) return chalk.yellow;
  return chalk.red;
}
