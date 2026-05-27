import chalk from 'chalk';
import { DoctorResult } from '../types';
import {
  doctorCheck,
  doctorProCheck,
  validateFile,
  computeScore,
  scanSecurity,
  checkCompatibility,
  SkillScore,
} from '../core/validator';
import { findSkillByName } from '../core/scanner';
import * as fs from 'fs';

// ──── 入口 ────

export async function doctorCommand(name?: string, options?: { deep?: boolean }): Promise<void> {
  if (name) {
    const skill = findSkillByName(name);
    if (!skill) {
      console.log(chalk.red(`未找到 Skill: ${name}`));
      return;
    }
    const result = validateFile(skill.filePath);
    printBasicIssues(result);
    if (options?.deep) printDeepInfo(skill.filePath);
    return;
  }

  console.log(chalk.bold('🔍 Skills 健康检查\n'));
  if (options?.deep) {
    await deepDoctor();
  } else {
    const result = doctorCheck();
    if (result.total === 0) console.log(chalk.dim('📭 没有找到任何 Skills'));
    else printBasicIssues(result);
  }
}

// ──── 深度检查 ────

async function deepDoctor(): Promise<void> {
  const pro = doctorProCheck();
  if (pro.total === 0) { console.log(chalk.dim('📭 没有找到任何 Skills')); return; }

  printScoreTable(pro.scores);
  printLowScores(pro.scores);
  printDuplicates(pro.duplicates);
  printCompatMatrix(pro.scores);
  if (pro.issues.length > 0) printBasicIssues(pro);

  const a = pro.scores.filter(s => s.grade === 'A').length;
  const b = pro.scores.filter(s => s.grade === 'B').length;
  console.log(`\n${chalk.green(`${a} A  `)}${chalk.cyan(`${b} B  `)}${chalk.yellow(`${pro.scores.length - a - b} C/D`)}`);
}

function printScoreTable(scores: SkillScore[]): void {
  console.log(chalk.bold('📊 质量评分\n'));
  console.log(chalk.dim(`  ${'Skill'.padEnd(24)} ${'评分'.padStart(6)}  等级`));
  console.log(chalk.dim(`  ${'─'.repeat(42)}`));
  for (const s of scores) {
    const gradeColor = s.grade === 'A' ? chalk.green : s.grade === 'B' ? chalk.cyan : s.grade === 'C' ? chalk.yellow : chalk.red;
    const bar = scoreBar(s.score);
    console.log(`  ${chalk.cyan(s.name.padEnd(24))} ${String(s.score).padStart(3)} ${bar} ${gradeColor(s.grade)}`);
  }
}

function printLowScores(scores: SkillScore[]): void {
  const low = scores.filter(s => s.score < 70);
  if (low.length === 0) return;
  console.log(chalk.bold('\n📉 低分详情\n'));
  for (const s of low) {
    console.log(`  ${chalk.cyan(s.name)}  ${chalk.yellow(s.score + '/100')}`);
    for (const b of s.breakdown) {
      const pct = b.max > 0 ? Math.round((b.points / b.max) * 100) : 0;
      const color = pct >= 80 ? chalk.green : pct >= 50 ? chalk.yellow : chalk.red;
      console.log(chalk.dim(`    ${b.category}: ${color(`${b.points}/${b.max}`)}`));
    }
    // 安全扫描 — 使用 body 内容
    const raw = (() => { try { return fs.readFileSync(s.filePath, 'utf-8'); } catch { return ''; } })();
    const body = raw.replace(/^---\n[\s\S]*?\n---\n?/, '');
    const sec = scanSecurity(body);
    if (sec.length > 0) {
      console.log(chalk.red(`    ⚠️  安全问题:`));
      for (const iss of sec) console.log(chalk.red(`      - ${iss.label} [${iss.severity}]`));
    }
  }
}

function printDuplicates(duplicates: string[][]): void {
  if (duplicates.length === 0) return;
  console.log(chalk.bold('\n🔄 疑似重复\n'));
  for (const g of duplicates) console.log(chalk.yellow(`  ⚠️  ${g.join('  ≈  ')}`));
}

function printCompatMatrix(scores: SkillScore[]): void {
  console.log(chalk.bold('\n📐 兼容性\n'));
  console.log(chalk.dim(`  ${'Skill'.padEnd(24)} Reasonix  Claude Code  Cursor`));
  console.log(chalk.dim(`  ${'─'.repeat(58)}`));
  for (const s of scores) {
    const skill = findSkillByName(s.name);
    const tools = skill?.allowedTools ?? [];
    const compat = checkCompatibility(tools);
    const rx = compat.reasonix.bad.length === 0 ? chalk.green('✓') : chalk.red(`${compat.reasonix.bad.length}✗`);
    const cc = compat.claudeCode.bad.length === 0 ? chalk.green('✓') : chalk.yellow(`${compat.claudeCode.bad.length}✗`);
    const cu = compat.cursor.bad.length === 0 ? chalk.green('✓') : chalk.yellow(`${compat.cursor.bad.length}✗`);
    console.log(`  ${s.name.padEnd(24)} ${rx.padStart(8)}  ${cc.padStart(10)}  ${cu.padStart(6)}`);
  }
}

function printDeepInfo(filePath: string): void {
  const raw = (() => { try { return fs.readFileSync(filePath, 'utf-8'); } catch { return ''; } })();
  const body = raw.replace(/^---\n[\s\S]*?\n---\n?/, '');
  const score = computeScore(filePath, raw);

  if (!score) return;
  console.log(chalk.bold(`\n📊 质量评分: ${score.score}/100 ${score.grade}\n`));
  for (const b of score.breakdown) {
    console.log(chalk.dim(`  ${b.category}: ${b.points}/${b.max}`));
  }

  const sec = scanSecurity(body);
  if (sec.length > 0) {
    console.log(chalk.red(`\n⚠️  安全问题:`));
    for (const iss of sec) console.log(chalk.red(`  - ${iss.label} [${iss.severity}]`));
  }

  const skill = findSkillByName(score.name);
  if (skill?.allowedTools?.length) {
    const compat = checkCompatibility(skill.allowedTools);
    console.log(chalk.bold('\n📐 兼容性:'));
    console.log(`  Reasonix:    ${compat.reasonix.ok}/${compat.reasonix.ok + compat.reasonix.bad.length} 工具兼容`);
    console.log(`  Claude Code: ${compat.claudeCode.ok}/${compat.claudeCode.ok + compat.claudeCode.bad.length} 工具兼容`);
    console.log(`  Cursor:      ${compat.cursor.ok}/${compat.cursor.ok + compat.cursor.bad.length} 工具兼容`);
  }
}

function printBasicIssues(result: { total: number; ok: number; issues: { filePath: string; severity: string; message: string }[] }): void {
  if (result.issues.length === 0) {
    console.log(chalk.green(`✅ ${result.total}/${result.total} Skills 通过`));
    return;
  }
  console.log(chalk.bold('📋 基础问题\n'));
  for (const issue of result.issues) {
    const icon = issue.severity === 'error' ? chalk.red('❌') : chalk.yellow('⚠️');
    const label = issue.severity === 'error' ? chalk.red('error') : chalk.yellow('warn');
    console.log(`  ${icon} ${label}  ${issue.message}`);
    console.log(`     ${chalk.dim(issue.filePath)}`);
  }
  console.log();
  const counts = result.issues.reduce((acc, i) => { i.severity === 'error' ? acc.err++ : acc.warn++; return acc; }, { err: 0, warn: 0 });
  console.log(chalk.yellow(`📊 ${result.ok}/${result.total} 通过  `) + (counts.err > 0 ? chalk.red(`${counts.err} 错误  `) : '') + (counts.warn > 0 ? chalk.yellow(`${counts.warn} 警告`) : ''));
}

function scoreBar(score: number): string {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  const color = score >= 70 ? chalk.green : score >= 50 ? chalk.yellow : chalk.red;
  return color('█'.repeat(filled) + '░'.repeat(empty));
}
