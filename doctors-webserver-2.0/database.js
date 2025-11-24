const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to SQLite database (creates file if not exists)
const dbPath = path.join(__dirname, 'patients.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initSchema();
    }
});

function initSchema() {
    const sql = `
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token INTEGER,
      name TEXT,
      age INTEGER,
      gender TEXT,
      phone TEXT,
      address TEXT,
      patientType TEXT,
      opdIpd TEXT,
      department TEXT,
      doctorId INTEGER,
      reason TEXT,
      status TEXT,
      registeredAt TEXT,
      vitals TEXT,
      prescription TEXT,
      pharmacyState TEXT,
      history TEXT,
      cost REAL DEFAULT 0
    )
  `;

    db.run(sql, (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
        } else {
            console.log('Patients table ready.');
            // Add cost column to existing table if it doesn't exist
            db.run(`ALTER TABLE patients ADD COLUMN cost REAL DEFAULT 0`, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    console.error('Error adding cost column:', err.message);
                } else if (!err) {
                    console.log('Cost column added successfully.');
                }
            });
        }
    });
}

module.exports = db;
