const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const API_URL = 'http://localhost:3000/api/register';

async function testUpload() {
    try {
        // Create a dummy file
        const filePath = path.join(__dirname, 'test-report.txt');
        fs.writeFileSync(filePath, 'This is a test report content.');

        const form = new FormData();
        form.append('name', 'Test Patient');
        form.append('age', '30');
        form.append('gender', 'Male');
        form.append('phone', '9999999999');
        form.append('department', 'General');
        form.append('reports', fs.createReadStream(filePath));

        console.log('Uploading file...');
        const res = await axios.post(API_URL, form, {
            headers: form.getHeaders()
        });

        console.log('Response:', res.data);

        if (res.data.reports && res.data.reports.includes('test-report.txt')) {
            console.log('SUCCESS: File uploaded and record created.');
        } else {
            console.log('WARNING: Record created but report path might be missing/different.');
        }

        // Cleanup
        fs.unlinkSync(filePath);

    } catch (err) {
        console.error('ERROR:', err.message);
        if (err.response) {
            console.error('Server Response:', err.response.data);
        }
    }
}

testUpload();
