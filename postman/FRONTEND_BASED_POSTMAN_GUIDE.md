# SynergySphere Frontend-Based API Testing Guide

## Overview
This collection is based on the actual API endpoints used by the SynergySphere frontend application. After analyzing the frontend code, I've identified the core APIs that the frontend actually calls, ensuring this Postman collection reflects real-world usage.

## Key Findings from Frontend Analysis

### 🔍 Frontend API Structure
Based on the analysis of `/frontend/src/utils/apiCalls/`, the frontend uses these main API modules:

1. **Authentication API** (`auth.js`) - 13 endpoints
2. **Project API** (`projectAPI.js`) - 10 endpoints  
3. **Task API** (`taskAPI.js`) - 6 endpoints
4. **Profile API** (`profileAPI.js`) - 5 endpoints
5. **Dashboard API** (`dashboardAPI.js`) - 2 endpoints

### 🏗️ API Base Configuration
- **Base URL**: `http://localhost:5000` (configurable in `apiRequest.js`)
- **Authentication**: JWT Bearer tokens with automatic refresh
- **Request Handling**: Centralized through `apiRequest()` function
- **Loading States**: Built-in loading state management for UX

## Collection Files

### Main Collection
- **`SynergySphere_Frontend_Complete_Collection.json`** - Complete collection with all endpoints

### Individual Parts (if needed)
- **`SynergySphere_Frontend_Based_Collection.json`** - Authentication only
- **`SynergySphere_Frontend_Based_Collection_Part2.json`** - Profile & Projects
- **`SynergySphere_Frontend_Based_Collection_Part3.json`** - Tasks & Dashboard

## 🔐 Authentication Flow (13 Endpoints)

### Core Authentication
1. **Login** - `POST /auth/login` ✅ Pre-configured with your credentials
2. **Register** - `POST /auth/register` (sends OTP)
3. **Verify OTP** - `POST /auth/verify-otp` (completes registration)
4. **Resend OTP** - `POST /auth/resend-otp`
5. **Refresh Token** - `POST /auth/refresh`
6. **Logout** - `DELETE /auth/logout`

### Password Reset
7. **Forgot Password** - `POST /auth/forgot-password`
8. **Verify Reset Token** - `POST /auth/verify-reset-token`
9. **Reset Password** - `POST /auth/reset-password`

### Settings & OAuth
10. **Update Settings** - `PUT /auth/settings`
11. **Google Register** - `POST /auth/google-register`
12. **Google Login** - `POST /auth/google-login`
13. **Get Google Client ID** - `GET /auth/google/client-id`

## 👤 Profile Management (5 Endpoints)

1. **Get Profile** - `GET /profile`
2. **Update Profile** - `PUT /profile` (username, about)
3. **Upload Profile Image** - `POST /profile/upload-image` (FormData)
4. **Update About** - `PUT /profile` (about only)
5. **Update Username** - `PUT /profile` (username only)

## 📁 Project Management (10 Endpoints)

### Core Project Operations
1. **Get All Projects** - `GET /projects` (with filters)
2. **Get Project by ID** - `GET /projects/{id}`
3. **Create Project (JSON)** - `POST /projects` (JSON payload)
4. **Create Project (FormData)** - `POST /projects` (with image upload)
5. **Update Project** - `PUT /projects/{id}`
6. **Delete Project** - `DELETE /projects/{id}`

### Project Members
7. **Add Project Member** - `POST /projects/{id}/members`
8. **Update Project Member** - `PUT /projects/{id}/members/{memberId}`
9. **Remove Project Member** - `DELETE /projects/{id}/members/{memberId}`

### User Search
10. **Search Users** - `GET /users/search` (for adding to projects)

### Frontend-Specific Features
- **Advanced Filtering**: search, status, owner, member, pagination
- **Image Upload**: Projects can have images via FormData
- **Member Management**: isEditor permission system
- **JSON vs FormData**: Two ways to create projects

## ✅ Task Management (6 Endpoints)

1. **Get All Tasks** - `GET /tasks` (with filters)
2. **Get Task by ID** - `GET /tasks/{id}`
3. **Create Task** - `POST /tasks`
4. **Update Task** - `PUT /tasks/{id}`
5. **Update Task Status Only** - `PUT /tasks/{id}/status`
6. **Delete Task** - `DELETE /tasks/{id}` (requires project_id in body)

### Frontend-Specific Features
- **Comprehensive Filtering**: project_id, status, assignee, search, owner
- **Status Management**: Dedicated endpoint for status updates
- **Project Integration**: Tasks are tied to projects

## 📊 Dashboard (2 Endpoints)

1. **Get Dashboard Overview** - `GET /dashboard/overview`
2. **Get Dashboard Stats** - `GET /dashboard/stats`

## 🔧 Environment Variables (Auto-Set)

| Variable | Description | Set By |
|----------|-------------|---------|
| `baseUrl` | API base URL | Manual: `http://127.0.0.1:5000` |
| `accessToken` | JWT access token | ✅ Login request |
| `refreshToken` | JWT refresh token | ✅ Login request |
| `userId` | Current user ID | ✅ Login request |
| `projectId` | Last created/fetched project ID | ✅ Project requests |
| `taskId` | Last created/fetched task ID | ✅ Task requests |

## 🧪 Testing Scenarios

### Scenario 1: Complete User Journey
```
1. Login → Get Profile → Update Profile → Upload Image
2. Get Projects → Create Project → Add Members
3. Create Tasks → Update Task Status → Get Dashboard
```

### Scenario 2: Project Collaboration
```
1. Login → Search Users → Create Project with Members
2. Create Tasks → Assign to Members → Update Progress
3. View Dashboard Stats
```

### Scenario 3: Authentication Testing
```
1. Register → Verify OTP → Login → Refresh Token → Logout
2. Forgot Password → Verify Reset Token → Reset Password
```

## 🚨 Key Differences from Backend Routes

### Missing from Frontend (Not Used)
- Messages/Chat functionality
- Notifications
- Finance/Expense management
- Advanced analytics
- Cache management
- System health endpoints

### Frontend-Specific Features
- **OTP Verification System**: Complete email verification flow
- **Google OAuth Integration**: Client ID fetching and OAuth flows
- **File Upload Support**: Profile images and project images
- **Advanced Query Parameters**: Comprehensive filtering for projects/tasks
- **Error Handling**: Frontend includes robust error management
- **Loading States**: Built-in loading state tracking

## 📋 Request Examples

### Create Project with Image (FormData)
```javascript
// Frontend sends as FormData when image is included
{
  "name": "Project Name",
  "description": "Description", 
  "deadline": "2024-12-31T23:59:59.000Z",
  "member_emails": "[\"email@example.com\"]",  // JSON string
  "member_permissions": "{\"email@example.com\": false}",  // JSON string
  "project_image": File
}
```

### Task Creation
```javascript
{
  "project_id": 1,
  "title": "Task Title",
  "description": "Task Description",
  "due_date": "2024-12-31T23:59:59.000Z",
  "status": "todo",
  "assigned_to": 2
}
```

## 🔄 Authentication Flow
```
1. POST /auth/login (with credentials)
   ↓
2. Store access_token, refresh_token, user data
   ↓
3. All requests include: Authorization: Bearer {access_token}
   ↓
4. On 401 error: POST /auth/refresh automatically
   ↓
5. Retry original request with new token
```

## ⚡ Quick Start
1. Import `SynergySphere_Frontend_Complete_Collection.json`
2. Run "Login" request first
3. Collection variables are automatically set
4. Test any endpoint with proper authentication

## 💡 Pro Tips
- **Start with Login**: Always run login first to set tokens
- **Check Variables**: Verify projectId/taskId are set before dependent requests
- **Use Filters**: Enable query parameters to test filtering
- **File Uploads**: Use FormData endpoints for image uploads
- **Error Testing**: Try requests without tokens to test error handling

---

**This collection reflects the actual frontend implementation, ensuring your API tests match real-world usage patterns!** 🚀 