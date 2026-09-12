# Vercel hosting

This project supports:

- The React site as a Vite build served from `dist/public`
- The Express API through Vercel functions under `/api`
- The Telegram bot through the webhook endpoint `/api/telegram`

## Vercel project settings

The checked-in `vercel.json` configures the Vite build and SPA fallback. Vercel's managed Node runtime is used; do not add a function-level `runtime` override.

Set these variables in the Vercel project for the environments you deploy:

- `DATABASE_URL` — a PostgreSQL URL reachable from Vercel. For Supabase, use the Session Pooler URL and URL-encode the password.
- `SESSION_SECRET`
- `APP_ENCRYPTION_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ADMIN_IDS` or `ADMIN_USER_IDS`
- `TELEGRAM_ADMIN_CHAT_ID` or `ADMIN_CHAT_ID`
- `NOWPAYMENTS_API_KEY`
- `NOWPAYMENTS_IPN_SECRET`

Use any other application secrets already required by the selected payment and mail features.

## Telegram webhook

Vercel functions cannot keep Telegram long polling alive. The deployed bot uses:

```text
https://your-production-domain.example/api/telegram
```

After the site is deployed, set `TELEGRAM_WEBHOOK_URL` to that URL and optionally set `TELEGRAM_WEBHOOK_SECRET`. Then run:

```bash
npm run set:telegram-webhook
```

The command calls Telegram's `setWebhook` API and does not print the bot token. If `TELEGRAM_WEBHOOK_SECRET` is configured, Telegram requests must include the matching secret header before the update is processed.

The existing `npm run start:bot` command remains available for a persistent VM or Replit production runtime using long polling. Do not run long polling and the webhook for the same bot token at the same time.