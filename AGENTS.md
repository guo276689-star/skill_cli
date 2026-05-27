# AGENTS.md — skills-cli

> 给 AI Agent（Reasonix / Claude Code / Codex 等）看的项目规则手册。

## 项目概述

`skills-cli` 是跨平台 AI Agent Skills 包管理器。核心功能：搜索 GitHub SKILL.md → 安装到本地 → doctor 质量检查 → freeze 导出 lock 文件。

## 目录结构

```
src/
  commands/   # 16 个 CLI 命令
  core/       # 核心逻辑（github / installer / scanner / validator / tracker / diff）
  web/        # Web UI 前端（skills serve）
```

## 关键约束

- **dist/ 不提交 git**：`.gitignore` 已排除，`prepublishOnly` 自动构建
- **工具名适配**：`read_file`/`edit_file`/`search_content`/`run_command`（Reasonix），不是 Claude Code 的 Read/Edit/Grep/Bash
- **Windows 路径**：项目在 `D:\比赛\项目\项目三\skills-cli`，D 盘副本在 `D:\skill_cli`
- **编码**：全部 UTF-8，Windows CRLF 警告可忽略
- **测试**：`npm test` 运行 vitest，2 个文件 19 个测试

## 命令速查

```
search install update diff freeze bundle new
list info review doctor env completion
serve remove
```

## 环境变量

- `GITHUB_TOKEN` — search/install 需要（无需 scope，只提限额）

## 发布

- GitHub：`guo276689-star/skill_cli`
- 安装：`git clone` → `npm install` → `npm link`
