# Repository Guidelines

## Project Structure & Module Organization
This repo is split into two apps:
- `backend/`: Express + MySQL API. Core files are `server.js`, `config/db.js`, `middleware/auth.js`, and route modules in `routes/` (`auth.js`, `institutes.js`, `attendance.js`, etc.).
- `frontend/`: React app (Create React App). App shell is `src/App.js`, API client is `src/api/index.js`, auth state is `src/context/AuthContext.js`, shared layouts/components are in `src/components/`, and feature pages are in `src/pages/admin`, `src/pages/institute`, and `src/pages/student`.
- SQL bootstrap is `backend/database.sql`.

## Build, Test, and Development Commands
Run commands from each package directory:
- `cd backend && npm install && npm run dev`: start API with nodemon on `:5000`.
- `cd backend && npm start`: run backend in non-watch mode.
- `cd frontend && npm install && npm start`: start React dev server on `:3000`.
- `cd frontend && npm run build`: production frontend build.

Example local workflow: run backend first, then frontend so proxy/API calls resolve to `http://localhost:5000`.

## Coding Style & Naming Conventions
- JavaScript style in this repo uses semicolons and 2-space indentation.
- React components/pages use `PascalCase` filenames (for example `AdminDashboard.js`, `InstStudents.js`).
- Backend route and utility modules use lowercase filenames (for example `routes/attendance.js`).
- Keep new route files grouped by domain under `backend/routes/`; keep frontend features grouped by role folder under `frontend/src/pages/`.

## Testing Guidelines
There is currently no automated test runner configured in `package.json` for either app. For now:
- Validate backend changes with targeted endpoint checks (for example `GET /api/health`, auth + CRUD flows).
- Validate frontend changes by role-based login flows and page navigation.
- If adding tests, follow `*.test.js` naming and co-locate with source or in `__tests__/`.

## Commit & Pull Request Guidelines
Git history is not available in this workspace snapshot, so follow a consistent convention:
- Commit format: `type(scope): imperative summary` (for example `feat(attendance): add resubmit endpoint guard`).
- Keep commits focused and atomic.
- PRs should include: purpose, changed areas (`backend/routes/...`, `frontend/src/pages/...`), setup/migration notes (`database.sql`, `.env`), and screenshots for UI changes.
