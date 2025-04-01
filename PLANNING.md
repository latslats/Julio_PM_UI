TaskFlow - Planning Document
1. Project Vision
To create a personal, modern, and efficient web application for managing projects and individual tasks. Key functionality includes robust time tracking for tasks, allowing users to start, pause, resume, and stop timers. The system should support tracking multiple tasks concurrently, provide a clear view of all currently running timers, and offer reporting capabilities on time spent and task completion.
2. Architecture Overview
The application follows a standard client-server architecture:
Frontend: A React single-page application (SPA) responsible for the user interface, user interactions, and communication with the backend API. It's built using Vite and styled with Tailwind CSS. State management is handled via React Context.
Backend: A Node.js/Express RESTful API that handles business logic, interacts with the database, and serves data to the frontend.
Database: A PostgreSQL database stores all application data (projects, tasks, time entries).
Containerization: Docker and Docker Compose are used to orchestrate the frontend (served by Nginx), backend, and database services for development and deployment consistency.
3. Tech Stack
Frontend:
Language: JavaScript
Framework/Library: React.js (v18+)
Build Tool: Vite
Styling: Tailwind CSS v3
Routing: react-router-dom v6
State Management: React Context API
Icons: react-icons
HTTP Client: fetch API (within ProjectContext)
Backend:
Language: JavaScript (Node.js)
Framework: Express.js
Database Client: pg (node-postgres)
Middleware: cors, express.json
Database: PostgreSQL (v16)
Web Server (Frontend): Nginx (Alpine)
Containerization: Docker, Docker Compose
4. Key Features
Current (Partially Implemented / Needs Polish)
Project CRUD (Create, Read, Update, Delete)
Task CRUD (within projects)
Basic Time Entry creation (Start)
Time Entry stopping (Stop)
Time Entry pause/resume (Backend logic exists, frontend integration needs verification/polish)
Dashboard overview (Stats, Recent Projects, Upcoming Tasks)
Project List view with filtering/search (Basic)
Project Detail view showing tasks and stats
Time Tracking page showing weekly overview and recent entries (Basic)
Reports page (UI placeholders exist)
Basic UI layout (Sidebar, Header)
Target / To Be Implemented/Polished
Reliable Pause/Resume: Ensure frontend accurately reflects and controls the pause/resume state managed by the backend.
Multiple Concurrent Timers: Allow users to start and track time for multiple tasks simultaneously.
View Running Timers: Implement a dedicated UI section (likely in TimeTrackingWidget or similar) to display all currently active (running or paused) timers.
Functional Reports: Replace placeholder charts/data on the Reports page with actual visualizations based on time entries and task data. Implement export functionality.
Full Frontend Functionality: Ensure all buttons, forms, and interactions work as expected, including validation and user feedback.
Polished UI/UX: Refine styles, transitions, and responsiveness based on the design principles.
Robust Filtering/Searching: Enhance filtering and searching capabilities on Projects and Time Tracking pages.
Settings Page: Implement actual user settings (if planned).
5. Design Style
Adhere to the principles outlined in .windsurfrules:
Elegant minimalism & functional design.
Soft, refreshing gradient colors.
Well-proportioned white space.
Light and immersive UX.
Clear information hierarchy (subtle shadows, modular cards).
Refined rounded corners.
Use react-icons for iconography.
6. Constraints & Decisions
Continue using the established Tech Stack.
State management primarily via ProjectContext. Evaluate if it needs refactoring for multiple active timers (Zustand or other lightweight libraries could be considered if Context becomes too complex).
Backend API remains RESTful.
Database schema might need minor adjustments to efficiently query active timers or support new reporting needs.
Focus on polishing existing frontend components and implementing missing backend logic to support target features.
7. Tools
Version Control: Git
Package Management: npm (as per package.json files)
Containerization: Docker Desktop / Docker Engine
