# Skills CLI

> AI Agent Skills 包管理器 — 搜索/安装/管理 Reasonix & Claude Code Skills

## 安装

```bash
git clone https://github.com/guo276689-star/skill_cli.git
cd skill_cli
npm install
npm link
```

## 使用

```bash
# 搜索 GitHub 上的 Skills（热门 + 近期更新）
skills search "code review" --min-stars 100

# 只看最近 3 个月更新的
skills search react --updated-within 3m

# 安装 Skill
skills install addyosmani/agent-skills code-review-and-quality

# 列出本地已安装
skills list

# 查看 Skill 详细信息
skills info audit-security

# 健康检查
skills doctor

# 移除 Skill
skills remove code-review-and-quality
```

## 配置 GitHub Token

`search` 和 `install` 需要 GitHub API：

```bash
# Windows (cmd)
set GITHUB_TOKEN=你的token

# Mac/Linux
export GITHUB_TOKEN=你的token
```

Token 在 [GitHub Settings → Tokens](https://github.com/settings/tokens) 生成，无需任何 scope。

## 目录约定

| 作用域 | 路径 |
|--------|------|
| 全局 | `~/.reasonix/skills/` |
| 项目级 | `<project>/.reasonix/skills/` |

## 兼容性

支持 Reasonix、Claude Code、Codex、Cursor 等所有使用 SKILL.md 格式的 AI Agent 平台。
