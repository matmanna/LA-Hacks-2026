# Polar

BetterBill uses Polar for the paid "assisted call" tier (checkout and customer
portal via `@polar-sh/better-auth`). Today the app is demo-only, so everything
defaults to the **Polar sandbox** environment. Do not point the app at a
production Polar organization and token until the tier is real.

## Sandbox by default

- The auth plugin (`packages/auth`) talks to `sandbox-api.polar.sh` unless
  `POLAR_SERVER=production` is set in `apps/web/.env`.
- The MCP server in `.mcp.json` points at the sandbox server
  (`https://mcp.polar.sh/mcp/polar-sandbox`). Give it a distinct name
  (`polar-sandbox`) so it never silently touches the live org.

## Env vars

| Variable | Required | Meaning |
|---|---|---|
| `POLAR_ACCESS_TOKEN` | only to enable the plugin | Organization access token. Create it in the **sandbox** dashboard (`sandbox.polar.sh`, Organization Settings > Developers > New Token). Tokens from the production environment do not work in the sandbox, and vice versa. |
| `POLAR_SUCCESS_URL` | only to enable the plugin | Redirect after a successful checkout |
| `POLAR_SAVINGS_PRODUCT_ID` | for payments | Sandbox product "BetterBill savings fee" (`62a50ba1-9f0f-4777-8826-5a04fc584ec9`). Not a secret. |
| `POLAR_BULK_PRODUCT_ID` | for payments | Sandbox product "BetterBill bulk plan (insurers and plans)" (`1450088d-c09f-4c4d-8cbb-dd77915d2f38`). Not a secret. |
| `POLAR_DEV_PROMO_CODE` | no | `BBDEV50`. Development only, see below. |
| `POLAR_SERVER` | no | `sandbox` (default) or `production`. Anything other than `production` falls back to `sandbox`. |

The plugin stays disabled until both `POLAR_ACCESS_TOKEN` and
`POLAR_SUCCESS_URL` are set (see `polarPlugins` in `packages/auth/src/index.ts`).

### Scopes

Pick the smallest scope set that the app needs. For this demo:
`orders:read`, `orders:write`, `products:read`, `customers:read`,
`customers:write`, `checkouts:read`, `checkouts:write`, `benefits:read`.
No scope is read from the environment; scopes live on the token itself.

## Payments (demo, sandbox)

Sandbox organization `0b8d14c9-6af8-4cf3-bc3b-1d02fd7a205f`.

| Product | Type | Price |
|---|---|---|
| BetterBill savings fee | one-time, custom price (minimum 50 cents) | the server passes `amount` |
| BetterBill bulk plan (insurers and plans) | recurring monthly | fixed $500 (demo pricing) |

Discount `BBDEV50` (fixed, $499.50 off, once) is attached to the bulk plan, so
it costs $0.50 for development.

oRPC procedures (all behind `accountProcedure`, so `BB_REQUIRE_ACCOUNT` applies):
`payment.quote`, `payment.checkout`, `payment.bulkCheckout`. Without
`POLAR_ACCESS_TOKEN` the checkout procedures return `PRECONDITION_FAILED`
("Payments are not configured") and the UI hides the pay button. The token
stays on the server. Checkouts redirect to `POLAR_SUCCESS_URL` (the `/success` route).

### Savings-fee formula (demo value, for the team to set)

Constants live in `packages/core/src/payments.ts`.

- Fee = 10% (`FEE_BPS = 1000`) of **confirmed** savings only. Estimates never count.
- Rounded half up to a whole cent, at least 50 cents (`MIN_FEE_CENTS`, Polar's
  custom-price minimum), at most $1,000 (`MAX_FEE_CENTS`), and never more than
  the confirmed savings.
- Confirmed savings under 50 cents (including zero): nothing is owed.
- Dev override: when the caller sends the code in `POLAR_DEV_PROMO_CODE` and
  `POLAR_SERVER` is not `production`, the charge is exactly 50 cents. In
  production server mode the override is ignored.

## MCP for agents

`.mcp.json` at the repo root exposes the Polar MCP server to any MCP-capable
client (Claude Desktop, Cursor, etc.):

```json
{
  "mcpServers": {
    "polar-sandbox": {
      "url": "https://mcp.polar.sh/mcp/polar-sandbox"
    }
  }
}
```

- Auth is OAuth per client: connecting opens a browser where you sign in and
  authorize an organization. No API key goes into agent config.
- To use the production environment instead, swap the URL to
  `https://mcp.polar.sh/mcp/polar-mcp` and rename the key so the sandbox
  and production servers are distinguishable.
- Sandbox emails only reach members of your organization, which is why the
  demo works without a real inbox (aliases like `you+test@example.com` work).

## Useful links

- MCP guide: https://polar.sh/docs/integrate/mcp
- Sandbox environment: https://polar.sh/docs/integrate/sandbox
- Sandbox dashboard: https://sandbox.polar.sh