# CLAUDE.md - Project Guidelines & ECC Engineering Harness

This repository is configured with the **Everything Claude Code (ECC)** engineering harness and multi-AI collaboration protocol (supporting Claude Code, Codex, and Antigravity).

---

## 🚀 Key Commands

- **Development Server**: `npm run dev` (starts Vite dev server)
- **Validation Pipeline (Mandatory before commit/completion)**:
  ```bash
  npm run validate
  ```
  *(Runs `typecheck` ➔ `lint` ➔ `test` ➔ `build` in sequence. Must pass with 0 errors and 0 warnings.)*
- **Unit Testing**: `npm run test` (Vitest run) / `npm run test:watch` (interactive watch)
- **Type Checking**: `npm run typecheck` (`tsc --noEmit`)
- **Linting & Formatting**: `npm run lint` (`eslint . --max-warnings=0`) / `npm run lint:fix`
- **Batch AI Job Analysis**: `npm run batch:dry-run` (check candidates) / `npm run batch:analyze` (run Gemini analysis)

---

## 📋 Multi-AI Collaboration Protocol

1. **Before Starting Any Task**:
   - Always read the top of `docs/AI_COLLABORATION_LOG.md` to check recent design decisions, modified files, and handoff instructions.
2. **After Completing Any Task**:
   - Prepend a new entry to the `Work History` section in `docs/AI_COLLABORATION_LOG.md` including:
     - Date, Author (Claude Code), Modified Files list, Key Changes summary, and Verification Result (`npm run validate` pass).
3. **Zero-Defect Standard**:
   - Never commit code that breaks `npm run validate`.

---

## 🏗️ Architecture & Code Standards

1. **Tech Stack**:
   - **Frontend**: React 19, TypeScript 6, Vite 8, Tailwind CSS v4, Lucide React, React Router 8
   - **Backend / Cloud**: Firebase 12 (Auth, Firestore, Cloud Functions, Storage, Hosting)
   - **Testing**: Vitest 4, Testing Library, JSDOM
2. **3-Tier Separation of Concerns**:
   - **Presentation Layer (`src/app/`, `src/components/`)**: Pure UI rendering and user interactions. No direct DB/API calls.
   - **Hook / State Layer (`src/hooks/`, `src/lib/`)**: View state, context (`authContext.tsx`), and coordination.
   - **Service / Data Layer (`src/services/`, `functions/`)**: Firestore CRUD, external APIs (Worknet, Seoul Job API, Gemini AI), data normalization.
3. **Strict TypeScript & Clean Code**:
   - No `any` type (use `unknown` with type guards if dynamic).
   - Explicit return types for public functions, services, and hooks.
   - Immutability: Use spread operators, `map`, `filter` rather than mutating objects.
4. **Senior Accessibility & Typography**:
   - Maintain high contrast (WCAG 4.5:1+) and readable font sizes (15px+).
   - Prevent awkward Korean word splitting using `whitespace-nowrap` and `break-keep`.
5. **Testing (TDD)**:
   - Isolate Firebase and network requests using `vi.mock` or `src/test/harness.ts`.
   - Maintain 100% test pass rate across all 27+ test suites.

---

## 🔌 MCP & Live Documentation (Context7)
- MCP server configurations are available in `.mcp.json` and `.cursor/mcp.json`.
- Uses `@upstash/context7-mcp` to pull version-accurate, real-time documentation for React 19, Tailwind v4, Vite 8, and Firebase 12 on demand.

---

## 🧠 Continuous Learning (Task Observer)
- Uses `task-observer` (`.agents/skills/task-observer/SKILL.md`) to capture feedback patterns and evolve project skills over time.

