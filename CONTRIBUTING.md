# 贡献指南

## 开发

```bash
git clone https://github.com/guo276689-star/skill_cli.git
cd skill_cli
npm install
npm run build
npm link
skills list
```

## 目录结构

```
src/
  commands/   # CLI 命令（search/install/doctor...）
  core/       # 核心逻辑（github/installer/validator...）
  web/        # Web UI 前端
```

## 提交规范

- `feat: xxx` — 新功能
- `fix: xxx` — 修复
- `docs: xxx` — 文档
- `chore: xxx` — 构建/依赖

## PR Checklist

- [ ] `npm run build` 通过
- [ ] 核心逻辑有测试覆盖
- [ ] 如果是新命令，README 命令表已更新
- [ ] 如果是 CLI 行为变更，help 文本已同步
