# Files: `tsconfig.json` / `tsconfig.build.json` (server, web, demo)

**What they are:** Settings for the TypeScript compiler — how strict to be,
where to put compiled output, which files to include.

**Why they exist:** TypeScript must be translated ("compiled") into plain
JavaScript before Node.js or the browser can run it. These files control that
translation.

- `server/tsconfig.json` — rules while developing the server.
- `server/tsconfig.build.json` — rules for the production build.
- `web/tsconfig.json` — rules for the dashboard code.
- `demo/tsconfig.json` — rules for the demo tests.
