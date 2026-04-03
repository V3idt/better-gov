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

Start the dev server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

## Notes

- The current ballot data is static and lives in [src/lib/ballotItems.ts](/home/v3idt/Documents/better-gov/src/lib/ballotItems.ts).
- The vote flow now resolves to a canonical `person_id` and stores votes per policy/person through a centralized voting store instead of a per-device browser key.
- The `History` section currently uses mocked closed-vote data.

## Direction

The intended direction is a platform where voting is not limited to rare high-level events. Decisions should be legible, direct, and close to the people they affect.
