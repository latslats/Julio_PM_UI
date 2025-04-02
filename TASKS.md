# TaskFlow - Task List
## Current Focus (High Priority)
## Backlog / To-Do
### Frontend
[Polish] UI/UX:
Ensure consistent styling and responsiveness across all pages and components.
[Refactor] ProjectContext:
Review apiRequest helper to potentially use axios consistently if preferred, or stick with fetch.
Evaluate if Context API is sufficient for managing multiple active timers or if a more robust state management solution (like Zustand) is needed.
### Backend
### Database
### General
## Completed (2025-04-02)
- [Enhancement] Settings Page & API:
  - Created `settings` table in PostgreSQL with columns for `auto_pause_enabled` (boolean) and `auto_pause_time` (time).
  - Added default settings row insertion during database initialization.
  - Implemented backend API endpoints (`GET /api/settings`, `PUT /api/settings`) to fetch and update settings.
  - Added `node-cron` dependency and implemented a scheduled job in `server.js` to check settings and auto-pause running timers every minute based on the configured time.
  - Ensured the `/settings` route exists in the frontend `App.jsx`.
  - Created the `frontend/src/pages/SettingsPage.jsx` component to fetch settings, display controls (toggle, time input), and save changes via the API.
  - Ensured the Settings link exists in the `Sidebar.jsx`.
- [Backend] Waiting Items Validation: Enhanced validation for waiting items API including:
  - Comprehensive field validation for required fields and formats
  - Date relationship validation (sent date, deadline date, received date)
  - Project existence verification
  - Timeline event validation
  - Detailed error messages with specific validation failures
  - Unit tests for all validation scenarios

- [Documentation] README: Updated README.md with comprehensive documentation including:
  - Detailed API endpoint descriptions for all routes (projects, tasks, time entries, reports, waiting items)
  - Request/response examples for all endpoints
  - Environment variable requirements and setup instructions
  - Development setup instructions (with and without Docker)
  - Improved project structure documentation

- [Testing] Unit Tests: Implemented comprehensive unit tests for backend route handlers and helper functions, including:
  - Time entries routes (start, stop, pause, resume, filtering)
  - Tasks routes (CRUD operations with validation)
  - Reports routes (time aggregation by project, task, and daily summaries)
  - Waiting items routes (CRUD operations with validation)
  - Error handling and edge cases
  - Proper test setup with database mocking

## Completed (2025-04-01)
- [API] Fetch Active Timers: Enhanced the GET /api/time-entries endpoint to efficiently filter and return all entries where endTime IS NULL, with real-time duration calculations and formatted time values.
- [API] Reporting Endpoints: Added dedicated endpoints to provide aggregated data for the reports page to simplify frontend logic, including /api/reports/time-by-project, /api/reports/time-by-task, and /api/reports/daily-summary with flexible date range filtering.
- [Enhancement] Validation: Added explicit checks in POST /api/time-entries/start to ensure the provided taskId exists in the tasks table before inserting.
- [Enhancement] Validation: Added similar checks for projectId in task creation/updates.
- [Enhancement] Error Handling: Provided more specific error messages from the API (e.g., "Task not found" instead of just "Internal Server Error" where appropriate).
- Polish Frontend: Ensure existing features (CRUD operations, basic time tracking display) are fully functional and provide user feedback (loading states, success/error messages).
- Implement Backend Logic: Complete and verify backend functions, especially for pause/resume and accurately calculating duration and totalPausedDuration for time entries.
- Reliable Pause/Resume: Connect frontend controls in TimeTrackingWidget and TaskItem to the backend pause/resume API endpoints and ensure the UI state updates correctly.
- [Feature] Waiting-On UI: Design UI within ProjectDetail (or new section) to display "Waiting-On" items based on the provided Notion example.
- Create components for: Request Info, Timeline, Stats, Attachments/Notes sections.
- Implement Modals/Forms for creating/editing "Waiting-On" items.
- Integrate API calls into ProjectContext (or new context) for "Waiting-On" data.
- Add loading indicators for asynchronous operations (API calls).
- Implement success/error notifications for user actions (e.g., creating/updating/deleting items).
- Review and improve form validation (e.g., prevent submitting empty required fields).
- [Feature] Waiting-On API: Create API endpoints for CRUD operations on waiting_items (e.g., /api/projects/:projectId/waiting-items, /api/waiting-items/:itemId).
- Create endpoints for managing timeline events (if using a separate table).
- Add backend logic to calculate stats like "Time Waiting".
- [Core] Pause/Resume Logic: Thoroughly test the /pause and /resume endpoints.
- Ensure totalPausedDuration is calculated and stored correctly in seconds.
- Ensure lastResumedAt is updated correctly.
- [Core] Stop Logic: Verify that the final duration calculation in the /stop endpoint correctly accounts for the last running segment and the totalPausedDuration.
- [Feature] Waiting-On Schema: Design and create a new table (e.g., waiting_items) linked to projects.
- Define columns: id, projectId, requestType, priority, requestedFrom, status, sentDate, deadlineDate, receivedDate, notes, link (optional).
- Consider a related table for timeline events (waiting_timeline_events).
- [Review] time_entries Schema: Confirm duration and totalPausedDuration units are consistently seconds (as implied by calculations).
- Ensure TIMESTAMPTZ is appropriate for all date/time fields.
- [Feature] Waiting-On Implementation: Created database schema for waiting_items and waiting_timeline_events tables
- Implemented backend API endpoints for CRUD operations on waiting items and timeline events
- Created a WaitingItemContext for managing waiting item state and API calls
- Developed WaitingItems page for listing and filtering waiting items
- Implemented WaitingItemDetail page for viewing and managing a single waiting item
- Created components for displaying waiting item cards, statistics, and forms
- Added timeline functionality for tracking the history of waiting items
- Integrated with existing project data for seamless navigation
- Implemented comprehensive form validation and error handling
- [Bug Fix] Reports Page: Fixed the Reports page to use real data in the detailed data section instead of static mock data
- Updated insights section to reflect actual project and task data
- Improved data formatting and display for time entries, projects, and tasks
- Enhanced the user experience with accurate reporting information
- [Enhancement] Form Validation and User Feedback: Enhanced project creation/editing forms with comprehensive validation (required fields, character limits, date relationships).
- Improved task creation/editing forms with validation for title, estimated hours, and due dates.
- Added loading indicators for all form submissions and CRUD operations.
- Implemented clear error messages for validation and API errors.
- Added character count for description fields.
- Enhanced delete confirmation with loading state and error handling.
- [Enhancement] Pause/Resume UI: Enhanced TimeTrackingWidget, RunningTimersWidget, and TaskItem components to properly handle pause/resume functionality.
- Added loading indicators and user feedback for pause/resume/stop actions.
- Ensured proper state updates after pause/resume actions.
- [Enhancement] Backend Time Tracking: Improved pause/resume/stop logic to ensure accurate duration calculations.
- Added pausedAt column to time_entries table to track when a timer was paused.
- Enhanced error handling and validation for time tracking operations.
- Added detailed logging for debugging time tracking operations.
- [Feature] View Running Timers: Created a new RunningTimersWidget component to list all active time entries.
- Implemented display of task name, project name, and elapsed time for each running timer.
- Added controls to pause/resume/stop directly from the list.
- Added automatic refresh functionality to keep the list up-to-date.
- [Feature] Multiple Concurrent Timers: Modified ProjectContext state and logic to handle multiple active time entries.
- Updated UI (TaskItem, TimeTrackingWidget) to allow starting a new timer even if others are running.
- Ensured the "View Running Timers" feature correctly displays all active timers.
- [Feature] Functional Reports: Integrated react-chartjs-2 library into Reports.jsx with multiple chart components.
- Implemented data processing to display meaningful charts (time per project, task completion trends).
- Added export functionality to download report data as CSV.
- [Enhancement] Backend API: Enhanced the GET /api/time-entries endpoint to support filtering for active timers.
- Added more detailed information about tasks and projects in the API response.
- [Enhancement] Time Tracking Page: Implemented full functionality for the date range selector.
- Implemented full functionality for the project filter dropdown.
- Implemented the general filter button functionality ().
- Ensured search works correctly across task titles, project names, and notes.
- [Polish] UI/UX: Added loading indicators for asynchronous operations (API calls).
- Implemented success/error notifications for user actions (e.g., creating/updating/deleting items).
- Basic Project CRUD API & Frontend Integration
- Basic Task CRUD API & Frontend Integration
- Initial Time Entry Start/Stop API & Frontend Integration
- Docker setup for Frontend, Backend, and Database
- Basic Frontend Routing and Layout
