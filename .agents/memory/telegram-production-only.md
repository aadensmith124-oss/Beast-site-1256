---
name: Telegram polling runtime
description: Telegram polling can run in development, but only one process may poll a bot token.
---

The Telegram bot runs from the normal Replit development server when its background jobs are enabled, and it can also run from the published server. Vercel serverless requests do not start polling.

**Why:** Telegram long polling allows only one active consumer per bot token; enabling development polling is useful for local testing but requires stopping other bot processes.

**How to apply:** Run one polling process at a time. Do not start the standalone bot worker while the regular development or published server is already polling with the same token.