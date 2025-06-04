# SynergySphere_336

SynergySphere is an advanced, intelligent team collaboration platform designed to help teams operate at their best—staying organized, communicating seamlessly, and making informed decisions. Built by Team 336.

## Application Flow
<!-- Updated: Use PDF instead of image -->

![SynergySphere Application Flow](./frontend/src/assets/synpdia.jpg)


## 🌟 Project Vision

SynergySphere is more than project management—it's the collaboration engine behind our Odoo Hackathon entry. We've built a platform that anticipates bottlenecks, keeps everyone synced in real-time, and turns scattered tasks into a single, flowing workspace—whether you're on desktop or mobile.

---

## 💡 Why SynergySphere?

SynergySphere was built to directly address the real challenges that teams face every day—challenges we experienced ourselves and set out to solve with a smarter, more supportive platform:

- No More Scattered Information: All your files, chats, tasks, and decisions live in one organized place. No more searching through endless emails or chat threads—everything you need is always at your fingertips.
- True Progress Visibility: Instantly see what's done, what's in progress, and what's holding things up. Our dashboards and task boards give everyone a clear, real-time view of project status.
- Smart Resource Management: Assignments are always clear. SynergySphere helps prevent overload and confusion by making sure everyone knows their responsibilities and workload.
- Proactive Deadline Tracking: Never be surprised by a missed deadline again. Automated reminders and visual timelines keep your team ahead of schedule, surfacing potential issues before they become problems.
- Seamless Communication: Updates, discussions, and decisions stay connected to the work they're about. No more missed messages or lost context—SynergySphere keeps everyone in the loop.
- Mobile & Desktop Ready: Whether you're at your desk or on the go, SynergySphere's responsive design ensures you can manage your work and collaborate with your team anywhere, anytime.

SynergySphere isn't just another project management tool—it's the intelligent backbone of your team's collaboration, built to help you work smarter, stay aligned, and achieve more together.

---

## 🚀 Features

### Core Features
- **User Authentication**: Secure registration and login with JWT tokens
- **Project Management**: Create, view, and manage projects with team collaboration
- **Team Collaboration**: Add team members to projects and assign tasks
- **Task Management**: Assign tasks with due dates, statuses (To-Do, In Progress, Done), priorities, and budgets
- **Threaded Discussions**: Communicate within each project and task context (including task-level chat)
- **Progress Visualization**: See task status and project progress at a glance
- **Notifications**: Get alerts for important events and deadlines
- **Mobile & Desktop Ready**: Fully responsive UI for all devices

### 🧠 Advanced Intelligence & Financial Features

#### Smart Task Prioritization
- **Dynamic Priority Scoring**: AI-powered priority calculation based on deadlines, dependencies, and project importance
- **Priority View Mode**: Toggle between standard and priority-sorted task views
- **Intelligent Task Ranking**: Automatically surface the most critical tasks that need immediate attention
- **Priority Recalculation**: Real-time priority updates as project conditions change

#### Proactive Deadline Management
- **At-Risk Task Detection**: Automatically identify tasks that may miss their deadlines
- **Progress Tracking**: Monitor task completion percentages with visual progress bars
- **Deadline Analytics**: Advanced algorithms predict which tasks need intervention
- **Risk Level Assessment**: Color-coded risk indicators (Low, Medium, High, Critical, Overdue)
- **Progress Rate Monitoring**: Track daily progress rates to predict completion times

#### Comprehensive Project & Task Analytics
- **Project Health Scoring**: Multi-factor health assessment with actionable recommendations
- **Team Activity Analytics**: Visualize team productivity and workload distribution
- **Progress Timeline Tracking**: Historical progress visualization with trend analysis
- **Resource Utilization Metrics**: Monitor and optimize team resource allocation
- **Interactive Charts**: Responsive charts powered by Recharts
- **Custom Timeframe Analysis**: Filter analytics by 7 days, 30 days, 3 months, or 1 year

#### Advanced Financial Management
- **Budget Creation & Tracking**: Set project and task budgets with real-time spending monitoring
- **Expense Management**: Categorized expense tracking with detailed reporting, receipts/attachments, and approval workflow
- **Financial Analytics**: Visual spending analysis with pie charts and trend graphs
- **Budget Status Monitoring**: Automatic alerts for budget overruns (75%, 90% thresholds)
- **Monthly Spending Analysis**: Track spending patterns over time
- **Category-wise Expense Breakdown**: Detailed expense categorization (Development, Design, Marketing, etc.)
- **Task-level Budget & Expense Tracking**: Manage and analyze budgets and expenses at the individual task level
- **Expense Attachments**: Upload receipts and files for expenses
- **Expense Approval Workflow**: Approve or reject large expenses
- **Recurring Expenses & Templates**: Support for recurring expenses and templates

#### Enhanced Dashboard Experience
- **At-Risk Tasks Widget**: Immediate visibility of tasks requiring attention
- **Quick Access Actions**: Direct links to project analytics and finance management
- **Real-time Metrics**: Live project and task statistics
- **Smart Navigation**: Context-aware navigation with advanced features integration

---

## 🛠️ Tech Stack

<p align="center">
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original-wordmark.svg" alt="React" width="50" height="50"/>
  <img src="https://vitejs.dev/logo.svg" alt="Vite" width="50" height="50"/>
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg" alt="JavaScript" width="50" height="50"/>
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg" alt="Python" width="50" height="50"/>
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/postgresql/postgresql-original-wordmark.svg" alt="PostgreSQL" width="50" height="50"/>
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/docker/docker-original.svg" alt="Docker" width="50" height="50"/>
</p>

### Frontend
- **React 19**: Latest React with modern hooks and concurrent features
- **Vite**: Lightning-fast build tool and development server
- **React Router**: Client-side routing with advanced navigation
- **Recharts**: Beautiful, responsive charts for analytics visualization
- **Lucide React**: Modern icon library with extensive icon set
- **Radix UI**: Accessible, unstyled UI components
- **Tailwind CSS**: Utility-first CSS framework for rapid styling

### Backend
- **Flask**: Lightweight and flexible Python web framework
- **SQLAlchemy**: Powerful ORM for database management
- **Flask-JWT-Extended**: Comprehensive JWT authentication
- **APScheduler**: Advanced Python scheduler for background tasks
- **Flask-Caching**: Intelligent caching for improved performance

### Database & Services
- **PostgreSQL**: Robust relational database for production
- **SQLite**: Development database for rapid prototyping
- **Advanced Analytics Service**: Custom-built analytics engine
- **Finance Management Service**: Comprehensive financial tracking
- **Priority Service**: Intelligent task prioritization algorithms
- **Deadline Service**: Proactive deadline monitoring system

---

## 📱 MVP Wireframes & User Flow

- **Login/Sign Up**: Email/password fields, sign-up and forgot password options
- **Enhanced Dashboard**: Project overview with analytics, at-risk tasks, and quick actions
- **Project Detail**: Task management with priority sorting, advanced filtering, and budget/expense tabs
- **Analytics Dashboard**: Comprehensive project insights with interactive charts
- **Finance Management**: Budget tracking and expense management with visual analytics, receipts, and approvals
- **At-Risk Tasks Monitor**: Dedicated view for tasks requiring immediate attention
- **Task Board**: Advanced task management with priority indicators, progress tracking, and budget/expense info
- **Task Detail**: Comprehensive task information with progress, budget, and expense updates, plus chat
- **User Profile**: Enhanced profile management with productivity insights
- **Mobile First**: All screens fully responsive across all device sizes

---

## 📦 Project Structure

```
SynergySphere_336/
├── backend/                 # Backend application (Flask)
│   ├── routes/             # API route handlers
│   │   ├── analytics.py    # Analytics endpoints
│   │   ├── finance.py      # Finance management endpoints
│   │   ├── task_advanced.py # Advanced task features
│   │   └── ...
│   ├── services/           # Business logic services
│   │   ├── analytics_service.py
│   │   ├── finance_service.py
│   │   ├── priority_service.py
│   │   ├── deadline_service.py
│   │   └── ...
│   ├── models/             # Database models
│   │   ├── budget.py       # Budget model
│   │   ├── expense.py      # Expense model
│   │   └── ...
│   ├── app.py
│   ├── requirements.txt
│   └── ...
├── frontend/               # Frontend application (React)
│   ├── src/
│   │   ├── components/
│   │   │   ├── AtRiskTasks.jsx
│   │   │   └── ui/         # Reusable UI components
│   │   ├── pages/
│   │   │   └── solutions/
│   │   │       ├── ProjectAnalytics.jsx
│   │   │       ├── ProjectFinance.jsx
│   │   │       └── ...
│   │   ├── utils/
│   │   │   └── apiCalls/
│   │   │       ├── analyticsAPI.js
│   │   │       ├── financeAPI.js
│   │   │       ├── taskAdvancedAPI.js
│   │   │       └── ...
│   │   ├── App.jsx
│   │   └── ...
│   ├── package.json
│   └── ...
├── docs/                   # Documentation
│   ├── PLANNING.md
│   └── TASK.md
├── .env
└── README.md
```

## ⚡ Getting Started

### Prerequisites

- Node.js 18+ & npm
- Python 3.9+ & pip
- PostgreSQL Server (for production)

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
# Set up your .env file with PostgreSQL credentials and secret keys
python app.py
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Visit [https://voluble-tapioca-bc2df4.netlify.app](https://voluble-tapioca-bc2df4.netlify.app) to view the app.

---

## 📄 API Overview

### Base URL
- Development: `http://localhost:5000/api`
- Production: [API Base URL]

### Core Endpoints
- **Authentication**: `POST /auth/register`, `POST /auth/login`
- **Projects**: CRUD endpoints for projects with team management
- **Tasks**: Advanced task management with priority, progress, budget, and expense tracking
- **Users**: User management and profile endpoints

### Advanced Feature Endpoints
- **Analytics**: `GET /analytics/projects/{id}/stats`, `/health`, `/resources`
- **Finance**: `POST /finance/projects/{id}/budget`, `/expenses`
- **Task Advanced**: `GET /task_advanced/tasks/at_risk`, `/projects/{id}/tasks/prioritized`
- **Priority Management**: `POST /task_advanced/users/{id}/priority_scores`
- **Task Chat**: `GET /projects/{projectId}/tasks/{taskId}/messages`, `POST /projects/{projectId}/tasks/{taskId}/messages`
- **Expense Attachments**: `POST /expenses/{id}/attachment`
- **Expense Approval**: `PUT /expenses/{id}/approve`

---

## 🎯 Key Innovation Highlights

### 1. Intelligent Task Prioritization
- Uses machine learning algorithms to score tasks based on multiple factors
- Dynamic priority recalculation as project conditions change
- Visual priority indicators with actionable insights

### 2. Predictive Analytics
- Project health scoring with multi-factor analysis
- Resource utilization optimization
- Deadline risk assessment with early warning system

### 3. Comprehensive Financial Management
- Real-time budget tracking with visual analytics
- Automated expense categorization
- Spending pattern analysis with forecasting
- Task-level budget and expense management
- Expense receipt uploads and approval workflow

### 4. Proactive Project Management
- At-risk task identification before problems occur
- Progress rate monitoring with trend analysis
- Automated recommendations for project optimization

### 5. Enhanced Communication
- Task-level chat and threaded discussions
- Real-time updates and notifications

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

**Team 336:**
- Vedika Santosh Vangar
- Rudransh Vikram Singh  
- Girish V Bhat
- Aditya R

---

## 📞 Contact

For inquiries, please contact us at:
- 23f3000802@ds.study.litm.ac.in
- 21f3001328@ds.study.iitm.ac.in
- 21f1006862@ds.study.iitm.ac.in
- 23f2005217@ds.study.iitm.ac.in
