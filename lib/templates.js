// dsh-live-canvas: Curated modern design blocks catalog.

export const DESIGN_BLOCKS = [
  {
    id: 'hero-mesh-glow',
    category: 'Hero',
    title: 'Modern SaaS Dark Hero',
    description: 'Minimalist high-conversion hero section with glowing gradient pill and primary CTA.',
    htmlSnippet: `
<section class="relative overflow-hidden bg-zinc-950 py-24 px-6 text-center text-white">
  <div class="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))]"></div>
  <div class="relative max-w-4xl mx-auto flex flex-col items-center">
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/80 text-xs font-medium text-zinc-300 mb-6 shadow-sm">
      <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
      Next-Generation Web Development
    </div>
    <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-500 mb-6 leading-tight">
      Build Interfaces of the Future in Seconds
    </h1>
    <p class="max-w-2xl text-base sm:text-lg text-zinc-400 mb-8 leading-relaxed">
      Real-time interactive preview, bidirectional visual editing, and generative AI coding right inside your workspace.
    </p>
    <div class="flex flex-wrap items-center justify-center gap-4">
      <button class="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transition">
        Get Started Free
      </button>
      <button class="px-6 py-3 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 font-semibold text-sm transition">
        Documentation →
      </button>
    </div>
  </div>
</section>
`
  },
  {
    id: 'feature-grid-3col',
    category: 'Features',
    title: 'Bento Feature Grid (3 Columns)',
    description: 'Asymmetric dark cards with subtle borders, Lucide icon styling, and badges.',
    htmlSnippet: `
<section class="bg-zinc-950 py-20 px-6 text-white">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-16">
      <h2 class="text-3xl font-bold tracking-tight mb-3">Everything You Need for Fast Iteration</h2>
      <p class="text-zinc-400 text-sm max-w-lg mx-auto">A complete suite of developer and designer tools in a single unified canvas.</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between hover:border-zinc-700 transition">
        <div>
          <div class="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 font-bold text-sm">⚡</div>
          <h3 class="text-xl font-semibold mb-2">Instant SSE Hot-Reload</h3>
          <p class="text-zinc-400 text-sm leading-relaxed">Disk updates recompile on the fly and refresh the canvas without losing application state.</p>
        </div>
        <div class="mt-6 flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-800/60 pt-4">
          <span>Sync Latency</span>
          <span class="text-emerald-400 font-mono font-medium">&lt;15ms</span>
        </div>
      </div>
      <div class="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between hover:border-zinc-700 transition">
        <div>
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 font-bold text-sm">🎨</div>
          <h3 class="text-xl font-semibold mb-2">Visual Style Tweaker</h3>
          <p class="text-zinc-400 text-sm leading-relaxed">Tweak colors, spacing, and border radius directly on canvas with bidirectional source sync.</p>
        </div>
        <span class="text-xs text-emerald-400 font-medium mt-6">Two-way Sync</span>
      </div>
      <div class="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between hover:border-zinc-700 transition">
        <div>
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 font-bold text-sm">📐</div>
          <h3 class="text-xl font-semibold mb-2">Multi-Device Matrix</h3>
          <p class="text-zinc-400 text-sm leading-relaxed">Simultaneously preview Mobile, Tablet, and Desktop with synchronized scroll tracking.</p>
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
    <h2 class="text-3xl font-bold tracking-tight mb-3">Simple & Transparent Pricing</h2>
    <p class="text-zinc-400 text-sm">Choose the right plan for your personal projects or entire engineering team.</p>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
    <div class="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between">
      <div>
        <h3 class="font-semibold text-lg mb-1">Starter</h3>
        <p class="text-xs text-zinc-400 mb-6">For personal projects</p>
        <div class="text-3xl font-bold mb-6">$0 <span class="text-xs font-normal text-zinc-500">/ forever</span></div>
        <ul class="space-y-3 text-xs text-zinc-300 text-left mb-8">
          <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> Up to 5 active canvases</li>
          <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> Live HTML/React preview</li>
          <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> Export to HTML</li>
        </ul>
      </div>
      <button class="w-full py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/50 text-xs font-semibold hover:bg-zinc-800 transition">Choose Plan</button>
    </div>
    <div class="p-8 rounded-2xl bg-zinc-900 border-2 border-blue-500/80 shadow-xl shadow-blue-500/10 relative flex flex-col justify-between">
      <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-600 text-[10px] font-bold uppercase tracking-wider text-white">Popular</div>
      <div>
        <h3 class="font-semibold text-lg mb-1">Professional</h3>
        <p class="text-xs text-zinc-400 mb-6">For product engineers</p>
        <div class="text-3xl font-bold mb-6">$19 <span class="text-xs font-normal text-zinc-500">/ mo</span></div>
        <ul class="space-y-3 text-xs text-zinc-300 text-left mb-8">
          <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> Unlimited canvases</li>
          <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> WYSIWYG editing & Style Tweaker</li>
          <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> 1-Click Vite project export</li>
          <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> AI Refine assistant</li>
        </ul>
      </div>
      <button class="w-full py-2.5 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow hover:bg-blue-500 transition">Start 14-Day Free Trial</button>
    </div>
    <div class="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between">
      <div>
        <h3 class="font-semibold text-lg mb-1">Team</h3>
        <p class="text-xs text-zinc-400 mb-6">For studios and agencies</p>
        <div class="text-3xl font-bold mb-6">$49 <span class="text-xs font-normal text-zinc-500">/ mo</span></div>
        <ul class="space-y-3 text-xs text-zinc-300 text-left mb-8">
          <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> Up to 10 developers</li>
          <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> Multi-device matrix & diff</li>
          <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span> Storybook UI Kit generator</li>
        </ul>
      </div>
      <button class="w-full py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/50 text-xs font-semibold hover:bg-zinc-800 transition">Contact Sales</button>
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
      <h2 class="text-3xl font-bold tracking-tight mb-2">Frequently Asked Questions</h2>
      <p class="text-zinc-400 text-sm">Answers to common questions about Live Canvas Studio.</p>
    </div>
    <div class="space-y-4">
      <details class="group p-5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 cursor-pointer">
        <summary class="font-medium text-sm text-zinc-200 list-none flex items-center justify-between">
          <span>Are multi-file React components supported?</span>
          <span class="transition group-open:rotate-180 text-zinc-500">▼</span>
        </summary>
        <p class="mt-4 text-xs text-zinc-400 leading-relaxed">Yes, the integrated Smart ESM Bundler automatically and recursively resolves local relative imports (.jsx, .js, .css).</p>
      </details>
      <details class="group p-5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 cursor-pointer">
        <summary class="font-medium text-sm text-zinc-200 list-none flex items-center justify-between">
          <span>How are visual edits saved?</span>
          <span class="transition group-open:rotate-180 text-zinc-500">▼</span>
        </summary>
        <p class="mt-4 text-xs text-zinc-400 leading-relaxed">Double-clicking text or tweaking utility classes via the Style Tweaker writes modifications back to disk in real time.</p>
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
      <a href="#" class="hover:text-white transition">Documentation</a>
      <a href="#" class="hover:text-white transition">Components</a>
      <a href="#" class="hover:text-white transition">GitHub</a>
    </div>
    <div class="flex items-center gap-2 text-zinc-500">
      <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
      <span>All systems operational</span>
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
