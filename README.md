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

This matters for accounts. The sign-in form calls the Bun API on `127.0.0.1:8787`, so if you only run `npm run dev:web` the frontend will load but account requests will fail.

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

## Account Email Setup

University account sign-in uses one-time email codes.

For local development:

1. Copy `.env.example` to `.env`.
2. Leave `BETTER_GOV_DEV_AUTH_CODES=1`.
3. Run `npm run dev`.

In that mode, the app shows the OTP in the dialog and logs it in the API console instead of sending a real email.

For real email delivery:

1. Set `RESEND_API_KEY`.
2. Set `BETTER_GOV_EMAIL_FROM` to a verified sender identity in Resend.
3. Optionally set `BETTER_GOV_EMAIL_REPLY_TO`.
4. Set `BETTER_GOV_APP_URL` to the public app URL.
5. Turn off `BETTER_GOV_DEV_AUTH_CODES`.

If email delivery is not configured and dev-code mode is disabled, sign-in code requests will fail by design.

## Notes

- The current ballot data is static and lives in [`src/lib/ballotItems.ts`](src/lib/ballotItems.ts).
- The vote flow now requires an authenticated university account and stores votes through a Bun + SQLite backend with a unique `(policy_id, person_id)` constraint.
- The API server seeds the ballot list and a small sample university roster into SQLite on startup.
- The `History` section currently uses mocked closed-vote data.

## Direction

The intended direction is a platform where voting is not limited to rare high-level events. Decisions should be legible, direct, and close to the people they affect.
