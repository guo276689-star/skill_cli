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
exports.installCommand = installCommand;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const github_1 = require("../core/github");
const installer_1 = require("../core/installer");
const validator_1 = require("../core/validator");
const tracker_1 = require("../core/tracker");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/** 构建 GitHub raw 下载 URL */
function buildSkillDownloadUrl(repoClean, skillName) {
    const urls = [];
    if (skillName) {
        const safe = (0, installer_1.sanitizeSkillName)(skillName);
        urls.push(`https://raw.githubusercontent.com/${repoClean}/main/skills/${safe}/SKILL.md`);
        urls.push(`https://raw.githubusercontent.com/${repoClean}/main/${safe}/SKILL.md`);
    }
    urls.push(`https://raw.githubusercontent.com/${repoClean}/main/SKILL.md`);
    return urls;
}
async function installCommand(repo, skillName, options) {
    // --from: 从 freeze 导出的 JSON 批量安装
    if (options?.from) {
        await bulkInstall(options.from, options?.scope ?? 'project');
        return;
    }
    const scope = options?.scope ?? 'project';
    // 清理并校验 repo 格式
    const repoClean = repo.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
    if (!(0, installer_1.validateRepoFormat)(repoClean)) {
        console.log(chalk_1.default.red(`无效的仓库格式: "${repo}"`));
        console.log(chalk_1.default.dim('格式应为 owner/repo，如 addyosmani/agent-skills'));
        return;
    }
    const displayName = skillName ?? repoClean.split('/').pop() ?? 'skill';
    const spinner = (0, ora_1.default)(`安装 ${displayName}...`).start();
    try {
        // 逐一尝试 URL 候选
        const urls = buildSkillDownloadUrl(repoClean, skillName);
        let content = null;
        for (const url of urls) {
            try {
                content = await (0, github_1.fetchSkillContent)(url);
                break;
            }
            catch {
                continue;
            }
        }
        if (!content) {
            throw new Error(`无法从 ${repoClean} 下载 SKILL.md，请指定 skill-name`);
        }
        // 提取实际 skill 名称
        const fm = (0, github_1.parseFrontmatterRaw)(content);
        const actualName = fm.name ?? displayName;
        // 写入磁盘（内存中已有 content，传 force 合并了 forceInstallSkill）
        const result = (0, installer_1.installSkill)(content, actualName, scope, options?.force);
        if (!result.success) {
            spinner.fail(result.error);
            if (!options?.force)
                console.log(chalk_1.default.dim('使用 --force 强制覆盖安装'));
            return;
        }
        spinner.succeed(`已安装 ${chalk_1.default.cyan(actualName)}`);
        console.log(`  📄 ${chalk_1.default.dim(result.filePath)}`);
        // 记录安装来源，以便 skills update
        (0, tracker_1.trackInstall)(scope, actualName, repoClean, skillName ?? actualName);
        if (fm.description) {
            console.log(`  📝 ${fm.description}`);
        }
        if (fm.runAs) {
            console.log(`  ⚙️  运行模式: ${fm.runAs}`);
        }
        // 安装后自动校验（复用内存中的 content，避免重复读盘）
        const check = (0, validator_1.validateFile)(result.filePath, content);
        if (check.issues.length > 0) {
            console.log(chalk_1.default.yellow(`\n  ⚠️  校验发现问题:`));
            for (const issue of check.issues) {
                const icon = issue.severity === 'error' ? '❌' : '⚠️';
                console.log(`  ${icon}  ${issue.message}`);
            }
        }
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        spinner.fail(`安装失败: ${message}`);
    }
}
async function bulkInstall(filePath, scope) {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
        console.log(chalk_1.default.red(`文件不存在: ${resolved}`));
        return;
    }
    let entries;
    try {
        entries = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
    }
    catch {
        console.log(chalk_1.default.red('JSON 解析失败'));
        return;
    }
    const withRepo = entries.filter(e => e.repo);
    if (withRepo.length === 0) {
        console.log(chalk_1.default.dim('没有可安装的条目（缺少 repo 字段）'));
        return;
    }
    console.log(chalk_1.default.bold(`\n📦 批量安装 ${withRepo.length} 个 Skills\n`));
    let ok = 0, fail = 0;
    for (const e of withRepo) {
        const spinner = (0, ora_1.default)(`  ${e.name}`).start();
        try {
            const safe = (0, installer_1.sanitizeSkillName)(e.skillName || e.name);
            const urls = [
                `https://raw.githubusercontent.com/${e.repo}/main/skills/${safe}/SKILL.md`,
                `https://raw.githubusercontent.com/${e.repo}/main/${safe}/SKILL.md`,
            ];
            let content = null;
            for (const url of urls) {
                try {
                    content = await (0, github_1.fetchSkillContent)(url);
                    break;
                }
                catch {
                    continue;
                }
            }
            if (!content)
                throw new Error('下载失败');
            const fm = (0, github_1.parseFrontmatterRaw)(content);
            const result = (0, installer_1.installSkill)(content, fm.name || e.name, scope, true);
            if (result.success) {
                (0, tracker_1.trackInstall)(scope, fm.name || e.name, e.repo, e.skillName || e.name);
                spinner.succeed(e.name);
                ok++;
            }
            else {
                spinner.fail(`${e.name}: ${result.error}`);
                fail++;
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            spinner.fail(`${e.name}: ${message}`);
            fail++;
        }
    }
    console.log();
    console.log(chalk_1.default.green(`${ok} 成功`) + (fail > 0 ? chalk_1.default.red(`  ${fail} 失败`) : ''));
}
//# sourceMappingURL=install.js.map