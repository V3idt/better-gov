# better-gov

better-gov is a prototype for direct decision-making. The core idea is simple: people should be able to vote directly on decisions that affect them, instead of having their intent diluted through layers of representation.

This version of the product is currently framed around university governance. The initial proposition set focuses on campus issues like tuition, library access, lecture recording, housing, shuttles, counseling, and exam policy.

## Current Product Shape

- A minimalist landing page introducing the platform
- An open proposition list backed by the API
- A proposition detail page with a `tl;dr`, full brief, live vote actions, and current split
- An authenticated AI explainer on proposition detail pages with student/staff views and provider fallback
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
It also allows development sign-in for any email under `BETTER_GOV_ALLOWED_EMAIL_DOMAIN`, even if that account is not in the seeded roster.

For real email delivery with Resend:

1. Set `RESEND_API_KEY`.
2. Set `BETTER_GOV_EMAIL_FROM` to a verified sender identity in Resend.
3. Optionally set `BETTER_GOV_EMAIL_REPLY_TO`.
4. Set `BETTER_GOV_APP_URL` to the public app URL.
5. Turn off `BETTER_GOV_DEV_AUTH_CODES`.

For hackathon delivery with Gmail SMTP:

1. Turn off `BETTER_GOV_DEV_AUTH_CODES`.
2. Set `BETTER_GOV_EMAIL_FROM` to your Gmail address, for example `better-gov <youraddress@gmail.com>`.
3. Set `BETTER_GOV_SMTP_HOST=smtp.gmail.com`.
4. Set `BETTER_GOV_SMTP_PORT=465`.
5. Set `BETTER_GOV_SMTP_SECURE=1`.
6. Set `BETTER_GOV_SMTP_USER` to your Gmail address.
7. Set `BETTER_GOV_SMTP_PASS` to a Google app password.
8. Set `BETTER_GOV_APP_URL` to the public app URL.

This is a hackathon fallback, not a production-grade mail setup. For a real deployment, use a dedicated sending domain and a transactional provider.

If email delivery is not configured and dev-code mode is disabled, sign-in code requests will fail by design.

## AI Explainer Setup

The proposition detail page includes an authenticated AI explainer that can use OpenAI, Gemini, or Grok.

For local development, you can leave the AI provider keys empty and the panel will show an error if no provider is available.

To enable live responses:

1. Set `BETTER_GOV_AI_PROVIDER_ORDER` to the provider order you want the server to try. Gemini is the default first choice.
2. Set the corresponding API keys for the providers you want to use.
3. Optionally override the model name for each provider.

The UI lets the signed-in user choose a provider and a student/staff perspective. The server still falls back through the configured order if the selected provider is unavailable.

## Notes

- Proposition list data, proposition detail data, review checks, and vote aggregates are served from the Bun + SQLite backend.
- The vote flow requires an authenticated university account and stores votes with a unique `(policy_id, person_id)` constraint.
- The AI explainer is also gated by the session cookie and caches outputs by proposition content, audience role, and provider preference.
- The API server seeds the proposition catalog and a small sample university roster into SQLite on startup.
- The frontend no longer reads proposition detail or history data directly from hardcoded page-level arrays.
- Production follow-ups are tracked in [`PRODUCTION_CHECKLIST.md`](PRODUCTION_CHECKLIST.md).

## Direction

The intended direction is a platform where voting is not limited to rare high-level events. Decisions should be legible, direct, and close to the people they affect.
