# 📦 @goodandready/dsh-live-canvas

<div align="center">

<h3>DeepSeek Harness 实时网页沙箱、DOM 元素检查器、视觉 Diff 对比与一键 Vite 项目打包插件</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/@goodandready/dsh-live-canvas"><img src="https://img.shields.io/npm/v/@goodandready/dsh-live-canvas.svg?style=for-the-badge&color=6366f1&labelColor=1e1b4b" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/GooDAnDReaDY/dsh-live-canvas.svg?style=for-the-badge&color=10b981&labelColor=064e3b" alt="license"></a>
  <a href="https://github.com/topics/dsh-plugin"><img src="https://img.shields.io/badge/DSH-Plugin-8b5cf6.svg?style=for-the-badge&labelColor=2e1065" alt="DSH Plugin"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node-20%2B-f59e0b.svg?style=for-the-badge&labelColor=451a03" alt="Node version"></a>
</p>

<!-- 官方插件展示中心跳转按钮 -->
<p align="center">
  <a href="https://goodandready.app/"><img src="https://img.shields.io/badge/🌐_DSH_Hub-goodandready.app-ff4500.svg?style=for-the-badge&labelColor=1a1a2e" alt="GoodAndReady Showcase"></a>
</p>

<p align="center">
  <a href="README.md"><b>🇬🇧 English</b></a> •
  <a href="README.ru.md"><b>🇷🇺 Русский</b></a> •
  <a href="README.zh.md"><b>🇨🇳 中文说明</b></a>
</p>

</div>

---

## ⚡ 插件概览

**`dsh-live-canvas`** 为 **DeepSeek Harness** 智能体提供实时交互式前端沙箱，支持秒级编译、实时渲染与可视化调试。

智能体输出 HTML、React 18 (JSX/TSX)、Vue、SVG、Mermaid 架构图或 Markdown 文档时，插件自动实时构建并渲染预览，支持 **SSE 热重载、DOM 元素悬浮点击检查、视觉 Diff 差分对比、多设备响应式矩阵以及一键 Vite ZIP 项目导出**。

```mermaid
graph LR
    subgraph AgentLoop [DSH 智能体执行流]
        Agent[🤖 智能体编写前端代码] --> Tool[调用工具: live_canvas_preview]
    end

    subgraph CanvasCore [dsh-live-canvas 引擎核心]
        Tool --> Transpiler[Babel 浏览器端实时转译器]
        Transpiler --> Sandbox[独立 Iframe 安全沙箱]
        Sandbox --> SSE[SSE 热重载监听流]
    end

    subgraph Features [交互式开发套件]
        Sandbox --> Inspector[🔍 DOM 悬浮点击检查器]
        Sandbox --> Diff[🌓 视觉版本滑动 Diff]
        Sandbox --> Matrix[📱 多尺寸设备响应式矩阵]
        Sandbox --> Pack[📦 一键 Vite ZIP 项目打包]
    end

    subgraph WebUI [Live Canvas 侧边预览面板]
        SSE --> Panel[实时交互式预览界面]
        Inspector --> Agent
        Diff --> Panel
        Matrix --> Panel
    end

    style AgentLoop fill:#1e1e2e,stroke:#89b4fa,stroke-width:2px,color:#cdd6f4
    style CanvasCore fill:#181825,stroke:#cba6f7,stroke-width:2px,color:#cdd6f4
    style Features fill:#11111b,stroke:#a6e3a1,stroke-width:2px,color:#cdd6f4
    style WebUI fill:#181825,stroke:#f38ba8,stroke-width:2px,color:#cdd6f4
```

---

## 📦 安装指南

```bash
dsh plugin --profile web add @goodandready/dsh-live-canvas
```

---

## 📄 开源协议

MIT © [GooDAnDReaDY](https://github.com/GooDAnDReaDY)
