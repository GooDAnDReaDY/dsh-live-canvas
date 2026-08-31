# 📦 @goodandready/dsh-live-canvas

<div align="center">

<h3>交互式可视化前端开发工作室、Split-View 代码编辑器、组件 Storybook UI Kit、拖拽排版画布、设计组件库及一键 Vite 打包导出工具 (适用于 DeepSeek Harness)</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/@goodandready/dsh-live-canvas"><img src="https://img.shields.io/npm/v/@goodandready/dsh-live-canvas.svg?style=for-the-badge&color=6366f1&labelColor=1e1b4b" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-10b981.svg?style=for-the-badge&color=10b981&labelColor=064e3b" alt="license"></a>
  <a href="https://github.com/topics/dsh-plugin"><img src="https://img.shields.io/badge/DSH-Plugin-8b5cf6.svg?style=for-the-badge&labelColor=2e1065" alt="DSH Plugin"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node-20%2B-f59e0b.svg?style=for-the-badge&labelColor=451a03" alt="Node version"></a>
</p>

<p align="center">
  <a href="https://goodandready.app/"><img src="https://img.shields.io/badge/作者全部项目-goodandready.app-ff4500.svg?style=for-the-badge&logo=rocket&logoColor=white&labelColor=1a1a2e" alt="作者全部项目"></a>
</p>

<p align="center">
  <a href="README.md"><b>🇬🇧 English</b></a> •
  <a href="README.ru.md"><b>🇷🇺 Русский</b></a> •
  <a href="README.zh.md"><b>🇨🇳 中文说明</b></a>
</p>

</div>

---

## ⚡ 概述与核心痛点

在 AI 智能体工作区中开发与调试前端组件时，通常面临以下瓶颈：
- **盲目代码生成**：智能体生成 HTML/JSX 代码后，开发者必须切换到外部浏览器或构建工具查看效果；
- **状态丢失**：常规重载会重置组件内部状态及响应式断点；
- **多文件引用失效**：组件经常引用本地子模块 (`./Header.jsx`, `./theme.css`, `./data.js`) 或本地图片，传统 iframe 沙箱无法解析；
- **微调成本高昂**：微调文案或样式需要发起完整的对话往返，无法在画布上就地即时修改。

**`dsh-live-canvas`** 将 DeepSeek Harness 升级为免配置的交互式可视化前端工作室。提供实时热重载画布、递归多文件 ESM 打包器、双击内联 WYSIWYG 文本编辑、悬浮式 Tailwind 样式微调条、Split-View 分屏代码抽屉、自动 Storybook UI Kit 生成器、画布区块拖拽排版、精品 UI 设计组件库及一键 Vite 项目导出。

---

## ✨ 核心特性矩阵

### 1. 多文件递归 ESM 打包器 (`lib/transpiler.js`)
- 自动递归解析相对导入 (`./Header.jsx`, `./components/Card.tsx`, `./data.js`, `./styles.css`)；
- 内联子模块至隔离的 Babel 执行模板中，并通过 `GET /dsh-live-canvas/assets/*` 安全流式提供本地图片与静态资源。

### 2. Split-View 分屏代码编辑器抽屉 (`lib/client.js`)
- 点击顶部工具栏 **`💻 代码`** 按钮即可呼出侧边等宽代码编辑器；
- 双向实时同步：编辑器改动自动防抖刷新画布并保存至磁盘；在检查器中选择 DOM 元素自动联动高亮对应源码。

### 3. 组件 Storybook UI Kit 探索器 (`lib/storybook.js`)
- 点击 **`🧩 UI Kit`** 按钮或调用智能体工具 `live_canvas_storybook`；
- 自动扫描工作区所有 `.jsx`、`.tsx`、`.vue` 组件并生成多状态并排对比画廊。

### 4. 可视化拖拽重排 (Drag & Drop) (`lib/sandbox.js`)
- 开启工具栏 **`↕️ D&D`** 模式；
- 支持自由拖拽 `<section>`、`<header>`、`<footer>`、`<nav>` 及卡片容器；
- 重排后的 DOM 结构通过 `POST /dsh-live-canvas/api/save-reorder` 实时同步保存至本地源码文件。

### 5. 高端设计组件库 (`lib/templates.js`)
- 点击 **`✨ 模块`** 按钮或调用 `live_canvas_insert_block` 快速插入：
  - **Glowing Mesh Agency Hero**: 暗色光晕弥散背景、状态徽章、双主行动按钮；
  - **Glassmorphic Bento Grid**: 磨砂玻璃质感非对称卡片与微动效指标；
  - **SaaS 3-Tier Pricing Table**: 3 列现代价格对比表与功能勾选清单；
  - **Modern Dark FAQ Accordion**: 平滑展开折叠常见问题卡片；
  - **Minimalist Agency Footer**: 简约暗黑页脚与实时系统运行状态点。

### 6. 双击内联 WYSIWYG 与悬浮 Tailwind 微调条 (`lib/sandbox.js`)
- **双击即刻编辑**：双击画布任意文字即可直接编辑，按 <kbd>Enter</kbd> 保存并回写磁盘源码；
- **悬浮微调工具栏**：开启检查器时点击元素，即可快速调整文字颜色、内边距、圆角与阴影。

---

## 🛠️ 智能体工具一览表 (共 17 个)

| 工具名称 | 功能描述 | 输出与响应 |
|---|---|---|
| `live_canvas_preview` | 渲染或更新 HTML/React/SVG/Mermaid 预览会话 | `previewUrl`, `canvasId` |
| `live_canvas_inspect` | 获取用户点击的 DOM 元素信息、CSS 选择器与属性 | `inspections: [...]` |
| `live_canvas_reload` | 强制向当前打开的预览画布广播 SSE 热重载事件 | 热重载广播 |
| `live_canvas_diagnose`| 查询沙箱控制台错误与异常，实现智能体自主修复 | `logs: [...]`, `hasErrors` |
| `live_canvas_export` | 导出单文件零依赖独立 HTML 页面 | `downloadUrl`, `savedPath` |
| `live_canvas_annotations` | 检索或清除画布上的矩形批注与用户反馈 | `annotations: [...]` |
| `live_canvas_gallery` | 渲染多组件状态 Storybook 并排对比矩阵 | `variantsCount`, `previewUrl` |
| `live_canvas_watch` | 扫描工作区文件并绑定实时文件监控器 | `files: [...]`, `watchedFiles` |
| `live_canvas_controls`| 调整 Storybook 风格的交互式 Props 滑块与开关 | `values: {...}` |
| `live_canvas_diff` | 分屏滑块对比两个版本快照的视觉差异 | `diffUrl`, `snapshotCount` |
| `live_canvas_matrix` | 渲染多设备响应式屏幕矩阵 (手机、平板、桌面) | `matrixUrl` |
| `live_canvas_mock` | 配置沙箱内部拦截的 Mock REST API 接口及数据集 | `endpointsCount`, `mockData` |
| `live_canvas_pack` | 一键生成包含完整依赖的 Vite+React / Vite+Vue ZIP 包 | `downloadUrl`, `writtenDir` |
| `live_canvas_refine_element` | 针对特定 DOM 元素执行精准的 AI 样式与结构优化 | 画布热重载 |
| `live_canvas_storybook` | 自动扫描组件并构建 Storybook UI Kit 对比画廊 | `galleryUrl`, `componentsCount` |
| `live_canvas_insert_block` | 在项目中插入预置高端设计模块 (Hero, Bento, Pricing 等) | `blockId`, `title` |
| `live_canvas_vision_import`| 导入屏幕截图 / 设计稿并转换为实时交互代码 | `previewUrl`, `framework` |

---

## 📦 安装说明

在 DeepSeek Harness 环境中一键安装：

```bash
dsh plugin --profile web add @goodandready/dsh-live-canvas
```

---

## 📄 开源许可证

MIT © [GooDAnDReaDY](https://github.com/GooDAnDReaDY)

