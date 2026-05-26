"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.doctorCommand = doctorCommand;
const chalk_1 = __importDefault(require("chalk"));
const validator_1 = require("../core/validator");
const scanner_1 = require("../core/scanner");
async function doctorCommand(name) {
    // 如果指定了名称，只检查单个
    if (name) {
        const skill = (0, scanner_1.findSkillByName)(name);
        if (!skill) {
            console.log(chalk_1.default.red(`未找到 Skill: ${name}`));
            return;
        }
        const result = (0, validator_1.validateFile)(skill.filePath);
        printDoctorResult(result);
        return;
    }
    console.log(chalk_1.default.bold('🔍 Skills 健康检查\n'));
    const result = (0, validator_1.doctorCheck)();
    if (result.total === 0) {
        console.log(chalk_1.default.dim('📭 没有找到任何 Skills'));
        return;
    }
    printDoctorResult(result);
}
function printDoctorResult(result) {
    for (const issue of result.issues) {
        const icon = issue.severity === 'error' ? chalk_1.default.red('❌') : chalk_1.default.yellow('⚠️');
        const label = issue.severity === 'error' ? chalk_1.default.red('error') : chalk_1.default.yellow('warn');
        console.log(`  ${icon} ${label}  ${issue.message}`);
        console.log(`     ${chalk_1.default.dim(issue.filePath)}`);
    }
    console.log();
    if (result.ok === result.total && result.total > 0) {
        console.log(chalk_1.default.green(`✅ ${result.total}/${result.total} Skills 通过检查`));
    }
    else {
        // 一次 reduce 统计 error/warning 计数
        const counts = result.issues.reduce((acc, i) => {
            i.severity === 'error' ? acc.err++ : acc.warn++;
            return acc;
        }, { err: 0, warn: 0 });
        console.log(chalk_1.default.yellow(`📊 ${result.ok}/${result.total} 通过  `) +
            (counts.err > 0 ? chalk_1.default.red(`${counts.err} 错误  `) : '') +
            (counts.warn > 0 ? chalk_1.default.yellow(`${counts.warn} 警告`) : ''));
    }
}
//# sourceMappingURL=doctor.js.map