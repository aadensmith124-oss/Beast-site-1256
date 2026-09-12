---
name: Vercel nested API splat routing
description: The Vercel routing requirement for nested paths handled by a plain Node catch-all function.
---

For a Vercel project using a plain Node function at `api/[...path].ts`, add an explicit rewrite from `/api/:path*` to `/api/[...path]`. Without it, single-segment API paths can work while nested paths return Vercel's platform `NOT_FOUND` before the handler runs.

**Why:** Vercel's filesystem matching for this non-Next function does not reliably route multi-segment paths to the catch-all file by itself.

**How to apply:** Keep the API splat rewrite before the SPA fallback rewrite, and smoke-test at least one two-segment GET and one nested POST after every production deployment.