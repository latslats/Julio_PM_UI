# TaskFlow - Project Management Application

A clean, effective, and modern project management application that allows users to manage projects, nested tasks, and track time spent on activities.

## Features

- **Project Management**: Create and manage projects with detailed progress tracking
- **Task Management**: Organize tasks within projects with priority levels and status tracking
- **Time Tracking**: Track time spent on individual tasks with start/stop functionality
- **Reporting**: View analytics and reports on project progress and time spent

## Tech Stack

- **Frontend**: React.js with Tailwind CSS
- **Containerization**: Docker

## Running Locally with Docker

The application is configured to run as a standalone frontend application in Docker with no authentication required.

### Prerequisites

- Docker and Docker Compose installed on your machine

### Steps to Run

1. Clone this repository
2. Navigate to the project directory
3. Run the following command:

```bash
docker-compose up -d
```

4. Access the application at http://localhost

### Stopping the Application

To stop the application, run:

```bash
docker-compose down
```

## Design Principles

- **Elegant Minimalism**: Perfect balance between aesthetics and functionality
- **Soft Gradients**: Refreshing color palette that creates a light, immersive experience
- **Clear Information Hierarchy**: Using subtle shadows and modular card layouts
- **Natural Focus**: Core functionalities are highlighted with refined visual elements

## Project Structure

- `/frontend`: React application with Tailwind CSS styling
  - `/src/components`: Reusable UI components
  - `/src/pages`: Main application pages
  - `/src/context`: React context for state management

## Mock Data

The application uses built-in mock data for demonstration purposes, allowing you to interact with all features without needing a backend or database.
