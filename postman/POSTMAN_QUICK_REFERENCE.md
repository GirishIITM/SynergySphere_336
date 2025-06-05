# SynergySphere API - Postman Quick Reference

## 🚀 Quick Setup
1. Import `SynergySphere_Complete_Postman_Collection.json` into Postman
2. Set `baseUrl` to `http://127.0.0.1:5000` (or your backend URL)
3. Run "Login" request first to authenticate
4. All other requests will use the auto-set bearer token

## 🔑 Pre-configured Login Credentials
- **Email**: `adityar42069@gmail.com`
- **Password**: `12345678`

## 📋 Essential Test Sequence

### 1. System Health Check
```
GET /health         - Check if backend is running
GET /version        - Get API version info
GET /              - Root endpoint
```

### 2. Authentication Flow
```
POST /auth/login    - Login (sets accessToken automatically)
GET /profile        - Verify authentication works
```

### 3. Project Lifecycle
```
POST /projects             - Create new project (sets projectId)
GET /projects              - List all projects
GET /projects/{id}         - Get specific project
PUT /projects/{id}         - Update project
DELETE /projects/{id}      - Delete project
```

### 4. Task Management
```
POST /projects/{id}/tasks  - Create task in project (sets taskId)
GET /tasks                 - Get all user tasks
PUT /tasks/{id}           - Update task
PUT /tasks/{id}/status    - Change task status
DELETE /tasks/{id}        - Delete task
```

### 5. Team Collaboration
```
POST /projects/{id}/members           - Add team member
GET /projects/{id}/members           - Get project members
GET /projects/{id}/messages          - Get project messages
POST /projects/{id}/messages         - Send message
GET /notifications                   - Check notifications
```

## 🔧 Key Environment Variables (Auto-Set)
- `accessToken` - JWT token for authentication
- `userId` - Current user ID
- `projectId` - Last created project ID  
- `taskId` - Last created task ID

## 📊 Advanced Features to Test

### Analytics & Dashboard
```
GET /dashboard/overview        - Main dashboard
GET /dashboard/stats          - Dashboard statistics
GET /projects/{id}/stats      - Project analytics
GET /users/{id}/productivity  - User productivity metrics
```

### Finance Management
```
POST /projects/{id}/budget    - Create project budget
POST /projects/{id}/expenses  - Add expense
GET /projects/{id}/financials - View financial summary
```

### Cache & Performance
```
GET /cache/stats             - Cache statistics
POST /cache/clear           - Clear cache
POST /cache/warm            - Warm up cache
```

## 🧪 Test Scenarios

### Scenario A: New Project Setup
1. Login → Create Project → Add Members → Create Tasks → Send Messages

### Scenario B: Task Management
1. Login → Get Tasks → Create Task → Update Status → Add Attachment

### Scenario C: Analytics Review
1. Login → Dashboard Overview → Project Stats → User Productivity

### Scenario D: Financial Tracking
1. Login → Create Project → Set Budget → Add Expenses → View Financials

## ⚡ Automated Tests Included
- ✅ Status code validation
- ✅ Response structure checks
- ✅ Automatic ID extraction and storage
- ✅ Authentication token management

## 🔍 Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Run Login request first |
| 404 Not Found | Check if projectId/taskId variables are set |
| 500 Server Error | Check backend console logs |
| Empty Response | Verify backend is running on correct port |

## 📁 Complete Endpoint List (70+ endpoints)

### Authentication (7 endpoints)
- Login, Register, Refresh, Logout, Forgot Password, Settings

### Profile (3 endpoints) 
- Get, Update, Upload Image

### Projects (7 endpoints)
- CRUD operations, Members, Search

### Tasks (12+ endpoints)
- Basic CRUD, Status updates, Attachments, Advanced features

### Messages (4 endpoints)
- Project and task-level messaging

### Analytics (7 endpoints)
- Dashboard, Stats, Health, Productivity

### Finance (8 endpoints)
- Budgets, Expenses, Financial reports

### System (10+ endpoints)
- Health, Cache, Notifications, Settings

---

**💡 Tip**: Always start with the Login request to set up authentication for all other endpoints!