const API_BASE = 'http://localhost:3000';
const socket = io(API_BASE);
socket.emit('join', 'pharmacy');

const listEl = document.getElementById('list');
const q = document.getElementById('q');
const refreshBtn = document.getElementById('refresh');

let cached = [];

function statusClass(p) {
  const st = p.pharmacyState || (p.status === 'pharmacy' ? 'pending' : 'pending');
  if (st === 'preparing') return 'status-preparing';
  if (st === 'ready') return 'status-ready';
  if (st === 'delivered') return 'status-delivered';
  return 'status-pending';
}

function renderRow(p) {
  const el = document.createElement('div');
  el.className = 'patient';
  el.id = 'p-' + p.id;

  const st = p.pharmacyState || (p.status === 'pharmacy' ? 'pending' : 'pending');
  let badgeClass = 'waiting'; // default yellow
  if (st === 'preparing') badgeClass = 'with-doctor'; // blue
  if (st === 'ready') badgeClass = 'completed'; // green
  if (st === 'delivered') badgeClass = 'pharmacy'; // indigo

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:start">
      <div>
        <div><strong>${p.name}</strong> <span class="meta" style="margin-left:8px;">(Token ${p.token} • ${p.phone || '-'})</span></div>
        <div class="meta" style="margin-top:4px;">Dept: ${p.department} • ${p.reason || ''}</div>
      </div>
      <div style="text-align:right">
        <span class="badge ${badgeClass}">${st.charAt(0).toUpperCase() + st.slice(1)}</span>
      </div>
    </div>
    <div style="margin-top:12px; font-weight:600; font-size:0.9rem;">Prescription:</div>
    <div class="presc">${p.prescription || '<em>— No prescription —</em>'}</div>
    <div style="margin-top:12px; display:flex; gap:8px">
      <button data-id="${p.id}" data-action="preparing" class="secondary">Mark Preparing</button>
      <button data-id="${p.id}" data-action="ready" class="secondary">Mark Ready</button>
      <button data-id="${p.id}" data-action="delivered">Mark Delivered</button>
    </div>
  `;
  return el;
}

function load() {
  fetch(`${API_BASE}/api/prescriptions`).then(r => r.json()).then(list => {
    cached = list;
    renderList();
  });
}

function renderList() {
  const query = q.value && q.value.toLowerCase();
  listEl.innerHTML = '';
  const filtered = cached.filter(p => {
    if (!query) return true;
    return (p.name && p.name.toLowerCase().includes(query)) || (p.phone && p.phone.includes(query)) || (String(p.token).includes(query));
  });
  if (!filtered.length) { listEl.innerHTML = '<div class="meta">No prescriptions found.</div>'; return; }
  filtered.forEach(p => listEl.appendChild(renderRow(p)));
}

listEl.addEventListener('click', (ev) => {
  const btn = ev.target.closest('button');
  if (!btn) return;
  const id = btn.getAttribute('data-id');
  const action = btn.getAttribute('data-action');
  if (action === 'preparing') socket.emit('move-patient', { id, status: 'pharmacy', pharmacyState: 'preparing' });
  if (action === 'ready') socket.emit('move-patient', { id, status: 'pharmacy', pharmacyState: 'ready' });
  if (action === 'delivered') socket.emit('move-patient', { id, status: 'completed', pharmacyState: 'delivered' });
});

q.addEventListener('input', renderList);
refreshBtn.addEventListener('click', load);

socket.on('queue-updated', () => load());
socket.on('patient-updated', () => load());
socket.on('prescription-updated', () => load());

load();
