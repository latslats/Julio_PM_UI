# TaskFlow - Task List
## Current Focus (High Priority)
## Backlog / To-Do
### Backend
### Database
### General
### UI Overhaul (iOS-Inspired Minimalism with shadcn/ui) - 2025-04-03

**Phase 1: Setup & Core Elements**
- [x] Setup `shadcn/ui` (init command) - 2025-04-02
- [ ] Define base styles (colors, typography) in Tailwind config and global CSS
- [x] Configure `Inter` font in Tailwind config - 2025-04-02
- [x] Add `shadcn/ui` Button component - 2025-04-02
- [x] Refactor `Button` usage in `Projects.jsx` (New Project button, +2 others) - 2025-04-03
- [x] Refactor other prominent `Button` instances (e.g., forms, modals) - 2025-04-03 (Includes TaskItem, SettingsPage, TimeTrackingWidget, ProjectDetail, WaitingItemForm, Header)
- [x] Add `shadcn/ui` Input component - 2025-04-03
- [x] Refactor `Input` usage (e.g., search bars, forms) - 2025-04-03 (Includes Projects, ProjectDetail, WaitingItems, SettingsPage, WaitingItemForm, Header, TaskItem)
- [x] Add `shadcn/ui` Checkbox component - 2025-04-03
- [x] Refactor `Checkbox` usage - 2025-04-03 (TaskItem)
- [x] Add `shadcn/ui` Switch component - 2025-04-03
- [x] Refactor `Switch` usage (e.g., Settings page) - 2025-04-03
- [x] Add `shadcn/ui` Card component - 2025-04-03
- [x] Refactor `Card` usage (e.g., `ProjectCard`, `Dashboard` cards) - 2025-04-03
- [x] Add `shadcn/ui` Textarea component - 2025-04-03 (Implied by Input refactoring)
- [x] Refactor `Textarea` usage - 2025-04-03 (Projects, ProjectDetail, WaitingItemForm, TaskItem)
- [x] Add `shadcn/ui` Select component - 2025-04-03 (Implied by Input refactoring)
- [x] Refactor `Select` usage - 2025-04-03 (Projects, ProjectDetail, WaitingItems, WaitingItemForm, TaskItem)
- [x] Add `shadcn/ui` AlertDialog component - 2025-04-03 (ProjectDetail delete)
- [x] Add `shadcn/ui` Calendar/Popover components - 2025-04-03 (WaitingItemForm, TaskItem)
- [x] Add `shadcn/ui` DropdownMenu component - 2025-04-03 (TaskItem)
- [x] Add `shadcn/ui` Label component - 2025-04-03 (Used across forms)

**Phase 2: Page Layouts & Containers**
- [x] Refactor `Dashboard.jsx` layout using new components & principles - 2025-04-03
- [x] Refactor `Projects.jsx` layout - 2025-04-03
- [x] Refactor `ProjectDetail.jsx` layout - 2025-04-03
- [x] Refactor `SettingsPage.jsx` layout - 2025-04-03
- [x] Add `shadcn/ui` Dialog component - 2025-04-03 (Added during Projects.jsx refactor)
- [x] Refactor existing modals to use `Dialog` - 2025-04-03 (Projects.jsx modal done, ProjectDetail modals done)
- [x] Add `shadcn/ui` Toast component - 2025-04-03
- [x] Implement `Toast` for notifications (SettingsPage, ProjectDetail) - 2025-04-03

**Phase 3: Complex Components & Navigation**
- [x] Refactor `TimeTrackingWidget.jsx` - 2025-04-03
- [ ] Refactor Tables (if any) using `shadcn/ui Table` (add component first) - Skipped (None Found)
- [x] Refactor Sidebar navigation (`Sidebar.jsx`) - 2025-04-03
- [x] Refactor Header (`Header.jsx`) - 2025-04-03
- [x] Evaluate/Implement iOS-style Segmented Control (custom or adapt `RadioGroup`/`ToggleGroup`) - 2025-04-03 (Implemented using ToggleGroup on Dashboard)

**Phase 4: Polish & Refinement**
- [ ] Review UI consistency across all pages/components
- [ ] Add subtle animations/transitions where appropriate
- [ ] Test responsiveness thoroughly
- [ ] Perform accessibility check

## Discovered During Work (2025-04-03)
- Refactored `AlertDialog` for delete confirmation in `ProjectDetail.jsx`.
- Refactored date inputs using `Calendar` and `Popover` in `WaitingItemForm.jsx` and `TaskItem.jsx`.
- Refactored dropdown menu using `DropdownMenu` in `TaskItem.jsx`.
- Added and used `Label` component across forms.
- Added `Textarea` and `Select` components and refactored their usage (these weren't explicitly listed in Phase 1 initially).
- Refactored remaining buttons missed in initial pass (`TaskItem`, `SettingsPage`, `TimeTrackingWidget`, `ProjectDetail`, `WaitingItemForm`, `Header`).
- Refactored `Card` usage in `ProjectCard.jsx` and `WaitingItemCard.jsx`. - 2025-04-03

## Completed (2025-04-02)
- [Enhancement] Dashboard UI/UX:
  - Redesigned dashboard layout with a more modern and minimalistic approach
  - Improved stats cards with cleaner design and hover effects
  - Enhanced project cards with better spacing, typography, and visual hierarchy
  - Redesigned time tracking widget with improved visual appeal
  - Added subtle animations and transitions for a more polished experience
  - Maintained all existing functionality while improving the visual design

## Completed (2025-04-02)
- [Bug Fix] Project and Task Display:
  - Fixed the estimated hours display in projects to properly format and sum all task hours
  - Added timer status indicators to tasks to show when a task has an active timer (running or paused)
  - Enhanced running timer display to show real-time elapsed time in HH:MM:SS format
  - Added tracked hours display to project details to show total completed time entries

## Completed (2025-04-02)
- [Cleanup] Time Tracking Page:
  - Removed the /time-tracking page and route from the application
  - Removed the Time Tracking link from the sidebar navigation
  - Removed unused RunningTimersWidget component
  - Kept TimeTrackingWidget as it's still used in the Dashboard
- [Polish] UI/UX:
  - Ensured consistent styling and responsiveness across all pages and components.
  - Updated SettingsPage to use consistent styling patterns with the rest of the application.
  - Standardized loading indicators across all pages.
  - Improved error handling UI for consistency.
  - Enhanced form elements with consistent styling.
  - Implemented proper responsive design for all screen sizes.
  - Added consistent iconography using react-icons.

- [Refactor] ProjectContext:
  - Refactored apiRequest helper to use axios consistently instead of fetch for better error handling and more concise API.
  - Added comprehensive documentation for the apiRequest helper explaining the advantages of axios over fetch.
  - Evaluated Context API for managing multiple active timers and determined it is sufficient for the current use case.
  - Added detailed documentation explaining when to consider migrating to a more robust state management solution.
  - Updated SettingsPage to use axios for consistency across the codebase.

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
### Backend
### Database
### General
- [ ] Implement manual time entry editing
### UI Overhaul (iOS-Inspired Minimalism with shadcn/ui) - 2025-04-03
