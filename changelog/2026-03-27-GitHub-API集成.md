# 2026-03-27 GitHub API 集成与生产环境修复

## 变更内容

### 1. GitHub API 集成

#### 新增 API 模块
- 添加 `src/api/github.js` 封装 GitHub Contents API
- 支持读取和更新仓库中的配置文件
- 自动处理 Base64 编码和 SHA 校验

#### 基金管理保存功能
- `FundManageModal.vue` 集成 GitHub API
- 添加基金后可通过界面直接保存到 GitHub
- 自动更新 `fund_codes.json` 和 `fund_groups.json`

#### 环境配置
- 支持 `VITE_GITHUB_TOKEN` 环境变量
- GitHub Actions 自动注入 Token
- 指定 `lyl-dev-claude` 分支进行读写

### 2. 生产环境修复

#### API 路径修复
- 修复 `pingzhongdata` 接口在生产环境 404 错误
- 生产环境直接访问 `fund.eastmoney.com` 源站
- 开发环境继续使用 Vite 代理

#### 跨域处理
- 添加必要的 `Referer` 和 `User-Agent` 请求头
- 自动检测开发/生产环境切换 API 基础路径

## 配置说明

### 本地开发

创建 `.env.local`：
```
VITE_GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

### GitHub Actions 部署

在仓库 Settings → Secrets → Actions 中添加：
- Name: `VITE_GITHUB_TOKEN`
- Value: GitHub Personal Access Token（需 `repo` 权限）

## 涉及文件

- `src/api/github.js` - 新增 GitHub API 封装
- `src/api/funds.js` - 修复生产环境 API 调用
- `src/components/FundManageModal.vue` - 集成保存功能
- `.github/workflows/pages-deploy.yml` - 配置环境变量注入
