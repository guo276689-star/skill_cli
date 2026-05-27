"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serveCommand = serveCommand;
const chalk_1 = __importDefault(require("chalk"));
const http = __importStar(require("http"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const github_1 = require("../core/github");
const scanner_1 = require("../core/scanner");
const installer_1 = require("../core/installer");
const validator_1 = require("../core/validator");
const github_2 = require("../core/github");
const tracker_1 = require("../core/tracker");
const diff_1 = require("../core/diff");
const PORT = 3456;
async function serveCommand() {
    // 读取前端 HTML
    const htmlPath = path.join(__dirname, '..', 'web', 'index.html');
    let html = '';
    try {
        html = fs.readFileSync(htmlPath, 'utf-8');
    }
    catch {
        // fallback: 内嵌 HTML
        html = getFallbackHtml();
    }
    const server = http.createServer(async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
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
                const data = await (0, github_1.searchSkillsWithMeta)(kw, { minStars: stars, updatedWithin: time });
                json(res, { ok: true, data });
                return;
            }
            if (url.pathname === '/api/list') {
                const all = url.searchParams.get('all') === '1';
                const data = (0, scanner_1.scanLocalSkills)();
                json(res, { ok: true, data, meta: { cwd: process.cwd(), dirs: (0, installer_1.getSkillsDirs)() } });
                return;
            }
            if (url.pathname === '/api/install') {
                const repo = url.searchParams.get('repo') || '';
                const skillName = url.searchParams.get('name') || '';
                const repoClean = repo.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
                if (!(0, installer_1.validateRepoFormat)(repoClean)) {
                    json(res, { ok: false, error: '无效仓库格式' });
                    return;
                }
                const safe = skillName ? (0, installer_1.sanitizeSkillName)(skillName) : '';
                const urls = safe
                    ? [`https://raw.githubusercontent.com/${repoClean}/main/skills/${safe}/SKILL.md`, `https://raw.githubusercontent.com/${repoClean}/main/${safe}/SKILL.md`]
                    : [`https://raw.githubusercontent.com/${repoClean}/main/SKILL.md`];
                let content = null;
                for (const u of urls) {
                    try {
                        content = await (0, github_2.fetchSkillContent)(u);
                        break;
                    }
                    catch {
                        continue;
                    }
                }
                if (!content) {
                    json(res, { ok: false, error: '无法下载' });
                    return;
                }
                const fm = (0, github_2.parseFrontmatterRaw)(content);
                const actualName = fm.name || skillName || repoClean.split('/')[1];
                const result = (0, installer_1.installSkill)(content, actualName, 'project', false);
                if (result.success && skillName)
                    (0, tracker_1.trackInstall)('project', actualName, repoClean, skillName);
                json(res, { ok: result.success, data: result, error: result.error });
                return;
            }
            if (url.pathname === '/api/remove') {
                const name = url.searchParams.get('name') || '';
                const skill = (0, scanner_1.findSkillByName)(name);
                if (!skill) {
                    json(res, { ok: false, error: '未找到' });
                    return;
                }
                fs.unlinkSync(skill.filePath);
                const scope = skill.filePath.includes(os.homedir()) ? 'global' : 'project';
                (0, tracker_1.trackRemove)(scope, name);
                json(res, { ok: true });
                return;
            }
            if (url.pathname === '/api/doctor') {
                const data = (0, validator_1.doctorProCheck)();
                json(res, { ok: true, data });
                return;
            }
            if (url.pathname === '/api/env') {
                const checks = [];
                checks.push({ label: 'Node.js', status: 'ok', detail: process.version });
                checks.push({ label: 'OS', status: 'ok', detail: `${os.type()} ${os.release()}` });
                const dirs = (0, installer_1.getSkillsDirs)();
                checks.push({ label: 'Skills 目录', status: dirs.length > 0 ? 'ok' : 'warn', detail: dirs.length ? dirs.map(d => d.replace(os.homedir(), '~')).join(', ') : '未找到' });
                const skills = (0, scanner_1.scanLocalSkills)();
                checks.push({ label: '已安装 Skills', status: skills.length > 0 ? 'ok' : 'warn', detail: `${skills.length} 个` });
                checks.push({ label: 'GITHUB_TOKEN', status: process.env.GITHUB_TOKEN ? 'ok' : 'warn', detail: process.env.GITHUB_TOKEN ? '已设置' : '未设置' });
                try {
                    (0, child_process_1.execSync)('git --version', { stdio: 'ignore' });
                    checks.push({ label: 'Git', status: 'ok', detail: '已安装' });
                }
                catch {
                    checks.push({ label: 'Git', status: 'err', detail: '未安装' });
                }
                json(res, { ok: true, data: checks });
                return;
            }
            if (url.pathname === '/api/diff') {
                const name = url.searchParams.get('name') || '';
                const skill = (0, scanner_1.findSkillByName)(name);
                if (!skill) {
                    json(res, { ok: false, error: '未找到' });
                    return;
                }
                const source = (0, tracker_1.getSource)(name);
                if (!source) {
                    json(res, { ok: false, error: '无安装来源' });
                    return;
                }
                const local = fs.readFileSync(skill.filePath, 'utf-8');
                const safe = (0, installer_1.sanitizeSkillName)(source.skillName);
                const urls = [
                    `https://raw.githubusercontent.com/${source.repo}/main/skills/${safe}/SKILL.md`,
                    `https://raw.githubusercontent.com/${source.repo}/main/${safe}/SKILL.md`,
                ];
                let remote = null;
                for (const u of urls) {
                    try {
                        remote = await (0, github_2.fetchSkillContent)(u);
                        break;
                    }
                    catch {
                        continue;
                    }
                }
                if (!remote) {
                    json(res, { ok: false, error: '无法获取远程' });
                    return;
                }
                const lines = (0, diff_1.diffLines)(local, remote);
                const stats = { added: 0, deleted: 0, modified: 0 };
                for (const l of lines) {
                    if (l.op === 'add')
                        stats.added++;
                    else if (l.op === 'del')
                        stats.deleted++;
                    else if (l.op === 'mod')
                        stats.modified++;
                }
                json(res, { ok: true, data: { lines, stats, same: stats.added + stats.deleted + stats.modified === 0 } });
                return;
            }
            if (url.pathname === '/api/update') {
                const name = url.searchParams.get('name') || '';
                const skill = (0, scanner_1.findSkillByName)(name);
                if (!skill) {
                    json(res, { ok: false, error: '未找到' });
                    return;
                }
                const source = (0, tracker_1.getSource)(name);
                if (!source) {
                    json(res, { ok: false, error: '无安装来源' });
                    return;
                }
                const safe = (0, installer_1.sanitizeSkillName)(source.skillName);
                const urls = [
                    `https://raw.githubusercontent.com/${source.repo}/main/skills/${safe}/SKILL.md`,
                    `https://raw.githubusercontent.com/${source.repo}/main/${safe}/SKILL.md`,
                ];
                let content = null;
                for (const u of urls) {
                    try {
                        content = await (0, github_2.fetchSkillContent)(u);
                        break;
                    }
                    catch {
                        continue;
                    }
                }
                if (!content) {
                    json(res, { ok: false, error: '无法下载' });
                    return;
                }
                const fm = (0, github_2.parseFrontmatterRaw)(content);
                const isGlobal = !skill.filePath.includes(process.cwd().replace(/\\/g, '/'));
                const result = (0, installer_1.installSkill)(content, fm.name || name, isGlobal ? 'global' : 'project', true);
                json(res, { ok: result.success, error: result.error });
                return;
            }
            // 404
            res.writeHead(404);
            res.end('Not Found');
        }
        catch (err) {
            json(res, { ok: false, error: err.message || 'Server Error' });
        }
    });
    server.listen(PORT, () => {
        console.log(chalk_1.default.bold.green('\n🧩 Skills Manager 已启动\n'));
        console.log(chalk_1.default.dim(`  打开浏览器访问: `) + chalk_1.default.cyan(`http://localhost:${PORT}`));
        console.log(chalk_1.default.dim(`  按 Ctrl+C 停止`));
        console.log();
        // 自动打开浏览器
        const platform = os.platform();
        const url = `http://localhost:${PORT}`;
        try {
            if (platform === 'win32')
                (0, child_process_1.execSync)(`start ${url}`, { stdio: 'ignore' });
            else if (platform === 'darwin')
                (0, child_process_1.execSync)(`open ${url}`, { stdio: 'ignore' });
            else
                (0, child_process_1.execSync)(`xdg-open ${url}`, { stdio: 'ignore' });
        }
        catch { /* 无法自动打开浏览器 */ }
    });
}
function json(res, data) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
}
function getFallbackHtml() {
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Skills Manager</title></head><body><h1>Skills Manager</h1><p>前端文件丢失，请重新安装。</p></body></html>';
}
//# sourceMappingURL=serve.js.map