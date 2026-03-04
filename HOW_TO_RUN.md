# 🚀 How to Run the CRM Dashboard

## ✅ Dependencies Installed Successfully!

All npm packages have been installed. Now follow these steps to start the system:

## 📋 Step-by-Step Instructions

### Step 1: Start Workflow Backend (Terminal 1)
```bash
cd workflow-blackhole\server
npm start
```
**Expected Output:** Server running on port 5001

### Step 2: Start AI CRM Backend (Terminal 2)
```bash
cd ai-crm\backend-nodejs
npm start
```
**Expected Output:** Server running on port 8000

### Step 3: Start AI CRM Frontend (Terminal 3)
```bash
cd ai-crm\frontend
npm run dev
```
**Expected Output:** Local: http://localhost:3000 (or 5173)

### Step 4: Access the Dashboard
1. Open browser: `http://localhost:3000` (or the port shown)
2. Login with your credentials
3. Navigate to **Infiverse** in the sidebar
4. Click on **Workflow Monitoring** tab
5. You'll see the workflow admin dashboard with employee data!

---

## 🎯 Quick Start (Windows)

**Option 1: Use the batch file**
```bash
START_INTEGRATED_SYSTEM.bat
```
This will open 3 command windows automatically.

**Option 2: Manual (Recommended for first time)**
Open 3 separate Command Prompt windows and run each command above.

---

## ✅ What You'll See

### Workflow Monitoring Tab Features:
- **Statistics Cards:**
  - Total Employees
  - Present Today
  - Active Now
  - Average Hours

- **Employee Table:**
  - Name & Email
  - Department
  - Work Mode (WFH/WFO)
  - Status (Active/Present/Absent)
  - Hours Worked
  - Start Time

- **Controls:**
  - Refresh button
  - Auto-refresh every 30 seconds

---

## 🔧 Troubleshooting

### Port Already in Use?
```bash
# Kill processes on ports
npx kill-port 5001
npx kill-port 8000
npx kill-port 3000
```

### MongoDB Connection Error?
Check your `.env` file in `workflow-blackhole/server/` has valid `MONGODB_URI`

### CORS Error?
Ensure `CORS_ORIGIN` in workflow backend includes `http://localhost:3000`

---

## 📞 Need Help?

Check these files:
- `README.md` - Full documentation
- `QUICK_REFERENCE.md` - Quick commands
- `INTEGRATION_GUIDE.md` - Technical details

---

**Status:** ✅ Ready to Run!  
**All dependencies installed successfully!**
