import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// 测试 doctor 评分边界
import { computeScore } from '../src/core/validator';

describe('computeScore', () => {
  it('完整规范的 Skill 得高分', () => {
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

    const score = computeScore(tmp, content);
    fs.unlinkSync(tmp);

    expect(score).not.toBeNull();
    expect(score!.score).toBeGreaterThan(70);
    expect(score!.grade).toBe('B');
  });

  it('空 body 得低分', () => {
    const tmp = path.join(os.tmpdir(), 'test-skill-empty.md');
    const content = `---
name: empty-skill
---
`;
    fs.writeFileSync(tmp, content);

    const score = computeScore(tmp, content);
    fs.unlinkSync(tmp);

    expect(score).not.toBeNull();
    expect(score!.score).toBeLessThan(50);
  });

  it('缺失 frontmatter 得 0 分 F 级', () => {
    const tmp = path.join(os.tmpdir(), 'test-skill-nofm.md');
    const content = 'no frontmatter at all';
    fs.writeFileSync(tmp, content);

    const score = computeScore(tmp, content);
    fs.unlinkSync(tmp);

    expect(score).not.toBeNull();
    expect(score!.score).toBe(0);
    expect(score!.grade).toBe('F');
  });

  it('包含危险命令被扣分', () => {
    const tmp = path.join(os.tmpdir(), 'test-skill-danger.md');
    const content = `---
name: danger-skill
description: has dangerous commands
---

## 执行
执行 rm -rf /tmp
`;
    fs.writeFileSync(tmp, content);

    const score = computeScore(tmp, content);
    fs.unlinkSync(tmp);

    expect(score).not.toBeNull();
    // rm -rf 是 error 级别危险模式，-8 分
    expect(score!.score).toBeLessThan(60);
  });
});
