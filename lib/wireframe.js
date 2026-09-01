// dsh-live-canvas: Low-Fi Wireframe Archetype Engine & Blueprint Mode.
// Inspired by plannotator/effective-html "html-wireframe" philosophy.

export function buildWireframeTemplate(options = {}) {
  const title = options.title || 'Structural UI Wireframe';
  const layout = options.layout || 'landing'; // landing, dashboard, ecommerce, settings

  let bodyContent = '';

  if (layout === 'dashboard') {
    bodyContent = `
    <!-- Top Bar -->
    <header class="border-b-2 border-zinc-700 p-4 flex items-center justify-between bg-zinc-900">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-zinc-700 border border-zinc-500 flex items-center justify-center text-xs font-mono font-bold">[LOGO]</div>
        <span class="font-bold text-sm text-zinc-300 font-mono">[App Header / Title]</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="w-48 h-8 bg-zinc-800 border border-zinc-600 rounded px-3 flex items-center text-xs text-zinc-500 font-mono">[Search input...]</div>
        <div class="w-8 h-8 rounded-full bg-zinc-700 border border-zinc-500 flex items-center justify-center text-xs font-mono">[U]</div>
      </div>
    </header>

    <div class="flex flex-1">
      <!-- Sidebar -->
      <aside class="w-64 border-r-2 border-zinc-700 p-4 bg-zinc-900 space-y-2 hidden md:block">
        <div class="text-xs font-mono uppercase text-zinc-500 font-bold mb-3">[Navigation]</div>
        <div class="p-2 bg-zinc-800 border border-zinc-600 rounded text-xs font-mono text-zinc-300">[Dashboard View]</div>
        <div class="p-2 border border-zinc-700 rounded text-xs font-mono text-zinc-400">[Analytics]</div>
        <div class="p-2 border border-zinc-700 rounded text-xs font-mono text-zinc-400">[Customers]</div>
        <div class="p-2 border border-zinc-700 rounded text-xs font-mono text-zinc-400">[Settings]</div>
      </aside>

      <!-- Main Canvas -->
      <main class="flex-1 p-6 space-y-6 overflow-y-auto">
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <h2 class="text-xl font-bold font-mono text-zinc-200">[Section Headline: Overview]</h2>
            <p class="text-xs text-zinc-500 font-mono">[Contextual sub-label describing the active metrics]</p>
          </div>
          <button class="px-4 py-2 border-2 border-zinc-400 bg-zinc-800 text-xs font-mono font-bold text-zinc-200 rounded">[+ Primary Action]</button>
        </div>

        <!-- Metrics Row -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 border-2 border-dashed border-zinc-700 bg-zinc-900 rounded space-y-2">
            <span class="text-xs font-mono text-zinc-500">[Metric A: Total Revenue]</span>
            <div class="text-2xl font-bold font-mono text-zinc-200">₽ 124,500</div>
            <div class="h-2 bg-zinc-700 rounded w-2/3"></div>
          </div>
          <div class="p-4 border-2 border-dashed border-zinc-700 bg-zinc-900 rounded space-y-2">
            <span class="text-xs font-mono text-zinc-500">[Metric B: Active Users]</span>
            <div class="text-2xl font-bold font-mono text-zinc-200">1,420</div>
            <div class="h-2 bg-zinc-700 rounded w-1/2"></div>
          </div>
          <div class="p-4 border-2 border-dashed border-zinc-700 bg-zinc-900 rounded space-y-2">
            <span class="text-xs font-mono text-zinc-500">[Metric C: Conversion]</span>
            <div class="text-2xl font-bold font-mono text-zinc-200">4.8%</div>
            <div class="h-2 bg-zinc-700 rounded w-3/4"></div>
          </div>
        </div>

        <!-- Chart / Table Box -->
        <div class="border-2 border-zinc-700 bg-zinc-900 rounded p-6 space-y-4">
          <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
            <span class="text-sm font-mono font-bold text-zinc-300">[Data Table / Graph Area]</span>
            <span class="text-xs font-mono text-zinc-500">[Filter: Last 30 Days]</span>
          </div>
          <div class="h-48 border border-dashed border-zinc-800 flex items-center justify-center text-xs font-mono text-zinc-600">
            [Chart Skeleton / Visual Graph Container]
          </div>
        </div>
      </main>
    </div>
    `;
  } else {
    // Default: Landing / Product wireframe
    bodyContent = `
    <!-- Header -->
    <header class="border-b-2 border-zinc-700 p-4 flex items-center justify-between max-w-6xl mx-auto">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 bg-zinc-700 border border-zinc-500 flex items-center justify-center text-xs font-mono font-bold">[L]</div>
        <span class="font-bold font-mono text-sm">[Brand Logo]</span>
      </div>
      <nav class="hidden md:flex items-center gap-6 text-xs font-mono text-zinc-400">
        <span>[Features]</span>
        <span>[Solutions]</span>
        <span>[Pricing]</span>
        <span>[Docs]</span>
      </nav>
      <button class="px-3 py-1.5 border border-zinc-500 bg-zinc-800 text-xs font-mono text-zinc-300 rounded">[Get Started]</button>
    </header>

    <!-- Hero Section -->
    <section class="max-w-4xl mx-auto py-16 px-4 text-center space-y-6">
      <div class="inline-block px-3 py-1 border border-zinc-600 rounded-full text-xs font-mono text-zinc-400 bg-zinc-900">[Release Pill / Announcement]</div>
      <h1 class="text-3xl md:text-5xl font-bold font-mono text-zinc-100">[Clear, Unambiguous Headline Explaining Product Value]</h1>
      <p class="text-sm md:text-base text-zinc-400 font-mono max-w-2xl mx-auto">[Two-line supporting paragraph clarifying the target audience, workflow improvements, and key architectural differentiators.]</p>
      <div class="flex items-center justify-center gap-4 pt-2">
        <button class="px-6 py-3 border-2 border-zinc-300 bg-zinc-800 text-sm font-mono font-bold text-white rounded">[Primary Call-to-Action]</button>
        <button class="px-6 py-3 border border-zinc-600 bg-zinc-900 text-sm font-mono text-zinc-300 rounded">[Secondary Action / Demo]</button>
      </div>

      <!-- Hero Visual Placeholder -->
      <div class="mt-12 border-2 border-dashed border-zinc-700 bg-zinc-900 rounded-xl h-64 flex flex-col items-center justify-center text-zinc-500 font-mono text-xs space-y-2">
        <div class="w-12 h-12 border border-zinc-600 rounded flex items-center justify-center text-lg font-bold">✕</div>
        <span>[Hero Screenshot / Interactive Mockup Frame]</span>
      </div>
    </section>

    <!-- Features Bento Grid Wireframe -->
    <section class="max-w-5xl mx-auto py-12 px-4 space-y-6">
      <div class="text-center space-y-2">
        <h2 class="text-2xl font-bold font-mono text-zinc-200">[Core Capabilities]</h2>
        <p class="text-xs text-zinc-500 font-mono">[Structural breakdown of features without visual bias]</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-6 border-2 border-zinc-700 bg-zinc-900 rounded-lg space-y-3">
          <div class="w-8 h-8 bg-zinc-800 border border-zinc-600 flex items-center justify-center text-xs font-mono">[01]</div>
          <h3 class="font-mono font-bold text-sm text-zinc-200">[Feature Alpha Title]</h3>
          <p class="text-xs font-mono text-zinc-500">[Concise description explaining how this module integrates with existing workflows.]</p>
        </div>
        <div class="p-6 border-2 border-zinc-700 bg-zinc-900 rounded-lg space-y-3">
          <div class="w-8 h-8 bg-zinc-800 border border-zinc-600 flex items-center justify-center text-xs font-mono">[02]</div>
          <h3 class="font-mono font-bold text-sm text-zinc-200">[Feature Beta Title]</h3>
          <p class="text-xs font-mono text-zinc-500">[Concise description explaining how this module integrates with existing workflows.]</p>
        </div>
        <div class="p-6 border-2 border-zinc-700 bg-zinc-900 rounded-lg space-y-3">
          <div class="w-8 h-8 bg-zinc-800 border border-zinc-600 flex items-center justify-center text-xs font-mono">[03]</div>
          <h3 class="font-mono font-bold text-sm text-zinc-200">[Feature Gamma Title]</h3>
          <p class="text-xs font-mono text-zinc-500">[Concise description explaining how this module integrates with existing workflows.]</p>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t-2 border-zinc-800 mt-16 p-8 text-center text-xs font-mono text-zinc-600">
      [Footer: Navigation Links • Legal • Privacy Policy • © 2026]
    </footer>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      background-color: #09090b;
      color: #e4e4e7;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background-image: radial-gradient(#27272a 1px, transparent 1px);
      background-size: 24px 24px;
    }
  </style>
</head>
<body class="min-h-screen flex flex-col">
  ${bodyContent}
</body>
</html>`;
}

