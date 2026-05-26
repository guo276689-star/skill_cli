import chalk from 'chalk';
import { findSkillByName, scanLocalSkills } from '../core/scanner';
import * as fs from 'fs';

export async function infoCommand(name: string): Promise<void> {
  if (!name) {
    // 无参数：列出所有 skills 让用户选
    const skills = scanLocalSkills();
    if (skills.length === 0) {
      console.log(chalk.dim('📭 本地没有安装任何 Skills'));
      return;
    }
    console.log(chalk.dim('使用 skills info <name> 查看详情:\n'));
    for (const s of skills) {
      console.log(`  ${chalk.cyan(s.name)}`);
    }
    return;
  }

  const skill = findSkillByName(name);

  if (!skill) {
    console.log(chalk.red(`未找到 Skill: ${name}`));
    console.log(chalk.dim('使用 skills list 查看已安装的 Skills'));
    return;
  }

  // 读取原始文件内容
  let rawContent = '';
  try {
    rawContent = fs.readFileSync(skill.filePath, 'utf-8');
  } catch {
    // ignore
  }

  // 解析 frontmatter
  const fmMatch = rawContent.match(/^---\n([\s\S]*?)\n---/);
  const bodyContent = fmMatch ? rawContent.slice(fmMatch[0].length).trim() : rawContent;

  console.log();
  console.log(chalk.bold.cyan(`  ${skill.name}`));
  console.log(chalk.dim(`  ${'─'.repeat(40)}`));

  // 基本信息
  console.log();
  console.log(`  ${chalk.dim('描述:')}  ${skill.description || '（无）'}`);
  console.log(`  ${chalk.dim('模式:')}  ${skill.runAs === 'subagent' ? '🧬 subagent' : '📋 inline'}`);

  if (skill.model) {
    console.log(`  ${chalk.dim('模型:')}  ${skill.model}`);
  }

  if (skill.maxIters) {
    console.log(`  ${chalk.dim('迭代上限:')}  ${skill.maxIters}`);
  }

  if (skill.allowedTools && skill.allowedTools.length > 0) {
    console.log(`  ${chalk.dim('工具白名单:')}  ${skill.allowedTools.join(', ')}`);
  }

  // 文件信息
  console.log();
  console.log(`  ${chalk.dim('文件:')}  ${skill.filePath}`);
  console.log(`  ${chalk.dim('大小:')}  ${(skill.size / 1024).toFixed(1)} KiB`);

  // Frontmatter 原文
  if (fmMatch) {
    console.log();
    console.log(chalk.dim('  ── frontmatter ──'));
    const fmLines = fmMatch[1].trim().split('\n');
    for (const line of fmLines) {
      console.log(chalk.dim(`  │ ${line}`));
    }
  }

  // Body 预览（前 5 行）
  if (bodyContent) {
    const bodyLines = bodyContent.split('\n').filter(l => l.trim());
    console.log();
    console.log(chalk.dim(`  ── body (${bodyLines.length} 行) ──`));
    const preview = bodyLines.slice(0, 8);
    for (const line of preview) {
      const trimmed = line.length > 60 ? line.slice(0, 60) + '...' : line;
      console.log(chalk.dim(`  │ ${trimmed}`));
    }
    if (bodyLines.length > 8) {
      const remaining = bodyContent.length - preview.join('\n').length;
      console.log(chalk.dim(`  │ ... 还有约 ${(remaining / 1024).toFixed(1)} KiB`));
    }
  }

  console.log();
}
