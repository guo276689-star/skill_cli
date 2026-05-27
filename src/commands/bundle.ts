import chalk from 'chalk';
import ora from 'ora';
import { fetchSkillContent, parseFrontmatterRaw } from '../core/github';
import { installSkill, sanitizeSkillName } from '../core/installer';
import { trackInstall } from '../core/tracker';

interface BundleSkill {
  name: string;
  repo: string;
  skill: string;
}

interface Bundle {
  name: string;
  desc: string;
  skills: BundleSkill[];
}

/** 预置套装 */
const BUNDLES: Record<string, Bundle> = {
  security: {
    name: '安全审计套装',
    desc: '安全审查 + 性能审查 + 代码风格审查',
    skills: [],
  },
  dev: {
    name: '开发工作流',
    desc: 'TDD + 代码审查 + Git 工作流',
    skills: [
      { name: 'TDD', repo: 'addyosmani/agent-skills', skill: 'test-driven-development' },
      { name: '代码审查', repo: 'addyosmani/agent-skills', skill: 'code-review-and-quality' },
      { name: 'Git 工作流', repo: 'addyosmani/agent-skills', skill: 'git-workflow-and-versioning' },
    ],
  },
  engineering: {
    name: '工程化套装',
    desc: 'Spec 驱动 + 规划 + 增量实现 + CI/CD + 发布',
    skills: [
      { name: 'Spec', repo: 'addyosmani/agent-skills', skill: 'spec-driven-development' },
      { name: '规划', repo: 'addyosmani/agent-skills', skill: 'planning-and-task-breakdown' },
      { name: '增量实现', repo: 'addyosmani/agent-skills', skill: 'incremental-implementation' },
      { name: 'CI/CD', repo: 'addyosmani/agent-skills', skill: 'ci-cd-and-automation' },
      { name: '发布', repo: 'addyosmani/agent-skills', skill: 'shipping-and-launch' },
    ],
  },
  research: {
    name: '科研套装',
    desc: '论文检索 + 文献综述 + 科学写作',
    skills: [
      { name: '论文检索', repo: 'Imbad0202/academic-research-skills', skill: 'paper-lookup' },
      { name: '文献综述', repo: 'Imbad0202/academic-research-skills', skill: 'literature-review' },
      { name: '科学写作', repo: 'Imbad0202/academic-research-skills', skill: 'scientific-writing' },
    ],
  },
};

export async function bundleCommand(action?: string, name?: string): Promise<void> {
  if (!action || action === 'list') {
    console.log(chalk.bold('\n📦 可用套装\n'));
    for (const [key, b] of Object.entries(BUNDLES)) {
      console.log(`  ${chalk.cyan(key.padEnd(14))} ${b.desc}`);
      console.log(chalk.dim(`    ${b.skills.length} 个 Skills: ${b.skills.map(s => s.name).join(', ')}`));
    }
    console.log();
    console.log(chalk.dim('💡 安装: skills bundle install <套装名>'));
    console.log(chalk.dim('💡 如: skills bundle install dev'));
    return;
  }

  if (action === 'install') {
    if (!name) {
      console.log(chalk.red('请指定套装名'));
      console.log(chalk.dim('可用: ' + Object.keys(BUNDLES).join(', ')));
      return;
    }

    const bundle = BUNDLES[name];
    if (!bundle) {
      console.log(chalk.red(`未知套装: ${name}`));
      console.log(chalk.dim('可用: ' + Object.keys(BUNDLES).join(', ')));
      return;
    }

    if (bundle.skills.length === 0) {
      console.log(chalk.yellow(`${bundle.name} 暂无远程 Skill，请手动创建`));
      return;
    }

    console.log(chalk.bold(`\n📦 安装 ${bundle.name}\n`));

    let ok = 0, fail = 0;
    for (const s of bundle.skills) {
      const spinner = ora(`  ${s.name}`).start();
      try {
        const safe = sanitizeSkillName(s.skill);
        const urls = [
          `https://raw.githubusercontent.com/${s.repo}/main/skills/${safe}/SKILL.md`,
          `https://raw.githubusercontent.com/${s.repo}/main/${safe}/SKILL.md`,
        ];
        let content: string | null = null;
        for (const url of urls) {
          try { content = await fetchSkillContent(url); break; } catch { continue; }
        }
        if (!content) throw new Error('下载失败');

        const fm = parseFrontmatterRaw(content);
        const result = installSkill(content, fm.name || s.name, 'project', true);
        if (result.success) {
          trackInstall('project', fm.name || s.name, s.repo, s.skill);
          spinner.succeed(s.name);
          ok++;
        } else {
          spinner.fail(`${s.name}: ${result.error}`);
          fail++;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        spinner.fail(`${s.name}: ${message}`);
        fail++;
      }
    }

    console.log();
    console.log(chalk.green(`${ok} 成功`) + (fail > 0 ? chalk.red(`  ${fail} 失败`) : ''));
    return;
  }

  console.log(chalk.red(`未知操作: ${action}`));
  console.log(chalk.dim('用法: skills bundle [list|install <name>]'));
}
