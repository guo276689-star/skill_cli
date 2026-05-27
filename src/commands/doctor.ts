import chalk from 'chalk';
import { DoctorResult } from '../types';
import {
  doctorCheck,
  doctorProCheck,
  validateFile,
  computeScore,
  scanSecurity,
  checkCompatibility,
} from '../core/validator';
import { findSkillByName } from '../core/scanner';

export async function doctorCommand(name?: string, options?: { deep?: boolean }): Promise<void> {
  if (name) {
    const skill = findSkillByName(name);
    if (!skill) {
      console.log(chalk.red(`未找到 Skill: ${name}`));
      return;
    }
    const result = validateFile(skill.filePath);
    printDoctorResult(result);

    if (options?.deep) {
      printDeepInfo(skill.filePath);
    }
    return;
  }

  console.log(chalk.bold('🔍 Skills 健康检查\n'));

  if (options?.deep) {
    await deepDoctor();
    return;
  }

  const result = doctorCheck();
  if (result.total === 0) {
    console.log(chalk.dim('📭 没有找到任何 Skills'));
    return;
  }
  printDoctorResult(result);
}

async function deepDoctor(): Promise<void> {
  const pro = doctorProCheck();

  if (pro.total === 0) {
    console.log(chalk.dim('📭 没有找到任何 Skills'));
    return;
  }

  // 1. 质量评分表格
  console.log(chalk.bold('📊 质量评分\n'));
  console.log(chalk.dim(`  ${'Skill'.padEnd(24)} ${'评分'.padStart(6)}  等级`));
  console.log(chalk.dim(`  ${'─'.repeat(42)}`));

  for (const s of pro.scores) {
    const gradeColor = s.grade === 'A' ? chalk.green : s.grade === 'B' ? chalk.cyan : s.grade === 'C' ? chalk.yellow : chalk.red;
    const bar = scoreBar(s.score);
    console.log(`  ${chalk.cyan(s.name.padEnd(24))} ${String(s.score).padStart(3)} ${bar} ${gradeColor(s.grade)}`);
  }

  // 2. 低分详情
  const lowScores = pro.scores.filter(s => s.score < 70);
  if (lowScores.length > 0) {
    console.log(chalk.bold('\n📉 低分 Skill 详情\n'));
    for (const s of lowScores) {
      console.log(`  ${chalk.cyan(s.name)}  ${chalk.yellow(s.score + '/100')}`);
      for (const b of s.breakdown) {
        const pct = b.max > 0 ? Math.round((b.points / b.max) * 100) : 0;
        const color = pct >= 80 ? chalk.green : pct >= 50 ? chalk.yellow : chalk.red;
        console.log(chalk.dim(`    ${b.category}: ${color(`${b.points}/${b.max}`)}`));
      }
      // 安全扫描
      const sec = scanSecurity(s.filePath);
      if (sec.length > 0) {
        console.log(chalk.red(`    ⚠️  安全问题:`));
        for (const iss of sec) {
          console.log(chalk.red(`      - ${iss.label} [${iss.severity}]`));
        }
      }
    }
  }

  // 3. 去重
  if (pro.duplicates.length > 0) {
    console.log(chalk.bold('\n🔄 疑似重复 Skill\n'));
    for (const group of pro.duplicates) {
      console.log(chalk.yellow(`  ⚠️  ${group.join('  ≈  ')}`));
    }
  }

  // 4. 兼容性
  console.log(chalk.bold('\n📐 兼容性矩阵\n'));
  console.log(chalk.dim(`  ${'Skill'.padEnd(24)} Reasonix  Claude Code  Cursor`));
  console.log(chalk.dim(`  ${'─'.repeat(58)}`));
  for (const s of pro.scores) {
    const skill = findSkillByName(s.name);
    const tools = skill?.allowedTools ?? [];
    const compat = checkCompatibility(tools);
    const rx = compat.reasonix.bad.length === 0 ? chalk.green('✓') : chalk.red(`${compat.reasonix.bad.length}✗`);
    const cc = compat.claudeCode.bad.length === 0 ? chalk.green('✓') : chalk.yellow(`${compat.claudeCode.bad.length}✗`);
    const cu = compat.cursor.bad.length === 0 ? chalk.green('✓') : chalk.yellow(`${compat.cursor.bad.length}✗`);
    console.log(`  ${s.name.padEnd(24)} ${rx.padStart(8)}  ${cc.padStart(10)}  ${cu.padStart(6)}`);
  }

  // 5. 基础问题
  if (pro.issues.length > 0) {
    console.log(chalk.bold('\n📋 基础问题\n'));
    for (const issue of pro.issues) {
      const icon = issue.severity === 'error' ? chalk.red('❌') : chalk.yellow('⚠️');
      console.log(`  ${icon} ${issue.message}`);
      console.log(`     ${chalk.dim(issue.filePath)}`);
    }
  }

  console.log();
  const aCount = pro.scores.filter(s => s.grade === 'A').length;
  const bCount = pro.scores.filter(s => s.grade === 'B').length;
  console.log(
    chalk.green(`${aCount} A  `) +
    chalk.cyan(`${bCount} B  `) +
    chalk.yellow(`${pro.scores.length - aCount - bCount} C/D`),
  );
}

function printDeepInfo(filePath: string): void {
  const score = computeScore(filePath);
  if (!score) return;

  console.log(chalk.bold(`\n📊 质量评分: ${score.score}/100 ${score.grade}\n`));
  for (const b of score.breakdown) {
    console.log(chalk.dim(`  ${b.category}: ${b.points}/${b.max}`));
  }

  const sec = scanSecurity(filePath);
  if (sec.length > 0) {
    console.log(chalk.red(`\n⚠️  安全问题:`));
    for (const iss of sec) {
      console.log(chalk.red(`  - ${iss.label} [${iss.severity}]`));
    }
  }

  const skill = findSkillByName(score.name);
  if (skill?.allowedTools && skill.allowedTools.length > 0) {
    const compat = checkCompatibility(skill.allowedTools);
    console.log(chalk.bold('\n📐 兼容性:'));
    console.log(`  Reasonix:    ${compat.reasonix.ok}/${compat.reasonix.ok + compat.reasonix.bad.length} 工具兼容`);
    console.log(`  Claude Code: ${compat.claudeCode.ok}/${compat.claudeCode.ok + compat.claudeCode.bad.length} 工具兼容`);
    console.log(`  Cursor:      ${compat.cursor.ok}/${compat.cursor.ok + compat.cursor.bad.length} 工具兼容`);
  }
}

function scoreBar(score: number): string {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  const color = score >= 70 ? chalk.green : score >= 50 ? chalk.yellow : chalk.red;
  return color('█'.repeat(filled) + '░'.repeat(empty));
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
    const counts = result.issues.reduce(
      (acc, i) => { i.severity === 'error' ? acc.err++ : acc.warn++; return acc; },
      { err: 0, warn: 0 },
    );
    console.log(
      chalk.yellow(`📊 ${result.ok}/${result.total} 通过  `) +
      (counts.err > 0 ? chalk.red(`${counts.err} 错误  `) : '') +
      (counts.warn > 0 ? chalk.yellow(`${counts.warn} 警告`) : ''),
    );
  }
}
