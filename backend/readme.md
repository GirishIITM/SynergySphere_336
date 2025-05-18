# SynergySphere - Advanced Team Collaboration Platform

## Overview
SynergySphere is an intelligent team collaboration platform designed to revolutionize how teams think, communicate, and work together. Going beyond traditional project management tools, SynergySphere serves as the intelligent backbone for teams, facilitating seamless organization, enhanced communication, and effective resource management.

## Mission
Our mission is to be the central nervous system for team collaboration. SynergySphere proactively streamlines tasks and communication while identifying potential issues early, helping teams stay ahead rather than being reactive. We create a supportive, insightful, and seamless experience that naturally integrates into your team's workflow.

## Pain Points We Solve
SynergySphere addresses critical challenges faced by modern teams:

- **Scattered Information**: No more hunting through multiple locations for files, chats, and decisions
- **Progress Tracking**: Clear visibility into task progress and project status
- **Resource Management**: Smart task assignment preventing overload and confusion
- **Deadline Management**: Proactive deadline tracking and early issue identification
- **Communication Clarity**: Centralized project communication ensuring no team member misses updates

## Key Features (MVP)
- User authentication system with registration and login
- Comprehensive project creation and management
- Team member management and role assignment
- Task management with due dates and status tracking
- Project-specific communication channels
- Intuitive task progress visualization
- Real-time notifications for important events

## Technical Stack

### Frontend
- **ReactJS**: For building a dynamic and responsive user interface
- Modern UI components and state management
- Responsive design for all device sizes

### Backend
- **Flask**: Lightweight and flexible Python web framework
- RESTful API architecture
- JWT authentication
- SQLAlchemy ORM

### Database
- **SQLite**: Efficient file-based database system
- Suitable for MVP phase with easy scaling options

## Installation

### Prerequisites
- Python 3.x
- Node.js and npm
- Git

### Backend Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/SynergySphere_336.git
   cd SynergySphere_336/backend
   ```

2. Create and activate virtual environment:
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # Linux/macOS
   python -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Initialize the database:
   ```bash
   python init_db.py
   ```

5. Start the Flask server:
   ```bash
   python app.py
   ```

### Frontend Setup
1. Navigate to frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## Usage Guide

### Getting Started
1. Access the application at `http://localhost:3000`
2. Register a new account or log in with existing credentials
3. Create your first project and add team members

### Project Management
- Create new projects with detailed descriptions
- Add team members and assign roles
- Set project milestones and deadlines

### Task Management
- Create tasks with titles, descriptions, and due dates
- Assign tasks to team members
- Track task progress and update status
- Add comments and attachments to tasks

### Communication
- Use project-specific chat channels
- Share updates and files
- Mention team members using @username
- Receive notifications for important events

## Contributing
We welcome contributions to SynergySphere! Here's how you can help:

1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. Commit your changes:
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. Push to the branch:
   ```bash
   git push origin feature/AmazingFeature
   ```
5. Open a Pull Request

### Coding Standards
- Follow PEP 8 guidelines for Python code
- Use ESLint configuration for JavaScript code
- Write clear commit messages
- Include tests for new features
- Update documentation as needed

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Screenshots
[Coming Soon] Visual overview of key features and interfaces:
- Project Dashboard
- Task Management Interface
- Team Communication Channels
- Progress Tracking Views

## Support
For support, please open an issue in the GitHub repository or contact the development team.

---

Built with ❤️ by Team 336