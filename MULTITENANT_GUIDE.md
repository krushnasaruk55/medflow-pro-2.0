# 🏥 Multi-Tenant Hospital Management System

## Quick Start Guide

### 1. Start the Multi-Tenant Server

```bash
node server-multitenant.js
```

The server will start on `http://localhost:3000`

### 2. Register Your First Hospital

1. Go to: `http://localhost:3000/register-hospital.html`
2. Fill in hospital details:
   - Hospital Name: "City General Hospital"
   - Email: "admin@cityhospital.com"
   - Phone & Address (optional)
3. Create admin account:
   - Username: "admin"
   - Password: "admin123" (or your choice)
4. Complete registration
5. **SAVE THE ACCESS CODE** shown on success screen!

### 3. Login to Your Hospital

1. Go to: `http://localhost:3000/login.html`
2. Search and select your hospital
3. Choose section (Reception/Doctor/Pharmacy)
4. Enter the access code from registration
5. Click "Access System"

### 4. View All Hospitals (Super Admin)

Go to: `http://localhost:3000/super-admin.html`

This shows:
- All registered hospitals
- Each hospital's current password
- User counts
- Subscription status
- Revenue tracking

## 🔑 Key Features

### Multi-Tenant Isolation
- ✅ Each hospital has separate data
- ✅ Patients, prescriptions, inventory isolated by hospitalId
- ✅ Socket.IO rooms per hospital for real-time updates
- ✅ No data mixing between hospitals

### Hospital-Specific Passwords
- ✅ Each hospital gets unique monthly password
- ✅ Password based on: Hospital ID + Month + Year
- ✅ Auto-expires at month end
- ✅ Example: Hospital #1 = `A1B2-C3D4`, Hospital #2 = `E5F6-G7H8`

### Subscription Management
- ✅ 30-day free trial on registration
- ✅ Active/Expired status tracking
- ✅ Admin can suspend/activate hospitals
- ✅ Expired hospitals can't login

## 📊 How It Works

### Data Isolation

Every data table includes `hospitalId`:

```sql
patients (hospitalId, name, age, ...)
vitals (hospitalId, patientId, ...)
inventory (hospitalId, medicationName, ...)
appointments (hospitalId, patientId, ...)
```

All queries filter by `hospitalId`:
```javascript
SELECT * FROM patients WHERE hospitalId = ? AND ...
```

### Socket.IO Rooms

Each hospital has isolated real-time rooms:
- `hospital-1` - All users of hospital 1
- `hospital-1-doctors` - Doctors of hospital 1
- `hospital-1-reception` - Reception of hospital 1
- `hospital-1-pharmacy` - Pharmacy of hospital 1

Updates only broadcast to same hospital!

### Authentication Flow

1. User selects hospital from dropdown
2. Enters hospital's monthly password
3. Server verifies:
   - Hospital exists
   - Subscription is active
   - Password matches `generateHospitalPassword(hospitalId)`
4. Session stores `hospitalId`
5. All subsequent requests filtered by `hospitalId`

## 🎯 URLs Reference

| Page | URL | Purpose |
|------|-----|---------|
| **Hospital Registration** | `/register-hospital.html` | Register new hospital |
| **Login** | `/login.html` | Hospital staff login |
| **Super Admin** | `/super-admin.html` | Manage all hospitals |
| **Reception** | `/reception.html` | Patient registration |
| **Doctor** | `/doctor.html` | Doctor dashboard |
| **Pharmacy** | `/pharmacy.html` | Pharmacy management |

## 💰 Business Model

### Pricing Example

- **Per Hospital**: ₹1,500/month
- **10 Hospitals**: ₹15,000/month revenue
- **50 Hospitals**: ₹75,000/month revenue
- **100 Hospitals**: ₹1,50,000/month revenue

### Monthly Process

1. **Start of Month**: New passwords auto-generate
2. **Contact Hospitals**: Share new password
3. **Collect Payment**: Get monthly subscription
4. **Share Password**: Only with paying hospitals
5. **Non-Payers**: Auto-locked out (old password expired)

## 🔧 Testing Multi-Tenancy

### Test Scenario

1. **Register Hospital A**
   - Name: "City Hospital"
   - Get password: `A1B2-C3D4`

2. **Register Hospital B**
   - Name: "Metro Hospital"  
   - Get password: `E5F6-G7H8`

3. **Login to Hospital A**
   - Use password `A1B2-C3D4`
   - Register patient "John Doe"

4. **Login to Hospital B**
   - Use password `E5F6-G7H8`
   - Register patient "Jane Smith"

5. **Verify Isolation**
   - Hospital A sees only "John Doe"
   - Hospital B sees only "Jane Smith"
   - No data mixing!

## 🚀 Migration from Old Server

### Option 1: Direct Replacement

```bash
# Backup current server
cp server.js server-old.js

# Replace with multi-tenant
cp server-multitenant.js server.js

# Restart
npm start
```

### Option 2: Run on Different Port

Edit `server-multitenant.js` line 566:
```javascript
const PORT = process.env.PORT || 3001; // Change to 3001
```

Then run both servers:
```bash
# Terminal 1 - Old server
node server.js

# Terminal 2 - New multi-tenant server
node server-multitenant.js
```

## 📝 Important Notes

### Existing Data Migration

If you have existing patients in database:

```sql
-- Assign all existing patients to hospital ID 1
UPDATE patients SET hospitalId = 1 WHERE hospitalId IS NULL;
```

### Socket.IO Client Updates

Update your client-side JavaScript to include hospitalId:

```javascript
// OLD
socket.emit('join', 'reception');

// NEW
socket.emit('join', { 
  role: 'reception', 
  hospitalId: sessionStorage.getItem('hospitalId') 
});
```

### Session Management

The system stores in session:
- `authenticated` - Boolean
- `hospitalId` - Hospital ID
- `hospitalName` - Hospital name
- `section` - reception/doctor/pharmacy

Access in client:
```javascript
const hospitalId = sessionStorage.getItem('hospitalId');
```

## 🎉 Success Checklist

- [ ] Multi-tenant server running
- [ ] Registered 2+ test hospitals
- [ ] Each hospital has unique password
- [ ] Login works for both hospitals
- [ ] Patient data isolated per hospital
- [ ] Super admin dashboard shows all hospitals
- [ ] Subscription status can be toggled
- [ ] Real-time updates work per hospital

## 🆘 Troubleshooting

**Q: Can't see any hospitals in login dropdown?**
- Register a hospital first at `/register-hospital.html`

**Q: Password not working?**
- Check super admin page for correct password
- Ensure hospital subscription is "active"

**Q: Seeing other hospital's data?**
- Check session has correct `hospitalId`
- Verify all queries include `WHERE hospitalId = ?`

**Q: Real-time updates not working?**
- Ensure Socket.IO join includes `hospitalId`
- Check browser console for errors

---

**Your multi-tenant system is ready!** 🎊

Each hospital is completely isolated with unique passwords and data separation.
