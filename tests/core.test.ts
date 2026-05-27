import { describe, it, expect } from 'vitest';

// 直接导入被测函数（绕过 CLI 层）
import { sanitizeSkillName, validateRepoFormat } from '../src/core/installer';
import { parseFrontmatterRaw } from '../src/core/github';

describe('sanitizeSkillName', () => {
  it('保留合法字符', () => {
    expect(sanitizeSkillName('code-review')).toBe('code-review');
  });

  it('点号转为连字符', () => {
    expect(sanitizeSkillName('my.skill')).toBe('my-skill');
  });

  it('特殊字符全部替换', () => {
    expect(sanitizeSkillName('evil<script>')).toBe('evil-script-');
  });

  it('中文替换为连字符', () => {
    expect(sanitizeSkillName('我的skill')).toBe('--skill');
  });

  it('空字符串返回空', () => {
    // sanitizeSkillName 只负责净化，空字符串保护在 installSkill 层
    expect(sanitizeSkillName('')).toBe('');
  });
});

describe('validateRepoFormat', () => {
  it('owner/repo 格式通过', () => {
    expect(validateRepoFormat('addyosmani/agent-skills')).toBe(true);
  });

  it('含点的 owner 通过', () => {
    expect(validateRepoFormat('sickn33/antigravity-awesome-skills')).toBe(true);
  });

  it('纯字符串拒绝', () => {
    expect(validateRepoFormat('not-a-repo')).toBe(false);
  });

  it('含 github.com 前缀拒绝', () => {
    expect(validateRepoFormat('github.com/user/repo')).toBe(false);
  });

  it('含 ? 拒绝', () => {
    expect(validateRepoFormat('owner/repo?query')).toBe(false);
  });
});

describe('parseFrontmatterRaw', () => {
  it('正常解析', () => {
    const content = '---\nname: test\ndescription: hello\n---\nbody';
    const fm = parseFrontmatterRaw(content);
    expect(fm.name).toBe('test');
    expect(fm.description).toBe('hello');
  });

  it('缺失 frontmatter 返回空对象', () => {
    expect(parseFrontmatterRaw('just body')).toEqual({});
  });

  it('name 不存在返回 undefined', () => {
    const content = '---\ndescription: only desc\n---\nbody';
    const fm = parseFrontmatterRaw(content);
    expect(fm.name).toBeUndefined();
    expect(fm.description).toBe('only desc');
  });

  it('损坏的 YAML 不崩溃', () => {
    const content = '---\n!!bad yaml!!!\n---\nbody';
    expect(() => parseFrontmatterRaw(content)).not.toThrow();
  });

  it('多行值正确提取', () => {
    const content = '---\nname: multi-line-skill\ndescription: line1\n---\nbody';
    const fm = parseFrontmatterRaw(content);
    expect(fm.name).toBe('multi-line-skill');
  });
});
