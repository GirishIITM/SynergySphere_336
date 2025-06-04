# SynergySphere Project Planning

## Project Overview
SynergySphere is a project collaboration and management platform built with Flask backend and modern frontend technologies.

## Architecture

### Backend Structure
- **Framework**: Flask with SQLAlchemy ORM
- **Database**: SQLite (for development)
- **Caching**: Redis/Valkey (optional, graceful fallback)
- **API Design**: RESTful endpoints with JSON responses

### Directory Structure
```
backend/
├── app.py              # Main Flask application
├── config.py           # Configuration settings
├── extensions.py       # Flask extensions (db, login_manager, etc.)
├── models/            # Database models
├── routes/            # API route blueprints
├── services/          # Business logic layer
├── utils/             # Utility functions
└── tests/             # Unit tests
```

### Route Modules
- `auth.py` - Authentication and user management
- `main.py` - Core application routes
- `profile.py` - User profile management
- `project.py` - Project CRUD operations
- `task.py` - Task management
- `message.py` - Messaging system
- `notification.py` - Notification handling
- `dashboard.py` - Dashboard analytics and metrics
- `analytics.py` - Advanced analytics and reporting
- `cache_management.py` - Cache operations
- `redis.py` - Redis operations

## Style Guidelines

### Python Code Standards
- Follow PEP8 formatting
- Use type hints for all functions
- Format with `black`
- Use `pydantic` for data validation
- Write Google-style docstrings

### File Size Limits
- **Maximum 500 lines per file**
- Refactor into modules when approaching limit

### Testing Requirements
- Pytest for unit testing
- Tests in `/tests` directory mirroring app structure
- Minimum test coverage: expected use, edge case, failure case

### Import Conventions
- Prefer relative imports within packages
- Clear, consistent import organization

## Database Design
- SQLAlchemy/SQLModel for ORM
- Pydantic models for validation
- Database migrations support

## Goals
1. Scalable project collaboration platform
2. Real-time communication features
3. Advanced analytics and reporting
4. Robust caching layer
5. Comprehensive test coverage

## Constraints
- Keep modules focused and under 500 lines
- Maintain clean separation of concerns
- Ensure graceful fallbacks for optional services
- Follow consistent naming conventions 