# Redis Caching Implementation for Projects and Tasks Routes

## Overview
Added Redis caching to the projects.js and tasks.js route files to improve API performance by reducing database queries for frequently accessed data.

## Implementation Details

### Projects Routes (`/routes/projects.js`)
- **TTL**: 5 minutes (300 seconds) - longer TTL since projects change less frequently
- **Cached Endpoints**:
  - `GET /api/projects` - List all projects
  - `GET /api/projects/:id` - Get single project by ID
- **Cache Invalidation**: Triggered on CREATE, UPDATE, and DELETE operations
- **Cache Keys**:
  - List: `cache:GET:/api/projects:{}`
  - Single: `cache:project:{id}`

### Tasks Routes (`/routes/tasks.js`)
- **TTL**: 2 minutes (120 seconds) - shorter TTL since tasks are modified more often
- **Cached Endpoints**:
  - `GET /api/tasks` - List all tasks (with optional projectId filter)
  - `GET /api/tasks/:id` - Get single task by ID
- **Cache Invalidation**: Triggered on CREATE, UPDATE, and DELETE operations
- **Cache Keys**:
  - All tasks: `cache:tasks:all`
  - Project tasks: `cache:tasks:project:{projectId}`
  - Single task: `cache:task:{id}`

## Cache Invalidation Strategy

### Projects
- **CREATE**: Invalidates all project caches
- **UPDATE**: Invalidates all project caches + specific project cache
- **DELETE**: Invalidates all project caches + specific project cache + related task caches

### Tasks
- **CREATE**: Invalidates all task caches + project-specific task caches
- **UPDATE**: Invalidates all task caches + specific task cache + project-specific caches (if projectId changed)
- **DELETE**: Invalidates all task caches + specific task cache + project-specific caches

## Key Features
- **Graceful Degradation**: Cache failures don't break API functionality
- **Smart Key Generation**: Custom key generators for filtered requests
- **Comprehensive Invalidation**: Ensures data consistency across related caches
- **Performance Logging**: Cache hits/misses are logged for monitoring

## Benefits
- Reduced database load for read operations
- Improved API response times
- Better scalability for high-traffic scenarios
- Maintains data consistency through strategic cache invalidation