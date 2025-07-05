# 🚀 Setup Guide - First Time Deployment

## 🎯 **Issue Fixed: Authentication Problem**

Your app was returning "Access token required" because:
- ✅ **Frontend is working** - React app loads correctly
- ❌ **No users exist** - Database is empty
- ❌ **Registration required auth** - Couldn't create first user

---

## 🔧 **Solution Applied**

I've added two new routes to fix this:

### **1. Setup Route** (`/api/auth/setup`)
- **Purpose**: Create the first admin user
- **Auth**: None required
- **Use**: Only works if no users exist

### **2. Public Registration** (`/api/auth/register`)
- **Purpose**: Create additional users
- **Auth**: None required
- **Use**: Works anytime

---

## 🚀 **How to Set Up Your First User**

### **Option 1: Use the Setup Route (Recommended)**

```bash
curl -X POST https://your-app-url.com/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

### **Option 2: Use Registration**

```bash
curl -X POST https://your-app-url.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin123",
    "role": "admin"
  }'
```

### **Option 3: Use the Frontend**

1. **Go to**: [https://your-app-url.com/](https://your-app-url.com/)
2. **Click "Register"** (if available)
3. **Fill in the form** with your admin credentials
4. **Login** with your new account

---

## 🧪 **Test Your Setup**

### **1. Create Admin User**
```bash
curl -X POST https://your-app-url.com/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@example.com","password":"admin123"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Admin user created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### **2. Test Login**
```bash
curl -X POST https://your-app-url.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### **3. Test Inventory Access**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  https://your-app-url.com/api/inventory
```

---

## 🎉 **After Setup**

Once you have a user account:

1. **Login** to your app at [https://your-app-url.com/](https://your-app-url.com/)
2. **Navigate** to Inventory page
3. **Add items** - should work now!
4. **Test all features** - Dashboard, Purchase Orders, Invoices, etc.

---

## 🔍 **Troubleshooting**

### **If Setup Fails:**
- Check if the deployment has completed
- Wait a few minutes for your platform to deploy the changes
- Try the registration route instead

### **If Login Fails:**
- Verify the user was created successfully
- Check the password is correct
- Try creating a new user

### **If Inventory Still Doesn't Work:**
- Make sure you're logged in
- Check browser console for errors
- Verify the token is being sent with requests

---

## 📊 **Expected Results**

After successful setup:

- ✅ **Can create admin user**
- ✅ **Can login successfully**
- ✅ **Can access inventory page**
- ✅ **Can add/edit/delete inventory items**
- ✅ **All features work as expected**

---

**Your Medicine Shop SaaS is now ready to use! 🏥💊** 