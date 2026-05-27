"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// 直接导入被测函数（绕过 CLI 层）
const installer_1 = require("../src/core/installer");
const github_1 = require("../src/core/github");
(0, vitest_1.describe)('sanitizeSkillName', () => {
    (0, vitest_1.it)('保留合法字符', () => {
        (0, vitest_1.expect)((0, installer_1.sanitizeSkillName)('code-review')).toBe('code-review');
    });
    (0, vitest_1.it)('点号转为连字符', () => {
        (0, vitest_1.expect)((0, installer_1.sanitizeSkillName)('my.skill')).toBe('my-skill');
    });
    (0, vitest_1.it)('特殊字符全部替换', () => {
        (0, vitest_1.expect)((0, installer_1.sanitizeSkillName)('evil<script>')).toBe('evil-script-');
    });
    (0, vitest_1.it)('中文替换为连字符', () => {
        (0, vitest_1.expect)((0, installer_1.sanitizeSkillName)('我的skill')).toBe('---skill');
    });
    (0, vitest_1.it)('空字符串仍返回可用的默认值', () => {
        const result = (0, installer_1.sanitizeSkillName)('');
        (0, vitest_1.expect)(result.length).toBeGreaterThan(0);
    });
});
(0, vitest_1.describe)('validateRepoFormat', () => {
    (0, vitest_1.it)('owner/repo 格式通过', () => {
        (0, vitest_1.expect)((0, installer_1.validateRepoFormat)('addyosmani/agent-skills')).toBe(true);
    });
    (0, vitest_1.it)('含点的 owner 通过', () => {
        (0, vitest_1.expect)((0, installer_1.validateRepoFormat)('sickn33/antigravity-awesome-skills')).toBe(true);
    });
    (0, vitest_1.it)('纯字符串拒绝', () => {
        (0, vitest_1.expect)((0, installer_1.validateRepoFormat)('not-a-repo')).toBe(false);
    });
    (0, vitest_1.it)('含 github.com 前缀拒绝', () => {
        (0, vitest_1.expect)((0, installer_1.validateRepoFormat)('github.com/user/repo')).toBe(false);
    });
    (0, vitest_1.it)('含 ? 拒绝', () => {
        (0, vitest_1.expect)((0, installer_1.validateRepoFormat)('owner/repo?query')).toBe(false);
    });
});
(0, vitest_1.describe)('parseFrontmatterRaw', () => {
    (0, vitest_1.it)('正常解析', () => {
        const content = '---\nname: test\ndescription: hello\n---\nbody';
        const fm = (0, github_1.parseFrontmatterRaw)(content);
        (0, vitest_1.expect)(fm.name).toBe('test');
        (0, vitest_1.expect)(fm.description).toBe('hello');
    });
    (0, vitest_1.it)('缺失 frontmatter 返回空对象', () => {
        (0, vitest_1.expect)((0, github_1.parseFrontmatterRaw)('just body')).toEqual({});
    });
    (0, vitest_1.it)('name 不存在返回 undefined', () => {
        const content = '---\ndescription: only desc\n---\nbody';
        const fm = (0, github_1.parseFrontmatterRaw)(content);
        (0, vitest_1.expect)(fm.name).toBeUndefined();
        (0, vitest_1.expect)(fm.description).toBe('only desc');
    });
    (0, vitest_1.it)('损坏的 YAML 不崩溃', () => {
        const content = '---\n!!bad yaml!!!\n---\nbody';
        (0, vitest_1.expect)(() => (0, github_1.parseFrontmatterRaw)(content)).not.toThrow();
    });
    (0, vitest_1.it)('多行值正确提取', () => {
        const content = '---\nname: multi-line-skill\ndescription: line1\n---\nbody';
        const fm = (0, github_1.parseFrontmatterRaw)(content);
        (0, vitest_1.expect)(fm.name).toBe('multi-line-skill');
    });
});
