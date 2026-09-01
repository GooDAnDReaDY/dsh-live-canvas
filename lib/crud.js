// dsh-live-canvas: Retool-Style CRUD & Admin Dashboard Studio Engine
// Generates complete interactive data-management micro-applications.

export function buildCrudTemplate(options = {}) {
  const title = options.title || 'Admin Data Management Dashboard';
  const entityName = options.entityName || 'Customer';
  const storageKey = options.storageKey || `dlc_crud_${entityName.toLowerCase()}_data`;

  const initialRows = options.initialData || [
    { id: 'REC-1001', name: 'Sophia Loren', email: 'sophia@example.com', role: 'Enterprise Admin', status: 'Active', spent: '$12,450', createdAt: '2026-08-15' },
    { id: 'REC-1002', name: 'Liam Chen', email: 'liam@domain.io', role: 'Billing Lead', status: 'Active', spent: '$4,890', createdAt: '2026-08-20' },
    { id: 'REC-1003', name: 'Elena Rostova', email: 'elena@corp.net', role: 'Developer', status: 'Pending', spent: '$1,200', createdAt: '2026-08-28' },
    { id: 'REC-1004', name: 'Marcus Vance', email: 'marcus@cloud.dev', role: 'Viewer', status: 'Suspended', spent: '$320', createdAt: '2026-08-30' },
    { id: 'REC-1005', name: 'Aisha Patel', email: 'aisha@tech.co', role: 'Enterprise Admin', status: 'Active', spent: '$18,900', createdAt: '2026-09-01' }
  ];

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #090a0f; color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .badge-active { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-pending { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-suspended { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
  </style>
</head>
<body class="min-h-screen p-4 md:p-8 flex flex-col justify-between">
  
  <div class="max-w-6xl mx-auto w-full space-y-6">
    
    <!-- Top Action Bar -->
    <header class="flex flex-wrap items-center justify-between gap-4 p-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-xl backdrop-blur">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">CRUD STUDIO</span>
          <span class="text-xs text-zinc-500 font-mono" id="total-badge">5 records</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-white">${title}</h1>
      </div>
      <div class="flex items-center gap-3">
        <button id="btn-export-csv" class="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-200 rounded-lg transition flex items-center gap-1.5">
          <span>📥</span> Export CSV
        </button>
        <button id="btn-add-record" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg transition shadow-lg shadow-indigo-600/20 flex items-center gap-1.5">
          <span>+</span> Add ${entityName}
        </button>
      </div>
    </header>

    <!-- Controls Row: Search & Filters -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="relative w-72">
        <input type="text" id="search-input" placeholder="Search by name, email, ID..." class="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500">
        <span class="absolute left-3 top-2.5 text-xs text-zinc-500">🔍</span>
      </div>

      <div class="flex items-center gap-2" id="status-filters">
        <button class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 text-white border border-zinc-700 filter-btn" data-status="all">All</button>
        <button class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white filter-btn" data-status="Active">Active</button>
        <button class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white filter-btn" data-status="Pending">Pending</button>
        <button class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white filter-btn" data-status="Suspended">Suspended</button>
      </div>
    </div>

    <!-- Data Table Container -->
    <div class="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-zinc-300">
          <thead class="bg-zinc-950/80 text-zinc-400 uppercase font-mono text-[11px] border-b border-zinc-800">
            <tr>
              <th class="p-4">ID</th>
              <th class="p-4">Customer Name</th>
              <th class="p-4">Role</th>
              <th class="p-4">Status</th>
              <th class="p-4">Spent</th>
              <th class="p-4">Created At</th>
              <th class="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody id="table-body" class="divide-y divide-zinc-800/60">
            <!-- Rows rendered dynamically via JS -->
          </tbody>
        </table>
      </div>

      <!-- Pagination / Footer -->
      <div class="p-4 bg-zinc-950/60 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500 font-mono">
        <div id="page-indicator">Showing 1 to 5 of 5 entries</div>
        <div class="flex items-center gap-2">
          <button id="btn-prev-page" class="px-3 py-1 rounded bg-zinc-900 border border-zinc-800 hover:text-white disabled:opacity-40">Previous</button>
          <button id="btn-next-page" class="px-3 py-1 rounded bg-zinc-900 border border-zinc-800 hover:text-white disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>

  </div>

  <!-- Add/Edit Record Modal -->
  <div id="record-modal" class="hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
      <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
        <h3 class="text-base font-bold text-white" id="modal-title">Add ${entityName}</h3>
        <button id="btn-close-modal" class="text-zinc-500 hover:text-white text-sm">✕</button>
      </div>

      <form id="record-form" onsubmit="return false;" class="space-y-3">
        <input type="hidden" id="form-id">
        <div>
          <label class="block text-xs font-semibold text-zinc-300 mb-1">Full Name</label>
          <input type="text" id="form-name" required class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500">
        </div>
        <div>
          <label class="block text-xs font-semibold text-zinc-300 mb-1">Email Address</label>
          <input type="email" id="form-email" required class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-zinc-300 mb-1">Role</label>
            <select id="form-role" class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500">
              <option value="Enterprise Admin">Enterprise Admin</option>
              <option value="Billing Lead">Billing Lead</option>
              <option value="Developer">Developer</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-zinc-300 mb-1">Status</label>
            <select id="form-status" class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500">
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-zinc-300 mb-1">Total Spent</label>
          <input type="text" id="form-spent" value="$0" class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500">
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
          <button type="button" id="btn-cancel-modal" class="px-3.5 py-2 bg-zinc-800 text-xs font-semibold text-zinc-300 rounded-lg hover:bg-zinc-700">Cancel</button>
          <button type="button" id="btn-save-record" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg transition shadow-lg shadow-indigo-600/20">Save ${entityName}</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    const STORAGE_KEY = '${storageKey}';
    let records = [];

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      records = stored ? JSON.parse(stored) : ${JSON.stringify(initialRows)};
    } catch {
      records = ${JSON.stringify(initialRows)};
    }

    let activeFilter = 'all';
    let searchQuery = '';

    function saveState() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      } catch {}
      renderTable();
    }

    function renderTable() {
      const tbody = document.getElementById('table-body');
      tbody.innerHTML = '';

      const filtered = records.filter(r => {
        const matchesStatus = activeFilter === 'all' || r.status === activeFilter;
        const matchesQuery = !searchQuery || 
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          r.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
          r.id.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesQuery;
      });

      document.getElementById('total-badge').innerText = records.length + ' records';
      document.getElementById('page-indicator').innerText = 'Showing ' + filtered.length + ' of ' + records.length + ' entries';

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-zinc-500 font-mono">No matching records found</td></tr>';
        return;
      }

      filtered.forEach(r => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-zinc-800/40 transition';
        const badgeClass = r.status === 'Active' ? 'badge-active' : (r.status === 'Pending' ? 'badge-pending' : 'badge-suspended');

        tr.innerHTML = \`
          <td class="p-4 font-mono text-zinc-500">\${r.id}</td>
          <td class="p-4 font-medium text-white">
            <div>\${r.name}</div>
            <div class="text-[11px] text-zinc-500 font-mono">\${r.email}</div>
          </td>
          <td class="p-4 text-zinc-400">\${r.role}</td>
          <td class="p-4"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono \${badgeClass}">\${r.status}</span></td>
          <td class="p-4 font-mono font-bold text-zinc-200">\${r.spent}</td>
          <td class="p-4 font-mono text-zinc-500">\${r.createdAt}</td>
          <td class="p-4 text-right space-x-2">
            <button onclick="editRecord('\${r.id}')" class="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300">Edit</button>
            <button onclick="deleteRecord('\${r.id}')" class="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded">Delete</button>
          </td>
        \`;
        tbody.appendChild(tr);
      });
    }

    // Search and Filters
    document.getElementById('search-input').addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderTable();
    });

    document.querySelectorAll('#status-filters button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#status-filters button').forEach(b => {
          b.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white filter-btn';
        });
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 text-white border border-zinc-700 filter-btn';
        activeFilter = btn.dataset.status;
        renderTable();
      });
    });

    // Modal Handlers
    const modal = document.getElementById('record-modal');
    document.getElementById('btn-add-record').addEventListener('click', () => {
      document.getElementById('modal-title').innerText = 'Add ${entityName}';
      document.getElementById('form-id').value = '';
      document.getElementById('form-name').value = '';
      document.getElementById('form-email').value = '';
      document.getElementById('form-spent').value = '$0';
      modal.classList.remove('hidden');
    });

    document.getElementById('btn-close-modal').addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('btn-cancel-modal').addEventListener('click', () => modal.classList.add('hidden'));

    window.editRecord = function(id) {
      const rec = records.find(r => r.id === id);
      if (!rec) return;
      document.getElementById('modal-title').innerText = 'Edit ' + rec.name;
      document.getElementById('form-id').value = rec.id;
      document.getElementById('form-name').value = rec.name;
      document.getElementById('form-email').value = rec.email;
      document.getElementById('form-role').value = rec.role;
      document.getElementById('form-status').value = rec.status;
      document.getElementById('form-spent').value = rec.spent;
      modal.classList.remove('hidden');
    };

    window.deleteRecord = function(id) {
      if (confirm('Delete record ' + id + '?')) {
        records = records.filter(r => r.id !== id);
        saveState();
      }
    };

    document.getElementById('btn-save-record').addEventListener('click', () => {
      const id = document.getElementById('form-id').value;
      const name = document.getElementById('form-name').value.trim();
      const email = document.getElementById('form-email').value.trim();
      const role = document.getElementById('form-role').value;
      const status = document.getElementById('form-status').value;
      const spent = document.getElementById('form-spent').value.trim();

      if (!name || !email) {
        alert('Please fill out Name and Email');
        return;
      }

      if (id) {
        const item = records.find(r => r.id === id);
        if (item) {
          item.name = name;
          item.email = email;
          item.role = role;
          item.status = status;
          item.spent = spent;
        }
      } else {
        const newId = 'REC-' + Math.floor(1000 + Math.random() * 9000);
        const createdAt = new Date().toISOString().split('T')[0];
        records.unshift({ id: newId, name, email, role, status, spent, createdAt });
      }

      modal.classList.add('hidden');
      saveState();
    });

    // CSV Export
    document.getElementById('btn-export-csv').addEventListener('click', () => {
      const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Spent', 'CreatedAt'];
      const rows = records.map(r => [r.id, r.name, r.email, r.role, r.status, r.spent, r.createdAt].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','));
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', '${entityName.toLowerCase()}_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    });

    renderTable();
  </script>
</body>
</html>`;
}

