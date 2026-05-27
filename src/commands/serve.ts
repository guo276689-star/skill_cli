import chalk from 'chalk';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { searchSkillsWithMeta } from '../core/github';
import { scanLocalSkills, findSkillByName } from '../core/scanner';
import { installSkill, validateRepoFormat, sanitizeSkillName, getSkillsDirs } from '../core/installer';
import { doctorProCheck, scanSecurity, checkCompatibility } from '../core/validator';
import { fetchSkillContent, parseFrontmatterRaw } from '../core/github';
import { getSource, listUpdatable, trackInstall, trackRemove } from '../core/tracker';
import { diffLines } from '../core/diff';

const PORT = 3456;

export async function serveCommand(): Promise<void> {
  // 读取前端 HTML
  const htmlPath = path.join(__dirname, '..', 'web', 'index.html');
  let html = '';
  try {
    html = fs.readFileSync(htmlPath, 'utf-8');
  } catch {
    // fallback: 内嵌 HTML
    html = getFallbackHtml();
  }

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

    const url = new URL(req.url || '/', `http://localhost:${PORT}`);

    try {
      // 路由
      if (url.pathname === '/' || url.pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }

      // API
      if (url.pathname === '/api/search') {
        const kw = url.searchParams.get('q') || '';
        const stars = parseInt(url.searchParams.get('stars') || '0');
        const time = url.searchParams.get('time') || undefined;
        const data = await searchSkillsWithMeta(kw, { minStars: stars, updatedWithin: time });
        json(res, { ok: true, data });
        return;
      }

      if (url.pathname === '/api/list') {
        const all = url.searchParams.get('all') === '1';
        const data = scanLocalSkills();
        json(res, { ok: true, data, meta: { cwd: process.cwd(), dirs: getSkillsDirs() } });
        return;
      }

      if (url.pathname === '/api/install') {
        const repo = url.searchParams.get('repo') || '';
        const skillName = url.searchParams.get('name') || '';
        const repoClean = repo.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
        if (!validateRepoFormat(repoClean)) { json(res, { ok: false, error: '无效仓库格式' }); return; }

        const safe = skillName ? sanitizeSkillName(skillName) : '';
        const urls = safe
          ? [`https://raw.githubusercontent.com/${repoClean}/main/skills/${safe}/SKILL.md`, `https://raw.githubusercontent.com/${repoClean}/main/${safe}/SKILL.md`]
          : [`https://raw.githubusercontent.com/${repoClean}/main/SKILL.md`];

        let content: string | null = null;
        for (const u of urls) { try { content = await fetchSkillContent(u); break; } catch { continue; } }
        if (!content) { json(res, { ok: false, error: '无法下载' }); return; }

        const fm = parseFrontmatterRaw(content);
        const actualName = fm.name || skillName || repoClean.split('/')[1];
        const result = installSkill(content, actualName, 'project', false);
        if (result.success && skillName) trackInstall('project', actualName, repoClean, skillName);
        json(res, { ok: result.success, data: result, error: result.error });
        return;
      }

      if (url.pathname === '/api/remove') {
        const name = url.searchParams.get('name') || '';
        const skill = findSkillByName(name);
        if (!skill) { json(res, { ok: false, error: '未找到' }); return; }
        fs.unlinkSync(skill.filePath);
        const scope = skill.filePath.includes(os.homedir()) ? 'global' : 'project';
        trackRemove(scope, name);
        json(res, { ok: true });
        return;
      }

      if (url.pathname === '/api/doctor') {
        const data = doctorProCheck();
        json(res, { ok: true, data });
        return;
      }

      if (url.pathname === '/api/env') {
        const checks: { label: string; status: string; detail: string }[] = [];
        checks.push({ label: 'Node.js', status: 'ok', detail: process.version });
        checks.push({ label: 'OS', status: 'ok', detail: `${os.type()} ${os.release()}` });

        const dirs = getSkillsDirs();
        checks.push({ label: 'Skills 目录', status: dirs.length > 0 ? 'ok' : 'warn', detail: dirs.length ? dirs.map(d => d.replace(os.homedir(), '~')).join(', ') : '未找到' });

        const skills = scanLocalSkills();
        checks.push({ label: '已安装 Skills', status: skills.length > 0 ? 'ok' : 'warn', detail: `${skills.length} 个` });

        checks.push({ label: 'GITHUB_TOKEN', status: process.env.GITHUB_TOKEN ? 'ok' : 'warn', detail: process.env.GITHUB_TOKEN ? '已设置' : '未设置' });

        try { execSync('git --version', { stdio: 'ignore' }); checks.push({ label: 'Git', status: 'ok', detail: '已安装' }); }
        catch { checks.push({ label: 'Git', status: 'err', detail: '未安装' }); }

        json(res, { ok: true, data: checks });
        return;
      }

      if (url.pathname === '/api/diff') {
        const name = url.searchParams.get('name') || '';
        const skill = findSkillByName(name);
        if (!skill) { json(res, { ok: false, error: '未找到' }); return; }
        const source = getSource(name);
        if (!source) { json(res, { ok: false, error: '无安装来源' }); return; }

        const local = fs.readFileSync(skill.filePath, 'utf-8');
        const safe = sanitizeSkillName(source.skillName);
        const urls = [
          `https://raw.githubusercontent.com/${source.repo}/main/skills/${safe}/SKILL.md`,
          `https://raw.githubusercontent.com/${source.repo}/main/${safe}/SKILL.md`,
        ];
        let remote: string | null = null;
        for (const u of urls) { try { remote = await fetchSkillContent(u); break; } catch { continue; } }
        if (!remote) { json(res, { ok: false, error: '无法获取远程' }); return; }

        const lines = diffLines(local, remote);
        const stats = { added: 0, deleted: 0, modified: 0 };
        for (const l of lines) {
          if (l.op === 'add') stats.added++;
          else if (l.op === 'del') stats.deleted++;
          else if (l.op === 'mod') stats.modified++;
        }
        json(res, { ok: true, data: { lines, stats, same: stats.added + stats.deleted + stats.modified === 0 } });
        return;
      }

      if (url.pathname === '/api/update') {
        const name = url.searchParams.get('name') || '';
        const skill = findSkillByName(name);
        if (!skill) { json(res, { ok: false, error: '未找到' }); return; }
        const source = getSource(name);
        if (!source) { json(res, { ok: false, error: '无安装来源' }); return; }

        const safe = sanitizeSkillName(source.skillName);
        const urls = [
          `https://raw.githubusercontent.com/${source.repo}/main/skills/${safe}/SKILL.md`,
          `https://raw.githubusercontent.com/${source.repo}/main/${safe}/SKILL.md`,
        ];
        let content: string | null = null;
        for (const u of urls) { try { content = await fetchSkillContent(u); break; } catch { continue; } }
        if (!content) { json(res, { ok: false, error: '无法下载' }); return; }

        const fm = parseFrontmatterRaw(content);
        const isGlobal = !skill.filePath.includes(process.cwd().replace(/\\/g, '/'));
        const result = installSkill(content, fm.name || name, isGlobal ? 'global' : 'project', true);
        json(res, { ok: result.success, error: result.error });
        return;
      }

      // 404
      res.writeHead(404);
      res.end('Not Found');
    } catch (err: any) {
      json(res, { ok: false, error: err.message || 'Server Error' });
    }
  });

  server.listen(PORT, () => {
    console.log(chalk.bold.green('\n🧩 Skills Manager 已启动\n'));
    console.log(chalk.dim(`  打开浏览器访问: `) + chalk.cyan(`http://localhost:${PORT}`));
    console.log(chalk.dim(`  按 Ctrl+C 停止`));
    console.log();

    // 自动打开浏览器
    const platform = os.platform();
    const url = `http://localhost:${PORT}`;
    try {
      if (platform === 'win32') execSync(`start ${url}`, { stdio: 'ignore' });
      else if (platform === 'darwin') execSync(`open ${url}`, { stdio: 'ignore' });
      else execSync(`xdg-open ${url}`, { stdio: 'ignore' });
    } catch { /* 无法自动打开浏览器 */ }
  });
}

function json(res: http.ServerResponse, data: any): void {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function getFallbackHtml(): string {
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Skills Manager</title></head><body><h1>Skills Manager</h1><p>前端文件丢失，请重新安装。</p></body></html>';
}
