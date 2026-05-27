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
exports.envCommand = envCommand;
const chalk_1 = __importDefault(require("chalk"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const scanner_1 = require("../core/scanner");
async function envCommand() {
    console.log(chalk_1.default.bold('🖥️  Skills 环境诊断\n'));
    const checks = [];
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
    const skills = (0, scanner_1.scanLocalSkills)();
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
        const icon = c.status === 'ok' ? chalk_1.default.green('✓') : c.status === 'warn' ? chalk_1.default.yellow('⚠') : chalk_1.default.red('✗');
        console.log(`  ${icon} ${c.label.padEnd(18)} ${chalk_1.default.dim(c.detail)}`);
    }
    const oks = checks.filter(c => c.status === 'ok').length;
    const warns = checks.filter(c => c.status === 'warn').length;
    const errs = checks.filter(c => c.status === 'err').length;
    console.log();
    if (errs === 0 && warns === 0) {
        console.log(chalk_1.default.green('✅ 环境就绪'));
    }
    else {
        console.log(chalk_1.default.green(`${oks} 正常  `) +
            (warns > 0 ? chalk_1.default.yellow(`${warns} 建议修复  `) : '') +
            (errs > 0 ? chalk_1.default.red(`${errs} 必须修复`) : ''));
    }
}
function checkBinary(name, args) {
    try {
        (0, child_process_1.execSync)(`${name} ${args.join(' ')}`, { stdio: 'ignore', timeout: 3000 });
        return true;
    }
    catch {
        return false;
    }
}
function checkReasonix() {
    // 先检查 reasonix 二进制，再检查 npx reasonix
    const installed = checkBinary('reasonix', ['--version']);
    if (installed)
        return { label: 'Reasonix CLI', status: 'ok', detail: '已安装' };
    const npxOk = checkBinary('npx', ['reasonix', '--version']);
    if (npxOk)
        return { label: 'Reasonix CLI', status: 'ok', detail: 'npx reasonix 可用' };
    return { label: 'Reasonix CLI', status: 'warn', detail: '未检测到' };
}
function checkGit() {
    const installed = checkBinary('git', ['--version']);
    return installed
        ? { label: 'Git', status: 'ok', detail: '已安装' }
        : { label: 'Git', status: 'err', detail: '未安装' };
}
//# sourceMappingURL=env.js.map