// dsh-live-canvas: Multi-Step Interactive Prototype Flow Engine.
// Inspired by plannotator/effective-html "html-prototype" philosophy.

export function buildPrototypeTemplate(options = {}) {
  const title = options.title || 'Interactive Onboarding & Checkout Wizard';

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #090a0f; color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .step-node-active { background: #6366f1; color: #fff; border-color: #818cf8; }
    .step-node-done { background: #10b981; color: #fff; border-color: #34d399; }
    .step-pane { display: none; }
    .step-pane.active { display: block; animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4">
  <div class="max-w-xl w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6">
    
    <!-- Wizard Header & Steps Stepper -->
    <div class="space-y-4 border-b border-zinc-800 pb-6">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold text-white">${title}</h1>
        <span class="text-xs font-mono text-zinc-400" id="step-indicator">Step 1 of 3</span>
      </div>

      <!-- Stepper Pills -->
      <div class="flex items-center justify-between relative">
        <div class="w-8 h-8 rounded-full border-2 border-zinc-700 bg-zinc-800 flex items-center justify-center text-xs font-bold step-node step-node-active" id="node-1">1</div>
        <div class="flex-1 h-0.5 bg-zinc-800 mx-2" id="line-1"></div>
        <div class="w-8 h-8 rounded-full border-2 border-zinc-700 bg-zinc-800 flex items-center justify-center text-xs font-bold step-node text-zinc-500" id="node-2">2</div>
        <div class="flex-1 h-0.5 bg-zinc-800 mx-2" id="line-2"></div>
        <div class="w-8 h-8 rounded-full border-2 border-zinc-700 bg-zinc-800 flex items-center justify-center text-xs font-bold step-node text-zinc-500" id="node-3">3</div>
      </div>
    </div>

    <!-- Wizard Panes -->
    <form id="wizard-form" onsubmit="return false;" class="space-y-6">
      
      <!-- Step 1: Account Info -->
      <div class="step-pane active space-y-4" id="step-1">
        <h2 class="text-lg font-bold text-zinc-200">1. Account Information</h2>
        <p class="text-xs text-zinc-400">Enter your developer profile details to configure the workspace.</p>
        
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-zinc-300 mb-1">Full Name</label>
            <input type="text" id="input-name" class="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Alex Morgan" value="Alex Morgan">
          </div>
          <div>
            <label class="block text-xs font-medium text-zinc-300 mb-1">Work Email</label>
            <input type="email" id="input-email" class="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="alex@company.com" value="alex@company.com">
          </div>
        </div>
      </div>

      <!-- Step 2: Project Preferences -->
      <div class="step-pane space-y-4" id="step-2">
        <h2 class="text-lg font-bold text-zinc-200">2. Workspace Configuration</h2>
        <p class="text-xs text-zinc-400">Select your default development stack and runtime preferences.</p>
        
        <div class="grid grid-cols-2 gap-3">
          <label class="p-4 bg-zinc-950 border-2 border-indigo-500 rounded-xl cursor-pointer block">
            <input type="radio" name="framework" value="react" checked class="hidden">
            <div class="font-bold text-sm text-white">React 18 + Vite</div>
            <div class="text-xs text-zinc-400 mt-1">Babel JSX standalone</div>
          </label>
          <label class="p-4 bg-zinc-950 border border-zinc-800 rounded-xl cursor-pointer block hover:border-zinc-700">
            <input type="radio" name="framework" value="vue" class="hidden">
            <div class="font-bold text-sm text-zinc-300">HTML5 + Tailwind</div>
            <div class="text-xs text-zinc-400 mt-1">Lightweight zero-config</div>
          </label>
        </div>
      </div>

      <!-- Step 3: Confirmation / Success -->
      <div class="step-pane space-y-4 text-center py-4" id="step-3">
        <div class="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-2xl mx-auto">🎉</div>
        <h2 class="text-xl font-bold text-white">Workspace Ready!</h2>
        <p class="text-xs text-zinc-400 max-w-sm mx-auto">Your live development environment has been provisioned with Hot-Reload and AI Tools enabled.</p>
      </div>

      <!-- Navigation Actions -->
      <div class="flex items-center justify-between border-t border-zinc-800 pt-6">
        <button type="button" id="btn-prev" class="px-4 py-2 border border-zinc-700 text-xs font-semibold text-zinc-400 rounded-lg hover:text-white hidden">← Back</button>
        <div class="ml-auto">
          <button type="button" id="btn-next" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg transition shadow-lg shadow-indigo-500/20">Continue →</button>
        </div>
      </div>

    </form>

  </div>

  <script>
    let currentStep = 1;
    const totalSteps = 3;

    const btnNext = document.getElementById('btn-next');
    const btnPrev = document.getElementById('btn-prev');

    function updateStep() {
      document.querySelectorAll('.step-pane').forEach((p, i) => {
        p.classList.toggle('active', i + 1 === currentStep);
      });

      document.getElementById('step-indicator').innerText = 'Step ' + currentStep + ' of ' + totalSteps;

      btnPrev.classList.toggle('hidden', currentStep === 1 || currentStep === totalSteps);

      if (currentStep === totalSteps) {
        btnNext.innerText = 'Launch Studio 🚀';
        btnNext.className = 'px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-lg transition shadow-lg shadow-emerald-500/20';
      } else {
        btnNext.innerText = 'Continue →';
        btnNext.className = 'px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg transition shadow-lg shadow-indigo-500/20';
      }

      // Stepper UI
      for (let s = 1; s <= 3; s++) {
        const node = document.getElementById('node-' + s);
        if (s < currentStep) {
          node.className = 'w-8 h-8 rounded-full border-2 step-node step-node-done flex items-center justify-center text-xs font-bold';
          node.innerText = '✓';
        } else if (s === currentStep) {
          node.className = 'w-8 h-8 rounded-full border-2 step-node step-node-active flex items-center justify-center text-xs font-bold';
          node.innerText = s;
        } else {
          node.className = 'w-8 h-8 rounded-full border-2 border-zinc-700 bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500';
          node.innerText = s;
        }
      }
    }

    btnNext.addEventListener('click', () => {
      if (currentStep < totalSteps) {
        currentStep++;
        updateStep();
      } else {
        alert('🎉 Prototype Flow Completed! State persisted.');
      }
    });

    btnPrev.addEventListener('click', () => {
      if (currentStep > 1) {
        currentStep--;
        updateStep();
      }
    });
  </script>
</body>
</html>`;
}

