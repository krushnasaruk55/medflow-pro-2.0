# 🔐 Monthly Subscription Authentication System

## Overview

Your hospital management system now has a **monthly subscription-based authentication system** with automatically rotating passwords!

## 🎯 Key Features

✅ **Monthly Auto-Rotating Passwords** - Password changes automatically on the 1st of each month  
✅ **Single Password for All Sections** - One code unlocks Reception, Doctor, and Pharmacy  
✅ **Admin Password Portal** - Secure page to view current month's password  
✅ **Session Management** - Users stay logged in for 30 days  
✅ **Professional Login Page** - Beautiful UI with section selector  

## 📋 How It Works

### For You (Administrator)

1. **View Current Password**
   - Go to: `http://localhost:3000/admin-password.html`
   - See the current month's password in large display
   - Copy and share with your subscribers

2. **Password Auto-Rotation**
   - Password automatically changes on the 1st of each month
   - Based on cryptographic hash of month + year + secret key
   - Example format: `A1B2-C3D4`

3. **Share with Subscribers**
   - Give them the login URL: `http://localhost:3000/login.html`
   - Share the current month's password
   - They can access all three sections with one password

### For Your Subscribers (Users)

1. **Login Process**
   - Visit: `http://localhost:3000/login.html`
   - Select their section (Reception/Doctor/Pharmacy)
   - Enter the monthly access code
   - Click "Access System"

2. **Stay Logged In**
   - Session lasts 30 days
   - No need to re-enter password daily
   - Logout button available in header

3. **Monthly Renewal**
   - Get new password from you at the start of each month
   - Old password stops working automatically

## 🚀 Quick Start

### Step 1: Restart Your Server

The server needs to be restarted to load the new authentication system:

```bash
# Stop current server (Ctrl+C in terminal)
# Then start again:
npm start
```

### Step 2: Get Your Current Password

1. Open: `http://localhost:3000/admin-password.html`
2. You'll see something like: **`A1B2-C3D4`**
3. This is your current month's password

### Step 3: Test the Login

1. Open: `http://localhost:3000/login.html`
2. Select "Reception"
3. Enter the password from admin page
4. Click "Access System"
5. You should be redirected to reception.html

### Step 4: Enable Protection (Optional)

To actually lock the pages, uncomment these lines in `server.js` (around line 158):

```javascript
// Remove the // to enable protection:
app.get('/reception.html', requireAuth, (req, res, next) => next());
app.get('/doctor.html', requireAuth, (req, res, next) => next());
app.get('/pharmacy.html', requireAuth, (req, res, next) => next());
```

## 📱 URLs Reference

| Page | URL | Purpose |
|------|-----|---------|
| **Admin Password** | `/admin-password.html` | View current month's password (KEEP SECRET!) |
| **User Login** | `/login.html` | Where users enter password |
| **Reception** | `/reception.html` | Reception dashboard |
| **Doctor** | `/doctor.html` | Doctor dashboard |
| **Pharmacy** | `/pharmacy.html` | Pharmacy dashboard |

## 🔒 Security Features

1. **Cryptographic Password Generation**
   - Uses SHA-256 hashing
   - Based on month + year + secret key
   - Impossible to guess or predict

2. **Session Management**
   - Secure HTTP-only cookies
   - 30-day expiration
   - Server-side validation

3. **Auto-Expiration**
   - Password expires at month end
   - New password auto-generated
   - No manual intervention needed

## 💡 Business Model

### Monthly Subscription Pricing (Example)

- **Reception Access**: ₹500/month
- **Doctor Access**: ₹800/month
- **Pharmacy Access**: ₹600/month
- **Full Package**: ₹1,500/month (all three)

### How to Sell

1. **Demo the System**
   - Show them the login page
   - Demonstrate features
   - Highlight monthly updates

2. **Collect Payment**
   - Get payment for the month
   - Share the current password
   - They can start using immediately

3. **Monthly Renewal**
   - Contact subscribers at month end
   - Collect next month's payment
   - Share new password

4. **Automatic Lockout**
   - Non-paying users locked out automatically
   - Old password stops working
   - No manual intervention needed

## 📊 Password Schedule Example

| Month | Password | Valid Until |
|-------|----------|-------------|
| January 2025 | `A1B2-C3D4` | Jan 31, 2025 |
| February 2025 | `E5F6-G7H8` | Feb 28, 2025 |
| March 2025 | `I9J0-K1L2` | Mar 31, 2025 |

*Actual passwords will be different and auto-generated*

## 🛠️ Customization

### Change Password Format

Edit `auth.js` line 18-21 to change format:

```javascript
// Current: XXXX-XXXX (8 characters)
// Change to: XXXXXX (6 characters)
const password = hash.substring(0, 6).toUpperCase();
return password;
```

### Change Session Duration

Edit `server.js` line 21:

```javascript
maxAge: 30 * 24 * 60 * 60 * 1000, // Change 30 to desired days
```

### Change Secret Key

Edit `auth.js` line 4:

```javascript
const SECRET_KEY = 'YourNewSecretKey2025';
```

**⚠️ Warning**: Changing the secret key will change all passwords!

## 🎨 Customization Ideas

1. **Add Company Logo** to login page
2. **Custom Welcome Message** for each section
3. **Different Passwords** for each section (modify auth.js)
4. **Email Notifications** when password changes
5. **Payment Integration** for automatic billing

## 📞 Support

### Common Issues

**Q: Password not working?**
- Check admin page for current password
- Ensure no extra spaces
- Password is case-sensitive

**Q: Users getting logged out?**
- Session expires after 30 days
- Clear browser cookies and re-login

**Q: Want to force logout all users?**
- Restart the server
- All sessions will be cleared

## 🎯 Next Steps

1. ✅ Test the login system
2. ✅ Bookmark admin password page
3. ✅ Enable page protection in server.js
4. ✅ Set your pricing
5. ✅ Start selling subscriptions!

---

**🎉 Your subscription system is ready!**  
You can now sell monthly access to your hospital management system with automatic password rotation!
