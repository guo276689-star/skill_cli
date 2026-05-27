import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getSkillsDirs } from '../core/installer';
import { validateFile } from '../core/validator';

const SKILL_TEMPLATE = `## 任务

描述这个 Skill 要完成什么任务。

## 执行步骤

1. **第一步**：做什么
2. **第二步**：做什么
3. **第三步**：做什么

## 输出格式

描述期望的输出格式。

## 约束

- 不要做 X
- 必须做 Y
`;

export async function newCommand(
  name: string,
  options?: {
    desc?: string;
    runAs?: string;
    scope?: string;
    model?: string;
    tools?: string;
  },
): Promise<void> {
  if (!name) {
    console.log(chalk.red('请指定 Skill 名称'));
    console.log(chalk.dim('用法: skills new <name> --desc "描述" --run-as subagent'));
    return;
  }

  // 校验名称
  if (!/^[a-zA-Z0-9_\-.]{1,64}$/.test(name)) {
    console.log(chalk.red(`非法名称: "${name}"（只允许字母/数字/_/-/.，1-64字符）`));
    return;
  }

  const scope = options?.scope === 'global' ? 'global' : 'project';
  const dirs = getSkillsDirs();
  const targetDir = scope === 'global' ? dirs.find(d => d.includes('.reasonix')) ?? dirs[0] : (dirs[1] || dirs[0]);

  if (!targetDir) {
    console.log(chalk.red('未找到 Skills 目录'));
    return;
  }

  // 确保目录存在
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const filePath = path.join(targetDir, `${name}.md`);

  // 检查是否已存在
  if (fs.existsSync(filePath)) {
    console.log(chalk.yellow(`Skill 已存在: ${filePath}`));
    console.log(chalk.dim('使用 --force 覆盖，或换一个名字'));
    return;
  }

  // 生成 frontmatter
  const frontmatter = buildFrontmatter(name, options);

  // 生成完整内容
  const content = frontmatter + '\n' + SKILL_TEMPLATE;

  fs.writeFileSync(filePath, content, 'utf-8');

  console.log(chalk.green(`✅ 已创建 ${chalk.cyan(name)}`));
  console.log(`  📄 ${chalk.dim(filePath)}`);

  if (options?.desc) {
    console.log(`  📝 ${options.desc}`);
  }
  if (options?.runAs) {
    console.log(`  ⚙️  模式: ${options.runAs}`);
  }
  if (options?.tools) {
    console.log(`  🔧 工具: ${options.tools}`);
  }

  // 创建后自动校验
  const check = validateFile(filePath);
  if (check.issues.length > 0) {
    console.log(chalk.yellow(`\n  ⚠️  校验:`));
    for (const issue of check.issues) {
      console.log(`  ${issue.severity === 'error' ? '❌' : '⚠️'} ${issue.message}`);
    }
  }

  console.log();
  console.log(chalk.dim('💡 编辑 body 后使用 skills doctor --deep 检查质量'));
  console.log(chalk.dim('💡 编辑 body 后推送到你的 skill 仓库分享'));
}

function buildFrontmatter(name: string, options?: { desc?: string; runAs?: string; model?: string; tools?: string }): string {
  const lines: string[] = ['---'];

  lines.push(`name: ${name}`);

  if (options?.desc) {
    lines.push(`description: ${options.desc}`);
  } else {
    lines.push(`description: TODO：一句话描述这个 Skill`);
  }

  if (options?.runAs && ['inline', 'subagent'].includes(options.runAs)) {
    lines.push(`runAs: ${options.runAs}`);
  }

  if (options?.model) {
    lines.push(`model: ${options.model}`);
  }

  if (options?.tools) {
    const tools = options.tools.split(/[,;\s]+/).filter(Boolean);
    lines.push(`allowed-tools: ${tools.join(', ')}`);
  }

  lines.push('---');
  return lines.join('\n');
}
