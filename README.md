# Pugress Tracker - Project Management Application

A clean, effective, and modern project management application that allows users to manage projects, nested tasks, and track time spent on activities.

## Features

- **Project Management**: Create and manage projects with detailed progress tracking
- **Task Management**: Organize tasks within projects with priority levels and status tracking
- **Time Tracking**: Multiple concurrent timers with pause/resume functionality and auto-pause scheduling
- **Focus Mode**: Distraction-free environment for working on current tasks
- **Waiting Items**: Track external dependencies and blockers with timeline events and statistics
- **Reporting**: View analytics and reports on project progress and time spent with Redis caching
- **Auto-Pause**: Configurable automatic stopping of timers based on schedule (cron-based)

## Tech Stack

- **Frontend**: React.js with Vite, Tailwind CSS, Radix UI primitives
- **Backend**: Node.js with Express
- **Database**: PostgreSQL (production), SQLite (development)
- **Caching**: Redis with automatic invalidation
- **Containerization**: Docker

## Running Locally with Docker

The application includes both a frontend and a backend service, containerized using Docker.

### Prerequisites

- Docker and Docker Compose installed on your machine

### Environment Variables

Create a `.env` file in the project root with the following variables:

```
DATABASE_URL=postgresql://postgres:postgres@db:5432/taskflow
PORT=5001
NODE_ENV=development
REDIS_URL=redis://redis:6379
```

### Steps to Run

1. Clone this repository
2. Navigate to the project directory
3. Create the `.env` file with the environment variables listed above
4. Run the following command to build and start the services:

```bash
docker-compose up -d --build
```

5. Access the application frontend at http://localhost (served by Nginx)
6. The backend API will be running on http://localhost:5001
7. PostgreSQL database will be running on port 5432
8. Redis cache will be running on port 6379

### Stopping the Application

To stop the application and remove the containers, run:

```bash
docker-compose down
```

## Development Setup (without Docker)

If you prefer to run the application without Docker for development:

### Backend Setup

1. Navigate to the `/backend` directory
2. Install dependencies: `npm install`
3. Create a `.env` file with environment variables (uses SQLite for development)
4. Run the development server: `npm run dev` or `npm start`
5. Run tests: `npm test`

### Frontend Setup

1. Navigate to the `/frontend` directory
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev` (localhost:5173)
4. Build for production: `npm run build`
5. Preview production build: `npm run preview`

**Note**: The application automatically uses SQLite for local development and PostgreSQL for Docker/production environments. Database schema is initialized automatically on first run.

## API Documentation

The TaskFlow API is RESTful and uses JSON for request and response bodies.

### Base URL

```
http://localhost:5001/api
```

### Projects API

#### GET /api/projects

Retrieve all projects.

**Response**: Array of project objects

#### GET /api/projects/:id

Retrieve a specific project by ID.

**Response**: Project object

#### POST /api/projects

Create a new project.

**Request Body**:
```json
{
  "name": "Project Name",
  "description": "Project description",
  "client": "Client name",
  "color": "#FF5733",
  "startDate": "2025-04-01T00:00:00Z",
  "dueDate": "2025-05-01T00:00:00Z",
  "status": "in-progress"
}
```

**Response**: Created project object

#### PUT /api/projects/:id

Update an existing project.

**Request Body**: Same as POST, with fields to update

**Response**: Updated project object

#### DELETE /api/projects/:id

Delete a project.

**Response**: Success message

### Tasks API

#### GET /api/tasks

Retrieve all tasks. Can filter by projectId using query parameter.

**Query Parameters**:
- `projectId`: Filter tasks by project ID

**Response**: Array of task objects

#### GET /api/tasks/:id

Retrieve a specific task by ID.

**Response**: Task object

#### POST /api/tasks

Create a new task.

**Request Body**:
```json
{
  "projectId": "project-uuid",
  "title": "Task title",
  "description": "Task description",
  "status": "not-started",
  "priority": "medium",
  "dueDate": "2025-04-15T00:00:00Z",
  "estimatedHours": 4
}
```

**Response**: Created task object

#### PUT /api/tasks/:id

Update an existing task.

**Request Body**: Same as POST, with fields to update

**Response**: Updated task object

#### DELETE /api/tasks/:id

Delete a task.

**Response**: Success message

### Time Entries API

#### GET /api/time-entries

Retrieve time entries with flexible filtering.

**Query Parameters**:
- `taskId`: Filter by task ID
- `projectId`: Filter by project ID
- `active`: Set to 'true' to get only active time entries
- `limit`: Limit the number of results

**Response**: Array of time entry objects with enhanced information including:
- For active entries: `currentElapsedSeconds`, `formattedElapsed`, `isActive`
- For completed entries: `formattedDuration`, `isActive`

#### GET /api/time-entries/:id

Retrieve a specific time entry by ID.

**Response**: Time entry object

#### POST /api/time-entries/start

Start a new time entry for a task.

**Request Body**:
```json
{
  "taskId": "task-uuid"
}
```

**Response**: Created time entry object

#### PUT /api/time-entries/stop/:id

Stop a running time entry.

**Response**: Updated time entry object with duration and endTime

#### PUT /api/time-entries/pause/:id

Pause a running time entry.

**Response**: Updated time entry object with isPaused=true

#### PUT /api/time-entries/resume/:id

Resume a paused time entry.

**Response**: Updated time entry object with isPaused=false and updated lastResumedAt

#### DELETE /api/time-entries/:id

Delete a time entry.

**Response**: Success message

### Reports API

#### GET /api/reports/time-by-project

Get aggregated time data by project for a specific time range.

**Query Parameters**:
- `range`: Time range (week, month, last-week, last-month)

**Response**: Object with time data aggregated by project

#### GET /api/reports/time-by-task

Get aggregated time data by task for a specific time range.

**Query Parameters**:
- `range`: Time range (week, month, last-week, last-month)
- `projectId`: Optional filter by project ID

**Response**: Object with time data aggregated by task

#### GET /api/reports/daily-summary

Get daily time summary for a specific time range.

**Query Parameters**:
- `range`: Time range (week, month, last-week, last-month)

**Response**: Object with time data aggregated by day

### Waiting Items API

#### GET /api/waiting-items

Retrieve all waiting items. Can filter by projectId using query parameter.

**Query Parameters**:
- `projectId`: Filter by project ID

**Response**: Array of waiting item objects

#### GET /api/waiting-items/:id

Retrieve a specific waiting item by ID.

**Response**: Waiting item object

#### POST /api/waiting-items

Create a new waiting item.

**Request Body**:
```json
{
  "projectId": "project-uuid",
  "requestType": "Information",
  "priority": "high",
  "requestedFrom": "Client Name",
  "status": "pending",
  "sentDate": "2025-04-01T00:00:00Z",
  "deadlineDate": "2025-04-15T00:00:00Z",
  "notes": "Additional details about the request"
}
```

**Response**: Created waiting item object

#### PUT /api/waiting-items/:id

Update an existing waiting item.

**Request Body**: Same as POST, with fields to update

**Response**: Updated waiting item object

#### DELETE /api/waiting-items/:id

Delete a waiting item.

**Response**: Success message

## Design Principles

- **Elegant Minimalism**: Perfect balance between aesthetics and functionality
- **Soft Gradients**: Refreshing color palette that creates a light, immersive experience
- **Clear Information Hierarchy**: Using subtle shadows and modular card layouts
- **Natural Focus**: Core functionalities are highlighted with refined visual elements

## Architecture Overview

### Frontend (React + Vite)
- **State Management**: React Context API with three main contexts:
  - `ProjectContext` - Projects, tasks, and time entries
  - `NotificationContext` - Global toast notifications  
  - `WaitingItemContext` - External dependency tracking
- **UI Components**: Radix UI primitives in `src/components/ui/` with Tailwind CSS
- **Routing**: React Router with `MainLayout` wrapper for consistent navigation

### Backend (Node.js + Express)
- **Database**: Uses better-sqlite3 for development, PostgreSQL for production
- **Caching**: Redis for high-performance caching with automatic invalidation
- **Routes**: Modular structure in `/routes` directory (projects, tasks, timeEntries, waitingItems, reports, settings)
- **Auto-initialization**: Database schema created automatically on startup
- **Cron Jobs**: Auto-pause functionality runs via node-cron based on settings

### Caching Strategy
- **Redis-based caching** for all API endpoints with smart TTL configuration
- **Active timer states** cached for real-time performance (30s TTL)
- **Project/task metadata** cached with moderate TTL (2-5 minutes)
- **Reports and statistics** cached with longer TTL (30 minutes)
- **Automatic cache invalidation** on CRUD operations
- **Graceful degradation** when Redis is unavailable

## Project Structure

```
src/components/
├── ui/           # Radix UI primitives (Button, Card, Dialog, etc.)
├── common/       # Shared components (LoadingSpinner, BackButton, etc.) 
├── layouts/      # Layout wrappers (MainLayout)
├── navigation/   # Header and Sidebar components
└── [feature]/    # Feature-specific components (projects, tasks, timeTracking, etc.)
```

- `/frontend`: React application (Vite + React)
- `/backend`: Node.js/Express API with Redis caching
- `/database`: Database migrations and seed data
- `docker-compose.yml`: Docker service definitions including Redis
- `CLAUDE.md`: Development guidance and commands
