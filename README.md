# Skills CLI

> **Skills 的 npm — 发现、安装、锁定、检查。**  
> 跨平台 AI Agent Skills 包管理器，支持 Reasonix / Cursor / Claude Code / Codex / Gemini CLI。

```bash
npm install -g github:guo276689-star/skill_cli
skills search "code review" --min-stars 500
skills install addyosmani/agent-skills code-review-and-quality
skills doctor --deep
```

## 一句话定位

传统方式：手动 `curl` → 放到 `~/.reasonix/skills/` → 用眼睛检查格式。

`skills` 把它变成：**`npm search` + `npm install` + `npm audit` + `package-lock.json`**，一站式。

## 安装

```bash
# 方式 1：npm（推荐）
npm install -g github:guo276689-star/skill_cli

# 方式 2：本地开发
git clone https://github.com/guo276689-star/skill_cli.git
cd skill_cli && npm install && npm link
```

## 快速开始

```bash
# 1. 搜索
skills search "test driven" --min-stars 500

# 2. 安装
skills install addyosmani/agent-skills test-driven-development

# 3. 检查质量
skills doctor --deep

# 4. 分享
skills freeze > my-skills.json
```

## 命令参考

| 命令 | 说明 |
|------|------|
| `skills search <kw>` | 搜索 GitHub Skills（⭐×新鲜度 排名） |
| `skills install <repo> [name]` | 安装 Skill |
| `skills update [name]` | 更新（先 diff 再确认） |
| `skills diff <name>` | 对比本地 vs 远程 |
| `skills list [--all]` | 已安装列表 |
| `skills info <name>` | Skill 详情 |
| `skills doctor [--deep]` | 格式检查 / 质量评分 |
| `skills review <name>` | AI 能力评审 |
| `skills freeze [file]` | 导出安装清单 |
| `skills install --from <file>` | 从清单批量安装 |
| `skills bundle [install] <name>` | 套装管理 |
| `skills new <name>` | 创建新 Skill |
| `skills env` | 环境诊断 |
| `skills serve` | 启动 Web UI |
| `skills completion` | Tab 补全脚本 |
| `skills remove <name>` | 删除 Skill |

## 典型工作流

### 个人使用

```bash
skills search "python" --min-stars 1000
skills install some-user/python-tools python-linter
skills doctor --deep
skills review python-linter
```

### 团队共享

```bash
# 你
skills freeze > skills-lock.json
git add skills-lock.json && git commit -m "skills lock"
git push

# 队友
git pull
skills install --from skills-lock.json
skills doctor
```

### 日常维护

```bash
skills update              # 列出可更新
skills update python-linter # diff → 确认 → 更新
```

## 多工具兼容

`skills` 自动扫描所有主流 AI Agent 的 Skills 目录：

| 工具 | 路径 |
|------|------|
| Reasonix | `~/.reasonix/skills/` `<project>/.reasonix/skills/` |
| Claude Code | `~/.claude/skills/` |
| Cursor | `~/.cursor/skills/` `<project>/.cursor/skills/` |
| Codex | `~/.codex/skills/` |
| Gemini CLI | `~/.gemini/skills/` |
| Antigravity | `~/.agents/skills/` |

```bash
skills list --all   # 全盘扫描
```

## GITHUB_TOKEN

`search` 和 `install` 需要 GitHub API 认证：

```bash
# Windows (cmd)
set GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# Mac / Linux
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

Token 在 [GitHub Settings → Tokens](https://github.com/settings/tokens) 生成，**无需勾选任何权限**（只提 API 限额，从 60/h → 5000/h）。

## 评分体系

`skills doctor --deep` 从 5 维度给每个 Skill 打分：

| 维度 | 检查什么 |
|------|---------|
| Frontmatter 完整性 (22) | name / description / runAs |
| Body 质量 (25) | 行数 / 结构化步骤 / 检查清单 |
| 内容深度 (18) | 指令具体性 / 约束覆盖 / 输出格式 / 代码示例 / 边界处理 |
| 配置质量 (12) | model / allowedTools |
| 安全性 (23) | 危险命令检测（eval / rm -rf / curl | sh） |

## 开发

```bash
git clone https://github.com/guo276689-star/skill_cli.git
cd skill_cli
npm install
npm run build
npm link
skills list
```

## License

MIT
