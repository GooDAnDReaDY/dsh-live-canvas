# DESIGN.md — `@goodandready/dsh-live-canvas`

## 1. Product / Purpose
- **Назначение**: Интерактивный холст реального времени (Live Canvas) для DeepSeek Harness (DSH). Обеспечивает мгновенный визуальный рендеринг веб-интерфейсов (HTML + Tailwind CSS + Lucide Icons), React/JSX/TSX компонентов, SVG графики, диаграмм Mermaid и Markdown, создаваемых AI-агентом или пользователем.
- **Аудитория**: Разработчики, дизайнеры и пользователи DeepSeek Harness, прототипирующие и инспектирующие UI прямо в рабочей среде без запуска внешних локальных dev-серверов.
- **Статус**: Production (накачен на prod v0.2.9). Выполняется приведение к единому стандарту DSH дизайна и комплексный аудит стабильности.

## 2. User Surfaces
- **DSH Settings**:
  - Карточка настроек в слоте `settings.plugin.item` (`key: '@goodandready/dsh-live-canvas'`, `locale: '@goodandready/dsh-live-canvas'`).
  - Управление: default viewport (`responsive`, `mobile`, `tablet`, `desktop`, `matrix`), auto-open canvas upon HTML generation, enable hot-reload (SSE), max session cache limit.
  - Статусы: `loading`, `unavailable`, `ready`, сообщение об успешном сохранении / ошибке.
- **Live Canvas Workspace**:
  - Вкладка рабочей области (`LiveCanvasWorkspace`), доступная через нативный DSH Sidebar (`sidebarRightTabs`), слот `better-sidebar.tab`, либо прямой переход по URL `/dsh-live-canvas/sandbox/:sessionId`.
  - Тулбар управления: выбор активной сессии, переключение адаптивных разрешений (375px, 768px, 1280px, 100%), мульти-девайс матрица с синхронным скроллом, тумблеры темы (светлая/тёмная), инспектор элементов, визуальные заметки (аннотации), панель интерактивных пропсов (props controls), консоль логов песочницы, AI Refine модалка, каталог дизайн-блоков, экспорт/скачивание Vite проекта.
- **Live Canvas File Viewer**:
  - Компонент предварительного просмотра файлов проекта в сайдбаре (`LiveCanvasFileViewer`).
- **Chat Preview Cards**:
  - Карточки интерактивного предпросмотра в потоке чата (`renderLiveCanvasCard`), возвращающие миниатюрный живой iframe, индикаторы типа артефакта и быстрые действия (открыть в отдельной вкладке, инспектировать).
- **Вспомогательные панели и модальные окна**:
  - `Code Drawer` — редактор живого исходного кода с двухсторонней синхронизацией.
  - `File Picker Drawer` — быстрый поиск и открытие файлов интерфейса из workspace.
  - `AI Prompt Modal` — точечная формулировка правок для выбранного в инспекторе элемента.
  - `Design Blocks Modal` — библиотека готовых компонентов Tailwind.
  - `Share Modal` — QR-код и мобильная ссылка для локальной сети.
  - `Deploy Modal` — генерация бандлов для Vercel / Cloudflare Pages / Netlify / Gist.

## 3. Visual Direction
- **Атмосфера**: Профессиональный, чистый, нативный инструмент разработчика. Ощущается как неотъемлемая часть DeepSeek Harness, а не стороннее веб-приложение или чужой дашборд.
- **Утверждённый референс**: Дизайн-архетип `dsh-clinebot`:
  - Использование нативных CSS-переменных DSH (`--dsw-alias-*`).
  - Иерархия слоёв поверхностей: `--dsw-alias-bg-layer-1` (глубокий фон песочницы/кода), `--dsw-alias-bg-layer-2` (тулбары, поля ввода, внутренние плашки), `--dsw-alias-bg-layer-3` (основные карточки и контейнеры), `--dsw-alias-bg-layer-4` (ховер-состояния).
  - Рамки и разделители: `--dsw-alias-border-l1` и `--dsw-alias-border-l2`.
  - Типографика: `--dsw-alias-label-primary`, `--dsw-alias-label-secondary`, `--dsw-alias-label-dimmed`.
  - Семантические акценты: `--dsw-alias-state-brand-primary`, `--dsw-alias-state-success-primary`, `--dsw-alias-state-warning-primary`, `--dsw-alias-state-error-primary`.
- **Что категорически запрещено (Don't)**:
  - Хардкодить тёмные HEX-цвета (`#18181b`, `#09090b`, `#27272a`, `#3f3f46`, `#ffffff`, `#e4e4e7`, `#71717a` и т.д.) в стилях и inline-style компонента, ломая светлую тему DSH.
  - Использовать кричащие градиенты (`linear-gradient(135deg, #8b5cf6, #3b82f6)`) на кнопках.
  - Использовать тяжелые внешние CSS-фреймворки в UI клиента DSH (Tailwind допустим только внутри изолированного `iframe` песочницы, но не в хост-интерфейсе DSH).
  - Бесконечный motion, параллакс, навязчивые анимации.

## 4. Foundations
- **Цвета и роли**:
  - Фон карточек/модалок: `var(--dsw-alias-bg-layer-3)`.
  - Фон тулбаров/инпутов/блоков: `var(--dsw-alias-bg-layer-2)`.
  - Фон холста и редактора кода: `var(--dsw-alias-bg-layer-1)`.
  - Границы: `var(--dsw-alias-border-l2)`.
  - Текст основной: `var(--dsw-alias-label-primary)`.
  - Текст вторичный / подсказки: `var(--dsw-alias-label-secondary)`.
  - Успех (OK): `var(--dsw-alias-state-success-primary)` с фоновой плашкой `rgba(16,185,129,0.08)`.
  - Предупреждение (Warn): `var(--dsw-alias-state-warning-primary)` с фоновой плашкой `rgba(245,158,11,0.08)`.
  - Ошибка / опасное действие (Error): `var(--dsw-alias-state-error-primary)` с фоновой плашкой `rgba(239,68,68,0.08)`.
- **Типографика**:
  - Семейство: системный шрифт DSH (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`).
  - Код/моноширинный: `ui-monospace, "Cascadia Code", "SFMono-Regular", Menlo, Monaco, Consolas, monospace`.
  - Размеры:
    - Заголовок секции / карточки: 15-16px, font-weight 600.
    - Основной текст: 13-14px.
    - Вторичный текст / подписи полей: 12-13px.
    - Бейджи и служебные теги: 11-12px, font-weight 500.
    - Метаданные / консоль: 11px monospace.
- **Сетка и отступы**:
  - Карточки: padding `16px 20px`, border-radius `12px`.
  - Кнопки: padding `6px 12px` (компактные) или `7px 14px`, border-radius `8px`.
  - Поля ввода: height `34-36px`, padding `0 12px`, border-radius `8px`.
  - Модальные окна: max-width `560-640px`, border-radius `14px`, padding `20px`.
  - Gap между элементами тулбара: `6-8px`.
- **Accessibility**:
  - Контрастность текста по отношению к фону нативных слоёв DSH.
  - Фокус-состояния для полей ввода (`outline: none; border-color: var(--dsw-alias-state-brand-primary)`).
  - Семантические теги и `aria-expanded` для сворачивающихся карточек.
  - Полноценные всплывающие подсказки (title / tooltip) для иконочных кнопок тулбара.

## 5. Components And States
- **Кнопки (`.dlc-btn`)**:
  - Базовая: `background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-primary); border-radius: 8px; font-weight: 500;`.
  - Ховер: `background: var(--dsw-alias-bg-layer-4); border-color: var(--dsw-alias-border-l1);`.
  - Активная (`.dlc-btn-active`): `background: var(--dsw-alias-state-brand-primary); color: #fff; border-color: transparent;`.
  - Первичная (`.dlc-btn-primary`): `background: var(--dsw-alias-label-primary); color: var(--dsw-alias-bg-layer-3); border-color: transparent;`.
  - Опасная / ошибка (`.dlc-btn-danger`): `color: var(--dsw-alias-state-error-primary); border-color: rgba(239,68,68,0.3);`.
- **Бейджи (`.dlc-badge`)**:
  - Овальные пилюли (`border-radius: 999px; font-size: 11px; padding: 2px 8px; font-weight: 500;`).
  - Цветовая кодировка по статусу (OK, Warn, Bad).
- **Поля ввода и селекты (`.dlc-input`, `.dlc-select`)**:
  - `height: 34px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); border-radius: 8px;`.
- **Состояния (Loading / Empty / Error / Ready)**:
  - `Loading`: Индикатор спиннера / текстовое сообщение без мерцания разметки.
  - `Empty`: Понятная заглушка (например, "Нет интерактивных компонентов", "Файлы не найдены") с рекомендацией действия.
  - `Error`: Отображение ошибки в `dlc-status-err` или всплывающем уведомлении, защита через корневой `ErrorBoundary`.
  - `Ready`: Активное рабочее состояние с интерактивными элементами управления.

## 6. User Flows
1. **Просмотр артефакта из чата**: AI-агент вызывает инструмент `live_canvas_preview`, клиент DSH отображает карточку с предпросмотром. Пользователь может кликнуть "Открыть в холсте", развернув Live Canvas Workspace.
2. **Инспектирование и правка UI**: Пользователь нажимает "Инспектор", кликает на элемент в холсте, нажимает "AI Правка", вводит инструкции или выбирает пресет (например, "Glassmorphism") — задача отправляется агенту, холст обновляется по SSE.
3. **Мобильная адаптивность**: Пользователь переключает видовые экраны (Mobile, Tablet, Desktop) или нажимает "Матрица", чтобы увидеть поведение на трёх устройствах одновременно с синхронной прокруткой.
4. **Экспорт**: Нажатие кнопки "В Vite" мгновенно скачивает готовый проект с `package.json`, Vite-конфигом, Tailwind и React/Vue кодом.

## 7. Do / Don't
- **Do**:
  - Использовать только токены `--dsw-alias-*`.
  - Поддерживать одинаково безупречный вид в светлой и тёмной теме.
  - Оборачивать React-компоненты в `ErrorBoundary`.
  - Обеспечивать безопасную деградацию при недоступности внешних сервисов или BetterSidebar.
- **Don't**:
  - Не использовать жестко прописанные цвета `#18181b`, `#27272a`, `#3f3f46`, `#000000`, `#ffffff`.
  - Не создавать кастомные несогласованные градиенты на кнопках.
  - Не загромождать тулбар лишними декоративными элементами: тулбар должен быть компактным и функциональным.

## 8. Locked Design Decisions
- `2026-09-10`: Полный переход на дизайн-систему `dsh-clinebot` с удалением всех хардкодных цветов тёмной темы. Причина: совместимость со светлой темой DSH и визуальное единообразие с экосистемой плагинов Good & Ready. Пересмотр возможен только при глобальном обновлении дизайн-системы самого ядра DSH.
