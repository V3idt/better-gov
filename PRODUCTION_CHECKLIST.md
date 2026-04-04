# Production Checklist

This file tracks development shortcuts and security-sensitive setup that must be changed before a real deployment.

## Authentication

- Replace development auto-provisioning of any `@BETTER_GOV_ALLOWED_EMAIL_DOMAIN` account with a real roster or identity source.
- Turn off `BETTER_GOV_DEV_AUTH_CODES`.
- Set a strong `BETTER_GOV_OTP_PEPPER` outside source control.
- Add server-side rate limiting for OTP request and verify endpoints.
- Add session expiration, rotation, and revocation rules.

## Email Delivery

- Set `RESEND_API_KEY`.
- Set `BETTER_GOV_EMAIL_FROM` to a verified sender on a domain you control.
- Set `BETTER_GOV_EMAIL_REPLY_TO` if support replies should route somewhere specific.
- Set `BETTER_GOV_APP_URL` to the public app URL.
- Confirm SPF, DKIM, and DMARC for the sending domain.

## Data Integrity

- Replace the seeded university roster with a real import or sync pipeline.
- Add audit logs for sign-in, proposition changes, vote attempts, and result publication.
- Define the final rule for whether votes are secret, recoverable, or admin-visible.
- Add moderation or review states before user-submitted draft propositions can open for voting.
- Add edit rules and immutable snapshots so propositions cannot be silently changed after voting opens.

## Infrastructure

- Move off local SQLite for production workloads.
- Add encrypted backups and restore testing.
- Add monitoring for API errors, auth failures, and delivery failures.
- Lock down environment variable handling in the deployment platform.
- Put the API behind a trusted proxy or load balancer and use validated client IP forwarding before relying on IP-based submission throttling.

## Repo Hygiene

- Keep `.env` and local databases out of version control.
- Rotate any secret immediately if it is ever exposed in logs, screenshots, or git history.
