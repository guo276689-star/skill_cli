import chalk from 'chalk';
import { DoctorResult } from '../types';
import { doctorCheck, validateFile } from '../core/validator';
import { findSkillByName } from '../core/scanner';

export async function doctorCommand(name?: string): Promise<void> {
  // 如果指定了名称，只检查单个
  if (name) {
    const skill = findSkillByName(name);
    if (!skill) {
      console.log(chalk.red(`未找到 Skill: ${name}`));
      return;
    }
    const result = validateFile(skill.filePath);
    printDoctorResult(result);
    return;
  }

  console.log(chalk.bold('🔍 Skills 健康检查\n'));

  const result = doctorCheck();

  if (result.total === 0) {
    console.log(chalk.dim('📭 没有找到任何 Skills'));
    return;
  }

  printDoctorResult(result);
}

function printDoctorResult(result: DoctorResult): void {
  for (const issue of result.issues) {
    const icon = issue.severity === 'error' ? chalk.red('❌') : chalk.yellow('⚠️');
    const label = issue.severity === 'error' ? chalk.red('error') : chalk.yellow('warn');
    console.log(`  ${icon} ${label}  ${issue.message}`);
    console.log(`     ${chalk.dim(issue.filePath)}`);
  }

  console.log();
  if (result.ok === result.total && result.total > 0) {
    console.log(chalk.green(`✅ ${result.total}/${result.total} Skills 通过检查`));
  } else {
    // 一次 reduce 统计 error/warning 计数
    const counts = result.issues.reduce(
      (acc, i) => {
        i.severity === 'error' ? acc.err++ : acc.warn++;
        return acc;
      },
      { err: 0, warn: 0 },
    );
    console.log(
      chalk.yellow(`📊 ${result.ok}/${result.total} 通过  `) +
      (counts.err > 0 ? chalk.red(`${counts.err} 错误  `) : '') +
      (counts.warn > 0 ? chalk.yellow(`${counts.warn} 警告`) : '')
    );
  }
}
