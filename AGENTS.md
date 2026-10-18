Project guidelines:

- use pnpm for the package manager
- when installing new packages, use `pnpm add` instead of manually editing the package.json file
- use Next.js App Router patterns for the frontend
- avoid `as any` at all costs, try to infer types from functions as much as possible
- use `@clerk/nextjs` for frontend auth and the shared Clerk app for identity
- use the Hono/WebSocket/PostgreSQL backend in `backend/stream-canvas` for all backend behavior (users, rooms, OBS, uploads, sync); define schema and migrations with Drizzle
- add new storage needs (for example pgvector) to that PostgreSQL database instead of introducing another datastore
- use tailwindcss for styling whenever possible, only resort to custom css if needed
- run `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `pnpm run build` after frontend changes
- run `pnpm --dir backend/stream-canvas run typecheck && pnpm --dir backend/stream-canvas run test` after backend changes
