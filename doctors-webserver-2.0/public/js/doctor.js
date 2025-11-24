const API_BASE = 'http://localhost:3000';
const socket = io(API_BASE);
socket.emit('join', 'doctor');

const patientsDiv = document.getElementById('patients');
const doctorSelect = document.getElementById('doctorSelect');
const refreshBtn = document.getElementById('refresh');

let currentDoctorId = null;

function renderPatient(p) {
  const el = document.createElement('div');
  el.className = 'patient';
  el.id = 'p-' + p.id;
  el.style.marginBottom = '12px';

  const statusColor = {
    'waiting': '#fbbf24',
    'with-doctor': '#60a5fa',
    'pharmacy': '#34d399',
    'completed': '#a78bfa'
  };

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:start;">
      <div style="flex:1">
        <div style="font-weight:700;font-size:1rem;color:var(--primary)">${p.name}</div>
        <div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px">
          Token: <strong>${p.token}</strong> • Age: ${p.age} • Gender: ${p.gender || '-'}
        </div>
        <div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px">
          Phone: ${p.phone || '-'} • Dept: ${p.department}
        </div>
        <div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px">
          Reason: ${p.reason || '-'}
        </div>
      </div>
      <div style="text-align:right">
        <span style="display:inline-block;background:${statusColor[p.status] || '#ccc'};color:white;padding:4px 8px;border-radius:4px;font-size:0.8rem;font-weight:600">${p.status}</span>
      </div>
    </div>
    <div style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px">
      <label style="display:block;font-weight:600;margin-bottom:6px">Prescription</label>
      <textarea id="tx-${p.id}" style="width:100%;height:100px;padding:8px;border:1px solid #d7dbe6;border-radius:4px;font-family:monospace;font-size:0.85rem">${p.prescription || ''}</textarea>
    </div>
    <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
      <button data-id="${p.id}" data-action="start" style="background:#3b82f6;color:white;padding:6px 10px;border:none;border-radius:4px;cursor:pointer;font-size:0.85rem;font-weight:600">Start</button>
      <button data-id="${p.id}" data-action="finish" style="background:#10b981;color:white;padding:6px 10px;border:none;border-radius:4px;cursor:pointer;font-size:0.85rem;font-weight:600">Finish</button>
      <button data-id="${p.id}" data-action="send-pharmacy" style="background:#f59e0b;color:white;padding:6px 10px;border:none;border-radius:4px;cursor:pointer;font-size:0.85rem;font-weight:600">Send to Pharmacy</button>
      <button data-id="${p.id}" data-action="save" style="background:#8b5cf6;color:white;padding:6px 10px;border:none;border-radius:4px;cursor:pointer;font-size:0.85rem;font-weight:600">Save Prescription</button>
    </div>
  `;
  return el;
}

function loadDoctors() {
  fetch(`${API_BASE}/api/doctors`).then(r => r.json()).then(list => {
    doctorSelect.innerHTML = '<option value="">Select doctor</option>';
    list.forEach(d => {
      const o = document.createElement('option');
      o.value = d.id;
      o.textContent = d.name + ' — ' + d.dept + ' (' + d.status + ')';
      doctorSelect.appendChild(o);
    });
  });
}

function loadPatients() {
  fetch(`${API_BASE}/api/patients`).then(r => r.json()).then(list => {
    patientsDiv.innerHTML = '';
    const filtered = list.filter(p => {
      if (!currentDoctorId) return true;
      return p.doctorId == currentDoctorId;
    });
    filtered.sort((a, b) => {
      const order = { 'waiting': 0, 'with-doctor': 1, 'pharmacy': 2, 'completed': 3 };
      return (order[a.status] || 9) - (order[b.status] || 9) || Number(a.token) - Number(b.token);
    });
    if (filtered.length === 0) {
      patientsDiv.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px">No patients assigned</div>';
      return;
    }
    filtered.forEach(p => patientsDiv.appendChild(renderPatient(p)));
  });
}

patientsDiv.addEventListener('click', (ev) => {
  const btn = ev.target.closest('button');
  if (!btn) return;
  const id = btn.getAttribute('data-id');
  const action = btn.getAttribute('data-action');
  if (action === 'start') {
    socket.emit('move-patient', { id, status: 'with-doctor', doctorId: currentDoctorId });
  } else if (action === 'finish') {
    socket.emit('move-patient', { id, status: 'completed' });
  } else if (action === 'send-pharmacy') {
    socket.emit('move-patient', { id, status: 'pharmacy' });
  } else if (action === 'save') {
    const tx = document.getElementById('tx-' + id);
    socket.emit('update-prescription', { id, prescription: tx.value });
  }
});

doctorSelect.addEventListener('change', () => {
  currentDoctorId = doctorSelect.value || null;
  loadPatients();
});

refreshBtn.addEventListener('click', () => loadPatients());

socket.on('patient-registered', (p) => {
  loadPatients();
});

socket.on('patient-updated', (p) => {
  loadPatients();
});

socket.on('queue-updated', (p) => {
  loadPatients();
});

socket.on('prescription-updated', (p) => {
  loadPatients();
});

loadDoctors();
loadPatients();
