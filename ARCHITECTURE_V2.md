# Personal Life OS - Production Architecture v2

## Project Structure (Scalable for 3+ Years)

```
/app                    # Next.js App Router - routes only, minimal logic
  layout.tsx            # Root layout, providers
  page.tsx              # Redirect to /dashboard
  dashboard/
  tasks/
  calendar/
  log/
  board/
  settings/
/components             # UI components - presentational
  layout/               # Sidebar, BottomNav, PageShell
  dashboard/
  tasks/
  calendar/
  log/
  board/
  settings/
  ui/                   # Reusable primitives
/hooks                  # Business logic hooks - single source of truth
  useTasks.ts
  useTimeLogs.ts
  useBoard.ts
  useReminders.ts
  useQuickLinks.ts
/lib                    # Pure logic, no React
  persistence/          # Storage abstraction - swap for DB later
  reminder-engine/      # Notification logic
  utils/                # Helpers
/types                  # All TypeScript types - single source of truth
/utils                  # App-level utilities
```

## Design Decisions

1. **No external state libs**: Hooks encapsulate state + persistence. Components consume hooks only.
2. **Persistence abstraction**: `IPersistence` interface allows localStorage → API/DB migration without touching hooks.
3. **Logic in hooks**: useTasks, useTimeLogs, etc. own CRUD + validation. UI stays dumb.
4. **Types first**: All models in /types. Hooks and persistence import from here.
5. **Reminder engine**: Separate module, runs in client, polls every 60s, uses Web Notifications API.
