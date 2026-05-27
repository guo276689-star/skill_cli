import chalk from 'chalk';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { scanLocalSkills } from '../core/scanner';

export async function envCommand(): Promise<void> {
  console.log(chalk.bold('🖥️  Skills 环境诊断\n'));

  const checks: { label: string; status: 'ok' | 'warn' | 'err'; detail: string }[] = [];

  // 1. Node.js
  const nodeVer = process.version;
  const nodeMajor = parseInt(nodeVer.slice(1).split('.')[0], 10);
  checks.push({
    label: 'Node.js',
    status: nodeMajor >= 18 ? 'ok' : 'warn',
    detail: `${nodeVer} ${nodeMajor >= 18 ? '' : '(建议 ≥18)'}`,
  });

  // 2. OS
  checks.push({ label: '操作系统', status: 'ok', detail: `${os.type()} ${os.release()}` });

  // 3. Skills 目录
  const globalDir = path.join(os.homedir(), '.reasonix', 'skills');
  const projectDir = path.join(process.cwd(), '.reasonix', 'skills');
  const skillDirs = [globalDir, projectDir].filter(d => fs.existsSync(d));
  checks.push({
    label: 'Skills 目录',
    status: skillDirs.length > 0 ? 'ok' : 'warn',
    detail: skillDirs.length > 0
      ? skillDirs.map(d => d.replace(os.homedir(), '~')).join(', ')
      : '未找到',
  });

  // 4. Skills 数量
  const skills = scanLocalSkills();
  checks.push({
    label: '已安装 Skills',
    status: skills.length > 0 ? 'ok' : 'warn',
    detail: skills.length > 0
      ? `${skills.length} 个 (${skills.map(s => s.name).join(', ')})`
      : '0 个',
  });

  // 5. GITHUB_TOKEN
  checks.push({
    label: 'GITHUB_TOKEN',
    status: process.env.GITHUB_TOKEN ? 'ok' : 'warn',
    detail: process.env.GITHUB_TOKEN ? '已设置' : '未设置，search/install 受限',
  });

  // 6. Reasonix CLI（跨平台检测）
  checks.push(checkReasonix());

  // 7. Git（跨平台检测）
  checks.push(checkGit());

  // 输出
  for (const c of checks) {
    const icon = c.status === 'ok' ? chalk.green('✓') : c.status === 'warn' ? chalk.yellow('⚠') : chalk.red('✗');
    console.log(`  ${icon} ${c.label.padEnd(18)} ${chalk.dim(c.detail)}`);
  }

  const oks = checks.filter(c => c.status === 'ok').length;
  const warns = checks.filter(c => c.status === 'warn').length;
  const errs = checks.filter(c => c.status === 'err').length;

  console.log();
  if (errs === 0 && warns === 0) {
    console.log(chalk.green('✅ 环境就绪'));
  } else {
    console.log(
      chalk.green(`${oks} 正常  `) +
      (warns > 0 ? chalk.yellow(`${warns} 建议修复  `) : '') +
      (errs > 0 ? chalk.red(`${errs} 必须修复`) : ''),
    );
  }
}

function checkBinary(name: string, args: string[]): boolean {
  try {
    execSync(`${name} ${args.join(' ')}`, { stdio: 'ignore', timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

function checkReasonix(): { label: string; status: 'ok' | 'warn' | 'err'; detail: string } {
  // 先检查 reasonix 二进制，再检查 npx reasonix
  const installed = checkBinary('reasonix', ['--version']);
  if (installed) return { label: 'Reasonix CLI', status: 'ok', detail: '已安装' };

  const npxOk = checkBinary('npx', ['reasonix', '--version']);
  if (npxOk) return { label: 'Reasonix CLI', status: 'ok', detail: 'npx reasonix 可用' };

  return { label: 'Reasonix CLI', status: 'warn', detail: '未检测到' };
}

function checkGit(): { label: string; status: 'ok' | 'warn' | 'err'; detail: string } {
  const installed = checkBinary('git', ['--version']);
  return installed
    ? { label: 'Git', status: 'ok', detail: '已安装' }
    : { label: 'Git', status: 'err', detail: '未安装' };
}
