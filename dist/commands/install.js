"use strict";
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
/** 构建 GitHub raw 下载 URL */
function buildSkillDownloadUrl(repoClean, skillName) {
    const urls = [];
    if (skillName) {
        urls.push(`https://raw.githubusercontent.com/${repoClean}/main/skills/${skillName}/SKILL.md`);
        urls.push(`https://raw.githubusercontent.com/${repoClean}/main/${skillName}/SKILL.md`);
    }
    urls.push(`https://raw.githubusercontent.com/${repoClean}/main/SKILL.md`);
    return urls;
}
async function installCommand(repo, skillName, options) {
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
//# sourceMappingURL=install.js.map