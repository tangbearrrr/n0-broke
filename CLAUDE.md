# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Type-check (tsc -b) then production bundle
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

There are no tests configured in this project.

## Environment Setup

Copy `.env.local.example` to `.env.local` and fill in the values:

- `VITE_API_URL` — deployed Google Apps Script web-app URL
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`

## Architecture

**N0broke** is a personal expense tracker SPA (React + TypeScript + Vite). There is no server in this repo — the backend is a deployed Google Apps Script (GAS) web-app.

### Data Flow

```
Pages → useQueries hooks (TanStack Query) → src/lib/api.ts → GAS endpoint (VITE_API_URL)
```

- `src/lib/api.ts` — All API calls are GET-only requests with a `payload` query parameter for mutations. This is intentional to avoid CORS preflight, which GAS web-apps don't support. The `gs()` function handles all reads; `gsMut()` wraps mutations by serializing the body into the `payload` param.
- `src/hooks/useQueries.ts` — Wraps all API calls in TanStack Query hooks (`useTransactions`, `useAddTransaction`, `useDebts`, `useIncome`, etc.).

### Authentication

- `src/lib/firebase.ts` — Initializes Firebase using `VITE_FIREBASE_*` env vars; exports `auth` and a `GoogleAuthProvider`.
- `src/hooks/useAuth.ts` — Listens to `onAuthStateChanged`. **Only one email address (`spz7th@gmail.com`) is allowed**; any other authenticated user is immediately signed out with "Access denied."
- `src/components/AuthGuard.tsx` — Renders children only if user is authenticated and authorized; otherwise shows `LoginPage`.

### App Shell

`App.tsx` composes: `QueryClientProvider` → `BrowserRouter` → `AuthGuard` → `Sidebar` + `Header` + route `<main>`.

The `@` path alias maps to `./src` (configured in `vite.config.ts`).

### UI

- `src/components/ui/` — Shared UI primitives (button, card, dialog, table, etc.)
- Styling is Tailwind CSS throughout. Radix UI primitives underlie several components. Recharts for charts, Sonner for toasts.
