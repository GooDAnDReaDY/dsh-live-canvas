// dsh-live-canvas: Time-Travel Debugger & History Timeline Scrubber Engine.

export function buildTimeTravelViewer({ session, snapshots = [], activeIndex = -1 }) {
  const title = session?.title || 'Session Time-Travel Playback';
  const canvasId = session?.id || 'default';
  const list = Array.isArray(snapshots) && snapshots.length > 0 
    ? snapshots 
    : [{ id: 'init', index: 0, title: 'Initial Revision', timestamp: new Date().toISOString(), content: session?.content || '' }];

  const currentIdx = activeIndex >= 0 && activeIndex < list.length ? activeIndex : list.length - 1;

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Time-Travel</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #090a0f; color: #f1f5f9; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; overflow: hidden; }
  </style>
</head>
<body class="h-screen w-screen flex flex-col justify-between">
  
  <!-- Scrubber Header -->
  <header class="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between z-10">
    <div class="flex items-center gap-3">
      <span class="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">⏳ TIME-TRAVEL</span>
      <span class="font-bold text-sm text-zinc-200">${title}</span>
      <span class="text-xs text-zinc-500 font-mono" id="step-label">Step ${currentIdx + 1} of ${list.length}</span>
    </div>
    <div class="flex items-center gap-2">
      <button id="btn-restore" class="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-xs font-bold text-black rounded-lg transition shadow-lg shadow-amber-500/20 flex items-center gap-1.5">
        <span>↺</span> Restore This Revision
      </button>
    </div>
  </header>

  <!-- Playback Viewport Frame -->
  <div class="flex-1 bg-black p-4 flex items-center justify-center overflow-hidden">
    <iframe id="playback-frame" class="w-full h-full border border-zinc-800 rounded-xl bg-zinc-950" sandbox="allow-scripts allow-forms allow-same-origin allow-modals"></iframe>
  </div>

  <!-- Bottom Timeline Scrubber Slider Bar -->
  <footer class="p-5 bg-zinc-950 border-t border-zinc-800 space-y-3 z-10">
    <div class="flex items-center justify-between text-xs text-zinc-400 font-mono">
      <div class="flex items-center gap-2">
        <button id="btn-prev" class="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded hover:text-white">◀ Prev Step</button>
        <button id="btn-next" class="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded hover:text-white">Next Step ▶</button>
      </div>
      <div class="text-zinc-500" id="snapshot-time">Recorded at: --</div>
    </div>

    <!-- Interactive Slider -->
    <div class="flex items-center gap-4">
      <span class="text-xs font-mono text-zinc-500">v1</span>
      <input type="range" id="timeline-slider" min="0" max="${list.length - 1}" value="${currentIdx}" class="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500">
      <span class="text-xs font-mono text-zinc-500">v${list.length}</span>
    </div>
  </footer>

  <script>
    const snapshots = ${JSON.stringify(list)};
    const canvasId = '${canvasId}';
    let currentIdx = ${currentIdx};

    const frame = document.getElementById('playback-frame');
    const slider = document.getElementById('timeline-slider');
    const stepLabel = document.getElementById('step-label');
    const timeLabel = document.getElementById('snapshot-time');

    function updateView(idx) {
      currentIdx = idx;
      slider.value = idx;
      const snap = snapshots[idx];
      stepLabel.innerText = 'Step ' + (idx + 1) + ' of ' + snapshots.length + ' (' + (snap.title || 'Revision') + ')';
      timeLabel.innerText = 'Recorded at: ' + (snap.timestamp || snap.createdAt || 'N/A');

      const blob = new Blob([snap.content || ''], { type: 'text/html' });
      frame.src = URL.createObjectURL(blob);
    }

    slider.addEventListener('input', (e) => {
      updateView(parseInt(e.target.value, 10));
    });

    document.getElementById('btn-prev').addEventListener('click', () => {
      if (currentIdx > 0) updateView(currentIdx - 1);
    });

    document.getElementById('btn-next').addEventListener('click', () => {
      if (currentIdx < snapshots.length - 1) updateView(currentIdx + 1);
    });

    document.getElementById('btn-restore').addEventListener('click', async () => {
      const snap = snapshots[currentIdx];
      if (confirm('Restore revision #' + (currentIdx + 1) + ' to active canvas?')) {
        try {
          const res = await fetch('/dsh-live-canvas/api/save-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ canvasId, content: snap.content })
          });
          const data = await res.json();
          if (data.success) {
            alert('✓ Revision #' + (currentIdx + 1) + ' restored successfully!');
            location.reload();
          }
        } catch (err) {
          alert('Error restoring revision: ' + err.message);
        }
      }
    });

    updateView(currentIdx);
  </script>
</body>
</html>`;
}

