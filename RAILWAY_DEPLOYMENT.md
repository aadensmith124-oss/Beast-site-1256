# Railway deployment

Railway runs the production Express server and Telegram long-polling bot
together in one persistent service. The repository includes `railway.json` so
Railway uses:

- Builder: Railpack
- Build command: `npm run build`
- Start command: `npm run start`
- Restart policy: restart after failures

## Setup

1. Create a new Railway project from this repository.
2. Add the environment variables below in the Railway service's Variables
   section.
3. Deploy the service.
4. Generate a public Railway domain from the service's Networking settings.

## Required variables

```text
DATABASE_URL
SESSION_SECRET
APP_ENCRYPTION_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_GROUP_ID
TELEGRAM_JOIN_URL
TELEGRAM_ADMIN_IDS
```

For Supabase, use the Session mode connection-pooling URL for `DATABASE_URL`.
Add the existing Supabase migration before using referral and drop tables.

Add payment variables only if those features are enabled:

```text
NOWPAYMENTS_API_KEY
NOWPAYMENTS_IPN_SECRET
```

## Telegram runtime

The production `npm run start` process starts the website and Telegram bot
long polling together. Do not run `npm run start:bot` as a second Railway
service with the same bot token, because Telegram allows only one active
polling consumer per token.

No Telegram webhook URL is required. Referrals award one extra drop claim,
which is consumed through `/claim`.

The Railway deployment must remain a persistent service. Do not convert it to
a serverless-only function or scheduled job.