const API_BASE = 'http://localhost:3000';
const socket = io(API_BASE);
socket.emit('join', 'reception');

const form = document.getElementById('regForm');
const patientsDiv = document.getElementById('patients');
const status = document.getElementById('status');
const deptSelect = document.getElementById('department');
const doctorSelect = document.getElementById('doctor');
const phoneInput = document.getElementById('phone');
let allDoctors = [];

function renderPatient(p) {
  const el = document.createElement('div');
  el.className = 'patient';
  el.id = 'p-' + p.id;

  const statusClass = p.status === 'waiting' ? 'waiting' :
    p.status === 'with-doctor' ? 'with-doctor' :
      p.status === 'pharmacy' ? 'pharmacy' : 'completed';

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:start">
      <div>
        <strong>${p.name}</strong> 
        <span class="meta" style="display:inline-block; margin-left:8px;">(Age: ${p.age} • ${p.gender || '-'})</span>
        <div class="meta" style="margin-top:4px;">Token: <strong>${p.token}</strong> • Dept: ${p.department}</div>
      </div>
      <span class="badge ${statusClass}">${p.status}</span>
    </div>
    <div style="margin-top:12px; color:var(--text-main);">Reason: ${p.reason}</div>
  `;

  const presc = document.createElement('div');
  presc.className = 'presc';
  presc.innerText = p.prescription ? `Prescription: ${p.prescription}` : 'No prescription yet';
  el.appendChild(presc);

  const actions = document.createElement('div');
  actions.style.marginTop = '12px';

  let assignHtml = '';
  if (!p.doctorId) {
    // Dropdown for unassigned patients
    assignHtml = `
      <select class="doctor-select-assign" style="width:auto; padding:6px; margin-right:8px; display:inline-block;">
        <option value="">Select Doctor</option>
        ${allDoctors.map(d => `<option value="${d.id}">${d.name} (${d.dept})</option>`).join('')}
      </select>
    `;
  }

  actions.innerHTML = `
    ${assignHtml}
    <button class="secondary" data-id="${p.id}" data-action="assign" style="margin-right:8px;">Assign to Doctor</button> 
    <button class="btn-warning" data-id="${p.id}" data-action="to-pharmacy">Send to Pharmacy</button>
  `;
  el.appendChild(actions);
  return el;
}

function loadPatients() {
  fetch(`${API_BASE}/api/patients`).then(r => r.json()).then(list => {
    patientsDiv.innerHTML = '';
    list.forEach(p => patientsDiv.appendChild(renderPatient(p)));
  });
}

function loadDepartments() {
  fetch(`${API_BASE}/api/departments`).then(r => r.json()).then(list => {
    deptSelect.innerHTML = '';
    list.forEach(d => {
      const o = document.createElement('option'); o.value = d; o.textContent = d; deptSelect.appendChild(o);
    });
    loadDoctors();
  });
}

function loadDoctors(dept) {
  let url = `${API_BASE}/api/doctors`;
  if (dept) url += '?dept=' + encodeURIComponent(dept);
  fetch(url).then(r => r.json()).then(list => {
    doctorSelect.innerHTML = '<option value="">(Auto assign)</option>';
    allDoctors = list; // Store for use in renderPatient
    list.forEach(d => {
      const o = document.createElement('option'); o.value = d.id; o.textContent = d.name + ' — ' + d.dept; doctorSelect.appendChild(o);
    });
    // Re-render patients to populate dropdowns if they were loaded before doctors
    if (patientsDiv.children.length > 0) loadPatients();
  });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  console.log('Form submitted');

  const data = {
    name: document.getElementById('name').value,
    age: document.getElementById('age').value,
    gender: document.getElementById('gender').value,
    phone: document.getElementById('phone').value,
    address: document.getElementById('address').value,
    patientType: document.getElementById('patientType').value,
    opdIpd: document.getElementById('opdipd').value,
    department: deptSelect.value,
    doctorId: doctorSelect.value || null,
    reason: document.getElementById('reason').value,
    prescription: document.getElementById('prescription').value,
    cost: parseFloat(document.getElementById('cost').value) || 0
  };

  console.log('Sending patient data:', data);
  socket.emit('register-patient', data);
  status.innerText = 'Registering...';
  status.style.color = 'var(--info)';
});

// Auto-fetch existing patient by phone
phoneInput && phoneInput.addEventListener('blur', () => {
  const val = phoneInput.value && phoneInput.value.trim();
  if (!val) return;
  fetch(`${API_BASE}/api/patients?phone=` + encodeURIComponent(val)).then(r => r.json()).then(list => {
    if (list && list.length) {
      const p = list[0];
      // prefill fields
      document.getElementById('name').value = p.name || '';
      document.getElementById('age').value = p.age || '';
      document.getElementById('gender').value = p.gender || '';
      document.getElementById('address').value = p.address || '';
      document.getElementById('patientType').value = 'Existing';
    }
  });
});

// Dept change updates doctors
deptSelect && deptSelect.addEventListener('change', () => loadDoctors(deptSelect.value));

// Handle action buttons in patient list (assign or send to pharmacy)
patientsDiv.addEventListener('click', (ev) => {
  const btn = ev.target.closest('button');
  if (!btn) return;
  const id = btn.getAttribute('data-id');
  const action = btn.getAttribute('data-action');
  if (action === 'assign') {
    // Check if there's a selector
    const parent = btn.parentElement;
    const select = parent.querySelector('.doctor-select-assign');
    let doctorId = null;

    if (select) {
      doctorId = select.value;
      if (!doctorId) {
        alert('Please select a doctor first.');
        return;
      }
    }

    // mark with-doctor
    const payload = { id, status: 'with-doctor' };
    if (doctorId) payload.doctorId = doctorId;

    socket.emit('move-patient', payload);
  } else if (action === 'to-pharmacy') {
    socket.emit('move-patient', { id, status: 'pharmacy' });
  }
});

socket.on('patient-registered', (p) => {
  console.log('Patient registered successfully:', p);
  status.innerText = `✓ Registered ${p.name} (Token ${p.token})`;
  status.style.color = 'var(--success)';
  form.reset();

  const existing = document.getElementById('p-' + p.id);
  if (existing) existing.replaceWith(renderPatient(p));
  else patientsDiv.prepend(renderPatient(p));

  // Clear success message after 3 seconds
  setTimeout(() => {
    status.innerText = '';
  }, 3000);
});

socket.on('patient-registration-error', (err) => {
  console.error('Registration error:', err);
  status.innerText = 'Error: ' + err.message;
  status.style.color = 'var(--danger)';
});

socket.on('patient-updated', (p) => {
  const existing = document.getElementById('p-' + p.id);
  if (existing) existing.replaceWith(renderPatient(p));
  else patientsDiv.prepend(renderPatient(p));
});

socket.on('queue-updated', ({ patient }) => {
  if (patient) {
    const existing = document.getElementById('p-' + patient.id);
    if (existing) existing.replaceWith(renderPatient(patient));
    else patientsDiv.prepend(renderPatient(patient));
  } else {
    loadPatients();
  }
});

socket.on('prescription-updated', (p) => {
  const node = document.getElementById('p-' + p.id);
  if (node) {
    const presc = node.querySelector('.presc');
    presc.innerText = p.prescription ? `Prescription: ${p.prescription}` : 'No prescription yet';
  } else {
    patientsDiv.prepend(renderPatient(p));
  }
});

loadPatients();
loadDepartments();

// Export Buttons
const exportMonthBtn = document.getElementById('exportMonth');
const exportYearBtn = document.getElementById('exportYear');

if (exportMonthBtn) {
  exportMonthBtn.addEventListener('click', () => {
    window.location.href = `${API_BASE}/api/export?type=month`;
  });
}

if (exportYearBtn) {
  exportYearBtn.addEventListener('click', () => {
    window.location.href = `${API_BASE}/api/export?type=year`;
  });
}
