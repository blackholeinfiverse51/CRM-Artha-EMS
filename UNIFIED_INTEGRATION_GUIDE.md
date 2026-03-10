# 🏢 Unified CRM-ERP-Finance System Integration

## Overview

This document describes the integration of **three systems** sharing a **single MongoDB database**:

1. **Workflow EMS** - Employee Management (Port 5001)
2. **AI CRM** - Customer Relationship Management (Port 8000 + 3000)
3. **Artha Finance** - Financial Management (Port 5002)

---

## 🗄️ Unified Database Architecture

**Database:** `blackhole_db` on MongoDB Atlas  
**Connection:** `mongodb+srv://7819vijaysharma:Ram%402025@cluster0.cvizq.mongodb.net/blackhole_db`

### Collections Structure

```
blackhole_db/
├── employees              # Workflow EMS
├── attendance             # Workflow EMS
├── departments            # Workflow EMS
├── users                  # Shared Auth
├── accounts               # AI CRM
├── contacts               # AI CRM
├── leads                  # AI CRM
├── opportunities          # AI CRM
├── expenses               # Artha Finance
├── transactions           # Artha Finance (income)
├── ledger_entries         # Artha Finance
├── gst_filings            # Artha Finance
├── inventory              # ERP Data
├── orders                 # ERP Data
└── returns                # ERP Data
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Workflow Backend
cd workflow-blackhole/server
npm install

# AI CRM Backend
cd ../../ai-crm/backend-nodejs
npm install

# AI CRM Frontend
cd ../frontend
npm install

# Artha Finance Backend
cd ../../artha-finance/backend
npm install
```

### 2. Start All Systems

**Windows:**
```bash
START_UNIFIED_SYSTEM.bat
```

**Manual:**
```bash
# Terminal 1 - Workflow
cd workflow-blackhole/server && npm start

# Terminal 2 - AI CRM Backend
cd ai-crm/backend-nodejs && npm start

# Terminal 3 - Artha Finance
cd artha-finance/backend && npm start

# Terminal 4 - AI CRM Frontend
cd ai-crm/frontend && npm run dev
```

### 3. Access Points

- **AI CRM Dashboard:** http://localhost:3000
- **Workflow API:** http://localhost:5001/api
- **AI CRM API:** http://localhost:8000
- **Artha Finance API:** http://localhost:5002/api

---

## 📊 Artha Finance Integration Endpoints

### Base URL: `http://localhost:5002/api/artha-integration`

#### 1. Get Company Expenses
```http
GET /expenses?startDate=2025-01-01&endDate=2025-01-31&status=approved
```

**Response:**
```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "_id": "...",
      "amount": 5000,
      "category": "Office Supplies",
      "date": "2025-01-15",
      "status": "approved"
    }
  ]
}
```

#### 2. Get Company Income
```http
GET /income?startDate=2025-01-01&endDate=2025-01-31
```

#### 3. Get Financial Summary
```http
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

#### 4. Get Dashboard Stats
```http
GET /dashboard-stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "monthly": {
      "expenses": 50000,
      "income": 150000,
      "balance": 100000
    },
    "yearly": {
      "expenses": 600000,
      "income": 1800000,
      "balance": 1200000
    },
    "pending": {
      "expenses": 5
    }
  }
}
```

#### 5. Get Ledger Entries
```http
GET /ledger?limit=50&skip=0
```

#### 6. Get GST Summary
```http
GET /gst-summary?quarter=1&year=2025
```

---

## 🔗 Frontend Integration

### Add Artha Finance Tab to AI CRM

Update `ai-crm/frontend/src/pages/Infiverse.jsx`:

```javascript
const [activeTab, setActiveTab] = useState('workflow'); // Add 'finance' option

// Add Finance Tab
<button
  onClick={() => setActiveTab('finance')}
  className={activeTab === 'finance' ? 'active' : ''}
>
  Finance Dashboard
</button>

// Add Finance Content
{activeTab === 'finance' && (
  <div className="finance-dashboard">
    <FinanceDashboard />
  </div>
)}
```

### Create Finance Dashboard Component

```javascript
// src/components/FinanceDashboard.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';

const ARTHA_API = 'http://localhost:5002/api/artha-integration';

export default function FinanceDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { data } = await axios.get(`${ARTHA_API}/dashboard-stats`);
    setStats(data.data);
  };

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard
        title="Monthly Income"
        value={`₹${stats.monthly.income.toLocaleString()}`}
        color="green"
      />
      <StatCard
        title="Monthly Expenses"
        value={`₹${stats.monthly.expenses.toLocaleString()}`}
        color="red"
      />
      <StatCard
        title="Monthly Balance"
        value={`₹${stats.monthly.balance.toLocaleString()}`}
        color="blue"
      />
    </div>
  );
}
```

---

## 🔐 Authentication

All three systems use **JWT tokens** stored in localStorage:

- **Workflow:** `WorkflowToken`
- **AI CRM:** `token`
- **Artha:** `arthaToken`

### Shared User Authentication

Users can log in once and access all systems. The `users` collection is shared across all three systems.

---

## 📈 Data Flow

```
┌─────────────────────────────────────────────────────┐
│           AI CRM Frontend (Port 3000)                │
│  ┌──────────────┬──────────────┬──────────────┐    │
│  │   Workflow   │   CRM Data   │   Finance    │    │
│  │  Monitoring  │              │  Dashboard   │    │
│  └──────────────┴──────────────┴──────────────┘    │
└────────┬──────────────┬──────────────┬─────────────┘
         │              │              │
         ▼              ▼              ▼
    ┌────────┐    ┌─────────┐    ┌──────────┐
    │Workflow│    │AI CRM   │    │  Artha   │
    │Backend │    │Backend  │    │ Backend  │
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

## 🛠️ Configuration Files

### Workflow Backend (.env)
```env
MONGODB_URI=mongodb+srv://7819vijaysharma:Ram%402025@cluster0.cvizq.mongodb.net/blackhole_db
PORT=5001
JWT_SECRET=supersecretkey
```

### AI CRM Backend (.env)
```env
MONGODB_URL=mongodb+srv://blackholeinfiverse51:Blackhole051@cluster0.7c16heb.mongodb.net/ai_crm_logistics
PORT=8000
JWT_SECRET=ai-crm-logistics-super-secret-jwt-key-2026
```

### Artha Finance Backend (.env)
```env
MONGODB_URI=mongodb+srv://7819vijaysharma:Ram%402025@cluster0.cvizq.mongodb.net/blackhole_db
PORT=5002
JWT_SECRET=supersecretkey
```

### AI CRM Frontend (.env)
```env
VITE_API_URL=http://localhost:8000
VITE_WORKFLOW_API_URL=http://localhost:5001/api
VITE_ARTHA_API_URL=http://localhost:5002/api
```

---

## 🧪 Testing Integration

### Test Artha API
```bash
curl http://localhost:5002/api/artha-integration/dashboard-stats
```

### Test Workflow API
```bash
curl http://localhost:5001/api/crm-integration/workflow-dashboard
```

### Test AI CRM API
```bash
curl http://localhost:8000/api/health
```

---

## 📦 Deployment

### Environment Variables (Production)

Update all `.env` files with production MongoDB URI:

```env
MONGODB_URI=mongodb+srv://production_user:password@cluster.mongodb.net/blackhole_db_prod
```

### CORS Configuration

Update CORS origins in all backends:

```env
CORS_ORIGIN=https://your-production-domain.com
```

---

## 🎯 Next Steps

1. ✅ All systems connected to unified database
2. ✅ Artha integration endpoints created
3. ⏳ Add Finance tab to AI CRM frontend
4. ⏳ Implement cross-system reporting
5. ⏳ Add unified analytics dashboard

---

## 📞 Support

**Blackhole Infiverse Development Team**  
Email: blackholeems@gmail.com  
Office: Mumbai, Maharashtra 400104

---

**Version:** 2.0.0  
**Last Updated:** January 2025  
**Status:** ✅ Integration Complete
