// dsh-live-canvas: Living Interactive Architecture Diagrams.
// Inspired by plannotator/effective-html "html-diagram" philosophy.

export function buildDiagramTemplate(options = {}) {
  const title = options.title || 'System Architecture & Data Flow Diagram';

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background: #08090d; color: #f4f4f5; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; overflow: hidden; }
    .grid-bg {
      background-image: radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px);
      background-size: 20px 20px;
    }
    .node-card {
      background: #11131a;
      border: 1px solid #272a38;
      border-radius: 12px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: pointer;
    }
    .node-card:hover {
      border-color: #6366f1;
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(99, 102, 241, 0.2);
    }
    .flow-line {
      stroke: #6366f1;
      stroke-width: 2;
      stroke-dasharray: 6 6;
      animation: flowDash 1.5s linear infinite;
    }
    @keyframes flowDash {
      to { stroke-dashoffset: -24; }
    }
  </style>
</head>
<body class="h-screen w-screen flex flex-col grid-bg">
  
  <!-- Diagram Header -->
  <header class="p-4 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur flex items-center justify-between z-10">
    <div class="flex items-center gap-3">
      <span class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
      <h1 class="font-bold text-sm text-zinc-200">${title}</h1>
      <span class="text-xs text-zinc-500 font-mono">[Interactive SVG/HTML Diagram]</span>
    </div>
    <div class="flex items-center gap-2 text-xs text-zinc-400">
      <span class="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded">💡 Click nodes for details</span>
      <button onclick="location.reload()" class="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-200">Reset</button>
    </div>
  </header>

  <!-- Interactive Diagram Canvas Area -->
  <div class="flex-1 relative overflow-auto p-8 flex items-center justify-center">
    
    <!-- SVG Connection Layer -->
    <svg class="absolute inset-0 w-full h-full pointer-events-none z-0">
      <!-- Client to Gateway -->
      <path d="M 220 280 L 380 280" class="flow-line" />
      <!-- Gateway to Engine -->
      <path d="M 540 280 L 680 220" class="flow-line" />
      <!-- Gateway to Store -->
      <path d="M 540 280 L 680 340" class="flow-line" />
      <!-- Engine to Bundler -->
      <path d="M 840 220 L 980 220" class="flow-line" />
      <!-- Store to Database -->
      <path d="M 840 340 L 980 340" class="flow-line" />
    </svg>

    <!-- Nodes Graph Layout -->
    <div class="relative z-10 flex items-center gap-16">
      
      <!-- 1. Client Tier -->
      <div class="space-y-4">
        <div class="text-xs text-zinc-500 font-bold uppercase tracking-wider">Client Ingress</div>
        <div class="node-card p-5 w-48 space-y-2" onclick="showDetails('Web Browser & BetterSidebar', 'Port 3080 / HTTPS', 'React 18 + SSE Event Stream', 'Ingress UI')">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-indigo-400">01. INGRESS</span>
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <div class="font-bold text-sm text-zinc-100">WebUI Client</div>
          <div class="text-xs text-zinc-400">SSE Event Stream & DOM Inspector</div>
        </div>
      </div>

      <!-- 2. Gateway Tier -->
      <div class="space-y-4">
        <div class="text-xs text-zinc-500 font-bold uppercase tracking-wider">API Gateway</div>
        <div class="node-card p-5 w-48 space-y-2 border-indigo-500/40" onclick="showDetails('Cordis Plugin Gateway', 'Port 3080', 'Express / Node.js Microservices', 'Router & Middleware')">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-emerald-400">02. ROUTER</span>
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <div class="font-bold text-sm text-zinc-100">DSH Live Canvas Core</div>
          <div class="text-xs text-zinc-400">HTTP REST & Hot-Reload Hub</div>
        </div>
      </div>

      <!-- 3. Engine & Store -->
      <div class="space-y-6">
        <div class="text-xs text-zinc-500 font-bold uppercase tracking-wider">Processing Tier</div>
        
        <div class="node-card p-5 w-48 space-y-2" onclick="showDetails('Smart ESM Bundler', 'Internal in-memory', 'Babel Standalone JSX + PostCSS', 'Transpiler')">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-amber-400">03A. BUNDLER</span>
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <div class="font-bold text-sm text-zinc-100">ESM Transpiler</div>
          <div class="text-xs text-zinc-400">Recursive multi-file module inline</div>
        </div>

        <div class="node-card p-5 w-48 space-y-2" onclick="showDetails('PreviewStore LRU', 'Memory Cache', 'LRU eviction & Snapshot history', 'Storage')">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-cyan-400">03B. STORE</span>
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <div class="font-bold text-sm text-zinc-100">Preview Store</div>
          <div class="text-xs text-zinc-400">Sessions & Mock Data Cache</div>
        </div>
      </div>

      <!-- 4. Sandbox Output -->
      <div class="space-y-6">
        <div class="text-xs text-zinc-500 font-bold uppercase tracking-wider">Output Sandbox</div>
        
        <div class="node-card p-5 w-48 space-y-2 border-purple-500/40" onclick="showDetails('Iframe Sandbox Frame', 'Sandboxed DOM', 'Strict CSP + Security Isolation', 'Renderer')">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-purple-400">04. SANDBOX</span>
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <div class="font-bold text-sm text-zinc-100">Isolated Runtime</div>
          <div class="text-xs text-zinc-400">WYSIWYG & D&D Reorder Host</div>
        </div>
      </div>

    </div>

  </div>

  <!-- Detail Drawer Modal -->
  <div id="detail-card" class="hidden absolute bottom-6 right-6 w-96 p-5 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-20 space-y-3">
    <div class="flex items-center justify-between border-b border-zinc-800 pb-2">
      <span class="text-xs font-bold font-mono text-indigo-400" id="detail-type">SERVICE INFO</span>
      <button onclick="document.getElementById('detail-card').classList.add('hidden')" class="text-zinc-500 hover:text-zinc-300 text-xs">✕</button>
    </div>
    <h3 class="text-base font-bold text-white" id="detail-title">Service Name</h3>
    <div class="space-y-1 text-xs font-mono">
      <div class="text-zinc-400">Endpoint: <span class="text-zinc-200" id="detail-endpoint"></span></div>
      <div class="text-zinc-400">Stack: <span class="text-zinc-200" id="detail-stack"></span></div>
    </div>
  </div>

  <script>
    function showDetails(title, endpoint, stack, type) {
      document.getElementById('detail-title').innerText = title;
      document.getElementById('detail-endpoint').innerText = endpoint;
      document.getElementById('detail-stack').innerText = stack;
      document.getElementById('detail-type').innerText = type || 'NODE DETAILS';
      document.getElementById('detail-card').classList.remove('hidden');
    }
  </script>
</body>
</html>`;
}

