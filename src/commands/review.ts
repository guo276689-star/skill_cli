import chalk from 'chalk';
import { findSkillByName } from '../core/scanner';
import * as fs from 'fs';

export async function reviewCommand(name: string): Promise<void> {
  if (!name) {
    console.log(chalk.red('请指定 Skill 名称'));
    console.log(chalk.dim('用法: skills review <name>'));
    return;
  }

  const skill = findSkillByName(name);
  if (!skill) {
    console.log(chalk.red(`未找到 Skill: ${name}`));
    console.log(chalk.dim('使用 skills list 查看已安装的 Skills'));
    return;
  }

  // 读取内容
  let content: string;
  try {
    content = fs.readFileSync(skill.filePath, 'utf-8');
  } catch {
    console.log(chalk.red('无法读取文件'));
    return;
  }

  // 基本信息
  console.log(chalk.bold(`\n📋 AI 评审: ${chalk.cyan(skill.name)}\n`));
  console.log(chalk.dim(`  文件: ${skill.filePath}`));
  console.log(chalk.dim(`  body: ${content.length} 字符`));
  console.log();

  // 提取 body
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const body = fmMatch ? content.slice(fmMatch[0].length).trim() : content;

  // 规则快速分析（本地）
  console.log(chalk.bold('🔍 规则快速分析\n'));

  // 分析维度
  const analysis = quickAnalyze(body);
  console.log(`  ${chalk.dim('清晰度:')}  ${analysis.clarity}`);
  console.log(`  ${chalk.dim('覆盖度:')}  ${analysis.coverage}`);
  console.log(`  ${chalk.dim('约束力:')}  ${analysis.constraints}`);
  console.log(`  ${chalk.dim('可验证性:')}  ${analysis.verifiability}`);
  console.log(`  ${chalk.dim('复用性:')}  ${analysis.reusability}`);

  // 提示 AI 深度评审
  console.log();
  console.log(chalk.bold('🧠 AI 深度评审'));
  console.log();
  console.log(chalk.dim('  在 Reasonix 中运行:'));
  console.log(chalk.cyan(`  /skill review-skill ${skill.filePath}`));
  console.log();
}

interface QuickAnalysis {
  clarity: string;
  coverage: string;
  constraints: string;
  verifiability: string;
  reusability: string;
}

function quickAnalyze(body: string): QuickAnalysis {
  const bodyLines = body.split('\n').filter(l => l.trim());

  // 清晰度：基于步骤和动词
  const stepCount = (body.match(/^\d+\.\s+/gm) || []).length;
  const verbCount = (body.match(/\b(读取|检查|验证|写入|运行|搜索|分析|审查|生成|执行|调用|返回|read|check|verify|write|run|search|analyze|review|generate|execute|call|return)\b/gi) || []).length;

  let clarity: string;
  if (stepCount >= 3 && verbCount >= 8) clarity = '🟢 高 — 步骤明确，动词丰富';
  else if (stepCount >= 1 || verbCount >= 4) clarity = '🟡 中 — 有基本指令，可进一步细化';
  else clarity = '🔴 低 — 缺少结构化步骤和具体动词';

  // 覆盖度：基于章节和检查项
  const sectionCount = (body.match(/^##\s+/gm) || []).length;
  const checklistItems = (body.match(/^[-*]\s+/gm) || []).length;

  let coverage: string;
  if (sectionCount >= 4 && checklistItems >= 5) coverage = '🟢 高 — 章节丰富，检查项充足';
  else if (sectionCount >= 2 || checklistItems >= 3) coverage = '🟡 中 — 有一定覆盖，可补充边界场景';
  else coverage = '🔴 低 — 建议增加章节和检查清单';

  // 约束力：基于限制词和反模式
  const constraintCount = (body.match(/\b(不要|禁止|只允许|必须|避免|切勿|优先|do not|must not|never|only|must|avoid)\b/gi) || []).length;

  let constraints: string;
  if (constraintCount >= 5) constraints = '🟢 强 — 约束明确，边界清楚';
  else if (constraintCount >= 2) constraints = '🟡 中 — 有基本约束，建议补充反模式';
  else constraints = '🔴 弱 — 缺少约束，agent 可能偏离预期';

  // 可验证性：基于验证/检查点
  const verifyCount = (body.match(/\b(验证|确认|检查|verify|confirm|check|assert|expect|确保|ensure)\b/gi) || []).length;

  let verifiability: string;
  if (verifyCount >= 5) verifiability = '🟢 强 — 有明确验证步骤';
  else if (verifyCount >= 2) verifiability = '🟡 中 — 有验证概念，可加具体检查点';
  else verifiability = '🔴 弱 — 缺少验证，无法判断任务是否完成';

  // 复用性：基于具体领域关键词 vs 通用性
  const specificTerms = (body.match(/\b(React|Next\.js|Python|Docker|AWS|MySQL|Kubernetes|TypeScript|GitHub|Slack)\b/gi) || []).length;
  const genericTerms = (body.match(/\b(代码|文件|项目|仓库|接口|API|数据|函数|模块|code|file|project|repo|data|function|module)\b/gi) || []).length;

  let reusability: string;
  if (genericTerms > specificTerms && sectionCount >= 3) reusability = '🟢 高 — 通用设计，可跨场景复用';
  else if (specificTerms <= 3) reusability = '🟡 中 — 基本通用，少数领域特化';
  else reusability = '🔴 低 — 领域耦合度高，复用受限';

  return { clarity, coverage, constraints, verifiability, reusability };
}
