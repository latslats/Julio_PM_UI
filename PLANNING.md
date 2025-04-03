# TaskFlow: Project Plan

**Date:** 2025-04-03 (Updated)

## 1. Project Overview

**Goal:** Develop "TaskFlow", a personal project management application featuring integrated time tracking, waiting list management, and basic reporting capabilities. The application aims for a clean, efficient, and intuitive user experience.

**Core Features:**
*   Project & Task Management (CRUD operations)
*   Time Tracking (Start, Stop, Pause, Resume, Multiple Timers)
*   Waiting Items Tracking
*   Reporting (Basic summaries)
*   Settings (e.g., Auto-pause)
*   Manual Time Entry Editing

## 2. Architecture

*   **Frontend:** React Single Page Application (SPA)
    *   Build Tool: Vite
    *   Styling: Tailwind CSS
    *   Component Library: shadcn/ui
    *   State Management: React Context API (or potentially Zustand/Redux if complexity grows)
*   **Backend:** Node.js RESTful API
    *   Framework: Express.js
*   **Database:** PostgreSQL
*   **Containerization:** Docker (using `docker-compose.yml`)

## 3. UI/UX Design: iOS-Inspired Minimalism with shadcn/ui

**Goal:** Refactor the UI for a modern, clean, minimalist, and efficient user experience inspired by iOS design principles.

**Framework/Library:**
*   **Component Foundation:** `shadcn/ui`
    *   Leverages Radix UI for accessible primitives.
    *   Styled using Tailwind CSS.
    *   Components copied into `src/components/ui` for customization.

**Core Aesthetic & Design Principles:**
*   **Overall Feel:** Clean, minimalist, spacious.
*   **Layout:** Ample white space, card-based layouts (`shadcn/ui Card`).
*   **Color Palette:** Primarily light, neutral grays/whites. Single accent color (e.g., `blue-500`). Consider dark mode later.
    *   *Initial Suggestion:* Backgrounds: `slate-50`/`white`. Borders: `slate-200`. Text: `slate-700`/`slate-900`. Accent: `blue-500`.
*   **Typography:**
    *   *Font:* `Inter` (sans-serif). Configure in `tailwind.config.js`.
    *   *Hierarchy:* Clear distinction between headers and body text. Generous line spacing (`leading-relaxed`).
*   **Depth & Hierarchy:** Subtle shadows (`shadow-sm`, `shadow-md`) on cards, modals.
*   **Rounding:** Consistent, slightly rounded corners (`rounded-md`, `rounded-lg`) on containers, buttons, inputs.
*   **Interactivity:** Use `shadcn/ui` components (`Button`, `Switch`, `Input`, `Dialog`, `Toast`, etc.). Style consistently. Explore adapting `RadioGroup`/`ToggleGroup` for segmented controls.
*   **Translucency/Blur:** Explore subtle `backdrop-blur-sm` for fixed headers/modals (optional).
*   **Micro-interactions:** Subtle transitions/animations from `shadcn/ui` or custom.

**Component Strategy:**
1.  **Install & Configure `shadcn/ui`**.
2.  **Base Styling:** Configure `tailwind.config.js`, `globals.css`. Define font, colors.
3.  **Replace Existing Components:** Gradually replace with `shadcn/ui` counterparts (e.g., `Button`, `Card`, `Input`). Customize styles within `src/components/ui`.
4.  **Layout Refactoring:** Update page layouts (`Dashboard`, `ProjectDetail`, etc.).
5.  **Custom Components:** Create only when necessary (e.g., segmented control) using Tailwind/Radix.
6.  **Navigation:** Refactor navigation (Sidebar/Header). Style according to the new aesthetic.

**UI Refactoring Plan (High-Level Phases):**
1.  **Phase 1: Setup & Core Elements:** `shadcn/ui` setup, base styles, refactor `Button`, `Input`, `Checkbox`, `Switch`, `Card`.
2.  **Phase 2: Page Layouts & Containers:** Refactor main layouts, implement `Dialog`/`Drawer`, `Toast`.
3.  **Phase 3: Complex Components & Navigation:** Address tables, `TimeTrackingWidget`, navigation. Implement custom components.
4.  **Phase 4: Polish & Refinement:** Consistency review, animations, responsiveness/accessibility testing.

## 4. Development Principles & Conventions

*   **Modularity:** Keep components and modules focused and reusable. Limit file length (< 500 lines).
*   **Testing:**
    *   Backend: Follow standard practices (Unit, Integration).
    *   Frontend: Add tests (e.g., using Vitest/React Testing Library) for components with complex logic or state management.
    *   Pytest for Python code if any backend parts switch.
*   **Styling:** Adhere to Tailwind CSS best practices. Customize `shadcn/ui` components within their files in `src/components/ui`.
*   **Backend (If applicable Python):** Follow PEP8, use `black`, type hints, Pydantic, FastAPI, SQLAlchemy/SQLModel.
*   **Documentation:** Maintain `README.md`, use Google-style docstrings (Python), JSDoc (JavaScript/JSX), add `# Reason:` comments for complex logic.
*   **Version Control:** Follow standard Git practices (feature branches, descriptive commits).
*   **Task Management:** Use `TASKS.md`.

## 5. Current High-Level Tasks (derived from `TASKS.md` / Memory)

*   Complete UI Overhaul (as detailed in Section 3).
*   Remove the time tracking tab/page at `/time-tracking`. (Functionality likely moving elsewhere).
*   Implement Settings page with auto-pause functionality.
*   Implement manual editing of time entries.

*(Further detailed tasks should be managed in TASKS.md)*
