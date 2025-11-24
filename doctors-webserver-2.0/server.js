const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const ExcelJS = require('exceljs');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Sample departments and doctors (Static for now)
const departments = [
  'General', 'Orthopedics', 'Gynecology', 'Pediatrics', 'ENT', 'Dermatology', 'Cardiology', 'Medicine'
];

const doctors = [
  { id: 1, name: 'Dr. Asha Patel', dept: 'General', status: 'available' },
  { id: 2, name: 'Dr. Rajesh Singh', dept: 'Orthopedics', status: 'available' },
  { id: 3, name: 'Dr. Nisha Rao', dept: 'Gynecology', status: 'available' },
  { id: 4, name: 'Dr. Vikram Shah', dept: 'Cardiology', status: 'available' }
];

// --- API Endpoints ---

app.get('/api/patients', (req, res) => {
  const { phone } = req.query;
  let sql = `SELECT * FROM patients ORDER BY id DESC`;
  let params = [];

  if (phone) {
    sql = `SELECT * FROM patients WHERE phone = ? ORDER BY id DESC`;
    params = [phone];
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/patients/:id', (req, res) => {
  const sql = `SELECT * FROM patients WHERE id = ?`;
  db.get(sql, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });
});

app.get('/api/doctors', (req, res) => {
  const { dept } = req.query;
  if (dept) return res.json(doctors.filter(d => d.dept === dept));
  res.json(doctors);
});

app.get('/api/departments', (req, res) => {
  res.json(departments);
});

app.get('/api/prescriptions', (req, res) => {
  // Patients with prescription OR in pharmacy flow
  const sql = `SELECT * FROM patients WHERE (prescription IS NOT NULL AND prescription != '') OR status = 'pharmacy' OR pharmacyState IS NOT NULL ORDER BY token ASC`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Excel Export Endpoint
app.get('/api/export', async (req, res) => {
  const { type } = req.query; // 'month' or 'year'
  const now = new Date();
  let startDate;

  if (type === 'year') {
    startDate = new Date(now.getFullYear(), 0, 1).toISOString();
  } else {
    // Default to current month
    startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }

  const sql = `SELECT * FROM patients WHERE registeredAt >= ? ORDER BY registeredAt DESC`;

  db.all(sql, [startDate], async (err, rows) => {
    if (err) return res.status(500).send('Database error');

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Patients');

    sheet.columns = [
      { header: 'Patient Name', key: 'name', width: 25 },
      { header: 'Visit Date', key: 'registeredAt', width: 20 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Age', key: 'age', width: 10 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Department', key: 'department', width: 15 },
      { header: 'Reason', key: 'reason', width: 20 },
      { header: 'Prescription', key: 'prescription', width: 30 },
      { header: 'Cost Paid', key: 'cost', width: 12 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    // Format the data for better readability
    const formattedRows = rows.map(row => ({
      ...row,
      registeredAt: new Date(row.registeredAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }),
      cost: row.cost || 0
    }));

    sheet.addRows(formattedRows);

    // Style the header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0EA5E9' }
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=patients_${type}_${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  });
});

// --- Socket.IO Logic ---

io.on('connection', (socket) => {
  socket.on('join', (role) => {
    if (role === 'doctor') socket.join('doctors');
    if (role === 'reception') socket.join('reception');
    if (role === 'pharmacy') socket.join('pharmacy');
    socket.role = role;
    console.log(`Socket ${socket.id} joined as ${role}`);
  });

  socket.on('register-patient', (data) => {
    const dept = data.department || 'General';

    // Calculate next token for this department today
    // For simplicity in this demo, we just count total patients in dept + 1
    // In prod, you'd filter by date too.
    db.get(`SELECT COUNT(*) as count FROM patients WHERE department = ?`, [dept], (err, row) => {
      if (err) return console.error(err);

      const token = (row.count || 0) + 1;

      let assignedDoctor = data.doctorId || null;
      if (!assignedDoctor) {
        const avail = doctors.find(d => d.dept === dept && d.status === 'available');
        if (avail) assignedDoctor = avail.id;
      }

      const patient = {
        token,
        name: data.name || 'Unknown',
        age: data.age || '',
        gender: data.gender || '',
        phone: data.phone || '',
        address: data.address || '',
        patientType: data.patientType || 'New',
        opdIpd: data.opdIpd || 'OPD',
        department: dept,
        doctorId: assignedDoctor,
        reason: data.reason || '',
        status: 'waiting',
        registeredAt: new Date().toISOString(),
        vitals: data.vitals || {},
        prescription: data.prescription || '',
        history: data.history || [],
        pharmacyState: null,
        cost: data.cost || 0
      };

      const sql = `INSERT INTO patients (token, name, age, gender, phone, address, patientType, opdIpd, department, doctorId, reason, status, registeredAt, vitals, prescription, pharmacyState, history, cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const params = [
        patient.token, patient.name, patient.age, patient.gender, patient.phone, patient.address,
        patient.patientType, patient.opdIpd, patient.department, patient.doctorId, patient.reason,
        patient.status, patient.registeredAt, JSON.stringify(patient.vitals), patient.prescription,
        patient.pharmacyState, JSON.stringify(patient.history), patient.cost
      ];

      db.run(sql, params, function (err) {
        if (err) {
          console.error(err.message);
          socket.emit('patient-registration-error', { message: 'Database error: ' + err.message });
          return;
        }

        patient.id = this.lastID; // Get the auto-increment ID
        console.log(`Registered patient ${patient.id} token ${patient.token}`);

        // Broadcast
        io.to('doctors').emit('patient-registered', patient);
        io.to('reception').emit('patient-registered', patient);
        io.emit('queue-updated', { patient });
        socket.emit('patient-registered', patient);
      });
    });
  });

  socket.on('move-patient', ({ id, status, doctorId, pharmacyState }) => {
    const pid = Number(id);

    // First get current state to merge
    db.get(`SELECT * FROM patients WHERE id = ?`, [pid], (err, current) => {
      if (err || !current) return;

      const newStatus = status || current.status;
      const newDocId = doctorId || current.doctorId;
      const newPharmState = pharmacyState || current.pharmacyState;
      const updatedAt = new Date().toISOString();

      const sql = `UPDATE patients SET status = ?, doctorId = ?, pharmacyState = ? WHERE id = ?`;
      db.run(sql, [newStatus, newDocId, newPharmState, pid], (err) => {
        if (err) return console.error(err);

        // Fetch updated to broadcast
        db.get(`SELECT * FROM patients WHERE id = ?`, [pid], (err, updated) => {
          if (updated) {
            io.emit('patient-updated', updated);
            io.to('doctors').emit('queue-updated', { patient: updated });
            io.to('reception').emit('queue-updated', { patient: updated });
            io.to('pharmacy').emit('queue-updated', { patient: updated });
          }
        });
      });
    });
  });

  socket.on('update-prescription', ({ id, prescription }) => {
    const pid = Number(id);
    const sql = `UPDATE patients SET prescription = ? WHERE id = ?`;
    db.run(sql, [prescription, pid], (err) => {
      if (err) return console.error(err);

      db.get(`SELECT * FROM patients WHERE id = ?`, [pid], (err, updated) => {
        if (updated) {
          io.to('doctors').emit('prescription-updated', updated);
          io.to('reception').emit('prescription-updated', updated);
          socket.emit('prescription-updated', updated);
        }
      });
    });
  });

  socket.on('disconnect', () => { });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
