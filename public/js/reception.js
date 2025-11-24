const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
const socket = io();
socket.emit('join', 'reception');

// DOM Elements
const form = document.getElementById('regForm');
const tableBody = document.getElementById('patients-table-body');
const emptyState = document.getElementById('empty-state');
const statusDiv = document.getElementById('status');
const deptSelect = document.getElementById('department');
const doctorSelect = document.getElementById('doctor');
const phoneInput = document.getElementById('phone');
const fileInput = document.getElementById('reports');
const fileLabelText = document.getElementById('fileLabelText');

// Stats Elements
const statTotal = document.getElementById('stat-total');
const statWaiting = document.getElementById('stat-waiting');
const statDoctor = document.getElementById('stat-doctor');
const statCompleted = document.getElementById('stat-completed');

let allDoctors = [];
let patientsList = [];

// --- Initialization ---
function init() {
  loadDepartments();
  loadPatients();
  setupEventListeners();
}

function setupEventListeners() {
  // File Input Change
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      fileLabelText.innerText = `${fileInput.files.length} file(s) selected`;
      fileLabelText.style.color = 'var(--primary)';
    } else {
      fileLabelText.innerText = 'Click to upload files (Images/PDF)';
      fileLabelText.style.color = 'var(--text-muted)';
    }
  });

  // Form Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('name', document.getElementById('name').value);
    formData.append('age', document.getElementById('age').value);
    formData.append('gender', document.getElementById('gender').value);
    formData.append('phone', document.getElementById('phone').value);
    formData.append('address', document.getElementById('address').value);
    formData.append('patientType', document.getElementById('patientType').value);
    formData.append('opdIpd', document.getElementById('opdipd').value);
    formData.append('department', deptSelect.value);
    formData.append('doctorId', doctorSelect.value || '');
    formData.append('reason', document.getElementById('reason').value);
    formData.append('cost', document.getElementById('cost').value);

    // Append files
    for (let i = 0; i < fileInput.files.length; i++) {
      formData.append('reports', fileInput.files[i]);
    }

    statusDiv.innerText = 'Registering...';
    statusDiv.style.color = 'var(--status-waiting)';

    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Registration failed');

      const result = await res.json();
      console.log('Registered:', result);

      // Success handled via socket event, but we can clear form here
      form.reset();
      fileLabelText.innerText = 'Click to upload files (Images/PDF)';
      fileLabelText.style.color = 'var(--text-muted)';

    } catch (err) {
      console.error(err);
      statusDiv.innerText = 'Error: ' + err.message;
      statusDiv.style.color = 'var(--danger)';
    }
  });

  // Auto-fetch patient
  phoneInput.addEventListener('blur', () => {
    const val = phoneInput.value.trim();
    if (!val) return;
    fetch(`${API_BASE}/api/patients?phone=` + encodeURIComponent(val))
      .then(r => r.json())
      .then(list => {
        if (list && list.length) {
          const p = list[0];
          document.getElementById('name').value = p.name || '';
          document.getElementById('age').value = p.age || '';
          document.getElementById('gender').value = p.gender || '';
          document.getElementById('address').value = p.address || '';
          document.getElementById('patientType').value = 'Follow-up';
        }
      });
  });

  // Dept change
  deptSelect.addEventListener('change', () => loadDoctors(deptSelect.value));

  // Export Buttons
  document.getElementById('exportMonth')?.addEventListener('click', () => {
    window.location.href = `${API_BASE}/api/export?type=month`;
  });
  document.getElementById('exportYear')?.addEventListener('click', () => {
    window.location.href = `${API_BASE}/api/export?type=year`;
  });

  // Table Actions (Delegation)
  tableBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === 'assign') {
      // Find selected doctor in the row
      const row = btn.closest('tr');
      const select = row.querySelector('.row-doctor-select');
      const doctorId = select ? select.value : null;

      if (!doctorId) return alert('Please select a doctor');

      socket.emit('move-patient', { id, status: 'with-doctor', doctorId });
    } else if (action === 'pharmacy') {
      socket.emit('move-patient', { id, status: 'pharmacy' });
    } else if (action === 'cancel') {
      if (confirm('Cancel this token?')) {
        // Implement cancel logic if needed, or just mark completed/cancelled
        socket.emit('move-patient', { id, status: 'cancelled' });
      }
    }
  });
}

// --- Data Loading ---
function loadDepartments() {
  fetch(`${API_BASE}/api/departments`).then(r => r.json()).then(list => {
    deptSelect.innerHTML = '';
    list.forEach(d => {
      const o = document.createElement('option'); o.value = d; o.textContent = d; deptSelect.appendChild(o);
    });
    loadDoctors(list[0]); // Load doctors for first dept
  });
}

function loadDoctors(dept) {
  let url = `${API_BASE}/api/doctors`;
  if (dept) url += '?dept=' + encodeURIComponent(dept);
  fetch(url).then(r => r.json()).then(list => {
    allDoctors = list;
    doctorSelect.innerHTML = '<option value="">(Auto Assign)</option>';
    list.forEach(d => {
      const o = document.createElement('option'); o.value = d.id; o.textContent = d.name; doctorSelect.appendChild(o);
    });
  });
}

function loadPatients() {
  fetch(`${API_BASE}/api/patients`).then(r => r.json()).then(list => {
    patientsList = list;
    renderTable();
    updateStats();
  });
}

// --- Rendering ---
function renderTable() {
  tableBody.innerHTML = '';

  // Filter for "Today" (optional, for now show all recent)
  // In a real app, you'd filter by date here or in API
  const displayList = patientsList.slice(0, 50); // Show last 50

  if (displayList.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  displayList.forEach(p => {
    const tr = document.createElement('tr');
    tr.className = 'animate-fade-in';

    // Status Badge
    let badgeClass = 'waiting';
    if (p.status === 'with-doctor') badgeClass = 'with-doctor';
    if (p.status === 'pharmacy') badgeClass = 'pharmacy';
    if (p.status === 'completed') badgeClass = 'completed';

    // Doctor Cell
    let doctorHtml = '-';
    if (p.doctorId) {
      const d = allDoctors.find(doc => doc.id == p.doctorId); // Might need to fetch all doctors globally or store map
      doctorHtml = d ? d.name : `Dr. ID ${p.doctorId}`;
    } else {
      // Dropdown to assign
      doctorHtml = `
        <div class="flex gap-2">
          <select class="row-doctor-select" style="padding: 4px; font-size: 0.85rem; width: 120px;">
            <option value="">Select...</option>
            ${allDoctors.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
          </select>
          <button class="btn btn-sm btn-primary" data-id="${p.id}" data-action="assign">Assign</button>
        </div>
      `;
    }

    // Actions
    let actionsHtml = '';
    if (p.status === 'with-doctor' || p.status === 'waiting') {
      actionsHtml += `<button class="btn btn-sm btn-accent" data-id="${p.id}" data-action="pharmacy">Pharmacy</button>`;
    }

    tr.innerHTML = `
      <td><strong>#${p.token}</strong></td>
      <td>
        <div style="font-weight:600;">${p.name}</div>
        <div class="text-muted" style="font-size:0.85rem;">${p.phone}</div>
      </td>
      <td>${p.age} / ${p.gender}</td>
      <td>${p.department}</td>
      <td>${doctorHtml}</td>
      <td><span class="badge ${badgeClass}">${p.status}</span></td>
      <td>${actionsHtml}</td>
    `;
    tableBody.appendChild(tr);
  });
}

function updateStats() {
  // Simple stats based on loaded list (ideally should come from API)
  const today = new Date().toISOString().split('T')[0];
  const todayPatients = patientsList.filter(p => p.registeredAt && p.registeredAt.startsWith(today));

  statTotal.innerText = todayPatients.length;
  statWaiting.innerText = todayPatients.filter(p => p.status === 'waiting').length;
  statDoctor.innerText = todayPatients.filter(p => p.status === 'with-doctor').length;
  statCompleted.innerText = todayPatients.filter(p => p.status === 'completed' || p.status === 'pharmacy').length;
}

// --- Socket Events ---
socket.on('patient-registered', (p) => {
  statusDiv.innerText = `✓ Registered ${p.name} (Token ${p.token})`;
  statusDiv.style.color = 'var(--status-completed)';
  setTimeout(() => statusDiv.innerText = '', 3000);

  patientsList.unshift(p);
  renderTable();
  updateStats();
});

socket.on('queue-updated', ({ patient }) => {
  if (patient) {
    const idx = patientsList.findIndex(x => x.id === patient.id);
    if (idx >= 0) patientsList[idx] = patient;
    else patientsList.unshift(patient);
    renderTable();
    updateStats();
  } else {
    loadPatients();
  }
});

// Start
init();
