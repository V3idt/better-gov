# better-gov

better-gov is a prototype for direct decision-making. The core idea is simple: people should be able to vote directly on decisions that affect them, instead of having their intent diluted through layers of representation.

This version of the product is currently framed around university governance. The sample ballot items focus on campus issues like tuition, library access, lecture recording, housing, shuttles, counseling, and exam policy.

## Current Product Shape

- A minimalist landing page introducing the platform
- An open ballot list
- A ballot detail page with a `tl;dr`, full brief, vote actions, and current split
- A history page for closed votes and outcomes
- A lightweight branding system aligned with the current dark, restrained visual style

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Router

## Local Development

Install dependencies:

```bash
npm install
```

Start the full app with the API and Vite frontend:

```bash
npm run dev
```

If you want to run them separately:

```bash
npm run dev:api
npm run dev:web
```

Create a production build:

```bash
npm run build
```

Run the server database tests:

```bash
npm run test:server
```

## Notes

- The current ballot data is static and lives in [`src/lib/ballotItems.ts`](src/lib/ballotItems.ts).
- The vote flow now resolves to a canonical `person_id` and stores votes through a Bun + SQLite backend with a unique `(policy_id, person_id)` constraint.
- The API server seeds the ballot list into SQLite on startup and keeps a demo session available for the current prototype.
- The `History` section currently uses mocked closed-vote data.

## Direction

The intended direction is a platform where voting is not limited to rare high-level events. Decisions should be legible, direct, and close to the people they affect.
