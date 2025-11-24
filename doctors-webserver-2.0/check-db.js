const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./patients.db');

console.log('\n=== PATIENTS DATABASE ===\n');

db.all('SELECT id, name, phone, age, department, cost, registeredAt FROM patients ORDER BY id DESC LIMIT 10', [], (err, rows) => {
    if (err) {
        console.error('Error:', err.message);
    } else {
        console.log(`Total patients shown: ${rows.length}\n`);
        rows.forEach(row => {
            console.log(`ID: ${row.id}`);
            console.log(`Name: ${row.name}`);
            console.log(`Phone: ${row.phone}`);
            console.log(`Age: ${row.age}`);
            console.log(`Department: ${row.department}`);
            console.log(`Cost: ₹${row.cost || 0}`);
            console.log(`Registered: ${new Date(row.registeredAt).toLocaleString('en-IN')}`);
            console.log('---');
        });
    }

    db.get('SELECT COUNT(*) as total FROM patients', [], (err, row) => {
        if (!err) {
            console.log(`\nTotal patients in database: ${row.total}`);
        }
        db.close();
    });
});
