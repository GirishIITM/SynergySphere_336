# SynergySphere Project Planning

## Architecture Overview
- **Backend**: Flask with SQLAlchemy, JWT authentication
- **Frontend**: React with Vite, modern UI components
- **Database**: SQLite for development, PostgreSQL for production
- **Authentication**: JWT-based with user roles and project memberships

## Current Models
- User: User management with roles and permissions
- Project: Project management with member relationships
- Task: Task management with assignments and status tracking
- Message: Project-level messaging/chat
- Notification: User notifications
- TaskAttachment: File attachments for tasks

## API Patterns
- REST endpoints following `/resource/<id>/action` pattern
- JWT authentication required for all protected routes
- Consistent error handling with appropriate HTTP status codes
- Caching with TTL for performance optimization

## Frontend Structure
- Pages organized under `/src/pages/`
- Reusable components in `/src/components/`
- API calls centralized in `/src/utils/apiCalls/`
- Styling with CSS modules and modern CSS

## Development Constraints
- Files should not exceed 500 lines
- Use consistent naming conventions
- All functions require Google-style docstrings
- Type hints required for Python functions
- Unit tests required for all new features

## Tech Stack
- Backend: Flask, SQLAlchemy, Flask-JWT-Extended, APScheduler
- Frontend: React, Vite, Lucide React (icons), Recharts (analytics)
- Styling: Modern CSS with component-based approach
- Testing: Pytest for backend, Jest for frontend 