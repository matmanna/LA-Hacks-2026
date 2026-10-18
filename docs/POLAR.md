# Polar (sandbox only)

Polar powers the optional paid "assisted call" tier. BetterBill uses the Polar **sandbox** only. Never use a production Polar organization or token in this repo.

## MCP server for coding agents

`.mcp.json` registers the Polar-hosted sandbox MCP server as `polar-sandbox`
(`https://mcp.polar.sh/mcp/polar-sandbox`). Source: https://polar.sh/docs/integrate/mcp

Auth is OAuth only. No token goes in the file.

1. Open the repo in Claude Code and approve the project MCP server.
2. Run `/mcp`, pick `polar-sandbox`, and sign in. Authorize your Polar **sandbox** organization.

Other clients: add the same URL as a remote MCP server named `polar-sandbox`. Do not add the production URL (`.../polar-mcp`).

## App env

All optional. Polar is enabled only when `POLAR_ACCESS_TOKEN` and `POLAR_SUCCESS_URL` are both set.

| Name | Notes |
|---|---|
| `POLAR_ACCESS_TOKEN` | Organization access token from the Polar sandbox. Server-side only. |
| `POLAR_SUCCESS_URL` | Where checkout returns the user. |
| `POLAR_SERVER` | `sandbox` (default) or `production`. Leave unset. Production is out of scope. |

Never commit values. Never put these in client code.
