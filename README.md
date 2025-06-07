# TCMT (TypeScript Cross-platform Management Tool)

<p align="center">基于 Electron + Vue 3 + TypeScript + SQLite3 的现代化跨平台桌面应用</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-31.3.1-47848F.svg?style=flat-square&logo=electron" />
  <img src="https://img.shields.io/badge/Vue.js-3.5.x-4FC08D.svg?style=flat-square&logo=vue.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.5.2-3178C6.svg?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/SQLite-3-003B57.svg?style=flat-square&logo=sqlite" />
</p>

## 📚 目录

- [快速开始](#-快速开始)
- [技术栈](#-技术栈)
- [特性](#-特性)
- [开发环境](#-开发环境)
- [项目设置](#-项目设置)
- [项目结构](#-项目结构)
- [开发指南](#-开发指南)
- [测试](#-测试)
- [构建](#-构建)
- [部署](#-部署)
- [依赖说明](#-依赖说明)
- [常见问题](#-常见问题)

## ⚡ 快速开始

### 环境准备

确保你的开发环境满足以下要求：

```bash
node -v  # >= 18
pnpm -v  # >= 8
git --version
```

### 克隆项目

```bash
git clone https://github.com/yourusername/tcmt.git
cd tcmt
pnpm install
pnpm dev
```

## 💻 技术栈

### 核心框架

- **前端框架**: Vue 3.5.x (Composition API)
    - `<script setup>` 语法
    - TypeScript 支持
    - 组件自动导入
- **桌面框架**: Electron 31.3.1
    - 主进程/渲染进程架构
    - IPC 通信
    - 原生功能集成
- **UI 框架**: Element Plus 2.8.x
    - 自定义主题
    - 组件按需加载
    - 图标自动导入

### 开发工具

- **构建工具**

    - Vite 5.3.x
    - electron-vite 2.3.0
    - electron-builder 24.13.x

- **数据库**
    - SQLite3 5.1.7
    - Knex 3.1.0 (SQL 查询构建器)

### 工程化

- TypeScript 5.5.2
- ESLint + Prettier
- Jest + Cypress

## ✨ 特性

### 核心功能

- 🎯 TypeScript 全栈支持
- 📦 跨平台应用支持
- 💪 Vue 3 Composition API
- 🔥 Vite 热更新
- 🎨 Element Plus UI
- 💾 SQLite3 数据库
- 📊 Knex 查询构建
- ✅ 自动化测试
- 🌈 主题定制
- 🔄 自动更新
- 📝 日志系统

### 开发体验

- 快速的热重载
- 完整的类型提示
- 代码规范自动修复
- 组件按需加载
- 自动化测试支持

## 🛠 开发环境

- Node.js >= 18
- pnpm >= 8
- Git
- VSCode (推荐)
    - Volar
    - ESLint
    - Prettier

## 📦 项目设置

### 开发命令

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 类型检查
pnpm typecheck

# 代码格式化
pnpm format

# 代码检查
pnpm lint
```

### 推荐 IDE 设置

```json
{
	"editor.formatOnSave": true,
	"editor.codeActionsOnSave": {
		"source.fixAll.eslint": true
	}
}
```

## 📁 项目结构

```
├── src/
│   ├── main/                 # Electron 主进程
│   │   ├── modules/         # 主进程模块
│   │   ├── services/        # 主进程服务
│   │   └── utils/          # 工具函数
│   ├── renderer/            # Vue 前端代码
│   │   ├── components/     # 公共组件
│   │   ├── composables/    # 组合式函数
│   │   ├── layouts/        # 布局组件
│   │   ├── pages/         # 页面组件
│   │   ├── stores/        # Pinia 状态
│   │   └── utils/         # 工具函数
│   └── preload/            # 预加载脚本
├── scripts/                # 构建脚本
├── patches/                # 依赖补丁
├── docker/                # Docker 配置
├── tests/                 # 测试文件
└── types/                # 类型定义
```

## 📖 开发指南

### Git 提交规范

```bash
feature: 新功能
fix: 修复问题
docs: 文档变更
style: 代码格式
test: 测试相关
```

### 数据库操作

```typescript
// 查询示例
import { db } from '@/database'

const users = await db('users').select('*').where('active', true)
```

### IPC 通信

```typescript
// 主进程
ipcMain.handle('database:query', async (event, query) => {
	return await db.raw(query)
})

// 渲染进程
const result = await window.electron.ipcRenderer.invoke('database:query', query)
```

## 🧪 测试

### 单元测试

```bash
# Jest 测试
pnpm test:unit

# 监听模式
pnpm test:unit:watch
```

### E2E 测试

```bash
# Cypress 测试
pnpm cyp:unit

# 开发模式
pnpm cyp:open
```

## 🚀 构建

### 开发构建

```bash
# 开发模式
pnpm dev
```

### 生产构建

> 注意：打包时请关闭杀毒软件，否则可能出现意外错误。

```bash
# Windows 构建
pnpm build:win

# macOS 构建
pnpm build:mac

# Linux 构建
pnpm build:linux

# Docker Linux 构建
pnpm build:linux:win
```

## 📦 依赖说明

### 主要依赖

- `electron`: 跨平台桌面应用框架
- `vue`: 前端框架
- `element-plus`: UI 组件库
- `sqlite3`: 本地数据库
- `knex`: SQL 查询构建器
- `pinia`: 状态管理
- `electron-updater`: 自动更新
- `electron-log`: 日志系统

### 开发依赖

- `electron-vite`: 构建工具
- `typescript`: 类型支持
- `jest`: 单元测试
- `cypress`: E2E 测试
- `eslint`: 代码检查
- `prettier`: 代码格式化
- `sass`: 样式预处理器

### 补丁说明

```json
"patchedDependencies": {
  "sqlite3@5.1.7": "patches/sqlite3@5.1.7.patch",
  "element-plus@2.8.7": "patches/element-plus@2.8.7.patch"
}
```

## ❓ 常见问题

### 1. 安装问题

#### node-gyp 编译失败

- Windows: 安装 Visual Studio Build Tools
- macOS: 安装 Xcode Command Line Tools
- Linux: 安装 build-essential

#### Electron 下载失败

```bash
# 设置镜像
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
```

### 2. 开发问题

#### 热重载不生效

- 检查文件监听设置
- 清除缓存
- 重启开发服务器

#### 数据库连接失败

- 检查路径权限
- 验证 SQLite3 安装
- 检查数据库文件

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

[MIT License](LICENSE)
