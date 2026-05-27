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
exports.freezeCommand = freezeCommand;
const chalk_1 = __importDefault(require("chalk"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const scanner_1 = require("../core/scanner");
const tracker_1 = require("../core/tracker");
async function freezeCommand(output) {
    const all = true; // freeze 总是导出全部
    const skills = (0, scanner_1.scanLocalSkills)(all);
    if (skills.length === 0) {
        console.log(chalk_1.default.dim('📭 没有 Skills 可导出'));
        return;
    }
    const entries = skills.map(s => {
        const source = (0, tracker_1.getSource)(s.name);
        return {
            name: s.name,
            description: s.description,
            runAs: s.runAs,
            repo: source?.repo,
            skillName: source?.skillName,
            installedAt: source?.installedAt,
            filePath: s.filePath,
        };
    });
    const json = JSON.stringify(entries, null, 2);
    if (output) {
        const filePath = path.resolve(output);
        fs.writeFileSync(filePath, json, 'utf-8');
        console.log(chalk_1.default.green(`✅ 已导出 ${skills.length} 个 Skills`));
        console.log(`  📄 ${chalk_1.default.dim(filePath)}`);
        console.log();
        console.log(chalk_1.default.dim('💡 导入: skills install --from ' + output));
    }
    else {
        // 输出到 stdout
        console.log(json);
    }
    // 同时生成可执行的安装命令
    const installCommands = entries
        .filter(e => e.repo)
        .map(e => `skills install ${e.repo} ${e.skillName || e.name}`);
    if (installCommands.length > 0 && output) {
        console.log();
        console.log(chalk_1.default.dim('💡 等效安装命令:'));
        for (const cmd of installCommands) {
            console.log(chalk_1.default.dim(`  ${cmd}`));
        }
    }
}
//# sourceMappingURL=freeze.js.map