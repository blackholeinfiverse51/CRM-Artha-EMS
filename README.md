# AI CRM + Workflow EMS Integration

## 🎯 Overview

This project integrates the **AI CRM System** with the **Workflow Employee Management System (EMS)**, enabling seamless employee monitoring and management through a unified interface.

### Key Features

✅ **Unified Dashboard** - View workflow admin dashboard directly in AI CRM  
✅ **Real-time Monitoring** - Live employee attendance and activity tracking  
✅ **Cross-System Authentication** - Single sign-on across both systems  
✅ **Comprehensive Analytics** - Employee statistics and performance metrics  
✅ **Department Management** - Organize and track employees by department  

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AI CRM Frontend                       │
│                   (React + Vite)                         │
│                    Port: 3000                            │
│                                                          │
│  ┌──────────────────────────────────────────────┐      │
│  │         Infiverse Monitoring Tab              │      │
│  │  ┌────────────────────────────────────┐      │      │
│  │  │   Workflow Monitoring Dashboard    │      │      │
│  │  │  - Employee Attendance              │      │      │
│  │  │  - Live Status                      │      │      │
│  │  │  - Statistics                       │      │      │
│  │  └────────────────────────────────────┘      │      │
│  └──────────────────────────────────────────────┘      │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ HTTP/REST API
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌─────────────────┐   ┌─────────────────┐
│  AI CRM Backend │   │ Workflow Backend│
│   (Node.js)     │   │   (Node.js)     │
│   Port: 8000    │   │   Port: 5001    │
└────────┬────────┘   └────────┬────────┘
         │                     │
         │                     │
         ▼                     ▼
    ┌─────────────────────────────┐
    │        MongoDB Atlas         │
    │  - CRM Data                  │
    │  - Employee Data             │
    │  - Attendance Records        │
    └─────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Git

### Installation

1. **Clone the repository**
   ```bash
   cd C:\Users\A\Desktop\CRM-ERP
   ```

2. **Install dependencies**
   
   **Workflow Backend:**
   ```bash
   cd workflow-blackhole/server
   npm install
   ```

   **AI CRM Backend:**
   ```bash
   cd ../../ai-crm/backend-nodejs
   npm install
   ```

   **AI CRM Frontend:**
   ```bash
   cd ../frontend
   npm install
   ```

3. **Configure Environment Variables**

   **Workflow Backend** (`workflow-blackhole/server/.env`):
   ```env
   PORT=5001
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=supersecretkey
   FRONTEND_URL=http://localhost:3000
   CORS_ORIGIN=http://localhost:3000,http://localhost:5173
   ```

   **AI CRM Frontend** (`ai-crm/frontend/.env`):
   ```env
   VITE_API_URL=http://localhost:8000
   VITE_WS_URL=ws://localhost:8000
   VITE_WORKFLOW_API_URL=http://localhost:5001/api
   ```

4. **Start the System**

   **Option A: Use the startup script (Windows)**
   ```bash
   START_INTEGRATED_SYSTEM.bat
   ```

   **Option B: Manual start**
   
   Terminal 1 - Workflow Backend:
   ```bash
   cd workflow-blackhole/server
   npm start
   ```

   Terminal 2 - AI CRM Backend:
   ```bash
   cd ai-crm/backend-nodejs
   npm start
   ```

   Terminal 3 - AI CRM Frontend:
   ```bash
   cd ai-crm/frontend
   npm run dev
   ```

5. **Access the System**
   - Open browser: `http://localhost:3000`
   - Login with your credentials
   - Navigate to **Infiverse** → **Workflow Monitoring** tab

## 📋 Features

### Workflow Monitoring Dashboard

#### Statistics Cards
- **Total Employees** - Count of all registered employees
- **Present Today** - Employees who checked in today
- **Active Now** - Currently working employees
- **Average Hours** - Average working hours today

#### Employee Table
- Real-time attendance status
- Department information
- Work mode (WFH/WFO)
- Hours worked
- Start/end times

#### Actions
- **Refresh** - Manual data refresh
- **Auto-refresh** - Updates every 30 seconds
- **Status Badges** - Visual indicators for employee status

## 🔧 Configuration

### Workflow Backend Routes

New integration route added: `routes/crmIntegration.js`

**Endpoints:**
- `GET /api/crm-integration/workflow-dashboard` - Get all employee data
- `GET /api/crm-integration/employee-details/:id` - Get specific employee

### Frontend Integration

Modified file: `ai-crm/frontend/src/pages/Infiverse.jsx`

**New Components:**
- Workflow Monitoring tab
- Employee attendance table
- Statistics dashboard
- Refresh functionality

## 🔐 Authentication

Both systems use JWT-based authentication. The integration automatically handles token sharing between systems.

**Token Storage:**
- Workflow: `WorkflowToken`
- CRM: `token`

## 📊 Data Flow

1. User opens Workflow Monitoring tab in AI CRM
2. Frontend sends request to Workflow Backend
3. Backend queries MongoDB for employee data
4. Data is formatted and returned to frontend
5. Frontend displays data in dashboard
6. Auto-refresh updates data every 30 seconds

## 🛠️ Development

### Project Structure

```
CRM-ERP/
├── workflow-blackhole/          # Workflow EMS
│   ├── server/                  # Backend
│   │   ├── routes/
│   │   │   └── crmIntegration.js  # NEW: Integration routes
│   │   ├── models/
│   │   └── index.js
│   └── client/                  # Frontend
│
├── ai-crm/                      # AI CRM System
│   ├── backend-nodejs/          # Backend
│   │   └── src/
│   └── frontend/                # Frontend
│       └── src/
│           └── pages/
│               └── Infiverse.jsx  # MODIFIED: Added monitoring tab
│
├── INTEGRATION_GUIDE.md         # Detailed integration docs
├── START_INTEGRATED_SYSTEM.bat  # Startup script
└── README.md                    # This file
```

### Adding New Features

1. **Backend:** Add new endpoints in `crmIntegration.js`
2. **Frontend:** Update `Infiverse.jsx` component
3. **Test:** Verify data flow and authentication

## 🐛 Troubleshooting

### Common Issues

**1. CORS Errors**
- Check `CORS_ORIGIN` in workflow `.env`
- Ensure frontend URL is whitelisted

**2. Authentication Failed**
- Verify JWT token is valid
- Check token expiration
- Ensure admin privileges

**3. Data Not Loading**
- Verify workflow backend is running (port 5001)
- Check `VITE_WORKFLOW_API_URL` in frontend `.env`
- Inspect browser console for errors

**4. Port Already in Use**
- Change port in `.env` files
- Kill existing processes on ports 3000, 5001, 8000

### Debug Mode

Enable detailed logging:

**Workflow Backend:**
```env
LOG_LEVEL=debug
```

**Browser Console:**
```javascript
localStorage.setItem('debug', 'true')
```

## 📚 Documentation

- [Integration Guide](./INTEGRATION_GUIDE.md) - Detailed technical documentation
- [Workflow EMS Docs](./workflow-blackhole/README.md) - Workflow system documentation
- [AI CRM Docs](./ai-crm/README.md) - CRM system documentation

## 🚢 Deployment

### Production Checklist

- [ ] Update environment variables with production URLs
- [ ] Configure CORS for production domains
- [ ] Set up SSL certificates (HTTPS)
- [ ] Configure production MongoDB
- [ ] Set up logging and monitoring
- [ ] Test authentication flow
- [ ] Verify data synchronization
- [ ] Set up backups

### Deployment Platforms

**Recommended:**
- **Backend:** Render, Railway, or AWS EC2
- **Frontend:** Vercel, Netlify, or AWS S3 + CloudFront
- **Database:** MongoDB Atlas

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is proprietary software for Blackhole Infiverse.

## 👥 Team

**Blackhole Infiverse Development Team**
- Email: blackholeems@gmail.com
- Office: Blackhole Infiverse, Mumbai, Maharashtra 400104

## 🎉 Success!

If you see the Workflow Monitoring tab with employee data, the integration is working correctly!

### Next Steps

1. Explore the dashboard features
2. Monitor employee attendance
3. Check real-time statistics
4. Customize as needed

---

**Version:** 1.0.0  
**Last Updated:** January 2025  
**Status:** ✅ Production Ready
