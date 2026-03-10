# 🏢 Unified CRM-ERP-Finance System

## 🎯 Overview

**Blackhole Infiverse** integrated business management platform combining:

1. **Workflow EMS** - Employee Management & Attendance
2. **AI CRM** - Customer Relationship Management  
3. **Artha Finance** - Financial Management & Accounting
4. **ERP Data Pipeline** - Inventory, Orders, Returns

All systems share a **unified MongoDB database** for seamless data flow.

---

## 🗄️ Database Architecture

**Unified Database:** `blackhole_db` on MongoDB Atlas

```
blackhole_db/
├── employees              # Workflow: Employee records
├── attendance             # Workflow: Attendance tracking
├── departments            # Workflow: Department management
├── users                  # Shared: Authentication
├── accounts               # CRM: Customer accounts
├── contacts               # CRM: Contact management
├── leads                  # CRM: Sales leads
├── opportunities          # CRM: Sales opportunities
├── expenses               # Finance: Company expenses
├── transactions           # Finance: Income/revenue
├── ledger_entries         # Finance: Accounting ledger
├── gst_filings            # Finance: GST compliance
├── inventory              # ERP: Stock management
├── orders                 # ERP: Order processing
└── returns                # ERP: Return management
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js v16+
- MongoDB Atlas account
- Git

### Installation

```bash
# Clone repository
cd C:\Users\A\Desktop\CRM-ERP

# Install all dependencies
cd workflow-blackhole/server && npm install
cd ../../ai-crm/backend-nodejs && npm install
cd ../frontend && npm install
cd ../../artha-finance/backend && npm install
```

### Configuration

All systems use the same MongoDB connection:

**Workflow** (`workflow-blackhole/server/.env`):
```env
MONGODB_URI=mongodb+srv://7819vijaysharma:Ram%402025@cluster0.cvizq.mongodb.net/blackhole_db
PORT=5001
JWT_SECRET=supersecretkey
```

**AI CRM Backend** (`ai-crm/backend-nodejs/.env`):
```env
MONGODB_URL=mongodb+srv://7819vijaysharma:Ram%402025@cluster0.cvizq.mongodb.net/blackhole_db
PORT=8000
JWT_SECRET=supersecretkey
```

**Artha Finance** (`artha-finance/backend/.env`):
```env
MONGODB_URI=mongodb+srv://7819vijaysharma:Ram%402025@cluster0.cvizq.mongodb.net/blackhole_db
PORT=5002
JWT_SECRET=supersecretkey
```

**AI CRM Frontend** (`ai-crm/frontend/.env`):
```env
VITE_API_URL=http://localhost:8000
VITE_WORKFLOW_API_URL=http://localhost:5001/api
VITE_ARTHA_API_URL=http://localhost:5002/api
```

### Start System

**Option 1: Automated (Windows)**
```bash
START_UNIFIED_SYSTEM.bat
```

**Option 2: Manual**
```bash
# Terminal 1 - Workflow Backend
cd workflow-blackhole/server
npm start

# Terminal 2 - AI CRM Backend
cd ai-crm/backend-nodejs
npm start

# Terminal 3 - Artha Finance Backend
cd artha-finance/backend
npm start

# Terminal 4 - AI CRM Frontend
cd ai-crm/frontend
npm run dev
```

### Access Points

- **AI CRM Dashboard:** http://localhost:3000
- **Workflow API:** http://localhost:5001/api
- **AI CRM API:** http://localhost:8000
- **Artha Finance API:** http://localhost:5002/api

---

## 📊 System Features

### Workflow EMS (Port 5001)
- ✅ Employee attendance tracking
- ✅ Real-time monitoring
- ✅ Department management
- ✅ Biometric integration
- ✅ Salary calculation

### AI CRM (Port 8000 + 3000)
- ✅ Customer account management
- ✅ Lead tracking
- ✅ Sales opportunities
- ✅ Communication logs
- ✅ Workflow monitoring integration

### Artha Finance (Port 5002)
- ✅ Expense management
- ✅ Income tracking
- ✅ Ledger with blockchain integrity
- ✅ GST filing & compliance
- ✅ TDS management
- ✅ Financial reports

### ERP Data Pipeline
- ✅ Excel to JSON ingestion
- ✅ Inventory management
- ✅ Order processing
- ✅ Returns handling

---

## 🔗 API Integration

### Artha Finance Endpoints

**Base URL:** `http://localhost:5002/api/artha-integration`

#### Get Financial Summary
```bash
GET /financial-summary?month=1&year=2025
```

**Response:**
```json
{
  "success": true,
  "data": {
    "expenses": { "total": 50000, "count": 25 },
    "income": { "total": 150000, "count": 10 },
    "balance": 100000,
    "profitMargin": "66.67"
  }
}
```

#### Get Dashboard Stats
```bash
GET /dashboard-stats
```

#### Get Expenses
```bash
GET /expenses?startDate=2025-01-01&status=approved
```

#### Get Income
```bash
GET /income?startDate=2025-01-01
```

#### Get Ledger
```bash
GET /ledger?limit=50
```

#### Get GST Summary
```bash
GET /gst-summary?quarter=1&year=2025
```

### Workflow Integration Endpoints

**Base URL:** `http://localhost:5001/api/crm-integration`

```bash
GET /workflow-dashboard
GET /employee-details/:id
```

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────┐
│         AI CRM Frontend (React + Vite)              │
│                  Port: 3000                          │
│  ┌──────────────┬──────────────┬──────────────┐    │
│  │   Workflow   │   CRM Data   │   Finance    │    │
│  │  Monitoring  │  Management  │  Dashboard   │    │
│  └──────────────┴──────────────┴──────────────┘    │
└────────┬──────────────┬──────────────┬─────────────┘
         │              │              │
         ▼              ▼              ▼
    ┌────────┐    ┌─────────┐    ┌──────────┐
    │Workflow│    │AI CRM   │    │  Artha   │
    │Backend │    │Backend  │    │ Finance  │
    │:5001   │    │:8000    │    │  :5002   │
    └────┬───┘    └────┬────┘    └────┬─────┘
         │             │              │
         └─────────────┴──────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  MongoDB Atlas  │
              │  blackhole_db   │
              └────────────────┘
```

---

## 🧪 Testing

### Test All APIs

```bash
# Workflow
curl http://localhost:5001/api/crm-integration/workflow-dashboard

# AI CRM
curl http://localhost:8000/api/health

# Artha Finance
curl http://localhost:5002/api/artha-integration/dashboard-stats
```

---

## 📚 Documentation

- [Unified Integration Guide](./UNIFIED_INTEGRATION_GUIDE.md)
- [Workflow EMS Docs](./workflow-blackhole/README.md)
- [AI CRM Docs](./ai-crm/README.md)
- [Artha Finance Docs](./artha-finance/README.md)
- [ERP Pipeline Guide](./excel_to_json_pipeline.py)

---

## 🚢 Deployment

### Production Checklist

- [ ] Update MongoDB URI to production cluster
- [ ] Configure CORS for production domains
- [ ] Set up SSL certificates
- [ ] Enable monitoring and logging
- [ ] Configure backups
- [ ] Test all integrations
- [ ] Set up CI/CD pipeline

### Recommended Platforms

- **Backend:** Render, Railway, AWS EC2
- **Frontend:** Vercel, Netlify
- **Database:** MongoDB Atlas (Production Cluster)

---

## 👥 Team

**Blackhole Infiverse Development Team**  
Email: blackholeems@gmail.com  
Office: Mumbai, Maharashtra 400104

---

## 📝 License

Proprietary software for Blackhole Infiverse.

---

**Version:** 2.0.0  
**Last Updated:** January 2025  
**Status:** ✅ Unified Integration Complete
