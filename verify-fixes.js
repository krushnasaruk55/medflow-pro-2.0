const io = require('socket.io-client');

const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('join', 'reception');

    const patientData = {
        name: 'Test Patient',
        age: 30,
        gender: 'Male',
        phone: '1234567890',
        department: 'General',
        reason: 'Test Visit'
    };

    console.log('Registering patient...');
    socket.emit('register-patient', patientData);
});

socket.on('patient-registered', (p) => {
    console.log('Patient registered:', p.name, 'Token:', p.token);

    // Test Send to Pharmacy
    console.log('Sending to pharmacy...');
    socket.emit('move-patient', { id: p.id, status: 'pharmacy' });
});

socket.on('queue-updated', (data) => {
    if (data.patient && data.patient.status === 'pharmacy') {
        console.log('Patient moved to pharmacy:', data.patient.name);
        console.log('Verification Successful!');
        socket.disconnect();
        process.exit(0);
    }
});

socket.on('patient-registration-error', (err) => {
    console.error('Registration Error:', err);
    process.exit(1);
});

setTimeout(() => {
    console.log('Timeout waiting for events');
    process.exit(1);
}, 5000);
