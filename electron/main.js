const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// 加载 skills-cli 核心模块
const { searchSkillsWithMeta } = require('../dist/core/github');
const { scanLocalSkills, findSkillByName } = require('../dist/core/scanner');
const { installSkill, validateRepoFormat, sanitizeSkillName } = require('../dist/core/installer');
const { doctorProCheck, computeScore, validateFile, scanSecurity, checkCompatibility } = require('../dist/core/validator');
const { fetchSkillContent, parseFrontmatterRaw } = require('../dist/core/github');
const { getSource, listUpdatable, trackInstall, trackRemove } = require('../dist/core/tracker');
const { diffLines, printDiff } = require('../dist/core/diff');
const { getSkillsDirs } = require('../dist/core/installer');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    title: 'Skills Manager',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'frontend', 'index.html'));
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  // ──── IPC Handlers ────

  // 搜索
  ipcMain.handle('search', async (_e, keyword, options) => {
    try {
      const results = await searchSkillsWithMeta(keyword, options || {});
      return { ok: true, data: results };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // 列出本地
  ipcMain.handle('list', async () => {
    try {
      const skills = scanLocalSkills();
      return { ok: true, data: skills };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // 安装
  ipcMain.handle('install', async (_e, repo, skillName, scope) => {
    try {
      const repoClean = repo.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
      if (!validateRepoFormat(repoClean)) {
        return { ok: false, error: '无效的仓库格式' };
      }

      const safe = skillName ? sanitizeSkillName(skillName) : '';
      const urls = [];
      if (safe) {
        urls.push(`https://raw.githubusercontent.com/${repoClean}/main/skills/${safe}/SKILL.md`);
        urls.push(`https://raw.githubusercontent.com/${repoClean}/main/${safe}/SKILL.md`);
      }
      urls.push(`https://raw.githubusercontent.com/${repoClean}/main/SKILL.md`);

      let content = null;
      for (const url of urls) {
        try { content = await fetchSkillContent(url); break; } catch { continue; }
      }
      if (!content) return { ok: false, error: '无法下载 SKILL.md' };

      const fm = parseFrontmatterRaw(content);
      const actualName = fm.name || skillName || repoClean.split('/')[1];
      const result = installSkill(content, actualName, scope || 'project', false);

      if (result.success && skillName) {
        trackInstall(scope || 'project', actualName, repoClean, skillName);
      }

      return { ok: result.success, data: result, error: result.error };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // 删除
  ipcMain.handle('remove', async (_e, name) => {
    try {
      const skill = findSkillByName(name);
      if (!skill) return { ok: false, error: '未找到' };
      fs.unlinkSync(skill.filePath);
      const os = require('os');
      const scope = skill.filePath.includes(os.homedir()) ? 'global' : 'project';
      trackRemove(scope, name);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Doctor
  ipcMain.handle('doctor', async () => {
    try {
      const result = doctorProCheck();
      return { ok: true, data: result };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // 环境诊断
  ipcMain.handle('env', async () => {
    try {
      const os = require('os');
      const { execSync } = require('child_process');
      const checks = [];

      const nodeVer = process.version;
      checks.push({ label: 'Node.js', status: 'ok', detail: nodeVer });
      checks.push({ label: 'OS', status: 'ok', detail: `${os.type()} ${os.release()}` });

      const dirs = getSkillsDirs();
      checks.push({
        label: 'Skills 目录',
        status: dirs.length > 0 ? 'ok' : 'warn',
        detail: dirs.length > 0 ? dirs.map(d => d.replace(os.homedir(), '~')).join(', ') : '未找到',
      });

      const skills = scanLocalSkills();
      checks.push({
        label: '已安装 Skills',
        status: skills.length > 0 ? 'ok' : 'warn',
        detail: `${skills.length} 个`,
      });

      checks.push({
        label: 'GITHUB_TOKEN',
        status: process.env.GITHUB_TOKEN ? 'ok' : 'warn',
        detail: process.env.GITHUB_TOKEN ? '已设置' : '未设置',
      });

      try { execSync('git --version', { stdio: 'ignore' }); checks.push({ label: 'Git', status: 'ok', detail: '已安装' }); }
      catch { checks.push({ label: 'Git', status: 'err', detail: '未安装' }); }

      return { ok: true, data: checks };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // 获取 Skill 详情
  ipcMain.handle('info', async (_e, name) => {
    try {
      const skill = findSkillByName(name);
      if (!skill) return { ok: false, error: '未找到' };
      const content = fs.readFileSync(skill.filePath, 'utf-8');
      const fm = parseFrontmatterRaw(content);
      return { ok: true, data: { ...skill, content, fm } };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Diff
  ipcMain.handle('diff', async (_e, name) => {
    try {
      const skill = findSkillByName(name);
      if (!skill) return { ok: false, error: '未找到' };
      const source = getSource(name);
      if (!source) return { ok: false, error: '无安装来源' };

      const local = fs.readFileSync(skill.filePath, 'utf-8');
      const safe = sanitizeSkillName(source.skillName);
      const urls = [
        `https://raw.githubusercontent.com/${source.repo}/main/skills/${safe}/SKILL.md`,
        `https://raw.githubusercontent.com/${source.repo}/main/${safe}/SKILL.md`,
      ];
      let remote = null;
      for (const url of urls) {
        try { remote = await fetchSkillContent(url); break; } catch { continue; }
      }
      if (!remote) return { ok: false, error: '无法获取远程版本' };

      const lines = diffLines(local, remote);
      const stats = { added: 0, deleted: 0, modified: 0 };
      for (const l of lines) {
        if (l.op === 'add') stats.added++;
        else if (l.op === 'del') stats.deleted++;
        else if (l.op === 'mod') stats.modified++;
      }

      return { ok: true, data: { lines, stats, same: stats.added + stats.deleted + stats.modified === 0 } };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // 更新
  ipcMain.handle('update', async (_e, name) => {
    try {
      const skill = findSkillByName(name);
      if (!skill) return { ok: false, error: '未找到' };
      const source = getSource(name);
      if (!source) return { ok: false, error: '无安装来源' };

      const safe = sanitizeSkillName(source.skillName);
      const urls = [
        `https://raw.githubusercontent.com/${source.repo}/main/skills/${safe}/SKILL.md`,
        `https://raw.githubusercontent.com/${source.repo}/main/${safe}/SKILL.md`,
      ];
      let content = null;
      for (const url of urls) {
        try { content = await fetchSkillContent(url); break; } catch { continue; }
      }
      if (!content) return { ok: false, error: '无法下载' };

      const fm = parseFrontmatterRaw(content);
      const isGlobal = !skill.filePath.includes(process.cwd().replace(/\\/g, '/'));
      const result = installSkill(content, fm.name || name, isGlobal ? 'global' : 'project', true);
      return { ok: result.success, error: result.error };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
