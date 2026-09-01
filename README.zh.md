# 📦 @goodandready/dsh-live-canvas

<div align="center">

<h3>交互式可视化前端开发工作室、Retool 风格 CRUD 数据看板、Time-Travel 时间旅行调试器、多平台一键部署 (Vercel, Cloudflare, Netlify, Gist)、Figma 矢量桥接及 30 个智能体工具 (适用于 DeepSeek Harness)</h3>

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

## ⚡ 里程碑 v0.2.0 核心能力

**`dsh-live-canvas`** 将 DeepSeek Harness 升级为下一代可视化前端开发工作室与交互式构件运行环境，包含 **30 个智能体工具**：
- **🗄️ Retool 风格 CRUD 看板**：可搜索数据表格、状态筛选器、新增/编辑弹窗及 CSV 导出。
- **⏳ Time-Travel 时间旅行调试器**：无需手动 Git 检出即可在历史快照间前后滑动对比并一键回滚。
- **🌍 一键多平台 Web 部署**：秒级生成 **Vercel**、**Cloudflare Pages**、**Netlify** 与 **GitHub Gist** 部署包。
- **🎨 Figma & Penpot 矢量桥接**：Figma SVG 矢量代码与 Tailwind 组件双向转换及图层导出。
- **🔊 UI 音效与微交互**：基于 Web Audio API 的触觉反馈音频合成 (点击、切换、成功提示音)。
- **📋 Effective HTML 构件库**：低保真线框图、持久化路线图、动态架构图与多步向导。
- **💬 对话框内交互式预览卡片**：在聊天消息中直接操作嵌入式预览，并支持一键唤起侧边栏 Live Canvas 工作区。

---

## 🛠️ 智能体工具一览表 (共 30 个)

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
| `live_canvas_visual_audit` | 自动化视觉审计：检查溢出、色彩对比度与响应式断点 | `score`, `issuesCount`, `issues` |
| `live_canvas_generate_mock`| 生成逼真的 JSON Mock 数据集并挂载至沙箱拦截器 | `datasetType`, `mockData` |
| `live_canvas_share` | 生成手机端实时预览二维码及局域网共享链接 | `shareUrl`, `qrSvg` |
| `live_canvas_create_wireframe` | 生成低保真结构蓝图线框图 HTML 构件 | `previewUrl`, `layout` |
| `live_canvas_create_plan` | 生成包含持久化状态的交互式发布计划与路线图 | `previewUrl`, `version` |
| `live_canvas_create_diagram` | 生成动态交互式架构系统关系与数据流向图 | `previewUrl`, `diagramType` |
| `live_canvas_create_prototype` | 生成包含平滑转场的多步骤交互向导原型 | `previewUrl`, `flowType` |
| `live_canvas_resolve_annotation` | 将画布上的用户批注标记为已解决并记录说明 | `status: 'resolved'` |
| `live_canvas_create_crud` | 生成包含搜索、筛选与弹窗的 Retool 风格 CRUD 数据看板 | `previewUrl`, `entityName` |
| `live_canvas_timetravel` | 历史版本时间旅行滑动对比与一键回滚 | `timetravelUrl`, `snapshotsCount` |
| `live_canvas_instant_deploy` | 生成适用于 Vercel、Cloudflare、Netlify 与 Gist 的部署包 | `downloadUrl`, `instructions` |
| `live_canvas_figma_bridge` | Figma SVG 矢量代码转换为 Tailwind 组件或导出 SVG | `action`, `componentName` |
| `live_canvas_sound_fx` | Web Audio 交互音效合成与预览 (点击、弹窗、成功音) | `presetsCount`, `soundType` |

---

## 📦 安装说明

```bash
dsh plugin --profile web add @goodandready/dsh-live-canvas
```

---

## 📄 开源许可证

MIT © [GooDAnDReaDY](https://github.com/GooDAnDReaDY)

