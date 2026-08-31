# 📦 @goodandready/dsh-live-canvas

<div align="center">

<h3>Интерактивная песочница живого превью, DOM-инспектор, визуальный Diff, матрица устройств и сборка Vite-проекта в 1 клик для DeepSeek Harness</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/@goodandready/dsh-live-canvas"><img src="https://img.shields.io/npm/v/@goodandready/dsh-live-canvas.svg?style=for-the-badge&color=6366f1&labelColor=1e1b4b" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-10b981.svg?style=for-the-badge&color=10b981&labelColor=064e3b" alt="license"></a>
  <a href="https://github.com/topics/dsh-plugin"><img src="https://img.shields.io/badge/DSH-Plugin-8b5cf6.svg?style=for-the-badge&labelColor=2e1065" alt="DSH Plugin"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node-20%2B-f59e0b.svg?style=for-the-badge&labelColor=451a03" alt="Node version"></a>
</p>

<p align="center">
  <a href="https://goodandready.app/"><img src="https://img.shields.io/badge/Все_проекты_автора-goodandready.app-ff4500.svg?style=for-the-badge&logo=rocket&logoColor=white&labelColor=1a1a2e" alt="Все проекты автора"></a>
</p>

<p align="center">
  <a href="README.md"><b>🇬🇧 English</b></a> •
  <a href="README.ru.md"><b>🇷🇺 Русский</b></a> •
  <a href="README.zh.md"><b>🇨🇳 中文说明</b></a>
</p>

</div>

---

## ⚡ Обзор

**`dsh-live-canvas`** даёт агентам **DeepSeek Harness** интерактивную браузерную песочницу для мгновенной визуализации, вёрстки и тестирования фронтенд-компонентов в реальном времени.

Когда агент генерирует код на HTML, React 18 (JSX/TSX), Vue, SVG, диаграммы Mermaid или Markdown, плагин мгновенно компилирует и отображает интерфейс в боковой панели с поддержкой **горячей перезагрузки (SSE Hot-Reload), инспектора элементов по клику, визуального сравнения версий (Diff), матрицы мобильных экранов и экспорта в готовый проект Vite в 1 клик**.

```mermaid
graph LR
    subgraph AgentLoop [Цикл работы агента DSH]
        Agent[🤖 Агент пишет UI-код] --> Tool[Инструмент: live_canvas_preview]
    end

    subgraph CanvasCore [Ядро dsh-live-canvas]
        Tool --> Transpiler[Браузерный Babel и JIT-транспайлер]
        Transpiler --> Sandbox[Изолированная песочница Iframe]
        Sandbox --> SSE[Поток горячей перезагрузки SSE]
    end

    subgraph Features [Набор интерактивных инструментов]
        Sandbox --> Inspector[🔍 DOM-инспектор по клику]
        Sandbox --> Diff[🌓 Визуальный Diff-слайдер]
        Sandbox --> Matrix[📱 Матрица мобильных экранов]
        Sandbox --> Pack[📦 Экспорт в Vite ZIP в 1 клик]
    end

    subgraph WebUI [Боковая панель Live Canvas]
        SSE --> Panel[Живое интерактивное превью]
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

## ✨ Ключевые возможности

### 1. 🎨 Мультиформатный рендеринг в реальном времени
* **React 18 JSX/TSX**: компиляция Babel Standalone на лету, изоляция ошибок Error Boundary и сохранение состояния компонентов.
* **HTML + Tailwind CSS + Lucide Icons**: рендеринг разметки с подключением JIT Tailwind CSS и нативных иконок Lucide.
* **SVG-графика**: векторный просмотрщик с переключением сетки прозрачности и зумом.
* **Mermaid и Markdown**: отображение архитектурных диаграмм (Sequence, Flowchart) и форматированного текста.

### 2. 🔍 Интерактивный DOM-инспектор (`live_canvas_inspect`)
Позволяет пользователю и агенту навести курсор и кликнуть на любой элемент превью:
* Получение точного CSS-селектора и иерархии DOM;
* Выгрузка вычисленных стилей, размеров, цветов и отступов;
* Мгновенный цикл обратной связи для самоисправления агента.

### 3. 🌓 Визуальное сравнение версий (`live_canvas_diff`)
Интерактивный слайдер «до/после» для наглядной проверки регрессий верстки.

### 4. 📱 Матрица мобильных устройств (`live_canvas_matrix`)
Одновременное отображение интерфейса на экранах Смартфона (iPhone/Pixel), Планшета (iPad) и Десктопа.

### 5. 📦 Экспорт в готовый Vite ZIP-проект в 1 клик (`live_canvas_pack`)
Упаковывает текущий компонент в полноценный проект **Vite + React / Vue + TypeScript** с настроенными `package.json`, `vite.config.ts` и Tailwind, готовый к запуску через `npm run dev`.

---

## 🛠️ Справочник инструментов агента (13 инструментов)

| Имя инструмента | Параметры | Описание |
|---|---|---|
| `live_canvas_preview` | `code`, `format`, `title` | Отображает или обновляет превью (HTML, React, SVG, Mermaid, Markdown) |
| `live_canvas_inspect` | `selector` | Инспектирует элементы DOM, вычисленные стили и геометрию |
| `live_canvas_reload` | `preserveState` | Вызывает немедленную горячую перезагрузку песочницы |
| `live_canvas_diagnose` | `limit` | Получает логи консоли, ошибки выполнения и телеметрию |
| `live_canvas_export` | `format` | Генерирует автономный single-file HTML документ |
| `live_canvas_annotations`| `items` | Накладывает рамки подсветки и комментарии поверх интерфейса |
| `live_canvas_gallery` | `stories` | Рендерит галерею компонентов в стиле Storybook |
| `live_canvas_watch` | `path`, `glob` | Следит за файлами рабочей директории для авто-обновления |
| `live_canvas_controls` | `props` | Генерирует интерактивные ползунки для управления свойствами компонента |
| `live_canvas_diff` | `baseCode`, `newCode` | Рендерит визуальный Diff-слайдер между двумя версиями |
| `live_canvas_matrix` | `devices` | Генерирует мультиэкранную адаптивную сетку превью |
| `live_canvas_mock` | `schema` | Генерирует реалистичные мок-данные для наполнения компонентов |
| `live_canvas_pack` | `projectName` | Собирает и скачивает ZIP-архив с готовым Vite-проектом |

---

## 📦 Быстрая установка

```bash
dsh plugin --profile web add @goodandready/dsh-live-canvas
```

---

## ⚙️ Пример конфигурации (`settings.yaml`)

```yaml
dsh-live-canvas:
  enabled: true
  autoOpenOnCode: true
  enableInspector: true
  enableHotReload: true
  defaultTheme: dark
  maxBundleSizeBytes: 5242880
```

---

## 📄 Лицензия

MIT © [GooDAnDReaDY](https://github.com/GooDAnDReaDY)
