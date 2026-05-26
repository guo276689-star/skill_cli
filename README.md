# Skills CLI

> AI Agent Skills 包管理器 — 像 npm 管理依赖一样管理你的 Skills。

## 安装

```bash
npm install -g @reasonix/skills-cli
```

## 使用

```bash
# 搜索 GitHub 上的 Skills
skills search "code review"

# 安装 Skill
skills install addyosmani/agent-skills code-review-quality

# 列出本地已安装
skills list

# 健康检查
skills doctor

# 移除 Skill
skills remove code-review-quality
```

## 配置 GitHub Token

`search` 和 `install` 命令需要 GitHub API。设置环境变量以提升限额：

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

Token 可在 [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens) 生成（无需任何 scope）。

## 目录约定

| 作用域 | 路径 |
|--------|------|
| 全局 | `~/.reasonix/skills/` |
| 项目级 | `<project>/.reasonix/skills/` |

## 兼容性

支持 Reasonix、Claude Code、Codex、Cursor 等所有使用 SKILL.md 格式的 AI Agent 平台。
