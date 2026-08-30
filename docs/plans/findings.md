# Findings & Architecture Decisions: dsh-live-canvas

## Архитектурные решения
1. **Изоляция песочницы**:
   - `Content-Security-Policy` со строгим `frame-ancestors 'self'`, `X-Content-Type-Options: nosniff` и `Cache-Control: no-cache`.
   - Санитизация путей через `sanitizePath` предотвращает path traversal и null-byte injection.
2. **Многоформатный предпросмотр**:
   - `html`: чистое встраивание с адаптивным CSS reset.
   - `react`: UMD-сборка React 18 + ReactDOM + Babel standalone с перехватом ошибок в Error Boundary.
   - `svg`: масштабируемый центрированный контейнер с шахматным фоном для контрастности.
   - `mermaid`: автоматический рендеринг диаграмм через Mermaid.js.
   - `markdown`: парсинг Marked с GitHub Markdown типографикой.
3. **SSE Hot-Reload**:
   - Канал `/dsh-live-canvas/events` с heartbeat (15с) и мягким обновлением iframe без перезагрузки всей страницы DSH.
4. **DOM Inspector**:
   - Полноценный расчет уникального CSS селектора (`#id`, классы, `:nth-of-type`) при клике, фиксация размеров, innerText и outerHTML, отправка в DSH UI и REST API `/dsh-live-canvas/api/inspect`.