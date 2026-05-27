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
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
// 测试 doctor 评分边界
const validator_1 = require("../src/core/validator");
(0, vitest_1.describe)('computeScore', () => {
    (0, vitest_1.it)('完整规范的 Skill 得高分', () => {
        const tmp = path.join(os.tmpdir(), 'test-skill-good.md');
        const content = `---
name: test-skill
description: A well-defined skill for testing
runAs: subagent
model: deepseek-v4-flash
allowed-tools:
  - read_file
  - search_content
---

## 任务
分析代码中的安全问题。

## 执行步骤
1. 读取文件
2. 检查注入风险
3. 检查密钥泄露
4. 输出报告

## 输出格式
以 Markdown 列表输出。

## 约束
- 不要做安全检查之外的事
- 避免误报
`;
        fs.writeFileSync(tmp, content);
        const score = (0, validator_1.computeScore)(tmp, content);
        fs.unlinkSync(tmp);
        (0, vitest_1.expect)(score).not.toBeNull();
        (0, vitest_1.expect)(score.score).toBeGreaterThan(70);
        (0, vitest_1.expect)(score.grade).toBe('B');
    });
    (0, vitest_1.it)('空 body 得低分', () => {
        const tmp = path.join(os.tmpdir(), 'test-skill-empty.md');
        const content = `---
name: empty-skill
---
`;
        fs.writeFileSync(tmp, content);
        const score = (0, validator_1.computeScore)(tmp, content);
        fs.unlinkSync(tmp);
        (0, vitest_1.expect)(score).not.toBeNull();
        (0, vitest_1.expect)(score.score).toBeLessThan(50);
    });
    (0, vitest_1.it)('缺失 frontmatter 得 0 分 F 级', () => {
        const tmp = path.join(os.tmpdir(), 'test-skill-nofm.md');
        const content = 'no frontmatter at all';
        fs.writeFileSync(tmp, content);
        const score = (0, validator_1.computeScore)(tmp, content);
        fs.unlinkSync(tmp);
        (0, vitest_1.expect)(score).not.toBeNull();
        (0, vitest_1.expect)(score.score).toBe(0);
        (0, vitest_1.expect)(score.grade).toBe('F');
    });
    (0, vitest_1.it)('包含危险命令被扣分', () => {
        const tmp = path.join(os.tmpdir(), 'test-skill-danger.md');
        const content = `---
name: danger-skill
description: has dangerous commands
---

## 执行
执行 rm -rf /tmp
`;
        fs.writeFileSync(tmp, content);
        const score = (0, validator_1.computeScore)(tmp, content);
        fs.unlinkSync(tmp);
        (0, vitest_1.expect)(score).not.toBeNull();
        // rm -rf 是 error 级别危险模式，-8 分
        (0, vitest_1.expect)(score.score).toBeLessThan(60);
    });
});
