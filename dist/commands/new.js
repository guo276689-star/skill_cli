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
exports.newCommand = newCommand;
const chalk_1 = __importDefault(require("chalk"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const installer_1 = require("../core/installer");
const validator_1 = require("../core/validator");
const SKILL_TEMPLATE = `## 任务

描述这个 Skill 要完成什么任务。

## 执行步骤

1. **第一步**：做什么
2. **第二步**：做什么
3. **第三步**：做什么

## 输出格式

描述期望的输出格式。

## 约束

- 不要做 X
- 必须做 Y
`;
async function newCommand(name, options) {
    if (!name) {
        console.log(chalk_1.default.red('请指定 Skill 名称'));
        console.log(chalk_1.default.dim('用法: skills new <name> --desc "描述" --run-as subagent'));
        return;
    }
    // 校验名称
    if (!/^[a-zA-Z0-9_\-.]{1,64}$/.test(name)) {
        console.log(chalk_1.default.red(`非法名称: "${name}"（只允许字母/数字/_/-/.，1-64字符）`));
        return;
    }
    const scope = options?.scope === 'global' ? 'global' : 'project';
    const dirs = (0, installer_1.getSkillsDirs)();
    const targetDir = scope === 'global' ? dirs.find(d => d.includes('.reasonix')) ?? dirs[0] : (dirs[1] || dirs[0]);
    if (!targetDir) {
        console.log(chalk_1.default.red('未找到 Skills 目录'));
        return;
    }
    // 确保目录存在
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    const filePath = path.join(targetDir, `${name}.md`);
    // 检查是否已存在
    if (fs.existsSync(filePath)) {
        console.log(chalk_1.default.yellow(`Skill 已存在: ${filePath}`));
        console.log(chalk_1.default.dim('使用 --force 覆盖，或换一个名字'));
        return;
    }
    // 生成 frontmatter
    const frontmatter = buildFrontmatter(name, options);
    // 生成完整内容
    const content = frontmatter + '\n' + SKILL_TEMPLATE;
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(chalk_1.default.green(`✅ 已创建 ${chalk_1.default.cyan(name)}`));
    console.log(`  📄 ${chalk_1.default.dim(filePath)}`);
    if (options?.desc) {
        console.log(`  📝 ${options.desc}`);
    }
    if (options?.runAs) {
        console.log(`  ⚙️  模式: ${options.runAs}`);
    }
    if (options?.tools) {
        console.log(`  🔧 工具: ${options.tools}`);
    }
    // 创建后自动校验
    const check = (0, validator_1.validateFile)(filePath);
    if (check.issues.length > 0) {
        console.log(chalk_1.default.yellow(`\n  ⚠️  校验:`));
        for (const issue of check.issues) {
            console.log(`  ${issue.severity === 'error' ? '❌' : '⚠️'} ${issue.message}`);
        }
    }
    console.log();
    console.log(chalk_1.default.dim('💡 编辑 body 后使用 skills doctor --deep 检查质量'));
    console.log(chalk_1.default.dim('💡 编辑 body 后推送到你的 skill 仓库分享'));
}
function buildFrontmatter(name, options) {
    const lines = ['---'];
    lines.push(`name: ${name}`);
    if (options?.desc) {
        lines.push(`description: ${options.desc}`);
    }
    else {
        lines.push(`description: TODO：一句话描述这个 Skill`);
    }
    if (options?.runAs && ['inline', 'subagent'].includes(options.runAs)) {
        lines.push(`runAs: ${options.runAs}`);
    }
    if (options?.model) {
        lines.push(`model: ${options.model}`);
    }
    if (options?.tools) {
        const tools = options.tools.split(/[,;\s]+/).filter(Boolean);
        lines.push(`allowed-tools: ${tools.join(', ')}`);
    }
    lines.push('---');
    return lines.join('\n');
}
//# sourceMappingURL=new.js.map