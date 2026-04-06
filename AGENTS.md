Project guidelines:

- use bun for the package manager
- when installing new packages, use `bun add` instead of manually editing the package.json file
- use Next.js App Router patterns for the frontend
- avoid `as any` at all costs, try to infer types from functions as much as possible
- keep Convex as the app-facing backend scaffold, but the real-time canvas backend lives in `backend/stream-canvas`
- use `@clerk/nextjs` for frontend auth and the shared Clerk app for identity
- use the Hono/WebSocket/SQLite backend in `backend/stream-canvas` for room, OBS, upload, and sync behavior
- use tailwindcss for styling whenever possible, only resort to custom css if needed
- after making changes to convex, run `bun run convex:gen` to generate the new api
- run `bun run lint`, `bun run typecheck`, `bun run test`, and `bun run build` after frontend changes
- run `cd backend/stream-canvas && bun run typecheck && bun run test` after backend changes

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
