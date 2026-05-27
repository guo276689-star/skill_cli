import chalk from 'chalk';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
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
  checks.push({
    label: '操作系统',
    status: 'ok',
    detail: `${os.type()} ${os.release()}`,
  });

  // 3. Skills 目录
  const globalDir = path.join(os.homedir(), '.reasonix', 'skills');
  const projectDir = path.join(process.cwd(), '.reasonix', 'skills');
  const globalExists = fs.existsSync(globalDir);
  const projectExists = fs.existsSync(projectDir);

  const skillDirs: string[] = [];
  if (globalExists) skillDirs.push(globalDir);
  if (projectExists) skillDirs.push(projectDir);

  checks.push({
    label: 'Skills 目录',
    status: skillDirs.length > 0 ? 'ok' : 'warn',
    detail: skillDirs.length > 0
      ? skillDirs.map(d => d.replace(os.homedir(), '~')).join(', ')
      : '未找到 Skills 目录',
  });

  // 4. Skills 数量
  const skills = scanLocalSkills();
  checks.push({
    label: '已安装 Skills',
    status: skills.length > 0 ? 'ok' : 'warn',
    detail: skills.length > 0
      ? `${skills.length} 个 (${skills.map(s => s.name).join(', ')})`
      : '0 个，使用 skills install 安装',
  });

  // 5. GITHUB_TOKEN
  const hasToken = !!process.env.GITHUB_TOKEN;
  checks.push({
    label: 'GITHUB_TOKEN',
    status: hasToken ? 'ok' : 'warn',
    detail: hasToken ? '已设置' : '未设置，search/install 受限',
  });

  // 6. Reasonix CLI
  const reasonixPaths = ['reasonix', 'npx reasonix'];
  const reasonixInstalled = (() => {
    try {
      const result = require('child_process').execSync('where reasonix 2>nul', { encoding: 'utf-8' });
      return result.trim().length > 0;
    } catch {
      return false;
    }
  })();

  checks.push({
    label: 'Reasonix CLI',
    status: reasonixInstalled ? 'ok' : 'warn',
    detail: reasonixInstalled ? '已安装' : '未检测到',
  });

  // 7. Git
  const gitInstalled = (() => {
    try {
      require('child_process').execSync('git --version 2>nul', { encoding: 'utf-8' });
      return true;
    } catch {
      return false;
    }
  })();

  checks.push({
    label: 'Git',
    status: gitInstalled ? 'ok' : 'err',
    detail: gitInstalled ? '已安装' : '未安装',
  });

  // 输出
  for (const c of checks) {
    const icon = c.status === 'ok' ? chalk.green('✓') : c.status === 'warn' ? chalk.yellow('⚠') : chalk.red('✗');
    const label = c.label.padEnd(18);
    console.log(`  ${icon} ${label} ${chalk.dim(c.detail)}`);
  }

  // 总结
  const oks = checks.filter(c => c.status === 'ok').length;
  const warns = checks.filter(c => c.status === 'warn').length;
  const errs = checks.filter(c => c.status === 'err').length;

  console.log();
  if (errs === 0 && warns === 0) {
    console.log(chalk.green('✅ 环境就绪，所有检查通过'));
  } else {
    console.log(
      chalk.green(`${oks} 正常  `) +
      (warns > 0 ? chalk.yellow(`${warns} 建议修复  `) : '') +
      (errs > 0 ? chalk.red(`${errs} 必须修复`) : ''),
    );
  }
}
