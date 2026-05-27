import chalk from 'chalk';
import ora from 'ora';
import { getSource, listUpdatable } from '../core/tracker';
import { findSkillByName } from '../core/scanner';
import { fetchSkillContent, parseFrontmatterRaw } from '../core/github';
import { installSkill, sanitizeSkillName } from '../core/installer';
import { validateFile } from '../core/validator';

export async function updateCommand(name?: string): Promise<void> {
  if (name) {
    await updateOne(name);
    return;
  }

  // 无参数：列出可更新的 Skill 并全部更新
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

  // 逐一更新
  let ok = 0;
  let fail = 0;
  for (const u of updatable) {
    const result = await updateOne(u.name, true);
    if (result) ok++; else fail++;
  }

  console.log();
  console.log(chalk.green(`${ok} 已更新`) + (fail > 0 ? chalk.red(`  ${fail} 失败`) : ''));
}

async function updateOne(name: string, silent = false): Promise<boolean> {
  // 检查本地是否存在
  const skill = findSkillByName(name);
  if (!skill) {
    if (!silent) console.log(chalk.red(`未找到 Skill: ${name}`));
    return false;
  }

  // 获取来源
  const source = getSource(name);
  if (!source) {
    if (!silent) {
      console.log(chalk.yellow(`${name}: 无安装来源记录，无法更新`));
      console.log(chalk.dim('  只有通过 skills install 安装的 Skill 才记录来源'));
    }
    return false;
  }

  const spinner = ora(`更新 ${name}...`).start();

  try {
    // 构建 URL
    const safeName = sanitizeSkillName(source.skillName);
    const urls = [
      `https://raw.githubusercontent.com/${source.repo}/main/skills/${safeName}/SKILL.md`,
      `https://raw.githubusercontent.com/${source.repo}/main/${safeName}/SKILL.md`,
    ];

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
      throw new Error(`无法从 ${source.repo} 下载最新版本`);
    }

    // 提取 actual name
    const fm = parseFrontmatterRaw(content);
    const actualName = fm.name ?? name;

    // 覆盖安装（force=true）
    const scope = skill.filePath.includes('AppData') || skill.filePath.includes('.reasonix')
      ? (skill.filePath.includes(process.cwd()) ? 'project' : 'global')
      : 'project';

    // 简单的 scope 判断
    const isGlobal = !skill.filePath.includes(process.cwd().replace(/\\/g, '/'));
    const result = installSkill(content, actualName, isGlobal ? 'global' : 'project', true);

    if (!result.success) {
      spinner.fail(result.error);
      return false;
    }

    spinner.succeed(`${chalk.cyan(name)} 已更新`);
    if (fm.description && fm.description !== skill.description) {
      console.log(`  📝 ${chalk.dim(fm.description.slice(0, 60))}`);
    }
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    spinner.fail(`更新失败: ${message}`);
    return false;
  }
}
