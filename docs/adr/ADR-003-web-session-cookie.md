# ADR-003: The web session is an httpOnly cookie set by the web server

- **Status:** Accepted
- **Date:** 2026-11-14

## Context

The store API issues a signed token at login ([PBI-06](../pbi/PBI-06.md)). The web app has to keep it between pages and send it with every request that needs a session, without letting a script injected into a page steal it. The owner also said they will change the BFF's CORS settings, so the web app should not depend on them.

## Decision

The Next.js server keeps the token in an **httpOnly** cookie (`orbit_session`, `SameSite=Lax`, `Secure` when `APP_URL` is https, lifetime taken from the token's own expiry). The browser never receives the token: the login, register and logout route handlers of the web app call the BFF and set or clear the cookie, and pages only get the user. Calls that need a session go through `/api/bff/...` on the web server, which adds the token and forwards to the BFF; only `products`, `categories`, `cart` and `orders` are reachable that way. Server components call the BFF directly with the token. A `proxy.ts` sends a visitor without the cookie to the login page, but every page still asks the API who the user is and what the role may do. Delivered in PBI-55.

## Alternatives considered

- **Keeping the token in `localStorage`:** simplest, but any script on the page can read it, so one cross-site scripting hole would leak every session.
- **A cookie set by the BFF itself, with the browser calling the BFF:** also httpOnly, but it needs cross-origin requests with credentials, so the web app would depend on the BFF's CORS and on both services sharing a site.
- **An authentication library (for example Auth.js):** more features than needed, a large dependency, and it would still need to hold this API's own token.

## Consequences

- The token is out of reach of page scripts, and the web app works whatever the BFF's CORS settings are.
- Every authenticated browser call passes through one extra hop (the web server), and the allowlist of reachable BFF paths must grow with each new feature.
- A role change applies at the next login, because the role is inside the token. There is no refresh token and no way to revoke a token before it expires.
- The `Secure` flag was only tested as an option value; it must be checked once the site is served over https.
