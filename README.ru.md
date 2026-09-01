# 📦 @goodandready/dsh-live-canvas

<div align="center">

<h3>Интерактивная дизайн-студия, Retool-подобные CRUD панели, Time-Travel отладчик, мгновенный деплой (Vercel, Cloudflare, Netlify, Gist), Figma Vector Bridge, саунд-дизайн и 30 инструментов агента для DeepSeek Harness</h3>

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

## ⚡ Обзор возможностей: Майлстоун v0.2.0

**`dsh-live-canvas`** превращает DeepSeek Harness в ультрасовременную визуальную среду frontend-разработки и генерации интерактивных артефактов с **30 инструментами агента**:
- **🗄️ Retool-Style CRUD Admin Studio**: Таблицы данных с поиском, фильтрами статусов, модалками создания/редактирования и экспортом в CSV.
- **⏳ Time-Travel Debugger & Слайдер истории**: Пошаговая отмотка верстки и состояния назад/вперед во времени без ручных git checkout.
- **🌍 1-Click Multi-Platform Web Deploy**: Мгновенная сборка для **Vercel**, **Cloudflare Pages**, **Netlify** и **GitHub Gist**.
- **🎨 Figma & Penpot Vector Bridge**: Двусторонняя конвертация векторного SVG из Figma в чистый Tailwind JSX/HTML и экспорт векторных слоев.
- **🔊 UI Sound FX & Микро-звуки**: Саунд-дизайн интерфейсов через синтезатор Web Audio API (клики, переключатели, саксесс-джинглы).
- **📋 Набор Effective HTML**: Low-fi вайрфреймы, персистентные роадмапы, живые схемы архитектуры и многошаговые визарды.
- **💬 Интерактивные карточки в чате**: Живой превью прямо в сообщениях чата с кнопкой открытия в Live Canvas в 1 клик.

---

## 🛠️ Справочник инструментов агента (30 инструментов)

| Имя инструмента | Назначение | Результат / Действие |
|---|---|---|
| `live_canvas_preview` | Создание или обновление сессии превью HTML/React/SVG/Mermaid | `previewUrl`, `canvasId` |
| `live_canvas_inspect` | Получение кликов пользователя, CSS-селекторов и атрибутов элементов | `inspections: [...]` |
| `live_canvas_reload` | Принудительная горячая перезагрузка открытых окон предпросмотра | SSE Broadcast |
| `live_canvas_diagnose` | Запрос ошибок консоли и исключений рантайма для самолечения | `logs: [...]`, `hasErrors` |
| `live_canvas_export` | Экспорт автономного HTML-файла без зависимостей | `downloadUrl`, `savedPath` |
| `live_canvas_annotations` | Чтение или очистка графических пометок и комментариев | `annotations: [...]` |
| `live_canvas_gallery` | Создание мульти-вариантной матрицы состояний Storybook | `variantsCount`, `previewUrl` |
| `live_canvas_watch` | Сканирование и привязка файлов проекта к файловому наблюдателю | `files: [...]`, `watchedFiles` |
| `live_canvas_controls` | Управление интерактивными слайдерами и пропсами | `values: {...}` |
| `live_canvas_diff` | Визуальный сплит-слайдер сравнения двух версий дизайна | `diffUrl`, `snapshotCount` |
| `live_canvas_matrix` | Мульти-экранная матрица разрешений (Mobile, Tablet, Desktop) | `matrixUrl` |
| `live_canvas_mock` | Настройка мок-ответов REST API, перехватываемых песочницей | `endpointsCount`, `mockData` |
| `live_canvas_pack` | Сборка готового Vite+React / Vite+Vue проекта в ZIP | `downloadUrl`, `writtenDir` |
| `live_canvas_refine_element` | Точечная визуальная или структурная ИИ-правка выбранного DOM-элемента | Hot-reload холста |
| `live_canvas_storybook` | Автосканирование компонентов и создание Storybook UI Kit галереи | `galleryUrl`, `componentsCount` |
| `live_canvas_insert_block` | Вставка дизайн-блока (Hero, Bento, Pricing, FAQ, Footer) в проект | `blockId`, `title` |
| `live_canvas_vision_import`| Импорт скриншота / макета в живой интерактивный код | `previewUrl`, `framework` |
| `live_canvas_visual_audit` | Анализ DOM на переполнение, контрастность и адаптивность | `score`, `issuesCount`, `issues` |
| `live_canvas_generate_mock`| Генерация реалистичных JSON мок-данных и внедрение в песочницу | `datasetType`, `mockData` |
| `live_canvas_share` | Генерация QR-кода и локального URL для смартфона | `shareUrl`, `qrSvg` |
| `live_canvas_create_wireframe` | Генерация Low-Fi структурного чертежа вайрфрейма | `previewUrl`, `layout` |
| `live_canvas_create_plan` | Генерация интерактивного роадмапа проекта и плана релиза | `previewUrl`, `version` |
| `live_canvas_create_diagram` | Генерация живой интерактивной схемы архитектуры и потоков данных | `previewUrl`, `diagramType` |
| `live_canvas_create_prototype` | Генерация многошагового интерактивного прототипа (визарда) | `previewUrl`, `flowType` |
| `live_canvas_resolve_annotation` | Пометка визуального замечания как решенного с фиксацией ответа | `status: 'resolved'` |
| `live_canvas_create_crud` | Генерация Retool-style CRUD админ-панели с таблицей и модалками | `previewUrl`, `entityName` |
| `live_canvas_timetravel` | Пошаговый просмотр истории ревизий и откат на любой снимок | `timetravelUrl`, `snapshotsCount` |
| `live_canvas_instant_deploy` | Формирование пакета деплоя для Vercel, Cloudflare, Netlify, Gist | `downloadUrl`, `instructions` |
| `live_canvas_figma_bridge` | Конвертация SVG-макета Figma в Tailwind или экспорт в векторный SVG | `action`, `componentName` |
| `live_canvas_sound_fx` | Саунд-дизайн интерфейсов через Web Audio API (клики, джинглы) | `presetsCount`, `soundType` |

---

## 📦 Быстрая установка

```bash
dsh plugin --profile web add @goodandready/dsh-live-canvas
```

---

## 📄 Лицензия

MIT © [GooDAnDReaDY](https://github.com/GooDAnDReaDY)

