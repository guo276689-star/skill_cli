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
exports.removeCommand = removeCommand;
const fs = __importStar(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
const scanner_1 = require("../core/scanner");
async function removeCommand(name) {
    const skill = (0, scanner_1.findSkillByName)(name);
    if (!skill) {
        console.log(chalk_1.default.red(`未找到 Skill: ${name}`));
        console.log(chalk_1.default.dim('使用 skills list 查看已安装的 Skills'));
        return;
    }
    try {
        fs.unlinkSync(skill.filePath);
        console.log(chalk_1.default.green(`已移除 ${chalk_1.default.cyan(skill.name)}`));
        console.log(`  📄 ${chalk_1.default.dim(skill.filePath)}`);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.log(chalk_1.default.red(`移除失败: ${message}`));
    }
}
//# sourceMappingURL=remove.js.map