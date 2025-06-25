# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (React + Vite)
```bash
cd frontend
npm run dev      # Start development server on localhost:5173
npm run build    # Production build
npm run preview  # Preview production build
```

### Backend (Node.js + Express)
```bash
cd backend
npm start        # Start development server with nodemon
npm run dev      # Same as start
npm test         # Run Jest test suite
```

### Docker Development
```bash
docker-compose up -d --build    # Start all services (frontend, backend, postgres, redis)
docker-compose down             # Stop all services
docker-compose logs -f          # Follow logs for all services
```

**Important:** The application uses PostgreSQL in Docker but SQLite for local development. Database automatically initializes schema on first run.

## Architecture Overview

### Frontend Structure
- **State Management:** React Context API with three main contexts:
  - `ProjectContext` - Projects, tasks, and time entries
  - `NotificationContext` - Global toast notifications  
  - `WaitingItemContext` - External dependency tracking
- **UI Components:** Radix UI primitives in `src/components/ui/` with Tailwind CSS
- **Routing:** React Router with `MainLayout` wrapper for consistent navigation
- **API Communication:** Axios with base URL configuration

### Backend Structure
- **Database:** Uses better-sqlite3 for development, PostgreSQL for production
- **Caching:** Redis for high-performance caching with automatic invalidation
- **Routes:** Modular structure in `/routes` directory (projects, tasks, timeEntries, waitingItems, reports, settings)
- **Auto-initialization:** Database schema created automatically on startup
- **Cron Jobs:** Auto-pause functionality runs via node-cron based on settings

### Key Architectural Patterns

**Time Tracking:**
- Multiple concurrent timers supported
- Pause/resume functionality with duration calculation
- Auto-pause scheduling based on user settings
- Time entries linked to tasks and projects

**State Synchronization:**
- Context providers wrap the entire app
- API calls trigger context updates for real-time UI updates
- Optimistic updates for better UX

**Caching Strategy:**
- Redis-based caching for all API endpoints with smart TTL configuration
- Active timer states cached for real-time performance (30s TTL)
- Project/task metadata cached with moderate TTL (2-5 minutes)
- Reports and statistics cached with longer TTL (30 minutes)
- Automatic cache invalidation on CRUD operations
- Graceful degradation when Redis is unavailable

**Component Organization:**
```
src/components/
├── ui/           # Radix UI primitives (Button, Card, Dialog, etc.)
├── common/       # Shared components (LoadingSpinner, BackButton, etc.) 
├── layouts/      # Layout wrappers (MainLayout)
├── navigation/   # Header and Sidebar components
└── [feature]/    # Feature-specific components (projects, tasks, timeTracking, etc.)
```

## Database Schema

**Core Tables:**
- `projects` - Client projects with metadata
- `tasks` - Project tasks with status/priority 
- `time_entries` - Time tracking with pause/resume support
- `waiting_items` - External dependencies/blockers
- `waiting_timeline_events` - Audit trail for waiting items
- `settings` - Application configuration (auto-pause, etc.)

**Key Relationships:**
- Projects → Tasks (1:many, cascade delete)
- Tasks → Time Entries (1:many, cascade delete)  
- Projects → Waiting Items (1:many)

## Testing

**Backend Testing:**
- Jest with supertest for API testing
- Database mocking via `tests/mocks/database.js`
- Test files follow `*.test.js` naming convention
- Run with `npm test` in backend directory

**Frontend Testing:**
- No test framework currently configured
- UI components built with Radix UI for accessibility

## Special Features

**Focus Mode:** Distraction-free environment for working on current tasks without distractions

**Multi-Timer Support:** Track time on multiple tasks simultaneously with pause/resume

**Auto-Pause:** Configurable automatic stopping of timers based on schedule (cron-based)

**Waiting Items:** Track external dependencies with timeline events and statistics

## Development Notes

- Frontend serves on port 3000 (dev) or 80 (Docker)
- Backend API serves on port 5001
- PostgreSQL serves on port 5432 (Docker)
- Redis serves on port 6379 (Docker)
- Hot reloading enabled for both frontend and backend in development
- Database persists to `~/Desktop/Dockers/taskflow_data/` in Docker setup
- Redis data persists to `~/Desktop/Dockers/taskflow_redis_data/` in Docker setup

## Redis Caching Implementation

**Cache Configuration:**
- **Redis Client:** ioredis with connection pooling and automatic reconnection
- **Cache Middleware:** Generic middleware with TTL and key generation strategies
- **Performance Monitoring:** Cache hits/misses logged for optimization

**Endpoint Caching TTLs:**
- Time Entries (active): 30 seconds (real-time updates)
- Projects: 5 minutes (moderate change frequency)
- Tasks: 2 minutes (frequent updates)
- Settings: 1 hour (rare changes)
- Reports: 30 minutes (computationally expensive)
- Waiting Items: 5-15 minutes (varies by endpoint)

**Cache Invalidation:**
- Automatic invalidation on all CRUD operations
- Pattern-based cache clearing for related data
- Project/task relationship awareness for cascade invalidation