# Parallel TaskFlow Development Execution

## Variables
PLAN_TO_EXECUTE: $ARGUMENTS

## Run these commands top to bottom
RUN `ls -la backend/ | head -10`
RUN `ls -la frontend/ | head -10`
RUN `git worktree list`
READ: PLAN_TO_EXECUTE

## Instructions

We're going to create 3 new subagents that use the Task tool to create 3 versions of the same TaskFlow feature in parallel.

This enables us to concurrently build the same feature in parallel so we can test and validate each subagent's changes in isolation then pick the best implementation.

**Workspace Structure:**
- Agent 1 will work in `trees/<feature_name>-1/`
- Agent 2 will work in `trees/<feature_name>-2/`  
- Agent 3 will work in `trees/<feature_name>-3/`

Each worktree contains a complete TaskFlow setup with:
- `backend/` - Node.js Express API with SQLite database
- `frontend/` - React + Vite application with Tailwind CSS
- Independent npm dependencies installed
- Unique frontend ports (3001, 3002, 3003)

**Agent Instructions:**
1. Each agent will independently implement the engineering plan in PLAN_TO_EXECUTE
2. Focus on code changes only - DO NOT run servers, npm start, or start.sh
3. Follow TaskFlow patterns from CLAUDE.md:
   - Use React Context API for state management
   - Follow Radix UI + Tailwind component patterns
   - Implement proper error handling and caching
   - Add appropriate tests using Jest
4. When complete, create a comprehensive `RESULTS.md` file at the workspace root documenting:
   - Files changed/created
   - Key implementation decisions
   - Testing approach
   - How to verify the feature works

**TaskFlow Context:**
- Backend: Express + SQLite with Redis caching
- Frontend: React + Context API state management
- Database: Auto-initializing schema with proper relationships
- UI: Radix primitives with consistent Tailwind styling