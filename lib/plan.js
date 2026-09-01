// dsh-live-canvas: Interactive Plan & Release Readiness Roadmap Artifacts.
// Inspired by plannotator/effective-html "html-plan" philosophy.

export function buildPlanTemplate(options = {}) {
  const title = options.title || 'Interactive Release Readiness Roadmap';
  const targetVersion = options.version || 'v1.0.0';
  const phases = options.phases || [
    {
      id: 'phase-1',
      title: 'Phase 1: Architecture & Foundation',
      items: [
        { id: 't1', text: 'Define Core Engine & Domain Models', priority: 'P0', done: true, owner: 'Architect' },
        { id: 't2', text: 'Set up strict validation & DSL constraints', priority: 'P0', done: true, owner: 'Backend' },
        { id: 't3', text: 'Configure CI test runner with 100% assertions', priority: 'P1', done: true, owner: 'QA' }
      ]
    },
    {
      id: 'phase-2',
      title: 'Phase 2: Interactive Studio & Tooling',
      items: [
        { id: 't4', text: 'Implement Split-View Code Editor drawer', priority: 'P0', done: true, owner: 'Frontend' },
        { id: 't5', text: 'Build Component Storybook Matrix explorer', priority: 'P1', done: true, owner: 'Frontend' },
        { id: 't6', text: 'Integrate Drag-and-Drop section reordering', priority: 'P1', done: false, owner: 'Frontend' }
      ]
    },
    {
      id: 'phase-3',
      title: 'Phase 3: Release Hardening & Deployment',
      items: [
        { id: 't7', text: 'Execute end-to-end regression audit', priority: 'P0', done: false, owner: 'QA' },
        { id: 't8', text: 'Publish multi-language documentation (EN/RU/ZH)', priority: 'P1', done: false, owner: 'Docs' },
        { id: 't9', text: 'Production VPS deploy and post-deploy healthchecks', priority: 'P0', done: false, owner: 'DevOps' }
      ]
    }
  ];

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .badge-p0 { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .badge-p1 { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-p2 { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
    .item-completed { opacity: 0.55; text-decoration: line-through; }
  </style>
</head>
<body class="min-h-screen p-6 md:p-12">
  <div class="max-w-4xl mx-auto space-y-8">
    
    <!-- Hero Header -->
    <header class="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4 shadow-xl">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Release Readiness</span>
            <span class="text-xs text-zinc-400 font-mono">${targetVersion}</span>
          </div>
          <h1 class="text-2xl md:text-3xl font-bold tracking-tight text-white">${title}</h1>
        </div>
        <div class="text-right">
          <div class="text-3xl font-extrabold text-emerald-400" id="progress-percent">0%</div>
          <div class="text-xs text-zinc-400" id="progress-count">0 of 0 completed</div>
        </div>
      </div>

      <!-- Dynamic Progress Bar -->
      <div class="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
        <div id="progress-bar" class="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300" style="width: 0%"></div>
      </div>
    </header>

    <!-- Filters & Actions -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div class="flex items-center gap-2" id="filter-btns">
        <button class="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-white border border-zinc-700 active-filter" data-filter="all">All Tasks</button>
        <button class="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white" data-filter="pending">Pending</button>
        <button class="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white" data-filter="completed">Completed</button>
      </div>
      <button id="btn-reset" class="text-xs text-zinc-500 hover:text-zinc-300">Reset Local State</button>
    </div>

    <!-- Phases List -->
    <div class="space-y-6">
      ${phases.map(phase => `
      <section class="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6 space-y-4">
        <h2 class="text-lg font-bold text-zinc-200">${phase.title}</h2>
        <div class="space-y-2">
          ${phase.items.map(item => `
          <label class="flex items-center justify-between p-3.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg cursor-pointer transition group task-row" data-id="${item.id}" data-done="${item.done}">
            <div class="flex items-center gap-3">
              <input type="checkbox" class="w-4 h-4 rounded bg-zinc-800 border-zinc-600 text-emerald-500 focus:ring-0 cursor-pointer task-cb" ${item.done ? 'checked' : ''}>
              <span class="text-sm text-zinc-200 task-text ${item.done ? 'item-completed' : ''}">${item.text}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-zinc-500 font-mono">${item.owner}</span>
              <span class="px-2 py-0.5 rounded text-xs font-bold font-mono badge-${item.priority.toLowerCase()}">${item.priority}</span>
            </div>
          </label>
          `).join('')}
        </div>
      </section>
      `).join('')}
    </div>

  </div>

  <script>
    const STORAGE_KEY = 'dlc_plan_state_${targetVersion}';
    let savedState = {};
    try {
      savedState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {}

    const checkboxes = document.querySelectorAll('.task-cb');
    checkboxes.forEach(cb => {
      const row = cb.closest('.task-row');
      const id = row.dataset.id;
      if (savedState[id] !== undefined) {
        cb.checked = savedState[id];
        row.dataset.done = savedState[id];
        row.querySelector('.task-text').classList.toggle('item-completed', savedState[id]);
      }

      cb.addEventListener('change', () => {
        const isDone = cb.checked;
        row.dataset.done = isDone;
        row.querySelector('.task-text').classList.toggle('item-completed', isDone);
        savedState[id] = isDone;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));
        updateProgress();
      });
    });

    function updateProgress() {
      const total = checkboxes.length;
      const done = Array.from(checkboxes).filter(c => c.checked).length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      document.getElementById('progress-percent').innerText = pct + '%';
      document.getElementById('progress-count').innerText = done + ' of ' + total + ' completed';
      document.getElementById('progress-bar').style.width = pct + '%';
    }

    // Filters
    document.querySelectorAll('#filter-btns button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#filter-btns button').forEach(b => {
          b.className = 'px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white';
        });
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-white border border-zinc-700 active-filter';

        const flt = btn.dataset.filter;
        document.querySelectorAll('.task-row').forEach(row => {
          const isDone = row.dataset.done === 'true';
          if (flt === 'all') row.style.display = 'flex';
          else if (flt === 'pending') row.style.display = isDone ? 'none' : 'flex';
          else if (flt === 'completed') row.style.display = isDone ? 'flex' : 'none';
        });
      });
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    });

    updateProgress();
  </script>
</body>
</html>`;
}

