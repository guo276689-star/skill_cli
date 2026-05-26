import chalk from 'chalk';
import ora from 'ora';
import { searchSkillsWithMeta, SearchOptions } from '../core/github';
import { SearchResult } from '../types';

export async function searchCommand(
  keyword: string,
  options?: SearchOptions & { json?: boolean },
): Promise<void> {
  const spinner = ora(`搜索 "${keyword}"${options?.minStars ? ` (≥${options.minStars} ⭐)` : ''}...`).start();

  try {
    const results = await searchSkillsWithMeta(keyword, options);

    if (results.length === 0) {
      spinner.warn(`未找到与 "${keyword}" 相关的 Skills`);
      console.log(chalk.dim('\n提示：尝试去掉 --min-stars 或换一个更通用的关键词'));
      return;
    }

    spinner.succeed(`找到 ${results.length} 个相关 Skills\n`);

    // 表头
    console.log(
      chalk.dim(
        `  ${'Skill'.padEnd(28)} ${'Repo'.padEnd(32)} ⭐`,
      ),
    );
    console.log(chalk.dim(`  ${'─'.repeat(72)}`));

    for (const r of results) {
      printResult(r);
    }

    console.log();
    console.log(chalk.dim('💡 安装: skills install <owner/repo> [skill-name]'));
    console.log(chalk.dim('💡 过滤: skills search "keyword" --min-stars 100'));
    if (!process.env.GITHUB_TOKEN) {
      console.log(chalk.yellow('⚠️  未设置 GITHUB_TOKEN，API 限流较低。'));
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    spinner.fail(`搜索失败: ${message}`);
  }
}

function printResult(r: SearchResult): void {
  const stars = r.repoStars >= 1000
    ? chalk.yellow(`${(r.repoStars / 1000).toFixed(1)}K`)
    : String(r.repoStars);

  const name = r.downloadUrl ? chalk.cyan.bold(r.skillName.padEnd(28).slice(0, 28)) : chalk.gray(r.skillName.padEnd(28).slice(0, 28));
  const repo = chalk.dim(r.repo.padEnd(32).slice(0, 32));

  console.log(`  ${name} ${repo} ${stars}`);

  const desc = r.skillDesc || r.repoDesc;
  if (desc) {
    const short = desc.length > 64 ? desc.slice(0, 64) + '...' : desc;
    console.log(chalk.dim(`  ${' '.repeat(2)}${short}`));
  }
}
