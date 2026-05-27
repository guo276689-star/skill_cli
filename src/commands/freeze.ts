import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { scanLocalSkills } from '../core/scanner';
import { getSource } from '../core/tracker';

interface FreezeEntry {
  name: string;
  description: string;
  runAs?: string;
  repo?: string;
  skillName?: string;
  installedAt?: string;
  filePath: string;
}

export async function freezeCommand(output?: string): Promise<void> {
  const all = true; // freeze 总是导出全部
  const skills = scanLocalSkills(all);

  if (skills.length === 0) {
    console.log(chalk.dim('📭 没有 Skills 可导出'));
    return;
  }

  const entries: FreezeEntry[] = skills.map(s => {
    const source = getSource(s.name);
    return {
      name: s.name,
      description: s.description,
      runAs: s.runAs,
      repo: source?.repo,
      skillName: source?.skillName,
      installedAt: source?.installedAt,
      filePath: s.filePath,
    };
  });

  const json = JSON.stringify(entries, null, 2);

  if (output) {
    const filePath = path.resolve(output);
    fs.writeFileSync(filePath, json, 'utf-8');
    console.log(chalk.green(`✅ 已导出 ${skills.length} 个 Skills`));
    console.log(`  📄 ${chalk.dim(filePath)}`);
    console.log();
    console.log(chalk.dim('💡 导入: skills install --from ' + output));
  } else {
    // 输出到 stdout
    console.log(json);
  }

  // 同时生成可执行的安装命令
  const installCommands = entries
    .filter(e => e.repo)
    .map(e => `skills install ${e.repo} ${e.skillName || e.name}`);

  if (installCommands.length > 0 && output) {
    console.log();
    console.log(chalk.dim('💡 等效安装命令:'));
    for (const cmd of installCommands) {
      console.log(chalk.dim(`  ${cmd}`));
    }
  }
}
