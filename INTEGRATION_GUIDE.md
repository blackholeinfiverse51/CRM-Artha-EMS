# AI CRM & Workflow EMS Integration Guide

## Overview
This integration connects the AI CRM system with the Workflow Employee Management System (EMS), allowing the CRM's "Infiverse Monitoring" tab to display the Workflow Admin Dashboard for employee monitoring.

## Architecture

### System Components

1. **Workflow Backend** (Port 5001)
   - Employee Management System
   - Attendance Tracking
   - Admin Dashboard APIs
   - Location: `workflow-blackhole/server/`

2. **AI CRM Backend** (Port 8000)
   - CRM & Logistics Management
   - Location: `ai-crm/backend-nodejs/`

3. **AI CRM Frontend** (Port 3000/5173)
   - React Application
   - Infiverse Monitoring Tab
   - Location: `ai-crm/frontend/`

## Integration Points

### 1. Backend Integration

#### New Route: `/api/crm-integration/workflow-dashboard`
**File:** `workflow-blackhole/server/routes/crmIntegration.js`

**Purpose:** Exposes workflow admin dashboard data to the CRM system

**Endpoints:**
- `GET /api/crm-integration/workflow-dashboard` - Get all employee attendance data
- `GET /api/crm-integration/employee-details/:employeeId` - Get specific employee details

**Response Format:**
```json
{
  "success": true,
  "data": {
    "employees": [
      {
        "id": "employee_id",
        "name": "Employee Name",
        "email": "email@example.com",
        "role": "User",
        "department": "Department Name",
        "departmentColor": "bg-blue-500",
        "workMode": "WFO",
        "attendance": {
          "status": "present",
          "startTime": "2024-01-01T09:00:00Z",
          "endTime": null,
          "hoursWorked": 5.5,
          "isActive": true
        }
      }
    ],
    "stats": {
      "totalEmployees": 50,
      "presentToday": 45,
      "activeNow": 40,
      "avgHoursToday": 6.5
    },
    "lastUpdated": "2024-01-01T14:30:00Z"
  }
}
```

### 2. Frontend Integration

#### Modified File: `ai-crm/frontend/src/pages/Infiverse.jsx`

**New Features:**
- Added "Workflow Monitoring" tab
- Real-time employee attendance display
- Statistics dashboard
- Auto-refresh functionality

**Key Components:**
- Employee attendance table
- Statistics cards (Total Employees, Present Today, Active Now, Avg Hours)
- Refresh button for manual updates
- Status badges (Active, Present, Absent)

## Setup Instructions

### 1. Backend Setup

#### Workflow Backend
```bash
cd workflow-blackhole/server
npm install
```

**Environment Variables** (`.env`):
```env
PORT=5001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

**Start Server:**
```bash
npm start
```

#### AI CRM Backend
```bash
cd ai-crm/backend-nodejs
npm install
```

**Environment Variables** (`.env`):
```env
PORT=8000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
WORKFLOW_API_URL=http://localhost:5001/api
```

**Start Server:**
```bash
npm start
```

### 2. Frontend Setup

```bash
cd ai-crm/frontend
npm install
```

**Environment Variables** (`.env`):
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_WORKFLOW_API_URL=http://localhost:5001/api
```

**Start Development Server:**
```bash
npm run dev
```

## Usage Guide

### Accessing Workflow Monitoring in CRM

1. **Login to AI CRM**
   - Navigate to `http://localhost:3000` (or your deployed URL)
   - Login with your credentials

2. **Navigate to Infiverse**
   - Click on "Infiverse" in the sidebar
   - This is the employee monitoring section

3. **Access Workflow Monitoring Tab**
   - Click on the "Workflow Monitoring" tab
   - The system will automatically fetch data from the Workflow backend

4. **View Employee Data**
   - See real-time employee attendance status
   - View statistics: Total Employees, Present Today, Active Now, Average Hours
   - Monitor individual employee work hours and status

5. **Refresh Data**
   - Click the "Refresh" button to manually update data
   - Data auto-refreshes every 30 seconds

## Authentication

### Token-Based Authentication
Both systems use JWT tokens for authentication. The integration uses the same token for cross-system requests.

**Token Storage:**
- Workflow: `localStorage.getItem('WorkflowToken')`
- CRM: `localStorage.getItem('token')`

**Headers:**
```javascript
{
  'x-auth-token': token,
  'Authorization': `Bearer ${token}`
}
```

## API Integration Flow

```
┌─────────────────┐
│   AI CRM UI     │
│  (Infiverse)    │
└────────┬────────┘
         │
         │ HTTP Request
         │ GET /crm-integration/workflow-dashboard
         ▼
┌─────────────────┐
│  Workflow API   │
│   (Port 5001)   │
└────────┬────────┘
         │
         │ Query Database
         ▼
┌─────────────────┐
│    MongoDB      │
│  (Attendance,   │
│   Users, etc)   │
└────────┬────────┘
         │
         │ Return Data
         ▼
┌─────────────────┐
│   AI CRM UI     │
│  (Display Data) │
└─────────────────┘
```

## Features

### Real-Time Monitoring
- Live employee attendance status
- Active/Inactive indicators
- Hours worked tracking
- Department-wise filtering

### Statistics Dashboard
- Total employee count
- Present employees today
- Currently active employees
- Average working hours

### Employee Details
- Name and email
- Department and role
- Work mode (WFH/WFO)
- Attendance status
- Start/end times
- Hours worked

## Security Considerations

1. **Authentication Required**
   - All endpoints require valid JWT token
   - Admin-only access for dashboard data

2. **CORS Configuration**
   - Properly configured CORS headers
   - Whitelist specific origins

3. **Data Privacy**
   - Only authorized users can access employee data
   - Sensitive information is protected

## Troubleshooting

### Common Issues

#### 1. CORS Errors
**Problem:** Browser blocks requests due to CORS policy

**Solution:**
- Ensure `CORS_ORIGIN` in workflow `.env` includes CRM frontend URL
- Check both backend CORS configurations

#### 2. Authentication Failures
**Problem:** 401 Unauthorized errors

**Solution:**
- Verify JWT token is valid and not expired
- Check token is being sent in correct header format
- Ensure user has admin privileges

#### 3. Data Not Loading
**Problem:** Workflow dashboard shows no data

**Solution:**
- Verify workflow backend is running on correct port
- Check `VITE_WORKFLOW_API_URL` in CRM frontend `.env`
- Inspect browser console for error messages
- Verify MongoDB connection is active

#### 4. Connection Refused
**Problem:** Cannot connect to workflow API

**Solution:**
- Ensure workflow backend is running: `http://localhost:5001`
- Check firewall settings
- Verify port 5001 is not in use by another application

## Production Deployment

### Environment Variables (Production)

**Workflow Backend:**
```env
PORT=5001
MONGODB_URI=mongodb+srv://your-production-db
JWT_SECRET=your-production-secret
FRONTEND_URL=https://your-crm-domain.com
CORS_ORIGIN=https://your-crm-domain.com
NODE_ENV=production
```

**AI CRM Frontend:**
```env
VITE_API_URL=https://your-crm-api-domain.com
VITE_WORKFLOW_API_URL=https://your-workflow-api-domain.com/api
```

### Deployment Checklist

- [ ] Update all environment variables with production URLs
- [ ] Configure CORS for production domains
- [ ] Set up SSL certificates (HTTPS)
- [ ] Configure MongoDB Atlas or production database
- [ ] Set up proper logging and monitoring
- [ ] Test authentication flow
- [ ] Verify data synchronization
- [ ] Set up backup and recovery procedures

## API Reference

### Workflow Integration Endpoints

#### Get Workflow Dashboard
```http
GET /api/crm-integration/workflow-dashboard
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "employees": [...],
    "stats": {...},
    "lastUpdated": "ISO-8601 timestamp"
  }
}
```

#### Get Employee Details
```http
GET /api/crm-integration/employee-details/:employeeId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "employee": {...},
    "attendanceHistory": [...],
    "summary": {
      "totalDays": 30,
      "presentDays": 28,
      "avgHours": 7.5
    }
  }
}
```

## Future Enhancements

1. **Real-time WebSocket Updates**
   - Live attendance updates without refresh
   - Push notifications for employee check-in/out

2. **Advanced Filtering**
   - Filter by department
   - Filter by work mode (WFH/WFO)
   - Date range selection

3. **Export Functionality**
   - Export attendance reports to CSV/PDF
   - Generate monthly summaries

4. **Analytics Dashboard**
   - Attendance trends
   - Productivity metrics
   - Department-wise comparisons

## Support

For issues or questions:
- Check the troubleshooting section
- Review server logs for errors
- Verify all environment variables are set correctly
- Ensure both backends are running and accessible

## Version History

- **v1.0.0** (Current)
  - Initial integration
  - Basic workflow monitoring tab
  - Real-time employee attendance display
  - Statistics dashboard

---

**Last Updated:** January 2025
**Integration Status:** ✅ Complete and Functional
