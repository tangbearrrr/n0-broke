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

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — from the Supabase project (Project Settings → API)
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`

Run `supabase/schema.sql` once in the Supabase SQL Editor to create the tables before first use.

## Architecture

**N0broke** is a personal expense tracker SPA (React + TypeScript + Vite). There is no server in this repo — data is stored in Supabase (Postgres), accessed directly from the client with the public anon key.

### Data Flow

```
Pages → useQueries hooks (TanStack Query) → src/lib/api.ts → src/lib/supabase.ts → Supabase (Postgres)
```

- `src/lib/supabase.ts` — Creates the Supabase client from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- `src/lib/api.ts` — Wraps Supabase table queries (`transactions`, `debts`, `income`, `notes`) behind the same `api` object surface pages/hooks always used, so callers don't touch Supabase directly.
- `src/hooks/useQueries.ts` — Wraps all API calls in TanStack Query hooks (`useTransactions`, `useAddTransaction`, `useDebts`, `useIncome`, etc.).
- RLS is enabled on every table with permissive "allow all" policies (see `supabase/schema.sql`) — the Firebase login gate below is what actually restricts the app to one user, not the database.

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
