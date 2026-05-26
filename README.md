# Skills CLI

> AI Agent Skills 包管理器 — 搜索/安装/管理 Reasonix & Claude Code Skills

## 安装

```bash
npm install -g github:guo276689-star/skills-cli
```

## 使用

```bash
# 搜索 GitHub 上的 Skills
skills search "code review"

# 安装 Skill
skills install addyosmani/agent-skills code-review-and-quality

# 列出本地已安装
skills list

# 健康检查
skills doctor

# 移除 Skill
skills remove code-review-and-quality
```

## 配置 GitHub Token

`search` 和 `install` 需要 GitHub API：

```bash
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

## 开发

```bash
git clone https://github.com/guo276689-star/skills-cli.git
cd skills-cli
npm install
npm run build
```
