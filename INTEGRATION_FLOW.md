# Integration Flow Diagram

## System Overview

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                        AI CRM + Workflow Integration                  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                               │
│                    AI CRM Frontend (React)                           │
│                      http://localhost:3000                           │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    Navigation Sidebar                       │   │
│  │  • Dashboard                                                │   │
│  │  • Products                                                 │   │
│  │  • Orders                                                   │   │
│  │  • Inventory                                                │   │
│  │  • Suppliers                                                │   │
│  │  ► Infiverse (Employee Monitoring) ◄ INTEGRATION POINT     │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │              Infiverse Page - Tab Navigation                │   │
│  │  ┌──────────┬──────────┬──────────┬──────────────────┐    │   │
│  │  │ Overview │Attendance│Performance│Workflow Monitoring│    │   │
│  │  └──────────┴──────────┴──────────┴──────────────────┘    │   │
│  │                                    ▲                        │   │
│  │                                    │ NEW TAB               │   │
│  │                                    │                        │   │
│  │  ┌─────────────────────────────────────────────────────┐  │   │
│  │  │      Workflow Admin Dashboard Display               │  │   │
│  │  │                                                      │  │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐│  │   │
│  │  │  │  Total   │ │ Present  │ │ Active   │ │  Avg   ││  │   │
│  │  │  │Employees │ │  Today   │ │   Now    │ │ Hours  ││  │   │
│  │  │  │    50    │ │    45    │ │    40    │ │  6.5h  ││  │   │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └────────┘│  │   │
│  │  │                                                      │  │   │
│  │  │  ┌──────────────────────────────────────────────┐  │  │   │
│  │  │  │      Employee Attendance Table                │  │  │   │
│  │  │  │  Name | Dept | Mode | Status | Hours | Time  │  │  │   │
│  │  │  │  ─────────────────────────────────────────── │  │  │   │
│  │  │  │  John | Dev  | WFO  | Active | 5.5h  | 9:00 │  │  │   │
│  │  │  │  Jane | HR   | WFH  | Active | 6.0h  | 8:30 │  │  │   │
│  │  │  │  ...                                          │  │  │   │
│  │  │  └──────────────────────────────────────────────┘  │  │   │
│  │  └─────────────────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────────────────┘   │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           │ HTTP Request
                           │ GET /api/crm-integration/workflow-dashboard
                           │ Headers: { Authorization: Bearer <token> }
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND LAYER                                   │
│                                                                      │
│  ┌──────────────────────────┐    ┌──────────────────────────┐     │
│  │   AI CRM Backend         │    │   Workflow Backend       │     │
│  │   (Node.js + Express)    │    │   (Node.js + Express)    │     │
│  │   Port: 8000             │    │   Port: 5001             │     │
│  │                          │    │                          │     │
│  │  • CRM APIs              │    │  • Employee APIs         │     │
│  │  • Product Management    │    │  • Attendance Tracking   │     │
│  │  • Order Processing      │    │  • Admin Dashboard       │     │
│  │  • Inventory Control     │    │  • NEW: CRM Integration  │     │
│  └──────────────────────────┘    └──────────┬───────────────┘     │
│                                              │                      │
│                                              │ Process Request      │
│                                              │                      │
│                                   ┌──────────▼───────────┐         │
│                                   │  crmIntegration.js   │         │
│                                   │  (New Route File)    │         │
│                                   │                      │         │
│                                   │  • Authenticate      │         │
│                                   │  • Query Database    │         │
│                                   │  • Format Response   │         │
│                                   └──────────┬───────────┘         │
│                                              │                      │
└──────────────────────────────────────────────┼──────────────────────┘
                                               │
                                               │ Database Query
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER                                │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    MongoDB Atlas                              │  │
│  │                                                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐    │  │
│  │  │   Users     │  │ Attendance  │  │ DailyAttendance  │    │  │
│  │  │             │  │             │  │                  │    │  │
│  │  │ • _id       │  │ • user      │  │ • user           │    │  │
│  │  │ • name      │  │ • date      │  │ • date           │    │  │
│  │  │ • email     │  │ • startTime │  │ • totalHours     │    │  │
│  │  │ • role      │  │ • endTime   │  │ • status         │    │  │
│  │  │ • dept      │  │ • hours     │  │ • workMode       │    │  │
│  │  └─────────────┘  └─────────────┘  └──────────────────┘    │  │
│  │                                                               │  │
│  │  ┌─────────────┐  ┌─────────────┐                           │  │
│  │  │Departments  │  │   Tasks     │                           │  │
│  │  │             │  │             │                           │  │
│  │  │ • _id       │  │ • assignee  │                           │  │
│  │  │ • name      │  │ • status    │                           │  │
│  │  │ • color     │  │ • progress  │                           │  │
│  │  └─────────────┘  └─────────────┘                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow Sequence

```
┌──────┐                ┌──────────┐              ┌──────────┐           ┌──────────┐
│ User │                │   CRM    │              │ Workflow │           │ MongoDB  │
│      │                │ Frontend │              │ Backend  │           │          │
└──┬───┘                └────┬─────┘              └────┬─────┘           └────┬─────┘
   │                         │                         │                      │
   │ 1. Click "Workflow      │                         │                      │
   │    Monitoring" Tab      │                         │                      │
   │────────────────────────>│                         │                      │
   │                         │                         │                      │
   │                         │ 2. GET /api/crm-       │                      │
   │                         │    integration/         │                      │
   │                         │    workflow-dashboard   │                      │
   │                         │────────────────────────>│                      │
   │                         │                         │                      │
   │                         │                         │ 3. Verify JWT Token  │
   │                         │                         │──────────┐           │
   │                         │                         │          │           │
   │                         │                         │<─────────┘           │
   │                         │                         │                      │
   │                         │                         │ 4. Query Users       │
   │                         │                         │─────────────────────>│
   │                         │                         │                      │
   │                         │                         │ 5. Query Attendance  │
   │                         │                         │─────────────────────>│
   │                         │                         │                      │
   │                         │                         │ 6. Return Data       │
   │                         │                         │<─────────────────────│
   │                         │                         │                      │
   │                         │                         │ 7. Format Response   │
   │                         │                         │──────────┐           │
   │                         │                         │          │           │
   │                         │                         │<─────────┘           │
   │                         │                         │                      │
   │                         │ 8. JSON Response        │                      │
   │                         │<────────────────────────│                      │
   │                         │                         │                      │
   │                         │ 9. Update UI            │                      │
   │                         │──────────┐              │                      │
   │                         │          │              │                      │
   │                         │<─────────┘              │                      │
   │                         │                         │                      │
   │ 10. Display Dashboard   │                         │                      │
   │<────────────────────────│                         │                      │
   │                         │                         │                      │
   │                         │ 11. Auto-refresh        │                      │
   │                         │    (every 30s)          │                      │
   │                         │────────────────────────>│                      │
   │                         │                         │                      │
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Infiverse.jsx Component                       │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                    State Management                     │    │
│  │                                                         │    │
│  │  • currentUser          - Logged in user info          │    │
│  │  • employeeMetrics      - Employee performance data    │    │
│  │  • attendanceRecords    - Attendance history           │    │
│  │  • workflowDashboard    - Workflow admin data (NEW)    │    │
│  │  • workflowLoading      - Loading state (NEW)          │    │
│  │  • workflowError        - Error state (NEW)            │    │
│  │  • activeTab            - Current tab selection        │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                    API Functions                        │    │
│  │                                                         │    │
│  │  • fetchCurrentUser()        - Get logged in user      │    │
│  │  • fetchEmployeeData()       - Get employee metrics    │    │
│  │  • fetchWorkflowDashboard()  - Get workflow data (NEW) │    │
│  │  • handleCheckIn()           - Employee check-in       │    │
│  │  • handleCheckOut()          - Employee check-out      │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                    UI Components                        │    │
│  │                                                         │    │
│  │  • Tab Navigation                                       │    │
│  │    - Overview                                           │    │
│  │    - Attendance                                         │    │
│  │    - Performance                                        │    │
│  │    - Workflow Monitoring (NEW)                          │    │
│  │    - Privacy                                            │    │
│  │                                                         │    │
│  │  • Workflow Monitoring Tab (NEW)                        │    │
│  │    ├─ Statistics Cards                                  │    │
│  │    │  ├─ Total Employees                                │    │
│  │    │  ├─ Present Today                                  │    │
│  │    │  ├─ Active Now                                     │    │
│  │    │  └─ Average Hours                                  │    │
│  │    │                                                     │    │
│  │    └─ Employee Table                                    │    │
│  │       ├─ Name & Email                                   │    │
│  │       ├─ Department                                     │    │
│  │       ├─ Work Mode (WFH/WFO)                            │    │
│  │       ├─ Status Badge                                   │    │
│  │       ├─ Hours Worked                                   │    │
│  │       └─ Start Time                                     │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Authentication Process                        │
└─────────────────────────────────────────────────────────────────┘

1. User Login
   ┌──────────┐
   │  Login   │
   │  Page    │
   └────┬─────┘
        │
        │ POST /api/auth/login
        │ { email, password }
        ▼
   ┌──────────┐
   │  Backend │
   │  Verify  │
   └────┬─────┘
        │
        │ Generate JWT Token
        ▼
   ┌──────────────────┐
   │  localStorage    │
   │  .setItem(       │
   │   'token',       │
   │   jwt_token      │
   │  )               │
   └──────────────────┘

2. Cross-System Request
   ┌──────────────────┐
   │  CRM Frontend    │
   │  Infiverse Page  │
   └────┬─────────────┘
        │
        │ GET /api/crm-integration/workflow-dashboard
        │ Headers: {
        │   'x-auth-token': localStorage.getItem('token'),
        │   'Authorization': 'Bearer ' + token
        │ }
        ▼
   ┌──────────────────┐
   │ Workflow Backend │
   │ Auth Middleware  │
   └────┬─────────────┘
        │
        │ Verify JWT Token
        │ Check Admin Role
        ▼
   ┌──────────────────┐
   │  Authorized      │
   │  Return Data     │
   └──────────────────┘
```

## File Structure

```
CRM-ERP/
│
├── workflow-blackhole/
│   └── server/
│       ├── routes/
│       │   ├── auth.js
│       │   ├── users.js
│       │   ├── attendance.js
│       │   └── crmIntegration.js ◄── NEW FILE
│       │
│       ├── models/
│       │   ├── User.js
│       │   ├── Attendance.js
│       │   └── DailyAttendance.js
│       │
│       ├── middleware/
│       │   ├── auth.js
│       │   └── adminAuth.js
│       │
│       └── index.js ◄── MODIFIED (added route)
│
├── ai-crm/
│   ├── backend-nodejs/
│   │   └── src/
│   │       ├── routes/
│   │       │   └── ems.js
│   │       └── server.js
│   │
│   └── frontend/
│       ├── src/
│       │   └── pages/
│       │       └── Infiverse.jsx ◄── MODIFIED (added tab)
│       │
│       └── .env ◄── NEW FILE
│
├── INTEGRATION_GUIDE.md ◄── NEW FILE
├── README.md ◄── NEW FILE
└── START_INTEGRATED_SYSTEM.bat ◄── NEW FILE
```

## Key Integration Points

### 1. Backend Route (NEW)
```javascript
// workflow-blackhole/server/routes/crmIntegration.js

router.get('/workflow-dashboard', auth, adminAuth, async (req, res) => {
  // Fetch employee data
  // Fetch attendance data
  // Format and return response
});
```

### 2. Frontend Component (MODIFIED)
```javascript
// ai-crm/frontend/src/pages/Infiverse.jsx

const fetchWorkflowDashboard = async () => {
  const response = await axios.get(
    `${WORKFLOW_API_URL}/crm-integration/workflow-dashboard`,
    { headers: { 'x-auth-token': token } }
  );
  setWorkflowDashboard(response.data);
};
```

### 3. Environment Configuration (NEW)
```env
# ai-crm/frontend/.env
VITE_WORKFLOW_API_URL=http://localhost:5001/api
```

---

**Integration Status:** ✅ Complete  
**Last Updated:** January 2025
