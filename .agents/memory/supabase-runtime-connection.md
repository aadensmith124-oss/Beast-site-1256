---
name: Supabase runtime connection
description: The difference between the agent's Supabase MCP access and the app's direct PostgreSQL runtime connection.
---

The Supabase MCP connection is for agent-side inspection and SQL operations; it does not automatically replace the app's `DATABASE_URL` or provide a runtime database driver connection. This app uses Drizzle with `pg`, so switching it to Supabase requires a securely configured direct Supabase PostgreSQL connection string.

**Why:** The app can successfully query the Replit-managed PostgreSQL database while the attached Supabase project is healthy, because they are separate data sources.

**How to apply:** Before changing the database target, obtain the Supabase direct connection string through the secure secrets flow, then validate the existing schema and data before repointing the app.