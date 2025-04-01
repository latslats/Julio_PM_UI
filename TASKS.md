# TaskFlow - Task List
## Current Focus (High Priority)
- Polish Frontend: Ensure existing features (CRUD operations, basic time tracking display) are fully functional and provide user feedback (loading states, success/error messages).
- ~~Implement Backend Logic: Complete and verify backend functions, especially for pause/resume and accurately calculating duration and totalPausedDuration for time entries.~~ (Completed 2025-04-01)
- ~~Reliable Pause/Resume: Connect frontend controls in TimeTrackingWidget and TaskItem to the backend pause/resume API endpoints and ensure the UI state updates correctly.~~ (Completed 2025-04-01)
## Backlog / To-Do
### Frontend
[Feature] Waiting-On UI:
Design UI within ProjectDetail (or new section) to display "Waiting-On" items based on the provided Notion example.
Create components for: Request Info, Timeline, Stats, Attachments/Notes sections.
Implement Modals/Forms for creating/editing "Waiting-On" items.
Integrate API calls into ProjectContext (or new context) for "Waiting-On" data.
[Enhancement] Settings Page:
Implement the /settings route and page functionality (if required).
[Polish] UI/UX:
Add loading indicators for asynchronous operations (API calls).
Implement success/error notifications for user actions (e.g., creating/updating/deleting items).
Review and improve form validation (e.g., prevent submitting empty required fields).
Ensure consistent styling and responsiveness across all pages and components.
[Refactor] ProjectContext:
Review apiRequest helper to potentially use axios consistently if preferred, or stick with fetch.
Evaluate if Context API is sufficient for managing multiple active timers or if a more robust state management solution (like Zustand) is needed.
### Backend
[Feature] Waiting-On API:
Create API endpoints for CRUD operations on waiting_items (e.g., /api/projects/:projectId/waiting-items, /api/waiting-items/:itemId).
Create endpoints for managing timeline events (if using a separate table).
Add backend logic to calculate stats like "Time Waiting".
~~[Core] Pause/Resume Logic:~~
~~Thoroughly test the /pause and /resume endpoints.~~
~~Ensure totalPausedDuration is calculated and stored correctly in seconds.~~
~~Ensure lastResumedAt is updated correctly.~~ (Completed 2025-04-01)
~~[Core] Stop Logic:~~
~~Verify that the final duration calculation in the /stop endpoint correctly accounts for the last running segment and the totalPausedDuration.~~ (Completed 2025-04-01)
[API] Fetch Active Timers:
Ensure the GET /api/time-entries endpoint can efficiently filter and return all entries where endTime IS NULL.
[API] Reporting Endpoints (Optional):
Consider adding dedicated endpoints to provide aggregated data for the reports page to simplify frontend logic (e.g., /api/reports/time-by-project?range=week).
[Enhancement] Validation:
Add explicit checks in POST /api/time-entries/start to ensure the provided taskId exists in the tasks table before inserting. (Partially done via FK constraint, but explicit check is better for user feedback).
Add similar checks for projectId in task creation/updates.
Add validation for "Waiting-On" item creation/updates.
[Enhancement] Error Handling:
Provide more specific error messages from the API (e.g., "Task not found" instead of just "Internal Server Error" where appropriate).
### Database
[Feature] Waiting-On Schema:
Design and create a new table (e.g., waiting_items) linked to projects.
Define columns: id, projectId, requestType, priority, requestedFrom, status, sentDate, deadlineDate, receivedDate, notes, link (optional).
Consider a related table for timeline events (waiting_timeline_events).
~~[Review] time_entries Schema:~~
~~Confirm duration and totalPausedDuration units are consistently seconds (as implied by calculations).~~
~~Ensure TIMESTAMPTZ is appropriate for all date/time fields.~~ (Completed 2025-04-01)
### General
[Testing] Unit Tests:
Write unit tests for backend route handlers and helper functions (including new "Waiting-On" endpoints).
Write unit/integration tests for key frontend components and context logic (including new "Waiting-On" UI).
[Documentation] README:
Update README.md with detailed API endpoint descriptions (including new "Waiting-On" endpoints).
Add instructions for setting up the development environment (if different from Docker).
Clarify environment variables needed (DATABASE_URL, PORT, etc.).
## Completed (2025-04-01)
[Enhancement] Pause/Resume UI:
Enhanced TimeTrackingWidget, RunningTimersWidget, and TaskItem components to properly handle pause/resume functionality.
Added loading indicators and user feedback for pause/resume/stop actions.
Ensured proper state updates after pause/resume actions.

[Enhancement] Backend Time Tracking:
Improved pause/resume/stop logic to ensure accurate duration calculations.
Added pausedAt column to time_entries table to track when a timer was paused.
Enhanced error handling and validation for time tracking operations.
Added detailed logging for debugging time tracking operations.
[Feature] View Running Timers:
Created a new RunningTimersWidget component to list all active time entries.
Implemented display of task name, project name, and elapsed time for each running timer.
Added controls to pause/resume/stop directly from the list.
Added automatic refresh functionality to keep the list up-to-date.
[Feature] Multiple Concurrent Timers:
Modified ProjectContext state and logic to handle multiple active time entries.
Updated UI (TaskItem, TimeTrackingWidget) to allow starting a new timer even if others are running.
Ensured the "View Running Timers" feature correctly displays all active timers.
[Feature] Functional Reports:
Integrated react-chartjs-2 library into Reports.jsx with multiple chart components.
Implemented data processing to display meaningful charts (time per project, task completion trends).
Added export functionality to download report data as CSV.
[Enhancement] Backend API:
Enhanced the GET /api/time-entries endpoint to support filtering for active timers.
Added more detailed information about tasks and projects in the API response.
[Enhancement] Time Tracking Page:
Implemented full functionality for the date range selector.
Implemented full functionality for the project filter dropdown.
Implemented the general filter button functionality ().
Ensured search works correctly across task titles, project names, and notes.
[Polish] UI/UX:
Added loading indicators for asynchronous operations (API calls).
Implemented success/error notifications for user actions (e.g., creating/updating/deleting items).
Basic Project CRUD API & Frontend Integration
Basic Task CRUD API & Frontend Integration
Initial Time Entry Start/Stop API & Frontend Integration
Docker setup for Frontend, Backend, and Database
Basic Frontend Routing and Layout
(Add items here as they are completed)
