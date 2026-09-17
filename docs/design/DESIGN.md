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

## 9. In-Canvas DevTools & Diagnostic Architecture
- **Mini-Console Drawer (.dlc-console-drawer)**:
  - Располагается снизу холста в виде сворачиваемой диагностической панели.
  - Перехватывает вызовы console.log, console.warn, console.error, console.info и исключения window.onerror внутри песочницы (lib/sandbox.js).
  - Передаёт структурированные события DLC_CONSOLE_LOG через postMessage в родительский фрейм.
  - В тулбаре отображается живой бейдж ошибок (при появлении ошибок подсвечивается акцентным красным --dsw-alias-state-error-primary).
  - Панель поддерживает фильтрацию по уровням (All, Errors, Warnings, Logs) и быструю очистку.

- **Component State Presets Switcher**:
  - Селектор пресетов в тулбаре (Default, Loading, Empty, Error, Overflow).
  - Передаёт событие DLC_SET_STATE_PRESET в iframe, устанавливая атрибут data-state-preset на корневой элемент документа холста и инициируя кастомный CustomEvent dsh:state-preset-change.

- **Vision Snapshot Feedback Loop**:
  - Инструмент агента live_canvas_capture_snapshot для замыкания цикла обратной связи: агент может программно запросить текущее состояние холста (метаданные сессии, структуру DOM-дерева или полный HTML-снимок).

- **Standalone Single-File HTML Export**:
  - Функция buildStandaloneHtmlBundle и эндпоинт /dsh-live-canvas/api/standalone для скачивания полностью автономного HTML-файла со всеми инлайновыми стилями и скриптами для отправки заказчику.

## 10. Localization Architecture (EN/ZH First-Class, External RU)
- Внутренний код плагина (lib/*) содержит исключительно канонический английский (en) и зеркальный китайский (zh) словари.
- Достигнут 100% паритет ключей между en и zh (75+ ключей интерфейса).
- Принцип нулевого кириллического текста в lib/ контролируется автоматическим юнит-тестом test/features_and_locale_audit.test.mjs.
- Русская локализация плагина вынесена в специализированный языковой пакет @goodandready/dsh-russian-lang (зарегистрировано Issue #188).

## 11. Security Architecture & Unified Path Policy (v0.2.12, Refs: #107, #108, #116)
- **Origin & Network Security (`lib/security.js`, Refs: #107)**:
  - Все мутирующие HTTP эндпоинты (`/api/open-file`, `/api/save-content`, `/api/save-reorder`, `/api/dsh-live-canvas/update`) валидируются через `isTrustedRequest` / `isTrustedUpdateRequest`.
  - Блокируются кросс-доменные запросы (`sec-fetch-site: cross-site`), проверяется совпадение Host/Origin и loopback/LAN IP.
  - Полный запрет wildcard CORS (`Access-Control-Allow-Origin: *`):
    - `lib/events.js`: SSE-поток событий выставляет `Access-Control-Allow-Origin` только для доверенного источника после проверки `isTrustedRequest(req)` (совпадение host/origin и loopback) и сопровождает заголовком `Vary: Origin`. Запросы от неавторизованных внешних источников заголовок не получают.
    - `lib/sandbox.js`: в `getSandboxHeaders` полностью удалён fallback `allowOrigin = '*'`. Изоляция превью-документов гарантируется заголовком `X-Frame-Options: SAMEORIGIN` и строгим CSP (`default-src 'self' ...`). Никаких открытых CORS заголовков не генерируется.
- **Единая политика путей (`resolveSafePath`)**:
  - Поддержка нескольких корней через `workspaceRoots: string[]` в настройках плагина и конфигурации DSH.
  - Защита от path traversal (`..`), символических ссылок (`fs.realpathSync` валидация) и выхода за границы разрешенных директорий.
  - Агентские инструменты (`live_canvas_preview`, `live_canvas_pack`, `live_canvas_export`) и HTTP роуты работают по единому контракту безопасности.
  - При ошибке доступа клиент отображает структурированный баннер с указанием пути, кода ошибки и подсказкой по настройке `workspaceRoots`.
- **One-Click Updater (`lib/updater.js`)**:
  - Стандартный эндпоинт `/api/dsh-live-canvas/update` с поддержкой проверки версий (`check`) и обновления через DSH CLI.
  - Корректная поддержка semver пререлизов (alpha/beta).
  - Интерактивный UI блок в `PluginCard` в настройках плагина.
## 12. Workspace Hub, Chat Card Ergonomics, and Refresh Lifecycle (v0.2.14, Refs: #118, #119, #121)
- **Interactive Chat Card Resizing & Wide View**:
  - Карточки предпросмотра в чате оснащены интерактивным ресайзером (`.dlc-chat-resize-handle`) по нижнему краю для плавной регулировки высоты (от 160px до 800px) с сохранением выбранной высоты.
  - Быстрые пресеты размера в тулбаре карточки: `S` (200px), `M` (320px), `L` (480px).
  - Режим расширенного обзора (`⤢` / Wide View): динамически разворачивает контейнер карточки на полную ширину сообщения чата для комфортного тестирования широких и адаптивных интерфейсов прямо в потоке диалога.
  - Исправлена диспетчеризация событий кнопки «Open in Canvas» с передачей точного ID сессии и фокусировкой вкладки Live Canvas в BetterSidebar.
- **In-Canvas Instant Frame Refresh**:
  - Выделенная кнопка `🔄 Refresh` в тулбаре холста и перехват сочетаний клавиш <kbd>F5</kbd> и <kbd>Ctrl+R</kbd> / <kbd>Cmd+R</kbd> внутри фрейма для мгновенной перезагрузки активного предпросмотра без перезагрузки всего приложения DSH. Незаменимо при итеративной работе с агентом, вносящим правки по ходу сессии.
- **Projects Hub & Recent Sessions (`/dsh-live-canvas/sandbox/hub`)**:
  - Полноценный хаб проектов и недавних сессий, доступный через выпадающий список тулбара (`🏠 Projects Hub`) и при открытии пустого холста.
  - Заменяет статические заглушки живым интерактивным списком:
    - Все ранее открытые сессии с сортировкой по времени последнего изменения (`updatedAt` descending).
    - Автоматически обнаруженные frontend-файлы рабочей области (React JSX/TSX, HTML, Vue, SVG, Markdown).
    - Карточки с бейджами типов, относительными путями, размерами файлов и временем правки.
    - Поле мгновенной фильтрации (`#dlc-search`) по названию, пути или типу.
    - Быстрое открытие в 1 клик через протоколы сообщений `dlc_open_session` и `dlc_open_file`.
    - Демо-шаблоны (калькулятор и аналитический дашборд) сохранены как вторичные быстрые пресеты в нижней части хаба.
- **Defensive Tool Output Schemas & Refusal Semantics**:
  - Инструмент агента `live_canvas_preview` при нарушениях политик путей (`ERR_PATH_OUTSIDE_ROOTS` или несуществующий файл) возвращает структурированный ответ об отказе с полями `code`, `allowedRoots`, `reason` и `valid: false`. Это позволяет языковым моделям понимать границы разрешённого доступа и автоматически корректировать свои вызовы без необработанных исключений.
