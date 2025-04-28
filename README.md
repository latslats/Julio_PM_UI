# Pugress Tracker - Project Management Application

A clean, effective, and modern project management application that allows users to manage projects, nested tasks, and track time spent on activities.

## Features

- **Project Management**: Create and manage projects with detailed progress tracking
- **Task Management**: Organize tasks within projects with priority levels and status tracking
- **Time Tracking**: Track time spent on individual tasks with start/stop/pause/resume functionality
- **Multiple Concurrent Timers**: Track time on multiple tasks simultaneously
- **Focus Mode**: Distraction-free environment with persistent status indicators
- **Pomodoro Timer**: Structured work sessions with customizable breaks
- **Waiting-On Management**: Track external dependencies and requests with timeline events and statistics
- **Reporting**: View analytics and reports on project progress and time spent

## Tech Stack

- **Frontend**: React.js with Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
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
3. Create a `.env` file with the DATABASE_URL pointing to your local PostgreSQL instance
4. Run the development server: `npm run dev`

### Frontend Setup

1. Navigate to the `/frontend` directory
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`

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

## Focus Mode & Pomodoro Timer

### Focus Mode

The Focus Mode feature provides a distraction-free environment for users to concentrate on their tasks:

- **Toggle Interface**: Switch between standard dashboard and focus mode with a single click
- **Persistent Status**: Focus mode status is clearly indicated in the dashboard header
- **Task Concentration**: Simplified interface that highlights only active tasks
- **Independent Operation**: Focus mode can be used with or without the Pomodoro timer

### Pomodoro Timer

The Pomodoro technique is a time management method that uses timed work sessions separated by short breaks:

- **Work Sessions**: Default 25-minute focused work periods
- **Short Breaks**: 5-minute breaks between work sessions
- **Long Breaks**: 15-minute breaks after completing 4 work sessions
- **Visual Timer**: Clear countdown display with session information
- **Controls**: Intuitive buttons for start/stop, pause/resume, and reset
- **Notifications**: Audio alerts when sessions end
- **Persistent Display**: Timer remains visible in dashboard when active, even outside focus mode

### Integration with Time Tracking

- Both features work seamlessly with the task time tracking system
- Multiple task timers can run concurrently with the pomodoro timer
- Pause/resume functionality works independently for both systems

## Design Principles

- **Elegant Minimalism**: Perfect balance between aesthetics and functionality
- **Soft Gradients**: Refreshing color palette that creates a light, immersive experience
- **Clear Information Hierarchy**: Using subtle shadows and modular card layouts
- **Natural Focus**: Core functionalities are highlighted with refined visual elements

## Project Structure

- `/frontend`: React application (served via Nginx)
  - `/src`: Frontend source code
    - `/components`: Reusable UI components
    - `/context`: React Context API state management
    - `/pages`: Application pages/routes
    - `/utils`: Utility functions
- `/backend`: Node.js/Express API
  - `/routes`: API route definitions
  - `/controllers`: Business logic for routes
  - `/models`: Database models
  - `/utils`: Utility functions
  - `/database.js`: PostgreSQL database setup
  - `/server.js`: Express server configuration
- `/database`: Database migrations and seed data
- `docker-compose.yml`: Docker service definitions
- `Dockerfile`: Docker build instructions
