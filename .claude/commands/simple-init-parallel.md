# Simple Init Parallel

Initialize three parallel git worktree directories for concurrent TaskFlow development.

## Variables

FEATURE_NAME: $ARGUMENTS

## Execute these tasks

CREATE new directory `trees/`

> Execute these steps in parallel for concurrency
>
> Use absolute paths for all commands

CREATE first worktree:
- RUN `git worktree add -b $ARGUMENTS-1 ./trees/$ARGUMENTS-1`
- COPY `./backend/.env` to `./trees/$ARGUMENTS-1/backend/.env` (if it exists)
- RUN `cd ./trees/$ARGUMENTS-1/backend` then `npm install`
- RUN `cd ../frontend` then `npm install`
- UPDATE `./trees/$ARGUMENTS-1/frontend/vite.config.js` port to `3001`

CREATE second worktree:
- RUN `git worktree add -b $ARGUMENTS-2 ./trees/$ARGUMENTS-2`
- COPY `./backend/.env` to `./trees/$ARGUMENTS-2/backend/.env` (if it exists)
- RUN `cd ./trees/$ARGUMENTS-2/backend` then `npm install`
- RUN `cd ../frontend` then `npm install`
- UPDATE `./trees/$ARGUMENTS-2/frontend/vite.config.js` port to `3002`

CREATE third worktree:
- RUN `git worktree add -b $ARGUMENTS-3 ./trees/$ARGUMENTS-3`
- COPY `./backend/.env` to `./trees/$ARGUMENTS-3/backend/.env` (if it exists)
- RUN `cd ./trees/$ARGUMENTS-3/backend` then `npm install`
- RUN `cd ../frontend` then `npm install`
- UPDATE `./trees/$ARGUMENTS-3/frontend/vite.config.js` port to `3003`

VERIFY setup by running `git worktree list`

## Usage Instructions

After setup, you can run each worktree independently:

**Backend (port 5001):**
```bash
cd ./trees/$ARGUMENTS-1/backend && npm start
```

**Frontend (custom ports):**
```bash
# Worktree 1
cd ./trees/$ARGUMENTS-1/frontend && npm run dev  # port 3001

# Worktree 2  
cd ./trees/$ARGUMENTS-2/frontend && npm run dev  # port 3002

# Worktree 3
cd ./trees/$ARGUMENTS-3/frontend && npm run dev  # port 3003
```

**Tests:**
```bash
cd ./trees/$ARGUMENTS-1/backend && npm test
```