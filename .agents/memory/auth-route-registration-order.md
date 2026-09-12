---
name: Auth route registration order
description: Express routes that call Passport request helpers must be registered after auth middleware setup.
---

Routes using `req.isAuthenticated()` or `req.user` must be registered after
the function that installs session and Passport middleware, not merely in the
same route-registration function.

**Why:** Express executes middleware and routes in registration order. A
protected route registered first can receive a request before Passport has
added its helpers and fail with a server error instead of returning 401.

**How to apply:** Keep public webhook/health routes independent; place
authenticated feature routes after session, Passport initialization, and the
same-origin middleware are mounted.