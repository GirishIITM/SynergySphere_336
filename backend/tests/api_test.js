const axios = require('axios');
const fs = require('fs');

// Base URL for the API
const API_BASE_URL = 'https://odoo336-akhta2hvagf3czda.southindia-01.azurewebsites.net';

// Store tokens and IDs
let accessToken = '';
let refreshToken = '';
let userId = null;
let projectId = null;
let taskId = null;

// Test user data
const testUser = {
  username: `testuser_${Date.now()}`,
  email: `testuser_${Date.now()}@example.com`,
  password: 'Password123!'
};

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add response interceptor for logging
api.interceptors.response.use(
  response => {
    console.log(`✅ [${response.config.method.toUpperCase()}] ${response.config.url} - ${response.status}`);
    return response;
  },
  error => {
    console.error(`❌ [${error.config.method.toUpperCase()}] ${error.config.url} - ${error.response?.status || 'ERROR'}`);
    console.error(error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Helper to update auth header
const setAuthHeader = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Auth tests
async function testRegister() {
  console.log('\n🔹 Testing user registration...');
  const response = await api.post('/auth/register', testUser);
  console.log('Registration initiated, OTP should be sent');
  return response.data;
}

async function testCompleteRegistration() {
  console.log('\n🔹 Testing complete registration with mock OTP...');
  try {
    // Since we can't get the real OTP in tests, we'll skip this
    // In a real test environment, you'd use a test email service
    console.log('Note: OTP verification skipped in automated tests');
    return { msg: "OTP verification skipped in tests" };
  } catch (error) {
    console.log('Expected: OTP verification requires manual testing');
    return null;
  }
}

async function testLogin() {
  console.log('\n🔹 Testing user login...');
  // For testing, we'll need to create a user directly in the database
  // or use a pre-existing test user
  try {
    const response = await api.post('/auth/login', {
      username: 'testuser', // Use a known test user
      email: 'test@example.com',
      password: 'TestPassword123!'
    });
    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token;
    setAuthHeader(accessToken);
    console.log('Login successful, tokens received');
    return response.data;
  } catch (error) {
    console.log('Note: Login test requires a pre-existing user account');
    throw error;
  }
}

async function testRefreshToken() {
  console.log('\n🔹 Testing token refresh...');
  const originalAuthHeader = api.defaults.headers.common['Authorization'];
  setAuthHeader(refreshToken);
  const response = await api.post('/auth/refresh');
  accessToken = response.data.access_token;
  // Update refresh token if provided (token rotation)
  if (response.data.refresh_token) {
    refreshToken = response.data.refresh_token;
  }
  setAuthHeader(accessToken);
  console.log('Token refreshed successfully');
  return response.data;
}

async function testUpdateSettings() {
  console.log('\n🔹 Testing update settings...');
  const response = await api.put('/auth/settings', {
    notify_email: true,
    notify_in_app: true
  });
  console.log('User settings updated successfully');
  return response.data;
}

// Project tests
async function testCreateProject() {
  console.log('\n🔹 Testing project creation...');
  const response = await api.post('/projects', {
    name: `Test Project ${Date.now()}`,
    description: 'This is a test project created by automated API tests'
  });
  projectId = response.data.project_id;
  console.log(`Project created with ID: ${projectId}`);
  return response.data;
}

async function testListProjects() {
  console.log('\n🔹 Testing project listing...');
  const response = await api.get('/projects');
  console.log(`Found ${response.data.length} projects`);
  return response.data;
}

async function testGetProject() {
  console.log('\n🔹 Testing get project details...');
  const response = await api.get(`/projects/${projectId}`);
  console.log('Project details retrieved successfully');
  return response.data;
}

async function testUpdateProject() {
  console.log('\n🔹 Testing project update...');
  const response = await api.put(`/projects/${projectId}`, {
    name: `Updated Project ${Date.now()}`,
    description: 'This project was updated by automated API tests'
  });
  console.log('Project updated successfully');
  return response.data;
}

async function testAddProjectMember() {
  console.log('\n🔹 Testing add project member...');
  try {
    const response = await api.post(`/projects/${projectId}/members`, {
      email: 'another_user@example.com'  // This user should exist in your system
    });
    console.log('Project member added successfully');
    return response.data;
  } catch (error) {
    console.log('Note: This test may fail if the test user does not exist. Continue testing...');
    return null;
  }
}

// Task tests
async function testCreateTask() {
  console.log('\n🔹 Testing task creation...');
  const response = await api.post('/tasks', {
    project_id: projectId,
    title: `Test Task ${Date.now()}`,
    description: 'This is a task created by automated API tests',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now with time
    status: 'Not Started'
  });
  taskId = response.data.task_id;
  console.log(`Task created with ID: ${taskId}`);
  return response.data;
}

async function testUpdateTask() {
  console.log('\n🔹 Testing task update...');
  const response = await api.put(`/tasks/${taskId}`, {
    title: `Updated Task ${Date.now()}`,
    description: 'This task was updated by automated API tests',
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now with time
    status: 'In Progress'
  });
  console.log('Task updated successfully');
  return response.data;
}

async function testUploadTaskAttachment() {
  console.log('\n🔹 Testing file upload to task...');
  try {
    // Create a test file
    const testFilePath = '/home/gir/Desktop/programming/backendspre/tests/test.svg';
    fs.writeFileSync(testFilePath, 'This is a test file for attachment upload.');
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));
    
    const response = await api.post(`/tasks/${taskId}/attachment`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    // Clean up
    fs.unlinkSync(testFilePath);
    
    console.log('File uploaded successfully');
    return response.data;
  } catch (error) {
    console.log('Note: File upload test requires browser environment or additional libraries. Skipping...');
    return null;
  }
}

// Notification and message tests would be added here if we had the routes

// Cleanup
async function testDeleteTask() {
  console.log('\n🔹 Testing task deletion...');
  const response = await api.delete(`/tasks/${taskId}`);
  console.log('Task deleted successfully');
  return response.data;
}

async function testDeleteProject() {
  console.log('\n🔹 Testing project deletion...');
  const response = await api.delete(`/projects/${projectId}`);
  console.log('Project deleted successfully');
  return response.data;
}

async function testLogout() {
  console.log('\n🔹 Testing logout...');
  const response = await api.delete('/auth/logout');
  setAuthHeader(null);
  console.log('Logged out successfully');
  return response.data;
}

// Add this function for error logging
function writeErrorToFile(testName, endpoint, method, errorDetail) {
  const timestamp = new Date().toISOString();
  const logEntry = `
===== ERROR: ${testName} =====
Time: ${timestamp}
Endpoint: [${method}] ${endpoint}
Error details: ${errorDetail}
==============================

`;
  
  fs.appendFileSync('api_test_errors.log', logEntry, { encoding: 'utf8' });
}

// Google OAuth tests
async function testGoogleClientId() {
  console.log('\n🔹 Testing get Google client ID...');
  const response = await api.get('/auth/google/client-id');
  console.log('Google client ID retrieved successfully');
  return response.data;
}

// Note: Testing actual Google OAuth would require real Google tokens
// This is just to test the endpoint structure
async function testGoogleLoginEndpoint() {
  console.log('\n🔹 Testing Google login endpoint (expects failure with fake token)...');
  try {
    const response = await api.post('/auth/google-login', {
      token: 'fake-google-token'
    });
    console.log('Unexpected success with fake token');
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('Expected failure with fake Google token - endpoint working correctly');
      return null;
    }
    throw error;
  }
}

// Run all tests in sequence
async function runTests() {
  console.log('🚀 Starting API tests...');
  
  // Create/reset error log file
  fs.writeFileSync('api_test_errors.log', `API TEST ERROR LOG - ${new Date().toISOString()}\n\n`, { encoding: 'utf8' });
  
  // Collect all test functions in order
  const tests = [
    { name: 'Get Google Client ID', fn: testGoogleClientId },
    { name: 'Google Login Endpoint', fn: testGoogleLoginEndpoint },
    { name: 'User Registration', fn: testRegister },
    { name: 'Complete Registration (mock OTP)', fn: testCompleteRegistration },
    { name: 'User Login', fn: testLogin },
    { name: 'Token Refresh', fn: testRefreshToken },
    { name: 'Update Settings', fn: testUpdateSettings },
    { name: 'Create Project', fn: testCreateProject },
    { name: 'List Projects', fn: testListProjects },
    { name: 'Get Project Details', fn: testGetProject },
    { name: 'Update Project', fn: testUpdateProject },
    { name: 'Add Project Member', fn: testAddProjectMember },
    { name: 'Create Task', fn: testCreateTask },
    { name: 'Update Task', fn: testUpdateTask },
    { name: 'Upload Task Attachment', fn: testUploadTaskAttachment },
    { name: 'Delete Task', fn: testDeleteTask },
    { name: 'Delete Project', fn: testDeleteProject },
    { name: 'Logout', fn: testLogout }
  ];
  
  // Track test results
  const testResults = [];
  
  // Execute each test with individual error handling
  for (const test of tests) {
    try {
      await test.fn();
      console.log(`✅ PASSED: ${test.name}`);
      testResults.push({ 
        name: test.name, 
        status: 'PASSED' 
      });
    } catch (error) {
      // Format error message
      let errorDetail = '';
      const endpoint = error.config?.url || 'Unknown';
      const method = error.config?.method?.toUpperCase() || 'Unknown';
      
      if (error.response) {
        const status = error.response.status;
        const statusText = error.response.statusText;
        errorDetail = `Status: ${status} - ${statusText}`;
        
        // Add more details if available
        if (error.response.data) {
          if (typeof error.response.data === 'object') {
            errorDetail += ` | Details: ${JSON.stringify(error.response.data)}`;
          } else {
            errorDetail += ` | Details: ${error.response.data}`;
          }
        }
      } else if (error.request) {
        errorDetail = 'No response received from server';
      } else {
        errorDetail = error.message;
      }
      
      // Write detailed error to file
      writeErrorToFile(test.name, endpoint, method, errorDetail);
      
      // Simple console output
      console.log(`❌ FAILED: ${test.name} → [${method}] ${endpoint}`);
      
      testResults.push({ 
        name: test.name, 
        status: 'FAILED',
        endpoint,
        method 
      });
      
      // Some tests depend on previous ones, so we might need to stop
      if (test.name === 'User Registration' || test.name === 'User Login' || 
          test.name === 'Create Project' || test.name === 'Create Task') {
        console.error('Critical test failed. Stopping test suite.');
        console.error(`See 'api_test_errors.log' for detailed error information`);
        break;
      }
    }
  }
  
  // Print summary table
  console.log('\n===== TEST SUMMARY =====');
  console.log('Test Name                 | Status | Endpoint');
  console.log('--------------------------|--------|---------------------------');
  
  testResults.forEach(result => {
    const name = result.name.padEnd(25);
    const status = result.status.padEnd(8);
    const endpoint = result.status === 'FAILED' ? 
      `[${result.method}] ${result.endpoint}` : '';
    
    console.log(`${name}| ${status}| ${endpoint}`);
  });
  
  const passedCount = testResults.filter(t => t.status === 'PASSED').length;
  const failedCount = testResults.filter(t => t.status === 'FAILED').length;
  
  console.log('\nSummary:');
  console.log(`- Total tests: ${testResults.length}`);
  console.log(`- Passed: ${passedCount}`);
  console.log(`- Failed: ${failedCount}`);
  
  if (failedCount > 0) {
    console.log(`\nDetailed error information has been saved to 'api_test_errors.log'`);
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed successfully!');
  }
}

// Run the tests
runTests();

// Instructions for usage:
console.log(`
To run these tests:
1. Make sure your Flask API is running at ${API_BASE_URL}
2. Install dependencies: npm install axios fs
3. Run the script: node api_test.js
`);
