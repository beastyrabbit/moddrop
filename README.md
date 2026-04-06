<div align="center">
  <img src="./nextjs-restyled.png" alt="Moddrop preview" width="100%" />
  <h1>Moddrop</h1>
  <p><strong>One browser source. Infinite canvas.</strong></p>
  <p>Shared live overlay control for streamers and mods.</p>
  <p>
    <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js_16-App_Router-0b0b0b?style=for-the-badge&logo=nextdotjs" />
    <img alt="React 19" src="https://img.shields.io/badge/React_19-Live_UI-111827?style=for-the-badge&logo=react" />
    <img alt="Bun" src="https://img.shields.io/badge/Bun-Fullstack-f5f5f5?style=for-the-badge&logo=bun&logoColor=111" />
    <img alt="tldraw" src="https://img.shields.io/badge/tldraw-Canvas-1d4ed8?style=for-the-badge" />
  </p>
</div>

Moddrop gives a stream one live canvas inside OBS. The streamer owns the room, invited mods join the same board, and media dropped into the stream zone renders live without scene juggling.

## Stack

`Next.js` `React` `Clerk` `Convex` `tldraw` `Hono` `WebSocket` `SQLite` `Bun`

## Run

```bash
bun install
bun run dev
bun run dev:convex
bun run dev:canvas
```

`frontend.localhost:1355`  
`stream-canvas.localhost:1355`

## Check

```bash
bun run lint && bun run typecheck && bun run test && bun run build
cd backend/stream-canvas && bun run typecheck && bun run test
```
