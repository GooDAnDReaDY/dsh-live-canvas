// dsh-live-canvas: curated high-end UI design blocks and templates library.

export const DESIGN_BLOCKS = [
  {
    id: 'hero-mesh-glow',
    category: 'Hero',
    title: 'Glowing Mesh Agency Hero',
    description: 'Dark modern hero with glowing gradient aura, badge pill, dual CTAs, and user rating social proof.',
    htmlSnippet: `
<section class="relative overflow-hidden bg-zinc-950 py-24 px-6 text-white text-center">
  <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-tr from-indigo-500 to-emerald-400 opacity-20 blur-3xl rounded-full pointer-events-none"></div>
  <div class="max-w-4xl mx-auto relative z-10">
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/80 text-xs font-medium text-emerald-400 mb-6 backdrop-blur-sm shadow-sm">
      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      Новое поколение веб-разработки
    </div>
    <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-b from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent mb-6">
      Создавайте интерфейсы будущего за секунды
    </h1>
    <p class="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
      Моментальный живой предпросмотр, двусторонняя визуальная правка и генеративный ИИ-кодинг прямо в вашей рабочей среде.
    </p>
    <div class="flex flex-wrap items-center justify-center gap-4">
      <button class="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:opacity-90 transition active:scale-95">
        Попробовать бесплатно
      </button>
      <button class="px-8 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold text-sm hover:bg-zinc-800/80 transition active:scale-95">
        Документация →
      </button>
    </div>
  </div>
</section>
`
  },
  {
    id: 'bento-grid-features',
    category: 'Features',
    title: 'Glassmorphic Bento Grid',
    description: '3-card bento layout with glowing borders, metric highlights, and modern micro-typography.',
    htmlSnippet: `
<section class="bg-zinc-950 py-20 px-6 text-white">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-14">
      <h2 class="text-3xl font-bold tracking-tight mb-3">Всё необходимое для быстрой сборки</h2>
      <p class="text-zinc-400 text-sm max-w-lg mx-auto">Полный арсенал инструментов для дизайнера и фронтенд-инженера в одном окне.</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="md:col-span-2 p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between group hover:border-zinc-700 transition">
        <div>
          <div class="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 font-bold">⚡</div>
          <h3 class="text-xl font-semibold mb-2">Мгновенный SSE Hot-Reload</h3>
          <p class="text-zinc-400 text-sm leading-relaxed">Изменения на диске компилируются на лету и обновляют холст без потери состояния приложения.</p>
        </div>
        <div class="mt-8 pt-4 border-t border-zinc-800/50 flex items-center justify-between text-xs text-zinc-500">
          <span>Задержка синхронизации</span>
          <span class="text-emerald-400 font-mono font-semibold">&lt; 150ms</span>
        </div>
      </div>
      <div class="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm flex flex-col justify-between group hover:border-zinc-700 transition">
        <div>
          <div class="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 font-bold">🎨</div>
          <h3 class="text-xl font-semibold mb-2">Визуальный Tweaker</h3>
          <p class="text-zinc-400 text-sm leading-relaxed">Правьте цвета, отступы и скругления прямо на холсте с сохранением в исходный код.</p>
        </div>
        <span class="text-xs text-amber-400 font-medium mt-6">Tailwind 3.4 Ready</span>
      </div>
    </div>
  </div>
</section>
`
  },
  {
    id: 'pricing-tiers',
    category: 'Pricing',
    title: 'SaaS 3-Tier Pricing Table',
    description: 'Clean dark mode pricing cards with featured badge and feature check list.',
    htmlSnippet: `
<section class="bg-zinc-950 py-20 px-6 text-white">
  <div class="max-w-5xl mx-auto text-center mb-12">
    <h2 class="text-3xl font-bold tracking-tight mb-3">Простые и прозрачные тарифы</h2>
    <p class="text-zinc-400 text-sm">Выбирайте подходящий план для себя или всей команды.</p>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
    <div class="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between">
      <div>
        <h3 class="font-semibold text-lg mb-1">Стартовый</h3>
        <p class="text-xs text-zinc-400 mb-6">Для личных проектов</p>
        <div class="text-3xl font-bold mb-6">0 ₽ <span class="text-xs font-normal text-zinc-500">/ навсегда</span></div>
        <ul class="space-y-3 text-xs text-zinc-300 text-left mb-8">
          <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> До 5 активных холстов</li>
          <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> Живой предпросмотр HTML/React</li>
          <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> Экспорт в HTML</li>
        </ul>
      </div>
      <button class="w-full py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/50 text-xs font-semibold hover:bg-zinc-800 transition">Выбрать план</button>
    </div>
    <div class="p-8 rounded-2xl bg-zinc-900 border-2 border-blue-500/80 shadow-xl shadow-blue-500/10 relative flex flex-col justify-between">
      <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-600 text-[10px] font-bold uppercase tracking-wider text-white">Популярный</div>
      <div>
        <h3 class="font-semibold text-lg mb-1">Профессионал</h3>
        <p class="text-xs text-zinc-400 mb-6">Для продуктовых инженеров</p>
        <div class="text-3xl font-bold mb-6">990 ₽ <span class="text-xs font-normal text-zinc-500">/ мес</span></div>
        <ul class="space-y-3 text-xs text-zinc-300 text-left mb-8">
          <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> Неограниченно холстов</li>
          <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> WYSIWYG правка и Style Tweaker</li>
          <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> 1-Click экспорт в Vite проект</li>
          <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> AI Refine ассистент</li>
        </ul>
      </div>
      <button class="w-full py-2.5 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow hover:bg-blue-500 transition">Начать 14 дней триала</button>
    </div>
    <div class="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between">
      <div>
        <h3 class="font-semibold text-lg mb-1">Команда</h3>
        <p class="text-xs text-zinc-400 mb-6">Для агентств и студий</p>
        <div class="text-3xl font-bold mb-6">2 990 ₽ <span class="text-xs font-normal text-zinc-500">/ мес</span></div>
        <ul class="space-y-3 text-xs text-zinc-300 text-left mb-8">
          <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> До 10 разработчиков</li>
          <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> Multi-Device матрица и Diff</li>
          <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> Storybook UI Kit генератор</li>
        </ul>
      </div>
      <button class="w-full py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/50 text-xs font-semibold hover:bg-zinc-800 transition">Связаться с нами</button>
    </div>
  </div>
</section>
`
  },
  {
    id: 'faq-accordion',
    category: 'FAQ',
    title: 'Modern Dark FAQ Accordion',
    description: 'Expandable question items with clean typography and borders.',
    htmlSnippet: `
<section class="bg-zinc-950 py-20 px-6 text-white">
  <div class="max-w-3xl mx-auto">
    <div class="text-center mb-12">
      <h2 class="text-3xl font-bold tracking-tight mb-2">Часто задаваемые вопросы</h2>
      <p class="text-zinc-400 text-sm">Ответы на ключевые вопросы о работе Live Canvas.</p>
    </div>
    <div class="space-y-4">
      <details class="group p-5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 cursor-pointer">
        <summary class="font-medium text-sm text-zinc-200 list-none flex items-center justify-between">
          <span>Поддерживаются ли многофайловые React компоненты?</span>
          <span class="transition group-open:rotate-180 text-zinc-500">▼</span>
        </summary>
        <p class="mt-4 text-xs text-zinc-400 leading-relaxed">Да, встроенный Smart ESM Bundler автоматически рекурсивно находит и подтягивает локальные импорты (.jsx, .js, .css).</p>
      </details>
      <details class="group p-5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 cursor-pointer">
        <summary class="font-medium text-sm text-zinc-200 list-none flex items-center justify-between">
          <span>Как сохраняются правки из визуального редактора?</span>
          <span class="transition group-open:rotate-180 text-zinc-500">▼</span>
        </summary>
        <p class="mt-4 text-xs text-zinc-400 leading-relaxed">Двойной клик на текст или правка классов через стиль-твикер автоматически записывает изменения в исходный файл на диске.</p>
      </details>
    </div>
  </div>
</section>
`
  },
  {
    id: 'dark-agency-footer',
    category: 'Footer',
    title: 'Minimalist Agency Footer',
    description: 'Sleek dark footer with social links, copyright, and status light.',
    htmlSnippet: `
<footer class="bg-zinc-950 border-t border-zinc-800/80 py-12 px-6 text-zinc-400 text-xs">
  <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
    <div class="flex items-center gap-3">
      <div class="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">LC</div>
      <span class="font-semibold text-zinc-200 text-sm">Live Canvas Studio</span>
    </div>
    <div class="flex items-center gap-6 text-zinc-400">
      <a href="#" class="hover:text-white transition">Документация</a>
      <a href="#" class="hover:text-white transition">Компоненты</a>
      <a href="#" class="hover:text-white transition">GitHub</a>
    </div>
    <div class="flex items-center gap-2 text-zinc-500">
      <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
      <span>Все системы работают штатно</span>
    </div>
  </div>
</footer>
`
  }
];

export function listTemplates(category) {
  if (!category) return DESIGN_BLOCKS;
  return DESIGN_BLOCKS.filter(b => b.category.toLowerCase() === category.toLowerCase());
}

export function getTemplateById(id) {
  return DESIGN_BLOCKS.find(b => b.id === id) || null;
}

