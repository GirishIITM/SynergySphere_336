# SynergySphere_336

SynergySphere is an advanced, intelligent team collaboration platform designed to help teams operate at their best—staying organized, communicating seamlessly, and making informed decisions. Built by Team 336.

## Application Flow
![Screenshot From 2025-05-18 17-20-38](https://github.com/user-attachments/assets/610b2a5a-b836-46d2-8ebc-11882fcf4349)



## Database Models
![diagram (1)](https://github.com/user-attachments/assets/77d447ee-bddc-4730-974e-9bcaf2534487)




## 🌟 Project Vision

SynergySphere is more than project management—it’s the collaboration engine behind our Odoo Hackathon entry. We’ve built a platform that anticipates bottlenecks, keeps everyone synced in real-time, and turns scattered tasks into a single, flowing workspace—whether you’re on desktop or mobile.

---

## 💡 Why SynergySphere?

SynergySphere was built to directly address the real challenges that teams face every day—challenges we experienced ourselves and set out to solve with a smarter, more supportive platform:

- No More Scattered Information: All your files, chats, tasks, and decisions live in one organized place. No more searching through endless emails or chat threads—everything you need is always at your fingertips.
- True Progress Visibility: Instantly see what’s done, what’s in progress, and what’s holding things up. Our dashboards and task boards give everyone a clear, real-time view of project status.
- Smart Resource Management: Assignments are always clear. SynergySphere helps prevent overload and confusion by making sure everyone knows their responsibilities and workload.
- Proactive Deadline Tracking: Never be surprised by a missed deadline again. Automated reminders and visual timelines keep your team ahead of schedule, surfacing potential issues before they become problems.
- Seamless Communication: Updates, discussions, and decisions stay connected to the work they’re about. No more missed messages or lost context—SynergySphere keeps everyone in the loop.
- Mobile & Desktop Ready: Whether you’re at your desk or on the go, SynergySphere’s responsive design ensures you can manage your work and collaborate with your team anywhere, anytime.

SynergySphere isn’t just another project management tool—it’s the intelligent backbone of your team’s collaboration, built to help you work smarter, stay aligned, and achieve more together.
---

## 🚀 Features

- User Authentication: Secure registration and login.
- Project Management: Create, view, and manage projects.
- Team Collaboration: Add team members to projects and assign tasks.
- Task Management: Assign tasks with due dates, statuses (To-Do, In Progress, Done), and priorities.
- Threaded Discussions: Communicate within each project context.
- Progress Visualization: See task status and project progress at a glance.
- Notifications: Get alerts for important events and deadlines.
- Mobile & Desktop Ready: Fully responsive UI for all devices.

---





## 🛠️ Tech Stack

<p align="center">
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original-wordmark.svg" alt="React" width="50" height="50"/>
  <img src="https://vitejs.dev/logo.svg" alt="Vite" width="50" height="50"/>
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg" alt="JavaScript" width="50" height="50"/>
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg" alt="Python" width="50" height="50"/>
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/flask/flask-original.svg" alt="Flask" width="50" height="50"/>
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/postgresql/postgresql-original-wordmark.svg" alt="PostgreSQL" width="50" height="50"/>
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/docker/docker-original.svg" alt="Docker" width="50" height="50"/>
</p>- Frontend: React, Vite, React Router, CSS Modules
- Backend: Flask, Flask-SQLAlchemy, Flask-Bcrypt, PyJWT
- Database: PostgreSQL (Production), SQLite (Development fallback)
- Authentication: JWT-based authentication
- Other: Python-dotenv, ESLint, psycopg2-binary

---

## 📱 MVP Wireframes & User Flow

- Login/Sign Up: Email/password fields, sign-up and forgot password options.
- Project Dashboard: List of projects, quick stats, and a button to create new projects.
- Project Detail: Task lists/boards, project-specific discussions.
- Task Board: Tasks with title, assignee, due date, and status. Add/edit tasks easily.
- Task Detail: View and edit all task details, including status and assignee.
- User Profile: View user info, logout, and manage basic settings.
- Mobile First: All screens are fully responsive for mobile and desktop.

---

Markdown

## 📦 Project Structure

SynergySphere_336/
├── backend/             # Backend application (Flask)
│   ├── app.py
│   ├── requirements.txt
│   └── ...
├── frontend/            # Frontend application (React)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── ...
│   ├── package.json
│   └── ...
├── .env
└── README.md

## ⚡ Getting Started

### Prerequisites

- Node.js & npm
- Python 3.x & pip
- PostgreSQL Server (for production)

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
# Set up your .env file with PostgreSQL credentials and secret keys
python app.py
```

### Frontend Setup

cd frontend
npm install
npm run dev
Visit [https://voluble-tapioca-bc2df4.netlify.app](https://voluble-tapioca-bc2df4.netlify.app) to view the app.

---

## 📄 API Overview

- Base URL: http://localhost:5000/api
- Authentication: POST /auth/register, POST /auth/login
- Projects: CRUD endpoints for projects
- Tasks: CRUD endpoints for tasks
- Users: User management endpoints

---





## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

- Team 336:
  - Vedika Santosh Vangar
  - Rudransh Vikram Singh
  - Girish V Bhat
  - Aditya R
  


---

## 📞 Contact

For inquiries, please contact us at 
-  23f3000802@ds.study.litm.ac.in
-  21f3001328@ds.study.iitm.ac.in
-  21f1006862@ds.study.iitm.ac.in
-  23f2005217@ds.study.iitm.ac.in
