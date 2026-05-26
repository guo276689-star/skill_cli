import chalk from 'chalk';
import ora from 'ora';
import { searchSkillsWithMeta } from '../core/github';
import { SearchResult } from '../types';

export async function searchCommand(keyword: string): Promise<void> {
  const spinner = ora(`搜索 "${keyword}"...`).start();

  try {
    const results = await searchSkillsWithMeta(keyword);

    if (results.length === 0) {
      spinner.warn(`未找到与 "${keyword}" 相关的 Skills`);
      console.log(chalk.dim('\n提示：尝试更通用的关键词，或访问 openagentskill.com 浏览更多'));
      return;
    }

    spinner.succeed(`找到 ${results.length} 个相关 Skills\n`);

    for (const r of results) {
      printResult(r);
    }

    console.log(chalk.dim('\n💡 安装: skills install <repo> [skill-name]'));
    if (!process.env.GITHUB_TOKEN) {
      console.log(chalk.yellow('⚠️  未设置 GITHUB_TOKEN，API 限流较低。设置后可获得更多搜索次数。'));
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    spinner.fail(`搜索失败: ${message}`);
  }
}

function printResult(r: SearchResult): void {
  const stars = r.repoStars > 1000
    ? chalk.yellow(`${(r.repoStars / 1000).toFixed(1)}K ⭐`)
    : `${r.repoStars} ⭐`;

  console.log(`  ${chalk.cyan.bold(r.skillName)}`);
  console.log(`  ${chalk.dim(r.skillDesc || '（无描述）')}`);
  console.log(`  📦 ${r.repo}  ${stars}`);
  console.log(`  📄 ${chalk.dim(r.skillPath)}`);
  console.log();
}
