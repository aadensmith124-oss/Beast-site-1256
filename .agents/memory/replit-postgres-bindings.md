---
name: Replit PostgreSQL bindings
description: Managed Replit database variables available to application workflows
---

Replit-managed PostgreSQL can provide the standard `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE` bindings even when the workflow does not expose a usable `DATABASE_URL`.

**Why:** Gating startup only on `DATABASE_URL` can make a healthy managed database look unconfigured in the preview workflow.

**How to apply:** Let node-postgres use its standard `PG*` environment-variable fallback, while retaining `DATABASE_URL` as the preferred connection string for Vercel and other hosted runtimes.