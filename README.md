# TaskFlow - Project Management Application

A clean, effective, and modern project management application that allows users to manage projects, nested tasks, and track time spent on activities.

## Features

- **Project Management**: Create and manage projects with detailed progress tracking
- **Task Management**: Organize tasks within projects with priority levels and status tracking
- **Time Tracking**: Track time spent on individual tasks with start/stop functionality
- **Reporting**: View analytics and reports on project progress and time spent

## Tech Stack

- **Frontend**: React.js with Tailwind CSS (via CDN)
- **Backend**: Node.js with Express
- **Database**: SQLite
- **Containerization**: Docker

## Running Locally with Docker

The application includes both a frontend and a backend service, containerized using Docker.

### Prerequisites

- Docker and Docker Compose installed on your machine

### Steps to Run

1. Clone this repository
2. Navigate to the project directory
3. Run the following command to build and start both the frontend and backend services:

```bash
docker-compose up -d --build
```

4. Access the application frontend at http://localhost (served by Nginx)
5. The backend API will be running on http://localhost:5001

### Stopping the Application

To stop the application and remove the containers, run:

```bash
docker-compose down
```

## Design Principles

- **Elegant Minimalism**: Perfect balance between aesthetics and functionality
- **Soft Gradients**: Refreshing color palette that creates a light, immersive experience
- **Clear Information Hierarchy**: Using subtle shadows and modular card layouts
- **Natural Focus**: Core functionalities are highlighted with refined visual elements

## Project Structure

- `/frontend`: React application (served via Nginx)
  - `/src`: Frontend source code
- `/backend`: Node.js/Express API
  - `/database.js`: SQLite database setup
  - `/routes`: API route definitions
  - `/server.js`: Express server configuration
- `docker-compose.yml`: Docker service definitions
- `Dockerfile`: Frontend Docker build instructions
