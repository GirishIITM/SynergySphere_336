# SynergySphere API Testing Guide with Postman

## Overview
This guide provides comprehensive Postman test cases for the entire SynergySphere backend API. The collection includes tests for authentication, project management, task management, finance, analytics, and more.

## Prerequisites
1. **Postman installed** (Desktop app or web version)
2. **SynergySphere backend running** (default: `http://127.0.0.1:5000`)
3. **Valid user credentials**: `adityar42069@gmail.com:12345678`

## Collection Import Instructions

### Method 1: Import JSON Files
1. Download the three Postman collection parts:
   - `SynergySphere_Postman_Collection.json` (Main collection with Auth & Projects)
   - `SynergySphere_Postman_Collection_Part2.json` (Tasks, Messages, Dashboard)
   - `SynergySphere_Postman_Collection_Part3.json` (Finance, Cache, System)

2. Open Postman
3. Click "Import" button
4. Select "Upload Files" and choose the JSON files
5. The collection will be imported with all endpoints

### Method 2: Manual Creation
If you prefer to create the collection manually, follow the folder structure and endpoints outlined below.

## Collection Structure

### 📁 01 - Authentication
- **Login** - `POST /auth/login` ✅ Pre-configured with your credentials
- **Register New User** - `POST /auth/register`
- **Refresh Token** - `POST /auth/refresh`
- **Logout** - `DELETE /auth/logout`
- **Forgot Password** - `POST /auth/forgot-password`

### 📁 02 - Profile Management
- **Get Profile** - `GET /profile`
- **Update Profile** - `PUT /profile/`
- **Upload Profile Image** - `POST /profile/upload-image`

### 📁 03 - Project Management
- **Create Project** - `POST /projects`
- **Get All Projects** - `GET /projects`
- **Get Project by ID** - `GET /projects/{id}`
- **Update Project** - `PUT /projects/{id}`
- **Add Project Member** - `POST /projects/{id}/members`
- **Search Users** - `GET /users/search`
- **Delete Project** - `DELETE /projects/{id}`

### 📁 04 - Task Management
- **Create Task** - `POST /projects/{projectId}/tasks`
- **Get All Tasks** - `GET /tasks`
- **Create Task (General)** - `POST /tasks`
- **Update Task** - `PUT /tasks/{id}`
- **Update Task Status** - `PUT /tasks/{id}/status`
- **Add Task Attachment** - `POST /tasks/{id}/attachment`
- **Delete Task** - `DELETE /tasks/{id}`

### 📁 05 - Advanced Task Features
- **Get Prioritized Tasks** - `GET /projects/{id}/tasks/prioritized`
- **Get At-Risk Tasks** - `GET /tasks/at_risk`
- **Update Task Progress** - `PUT /tasks/{id}/progress`
- **Set User Priority Scores** - `POST /users/{id}/priority_scores`

### 📁 06 - Messages
- **Get Project Messages** - `GET /projects/{id}/messages`
- **Send Project Message** - `POST /projects/{id}/messages`
- **Get Task Messages** - `GET /projects/{projectId}/tasks/{taskId}/messages`
- **Send Task Message** - `POST /projects/{projectId}/tasks/{taskId}/messages`

### 📁 07 - Notifications
- **Get Notifications** - `GET /notifications`
- **Mark Notification as Read** - `PUT /notifications/{id}/read`

### 📁 08 - Dashboard & Analytics
- **Dashboard Overview** - `GET /dashboard/overview`
- **Dashboard Stats** - `GET /dashboard/stats`
- **Project Statistics** - `GET /projects/{id}/stats`
- **User Dashboard Analytics** - `GET /users/{id}/dashboard`
- **User Productivity Analytics** - `GET /users/{id}/productivity`
- **Project Health Analytics** - `GET /projects/{id}/health`
- **Project Resources Analytics** - `GET /projects/{id}/resources`

### 📁 09 - Finance Management
- **Create Project Budget** - `POST /projects/{id}/budget`
- **Update Budget** - `PUT /budgets/{id}`
- **Delete Budget** - `DELETE /budgets/{id}`
- **Create Expense** - `POST /projects/{id}/expenses`
- **Update Expense** - `PUT /expenses/{id}`
- **Delete Expense** - `DELETE /expenses/{id}`
- **Get Project Expenses** - `GET /projects/{id}/expenses`
- **Get Project Financials** - `GET /projects/{id}/financials`

### 📁 10 - Cache Management
- **Get Cache Stats** - `GET /cache/stats`
- **Clear Cache** - `POST /cache/clear`
- **Warm Up Cache** - `POST /cache/warm`
- **Invalidate Cache** - `POST /cache/invalidate`

### 📁 11 - System & Health
- **Health Check** - `GET /health`
- **Get Version** - `GET /version`
- **Root Endpoint** - `GET /`

### 📁 12 - User Settings
- **Get User Settings** - `GET /auth/settings`
- **Update User Settings** - `PUT /auth/settings`

### 📁 13 - Google OAuth
- **Get Google Client ID** - `GET /auth/google/client-id`
- **Google Register** - `POST /auth/google-register`
- **Google Login** - `POST /auth/google-login`
- **Google Exchange Code** - `POST /auth/google/exchange-code`

## Environment Variables

The collection uses the following variables that are automatically set:

| Variable | Description | Auto-Set |
|----------|-------------|----------|
| `baseUrl` | API base URL | Manual: `http://127.0.0.1:5000` |
| `accessToken` | JWT access token | ✅ Auto-set after login |
| `refreshToken` | JWT refresh token | ✅ Auto-set after login |
| `userId` | Current user ID | ✅ Auto-set after login |
| `projectId` | Current project ID | ✅ Auto-set after project creation |
| `taskId` | Current task ID | ✅ Auto-set after task creation |

## Testing Workflow

### 🚀 Quick Start (Recommended Order)
1. **System Health** - Test `/health` and `/version` endpoints
2. **Authentication** - Login with provided credentials
3. **Profile** - Get and update user profile
4. **Projects** - Create a new project for testing
5. **Tasks** - Create and manage tasks
6. **Messages** - Test messaging features
7. **Analytics** - View dashboard and analytics
8. **Finance** - Test budget and expense management

### 🔐 Authentication Flow
```
1. POST /auth/login (credentials: adityar42069@gmail.com:12345678)
   → Sets accessToken, refreshToken, userId variables
   
2. All subsequent requests use Bearer {{accessToken}}

3. If token expires, use POST /auth/refresh
   → Updates accessToken
```

### 📝 Test Scripts
The collection includes automated test scripts that:
- ✅ Verify response status codes
- ✅ Extract and store important IDs (projectId, taskId, etc.)
- ✅ Validate response structure
- ✅ Set collection variables automatically

## Common Test Scenarios

### Scenario 1: Complete Project Lifecycle
1. Login → Create Project → Add Members → Create Tasks → Update Tasks → View Analytics

### Scenario 2: Financial Management
1. Login → Create Project → Create Budget → Add Expenses → View Financials

### Scenario 3: Team Collaboration
1. Login → Create Project → Add Tasks → Send Messages → View Notifications

### Scenario 4: Analytics & Monitoring
1. Login → View Dashboard → Check Project Health → Monitor Productivity

## Error Handling

Common HTTP status codes you'll encounter:
- `200` - Success
- `201` - Created successfully
- `400` - Bad request (check request body)
- `401` - Unauthorized (check access token)
- `403` - Forbidden (insufficient permissions)
- `404` - Resource not found
- `500` - Internal server error

## File Upload Testing

For endpoints that require file uploads (profile image, task attachments):
1. Use `form-data` body type
2. Add file field with key specified in endpoint
3. Ensure file size is within limits

## Security Notes

- 🔒 All protected endpoints require `Authorization: Bearer {{accessToken}}`
- 🔄 Tokens expire after 15 hours (configurable)
- 🔐 Use refresh token to get new access token
- 🚫 Logout invalidates tokens

## Advanced Features

### Cache Testing
- Test cache performance with `/cache/stats`
- Clear cache with `/cache/clear`
- Warm up cache with `/cache/warm`

### Analytics Testing
- Monitor user productivity
- Check project health metrics
- View resource utilization

### Finance Testing
- Create and manage budgets
- Track expenses by category
- View financial summaries

## Troubleshooting

### Common Issues:
1. **401 Unauthorized**: Login first or refresh token
2. **404 Not Found**: Check if resource exists (projectId, taskId)
3. **400 Bad Request**: Verify request body format
4. **500 Server Error**: Check backend logs

### Tips:
- Always start with the Login request
- Check collection variables are set correctly
- Verify backend is running on correct port
- Use the Console tab to debug requests

## Collection Maintenance

When updating the API:
1. Add new endpoints to appropriate folders
2. Update test scripts as needed
3. Maintain consistent variable naming
4. Include example request bodies
5. Add error handling tests

---

**Happy Testing! 🚀**

For issues or questions, check the backend logs or API documentation. 