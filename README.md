# SynergySphere - Intelligent Team Collaboration Platform

[**demo link**](https://drive.google.com/file/d/1roAdPW577RFYyRX4CSlQeamEJOOiAS54/view)

> **🏆 Built by Team 336 for the Odoo Hackathon**  
> An advanced, AI-powered project management and team collaboration platform designed to help teams operate at their peak performance.

![SynergySphere Application Flow](./frontend/src/assets/synpdia.jpg)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://python.org)
[![React](https://img.shields.io/badge/React-19+-green.svg)](https://reactjs.org)
[![Flask](https://img.shields.io/badge/Flask-3.1+-red.svg)](https://flask.palletsprojects.com)

## 🌟 Project Vision

SynergySphere is more than project management—it's the collaboration engine that anticipates bottlenecks, keeps everyone synced in real-time, and turns scattered tasks into a single, flowing workspace. Whether you're on desktop or mobile, SynergySphere provides intelligent insights to help your team work smarter and achieve more together.

## 🎥 Video Demo

Watch our project demo video to see SynergySphere in action:

[📺 SynergySphere Demo Video]([
https://drive.google.com/file/d/1roAdPW577RFYyRX4CSlQeamEJOOiAS54/view])
The video demonstrates key features including:
- Project and task management workflow
- Real-time collaboration capabilities  
- AI-powered analytics and insights
- Financial management tools
- Mobile responsiveness


## 💡 Why SynergySphere?

SynergySphere addresses real team collaboration challenges:

- **🔍 Unified Information Hub**: All files, chats, tasks, and decisions in one organized place
- **📊 True Progress Visibility**: Real-time project status with interactive dashboards and analytics
- **🎯 Smart Resource Management**: Clear assignments with workload management and priority scoring
- **⏰ Proactive Deadline Tracking**: AI-powered deadline risk assessment with early warnings
- **💬 Seamless Communication**: Context-aware messaging with @mentions and task-level chat
- **📱 Mobile & Desktop Ready**: Fully responsive design for work anywhere, anytime
- **💰 Financial Management**: Comprehensive budget tracking and expense management

## 🚀 Core Features

### Project Management
- **Intelligent Project Creation**: Advanced project setup with budget allocation and team management
- **Team Collaboration**: Member management with role-based permissions
- **Real-time Updates**: Live project status and progress tracking
- **Project Analytics**: Health scoring and performance metrics

### Task Management
- **Smart Task Creation**: Priority-based task assignments with budget allocation
- **Drag & Drop Board**: Kanban-style task board with status management
- **Task Chat**: Thread-based discussions within task context
- **Progress Tracking**: Visual progress indicators with completion percentages

### Advanced Intelligence
- **AI-Powered Priority Scoring**: Dynamic task prioritization based on multiple factors
- **At-Risk Task Detection**: Proactive identification of tasks that may miss deadlines
- **Deadline Analytics**: Predictive algorithms for timeline management
- **Resource Optimization**: Smart workload distribution recommendations

### Financial Management
- **Budget Tracking**: Project and task-level budget management
- **Expense Management**: Categorized expense tracking with receipt uploads
- **Financial Analytics**: Visual spending analysis with trend graphs
- **Approval Workflow**: Expense approval system for financial control

### Communication & Notifications
- **Task-Level Chat**: Real-time messaging within task context
- **@Mention System**: Tag team members for immediate attention
- **Smart Notifications**: Context-aware alerts and updates
- **Activity Inbox**: Centralized notification management

## 🛠️ Tech Stack

### Frontend
- **React 19** - Latest React with concurrent features
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component library
- **Recharts** - Data visualization library
- **Socket.IO Client** - Real-time communication
- **Zustand** - State management

### Backend
- **Flask 3.1** - Python web framework
- **SQLAlchemy** - Database ORM
- **Flask-JWT-Extended** - Authentication
- **Socket.IO** - Real-time communication
- **APScheduler** - Background task scheduling
- **Celery** - Distributed task queue
- **Redis/Valkey** - Caching and message broker

### Database & Services
- **PostgreSQL** - Production database
- **SQLite** - Development database
- **Cloudinary** - File storage and management
- **Google APIs** - Additional integrations

## 📦 Project Structure

```
SynergySphere_336/
├── backend/                    # Flask backend application
│   ├── app.py                 # Main Flask application
│   ├── config.py              # Configuration settings
│   ├── extensions.py          # Flask extensions setup
│   ├── models/                # Database models
│   │   ├── user.py           # User model
│   │   ├── project.py        # Project model
│   │   ├── task.py           # Task model
│   │   ├── budget.py         # Budget model
│   │   └── expense.py        # Expense model
│   ├── routes/                # API route handlers
│   │   ├── auth.py           # Authentication routes
│   │   ├── project.py        # Project management
│   │   ├── task.py           # Task management
│   │   ├── analytics.py      # Analytics endpoints
│   │   ├── finance.py        # Financial management
│   │   └── message.py        # Messaging system
│   ├── services/              # Business logic services
│   │   ├── analytics_service.py
│   │   ├── finance_service.py
│   │   ├── priority_service.py
│   │   └── deadline_service.py
│   ├── utils/                 # Utility functions
│   ├── tests/                 # Unit tests
│   └── requirements.txt       # Python dependencies
├── frontend/                   # React frontend application
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   │   ├── ui/           # UI component library
│   │   │   ├── AtRiskTasks.jsx
│   │   │   └── TaskBoard.jsx
│   │   ├── pages/            # Page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Projects.jsx
│   │   │   ├── Tasks.jsx
│   │   │   └── solutions/    # Advanced features
│   │   │       ├── ProjectAnalytics.jsx
│   │   │       └── ProjectFinance.jsx
│   │   ├── utils/
│   │   │   └── apiCalls/     # API integration
│   │   ├── App.jsx           # Main App component
│   │   └── main.jsx          # Application entry point
│   ├── package.json          # Node.js dependencies
│   └── vite.config.js        # Vite configuration
├── docs/                      # Documentation
│   ├── PLANNING.md           # Project architecture
│   ├── TASK.md              # Development tasks
│   └── COMPREHENSIVE_SYSTEM_OVERVIEW.md
├── utils/                     # Shared utilities
├── postman/                  # API testing collection
├── LICENSE                   # MIT License
└── README.md                # This file
```

## ⚡ Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.9+ and pip
- **PostgreSQL** (for production) or SQLite (for development)
- **Redis** (optional, for caching)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SynergySphere_336
   ```

2. **Backend Setup**
   ```bash
   cd backend
   
   # Create virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Set up environment variables
   cp .env.example .env
   # Edit .env with your database credentials
   
   # Initialize database
   python init_db.py
   
   # Start the backend server
   python app.py
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   
   # Install dependencies
   npm install
   
   # Start development server
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - Live Demo: https://voluble-tapioca-bc2df4.netlify.app

### Environment Configuration

Create a `.env` file in the backend directory:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/synergysphere
# For development with SQLite:
# DATABASE_URL=sqlite:///synergysphere.db

# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key
JWT_ACCESS_TOKEN_EXPIRES=1800

# Flask Configuration
FLASK_ENV=development
SECRET_KEY=your-super-secret-flask-key

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379/0

# Cloudinary Configuration (for file uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email Configuration (optional)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
```

## 🔧 Development Guide

### Code Standards

- **Python**: Follow PEP8, use type hints, format with `black`
- **JavaScript**: Use ESLint configuration, prefer functional components
- **File Size Limit**: Maximum 500 lines per file
- **Testing**: Minimum coverage with unit tests for all features

### Development Workflow

1. **Feature Development**
   ```bash
   # Create feature branch
   git checkout -b feature/feature-name
   
   # Make changes and commit
   git add .
   git commit -m "feat: add feature description"
   
   # Run tests
   cd backend && python -m pytest
   cd frontend && npm test
   ```

2. **Database Migrations**
   ```bash
   cd backend
   python migrate.py  # Custom migration script
   ```

3. **Testing**
   ```bash
   # Backend tests
   cd backend
   python -m pytest tests/ -v
   
   # Frontend tests
   cd frontend
   npm test
   ```



## 📡 API Documentation

### Base URLs
- Development: `http://localhost:5000`
- Production: `https://your-production-api.com`

### Authentication
All API endpoints (except auth) require JWT authentication:
```
Authorization: Bearer <jwt_token>
```

### Core Endpoints

#### Authentication
```
POST /auth/register          # User registration
POST /auth/login            # User login
POST /auth/logout           # User logout
GET  /auth/profile          # Get user profile
```

#### Projects
```
GET    /projects            # List user projects
POST   /projects            # Create new project
GET    /projects/{id}       # Get project details
PUT    /projects/{id}       # Update project
DELETE /projects/{id}       # Delete project
POST   /projects/{id}/members  # Add project member
```

#### Tasks
```
GET    /projects/{id}/tasks    # List project tasks
POST   /projects/{id}/tasks    # Create new task
GET    /tasks/{id}            # Get task details
PUT    /tasks/{id}            # Update task
DELETE /tasks/{id}            # Delete task
GET    /task_advanced/tasks/at_risk  # Get at-risk tasks
```

#### Analytics
```
GET /analytics/projects/{id}/stats     # Project statistics
GET /analytics/projects/{id}/health    # Project health score
GET /analytics/projects/{id}/resources # Resource utilization
```

#### Finance
```
POST /finance/projects/{id}/budget     # Create project budget
GET  /finance/projects/{id}/financials # Get financial overview
POST /finance/expenses                 # Create expense
PUT  /finance/expenses/{id}/approve    # Approve expense
```

### WebSocket Events

#### Task Chat
```javascript
// Join task room
socket.emit('join_task_room', {taskId: 123});

// Send message
socket.emit('send_task_message', {
  taskId: 123,
  content: 'Hello team!'
});

// Listen for messages
socket.on('task_message_received', (data) => {
  console.log('New message:', data);
});
```

## 🧪 Testing

### Backend Testing
```bash
cd backend

# Run all tests
python -m pytest

# Run with coverage
python -m pytest --cov=. --cov-report=html

# Run specific test file
python -m pytest tests/test_models.py -v
```

### Frontend Testing
```bash
cd frontend

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Structure
```
backend/tests/
├── test_models.py           # Model tests
├── test_routes/            # Route tests
│   ├── test_auth.py
│   ├── test_projects.py
│   └── test_tasks.py
├── test_services/          # Service tests
└── conftest.py            # Test configuration

frontend/src/__tests__/
├── components/            # Component tests
├── pages/                # Page tests
└── utils/                # Utility tests
```

## 🚀 Deployment

### Production Deployment

1. **Backend Deployment (Heroku/Railway)**
   ```bash
   # Install Gunicorn
   pip install gunicorn
   
   # Create Procfile
   echo "web: gunicorn app:app" > Procfile
   
   # Deploy
   git push heroku main
   ```

2. **Frontend Deployment (Netlify/Vercel)**
   ```bash
   cd frontend
   
   # Build for production
   npm run build
   
   # Deploy to Netlify
   netlify deploy --prod --dir=dist
   ```

3. **Database Setup**
   ```bash
   # PostgreSQL setup
   heroku addons:create heroku-postgresql:hobby-dev
   heroku config:get DATABASE_URL
   ```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or run individually
docker build -t synergysphere-backend ./backend
docker build -t synergysphere-frontend ./frontend
```

### Environment Variables for Production

```env
FLASK_ENV=production
DATABASE_URL=postgresql://prod-db-url
JWT_SECRET_KEY=production-secret-key
REDIS_URL=redis://prod-redis-url
```

## 🔧 Troubleshooting

### Common Issues

#### Backend Issues

1. **Import Errors**
   ```bash
   # Ensure all modules are properly imported
   python -c "from app import app; print('App imports successfully')"
   ```

2. **Database Connection Issues**
   ```bash
   # Check database connection
   python check_db.py
   ```

3. **Redis Connection Issues**
   ```bash
   # Check if Redis is running
   redis-cli ping
   ```

#### Frontend Issues

1. **Module Not Found Errors**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Build Issues**
   ```bash
   # Clear Vite cache
   rm -rf node_modules/.vite
   npm run dev
   ```

3. **API Connection Issues**
   - Check if backend is running on correct port
   - Verify CORS configuration
   - Check environment variables

### Debug Mode

Enable debug logging:

```python
# Backend debug mode
FLASK_ENV=development
FLASK_DEBUG=True

# Enable verbose logging
import logging
logging.basicConfig(level=logging.DEBUG)
```

```javascript
// Frontend debug mode
const DEBUG = import.meta.env.DEV;
if (DEBUG) console.log('Debug info:', data);
```

## 🎯 Key Innovation Highlights

### 1. **Intelligent Task Prioritization**
- Machine learning algorithms for dynamic priority scoring
- Multi-factor analysis (deadlines, dependencies, importance)
- Real-time priority recalculation

### 2. **Predictive Analytics**
- Project health scoring with actionable insights
- Resource utilization optimization
- Deadline risk assessment with early warnings

### 3. **Comprehensive Financial Management**
- Real-time budget tracking with visual analytics
- Automated expense categorization and approval workflow
- Task-level budget and expense management

### 4. **Proactive Project Management**
- At-risk task identification before problems occur
- Progress rate monitoring with trend analysis
- Automated recommendations for optimization

### 5. **Enhanced Communication**
- Task-level chat with @mention notifications
- Real-time updates with Socket.IO
- Context-aware messaging system

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Follow coding standards** (see Development Guide)
4. **Add tests** for new functionality
5. **Commit changes** (`git commit -m 'Add amazing feature'`)
6. **Push to branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

### Contribution Guidelines

- Write comprehensive tests for new features
- Update documentation for any API changes
- Keep commits atomic and well-described
- Ensure all tests pass before submitting PR

## 📊 Performance & Monitoring

### Performance Optimization
- **Caching**: Redis-based caching for frequent queries
- **Database Optimization**: Indexed queries and connection pooling
- **Frontend Optimization**: Code splitting and lazy loading
- **API Optimization**: Pagination and efficient data serialization

### Monitoring
- **Health Checks**: Built-in health monitoring endpoints
- **Error Tracking**: Comprehensive error logging
- **Performance Metrics**: Response time and resource usage tracking

## 🔐 Security

### Security Features
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **CORS Protection**: Properly configured cross-origin requests
- **Input Validation**: Comprehensive input sanitization
- **File Upload Security**: Secure file handling with Cloudinary

### Security Best Practices
- Regular dependency updates
- Environment variable protection
- SQL injection prevention
- XSS protection

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License - Copyright (c) 2025 Girish Vishveshvara Bhat
```

## 👥 Team 336

**Core Development Team:**
- **Vedika Santosh Vangar** - Frontend Development & UX Design
- **Rudransh Vikram Singh** - Database Design & Analytics 
- **Girish V Bhat** - Full Stack Development & Project Lead
- **Aditya R** - Backend Development & Architecture 

## 📞 Contact & Support

### Get in Touch
- **Email**: 23f2005217@ds.study.iitm.ac.in
- **Project Repository**: [GitHub Repository]
- **Live Demo**: https://voluble-tapioca-bc2df4.netlify.app

### Support
For bugs, feature requests, or questions:
1. Check existing issues in the repository
2. Create a new issue with detailed description
3. Contact the development team via email

### Acknowledgments
- Built for the Odoo Hackathon
- Special thanks to the open-source community
- Inspired by modern project management needs

---

**🚀 Ready to transform your team's collaboration? Start with SynergySphere today!**
