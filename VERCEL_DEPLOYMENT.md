# Vercel deployment

This project is configured as a Vite frontend with Express API routes running
as Vercel Node.js functions.

## Vercel project settings

Use the repository root as the project root. `vercel.json` supplies the
following settings automatically:

- Build command: `npm run build:vercel`
- Output directory: `dist/public`
- Node.js version: 24.x via the package engine requirement
- API entrypoints: `api/index.ts` and `api/[...path].ts`

Do not set the output directory to `dist` or `client/dist`.

## Environment variables

Vercel does not automatically inherit Replit Secrets or Replit's runtime
database variables. Add these variables in **Vercel → Project Settings →
Environment Variables** for every environment that should serve the
application, then redeploy:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string. Vercel Postgres/Supabase integrations may expose this as `POSTGRES_URL_NON_POOLING`, `POSTGRES_URL`, or `POSTGRES_PRISMA_URL`; the app accepts those names as fallbacks. |
| `SESSION_SECRET` | Yes | Persistent session-cookie signing secret |
| `APP_ENCRYPTION_KEY` | Yes | Encryption for protected application data |
| `NOWPAYMENTS_API_KEY` | For crypto payments | NOWPayments API access |
| `NOWPAYMENTS_IPN_SECRET` | For crypto payments | NOWPayments webhook verification |
| `TELEGRAM_BOT_TOKEN` | For Telegram | Bot token from BotFather |
| `TELEGRAM_GROUP_ID` | For Telegram join gate | Numeric group/channel ID, including the `-100` prefix |
| `TELEGRAM_JOIN_URL` | For Telegram join gate | Invite URL shown by the join button |

Optional integrations use `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`TELEGRAM_ADMIN_IDS`, and the legacy-compatible `Telegram_group_id` name.

Keep the same `DATABASE_URL`, `SESSION_SECRET`, and `APP_ENCRYPTION_KEY`
across production deploys. Changing them can invalidate sessions or make
previously encrypted data unreadable.

`DATABASE_URL` must be the complete PostgreSQL connection string, for example
`postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require`. Do not use the
Replit-only hostname from a local development environment unless that database
is reachable from Vercel.

For Supabase deployments, use **Connect → Connection Pooling → Session mode**
instead of the direct `db.<project-ref>.supabase.co` endpoint. The direct
endpoint may not resolve from Vercel, while the session pooler is intended for
serverless applications and uses a `pooler.supabase.com` hostname.

## Database setup

Before the first production request, point `DATABASE_URL` at the production
PostgreSQL database and run:

```bash
npm run db:push
```

The Vercel function creates the PostgreSQL session table on its first cold
start. It does not run schema migrations during the frontend build.

## NOWPayments webhook

Configure the NOWPayments IPN callback URL to:

```text
https://<your-vercel-domain>/api/webhooks/nowpayments
```

The callback must use the same `NOWPAYMENTS_IPN_SECRET` configured in Vercel.

Use `/api/health` after publishing to verify that Vercel is routing requests to
the API function before debugging database configuration.

## Telegram polling and join gate

The regular Replit development and published server processes run the Telegram
bot with long polling. Vercel functions are short-lived, so the Vercel adapter
does not start Telegram polling. If deploying the API to Vercel, run the bot
from one separate persistent process:

```bash
npm run build:bot
npm run start:bot
```

The bot must be an administrator of the configured group/channel so Telegram
can answer membership checks. Users must join that group before `/start`,
`/ref`, or other bot commands are processed.

Each successful referral gives the referrer one additional drop claim. The
bonus is consumed automatically when the referrer uses the extra `/claim` and
cannot be reused after it is consumed.

## Important runtime difference

Vercel functions are short-lived and can run on multiple instances. The
serverless adapter disables the background cleanup, payment polling, and
Telegram polling loops. Ensure only one process is polling with a given bot
token; do not run `npm run start:bot` while the regular server is already
running with the same token.