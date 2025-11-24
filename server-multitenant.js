const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const ExcelJS = require('exceljs');
const db = require('./database');
const multer = require('multer');
const session = require('express-session');
const auth = require('./auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- Middleware ---
app.use(express.json());

// Session middleware for authentication
app.use(session({
    secret: 'MedFlowProSecretKey2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true
    }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// --- Multer Configuration ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + '-' + file.originalname)
    }
});
const upload = multer({ storage: storage });

// --- Sample Data ---
const departments = [
    'General', 'Orthopedics', 'Gynecology', 'Pediatrics', 'ENT', 'Dermatology', 'Cardiology', 'Medicine'
];

const doctors = [
}

// --- Authentication Endpoints ---

// Hospital-based login
app.post('/api/login', (req, res) => {
    const { hospitalId, password, section } = req.body;

    if (!hospitalId) {
        return res.json({ success: false, message: 'Please select a hospital' });
    }

    // Verify hospital exists and is active
    db.get('SELECT * FROM hospitals WHERE id = ?', [hospitalId], (err, hospital) => {
        if (err || !hospital) {
            return res.json({ success: false, message: 'Hospital not found' });
        }

        if (hospital.subscriptionStatus !== 'active') {
            return res.json({ success: false, message: 'Subscription expired. Please contact admin.' });
        }

        // Verify password
        if (auth.verifyHospitalPassword(hospitalId, password)) {
            req.session.authenticated = true;
            req.session.hospitalId = hospitalId;
            req.session.hospitalName = hospital.name;
            req.session.section = section;
            req.session.loginDate = new Date().toISOString();

            // Update last login
            db.run('UPDATE hospitals SET lastLogin = ? WHERE id = ?', [new Date().toISOString(), hospitalId]);

            res.json({
                success: true,
                message: 'Login successful',
                hospitalId,
                hospitalName: hospital.name,
                section
            });
        } else {
            res.json({
                success: false,
                message: 'Invalid access code'
            });
        }
    });
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
    res.json({
        authenticated: !!req.session.authenticated,
        hospitalId: req.session.hospitalId || null,
        hospitalName: req.session.hospitalName || null,
        section: req.session.section || null
    });
});

// --- Hospital Management Endpoints ---

// Register new hospital
app.post('/api/hospitals/register', async (req, res) => {
    const { hospital, admin } = req.body;

    try {
        // Check if email already exists
        db.get('SELECT id FROM hospitals WHERE email = ?', [hospital.email], async (err, existing) => {
            if (existing) {
                return res.json({ success: false, message: 'Hospital email already registered' });
            }

            const now = new Date().toISOString();
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30); // 30-day trial

            // Insert hospital
            const hospitalSql = `INSERT INTO hospitals (name, email, phone, address, subscriptionStatus, subscriptionExpiry, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`;

            db.run(hospitalSql, [hospital.name, hospital.email, hospital.phone, hospital.address, 'active', expiryDate.toISOString(), now], async function (err) {
                if (err) {
                    console.error('Hospital registration error:', err);
                    return res.json({ success: false, message: 'Failed to register hospital' });
                }

                const hospitalId = this.lastID;

                // Hash admin password
                const hashedPassword = await auth.hashPassword(admin.password);

                // Create admin user
                const userSql = `INSERT INTO users (hospitalId, username, email, role, password, createdAt) VALUES (?, ?, ?, ?, ?, ?)`;

                db.run(userSql, [hospitalId, admin.username, admin.email, 'admin', hashedPassword, now], (err) => {
                    if (err) {
                        console.error('Admin user creation error:', err);
                        return res.json({ success: false, message: 'Failed to create admin user' });
                    }

                    // Generate hospital password
                    const password = auth.generateHospitalPassword(hospitalId);

                    console.log(`Hospital registered: ${hospital.name} (ID: ${hospitalId})`);

                    res.json({
                        success: true,
                        hospitalId,
                        password,
                        message: 'Hospital registered successfully'
                    });
                });
            });
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.json({ success: false, message: 'Registration failed' });
    }
});

// Get all hospitals (for login dropdown)
app.get('/api/hospitals', (req, res) => {
    db.all('SELECT id, name, email, subscriptionStatus FROM hospitals WHERE subscriptionStatus = "active" ORDER BY name', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// --- Admin Endpoints ---

// Super admin login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;

    if (password === SUPER_ADMIN_PASSWORD) {
        req.session.superAdmin = true;
        req.session.adminLoginDate = new Date().toISOString();
        res.json({ success: true, message: 'Super admin authenticated' });
    } else {
        res.json({ success: false, message: 'Invalid admin password' });
    }
});

// Check super admin status
app.get('/api/admin/status', (req, res) => {
    res.json({
        authenticated: !!req.session.superAdmin
    });
});

// Super admin middleware
function requireSuperAdmin(req, res, next) {
    if (req.session.superAdmin) {
        next();
    } else {
        res.status(403).json({ error: 'Unauthorized' });
    }
}
res.json({ success: true });
                });
            });

// --- Patient Management Endpoints (with hospital isolation) ---

app.get('/api/patients', requireAuth, (req, res) => {
    const { phone } = req.query;
    const hospitalId = req.hospitalId;

    let sql = `SELECT * FROM patients WHERE hospitalId = ? ORDER BY id DESC`;
    let params = [hospitalId];

    if (phone) {
        sql = `SELECT * FROM patients WHERE hospitalId = ? AND phone = ? ORDER BY id DESC`;
        params = [hospitalId, phone];
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/patients/:id', requireAuth, (req, res) => {
    const hospitalId = req.hospitalId;
    const sql = `SELECT * FROM patients WHERE id = ? AND hospitalId = ?`;

    db.get(sql, [req.params.id, hospitalId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Not found' });
        res.json(row);
    });
});

app.get('/api/prescriptions', requireAuth, (req, res) => {
    const hospitalId = req.hospitalId;
    const sql = `SELECT * FROM patients WHERE hospitalId = ? AND ((prescription IS NOT NULL AND prescription != '') OR status = 'pharmacy' OR pharmacyState IS NOT NULL) ORDER BY token ASC`;

    db.all(sql, [hospitalId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// Register Patient (with hospital isolation)
app.post('/api/register', requireAuth, upload.array('reports'), (req, res) => {
    const { name, age, gender, phone, address, patientType, opdIpd, department, doctorId, reason, cost } = req.body;
    const reports = req.files ? JSON.stringify(req.files.map(f => f.filename)) : '[]';
    const hospitalId = req.hospitalId;
    const dept = department || 'General';

    // Get token count for this hospital and department
    db.get(`SELECT COUNT(*) as count FROM patients WHERE hospitalId = ? AND department = ?`, [hospitalId, dept], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        const token = (row.count || 0) + 1;

        // Auto-assign doctor if not provided
        let assignedDoctor = doctorId || null;
        if (!assignedDoctor) {
            const avail = doctors.find(d => d.dept === dept && d.status === 'available');
            if (avail) assignedDoctor = avail.id;
        }

        const sql = `INSERT INTO patients (hospitalId, name, age, gender, phone, address, patientType, opdIpd, department, doctorId, reason, status, token, cost, reports, registeredAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const registeredAt = new Date().toISOString();
        const params = [hospitalId, name, age, gender, phone, address, patientType, opdIpd, dept, assignedDoctor, reason, 'waiting', token, cost || 0, reports, registeredAt];

        db.run(sql, params, function (err) {
            if (err) return res.status(500).json({ error: err.message });

            const patient = {
                id: this.lastID,
                hospitalId,
                name, age, gender, phone, address, patientType, opdIpd,
                department: dept, doctorId: assignedDoctor, reason,
                status: 'waiting', token, cost, reports, registeredAt
            };

            // Broadcast updates (only to same hospital)
            io.to(`hospital-${hospitalId}-doctors`).emit('patient-registered', patient);
            io.to(`hospital-${hospitalId}-reception`).emit('patient-registered', patient);
            io.to(`hospital-${hospitalId}`).emit('queue-updated', { patient });

            res.json(patient);
        });
    });
});

// --- Static Data Endpoints ---

app.get('/api/doctors', (req, res) => {
    const { dept } = req.query;
    if (dept) return res.json(doctors.filter(d => d.dept === dept));
    res.json(doctors);
});

app.get('/api/departments', (req, res) => {
    res.json(departments);
});

// --- Excel Export (with hospital isolation) ---

app.get('/api/export', requireAuth, async (req, res) => {
    const { type } = req.query;
    const hospitalId = req.hospitalId;
    const now = new Date();
    let startDate;

    if (type === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1).toISOString();
    } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }

    const sql = `SELECT * FROM patients WHERE hospitalId = ? AND registeredAt >= ? ORDER BY registeredAt DESC`;

    db.all(sql, [hospitalId, startDate], async (err, rows) => {
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

        const formattedRows = rows.map(row => ({
            ...row,
            registeredAt: new Date(row.registeredAt).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short'
            }),
            cost: row.cost || 0
        }));

        sheet.addRows(formattedRows);

        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0EA5E9' }
        };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=patients_${type}_${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    });
});

// --- Socket.IO Logic (with hospital isolation) ---

io.on('connection', (socket) => {
    socket.on('join', (data) => {
        const { role, hospitalId } = data;

        if (hospitalId) {
            socket.join(`hospital-${hospitalId}`);
            socket.join(`hospital-${hospitalId}-${role}`);
            socket.hospitalId = hospitalId;
        }

        socket.role = role;
        console.log(`Socket ${socket.id} joined hospital ${hospitalId} as ${role}`);
    });

    socket.on('register-patient', (data) => {
        const hospitalId = socket.hospitalId;
        if (!hospitalId) return;

        const dept = data.department || 'General';

        db.get(`SELECT COUNT(*) as count FROM patients WHERE hospitalId = ? AND department = ?`, [hospitalId, dept], (err, row) => {
            if (err) return console.error(err);

            const token = (row.count || 0) + 1;

            let assignedDoctor = data.doctorId || null;
            if (!assignedDoctor) {
                const avail = doctors.find(d => d.dept === dept && d.status === 'available');
                if (avail) assignedDoctor = avail.id;
            }

            const sql = `INSERT INTO patients (hospitalId, token, name, age, gender, phone, address, patientType, opdIpd, department, doctorId, reason, status, registeredAt, cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            const params = [
                hospitalId, token, data.name || 'Unknown', data.age || '', data.gender || '', data.phone || '',
                data.address || '', data.patientType || 'New', data.opdIpd || 'OPD', dept, assignedDoctor,
                data.reason || '', 'waiting', new Date().toISOString(), data.cost || 0
            ];

            db.run(sql, params, function (err) {
                if (err) {
                    console.error(err.message);
                    socket.emit('patient-registration-error', { message: 'Database error: ' + err.message });
                    return;
                }

                const patient = { id: this.lastID, hospitalId, token, ...data, status: 'waiting' };

                io.to(`hospital-${hospitalId}-doctors`).emit('patient-registered', patient);
                io.to(`hospital-${hospitalId}-reception`).emit('patient-registered', patient);
                io.to(`hospital-${hospitalId}`).emit('queue-updated', { patient });
                socket.emit('patient-registered', patient);
            });
        });
    });

    socket.on('move-patient', ({ id, status, doctorId, pharmacyState }) => {
        const hospitalId = socket.hospitalId;
        if (!hospitalId) return;

        const pid = Number(id);

        db.get(`SELECT * FROM patients WHERE id = ? AND hospitalId = ?`, [pid, hospitalId], (err, current) => {
            if (err || !current) return;

            const newStatus = status || current.status;
            const newDocId = doctorId || current.doctorId;
            const newPharmState = pharmacyState || current.pharmacyState;

            const sql = `UPDATE patients SET status = ?, doctorId = ?, pharmacyState = ? WHERE id = ? AND hospitalId = ?`;
            db.run(sql, [newStatus, newDocId, newPharmState, pid, hospitalId], (err) => {
                if (err) return console.error(err);

                db.get(`SELECT * FROM patients WHERE id = ? AND hospitalId = ?`, [pid, hospitalId], (err, updated) => {
                    if (updated) {
                        io.to(`hospital-${hospitalId}`).emit('patient-updated', updated);
                        io.to(`hospital-${hospitalId}-doctors`).emit('queue-updated', { patient: updated });
                        io.to(`hospital-${hospitalId}-reception`).emit('queue-updated', { patient: updated });
                        io.to(`hospital-${hospitalId}-pharmacy`).emit('queue-updated', { patient: updated });
                    }
                });
            });
        });
    });

    socket.on('update-prescription', ({ id, prescription }) => {
        const hospitalId = socket.hospitalId;
        if (!hospitalId) return;

        const pid = Number(id);
        const sql = `UPDATE patients SET prescription = ? WHERE id = ? AND hospitalId = ?`;

        db.run(sql, [prescription, pid, hospitalId], (err) => {
            if (err) return console.error(err);

            db.get(`SELECT * FROM patients WHERE id = ? AND hospitalId = ?`, [pid, hospitalId], (err, updated) => {
                if (updated) {
                    io.to(`hospital-${hospitalId}-doctors`).emit('prescription-updated', updated);
                    io.to(`hospital-${hospitalId}-reception`).emit('prescription-updated', updated);
                    socket.emit('prescription-updated', updated);
                }
            });
        });
    });

    socket.on('disconnect', () => {
        console.log(`Socket ${socket.id} disconnected`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Multi-tenant server listening on port ${PORT}`));
