import chalk from 'chalk';
import ora from 'ora';
import { fetchSkillContent, parseFrontmatterRaw } from '../core/github';
import { installSkill, validateRepoFormat, sanitizeSkillName } from '../core/installer';
import { validateFile } from '../core/validator';

/** 构建 GitHub raw 下载 URL */
function buildSkillDownloadUrl(repoClean: string, skillName?: string): string[] {
  const urls: string[] = [];
  if (skillName) {
    const safe = sanitizeSkillName(skillName);
    urls.push(`https://raw.githubusercontent.com/${repoClean}/main/skills/${safe}/SKILL.md`);
    urls.push(`https://raw.githubusercontent.com/${repoClean}/main/${safe}/SKILL.md`);
  }
  urls.push(`https://raw.githubusercontent.com/${repoClean}/main/SKILL.md`);
  return urls;
}

export async function installCommand(
  repo: string,
  skillName?: string,
  options?: { force?: boolean; scope?: 'global' | 'project' }
): Promise<void> {
  const scope = options?.scope ?? 'project';

  // 清理并校验 repo 格式
  const repoClean = repo.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
  if (!validateRepoFormat(repoClean)) {
    console.log(chalk.red(`无效的仓库格式: "${repo}"`));
    console.log(chalk.dim('格式应为 owner/repo，如 addyosmani/agent-skills'));
    return;
  }

  const displayName = skillName ?? repoClean.split('/').pop() ?? 'skill';

  const spinner = ora(`安装 ${displayName}...`).start();

  try {
    // 逐一尝试 URL 候选
    const urls = buildSkillDownloadUrl(repoClean, skillName);
    let content: string | null = null;
    for (const url of urls) {
      try {
        content = await fetchSkillContent(url);
        break;
      } catch {
        continue;
      }
    }

    if (!content) {
      throw new Error(`无法从 ${repoClean} 下载 SKILL.md，请指定 skill-name`);
    }

    // 提取实际 skill 名称
    const fm = parseFrontmatterRaw(content);
    const actualName = fm.name ?? displayName;

    // 写入磁盘（内存中已有 content，传 force 合并了 forceInstallSkill）
    const result = installSkill(content, actualName, scope, options?.force);

    if (!result.success) {
      spinner.fail(result.error);
      if (!options?.force) console.log(chalk.dim('使用 --force 强制覆盖安装'));
      return;
    }

    spinner.succeed(`已安装 ${chalk.cyan(actualName)}`);
    console.log(`  📄 ${chalk.dim(result.filePath)}`);

    if (fm.description) {
      console.log(`  📝 ${fm.description}`);
    }
    if (fm.runAs) {
      console.log(`  ⚙️  运行模式: ${fm.runAs}`);
    }

    // 安装后自动校验（复用内存中的 content，避免重复读盘）
    const check = validateFile(result.filePath, content);
    if (check.issues.length > 0) {
      console.log(chalk.yellow(`\n  ⚠️  校验发现问题:`));
      for (const issue of check.issues) {
        const icon = issue.severity === 'error' ? '❌' : '⚠️';
        console.log(`  ${icon}  ${issue.message}`);
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    spinner.fail(`安装失败: ${message}`);
  }
}
