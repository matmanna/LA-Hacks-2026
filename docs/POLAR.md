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
| `POLAR_SERVER` | no | `sandbox` (default) or `production`. Anything other than `production` falls back to `sandbox`. |

The plugin stays disabled until both `POLAR_ACCESS_TOKEN` and
`POLAR_SUCCESS_URL` are set (see `polarPlugins` in `packages/auth/src/index.ts`).

### Scopes

Pick the smallest scope set that the app needs. For this demo:
`orders:read`, `orders:write`, `products:read`, `customers:read`,
`customers:write`, `checkouts:read`, `checkouts:write`, `benefits:read`.
No scope is read from the environment; scopes live on the token itself.

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