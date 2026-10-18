# BetterBill native (Expo SDK 57, Better-T-Stack `native-uniwind`)

Phone app for taking or choosing bill photos, uploading them, confirming the lines, and following the case status over time. Same oRPC API and Better Auth as `apps/web`. UI is placeholder until the mobile design files land.

## Run in Expo Go

1. Point the app at your computer on the LAN. Create `apps/native/.env` (gitignored):
   ```
   EXPO_PUBLIC_SERVER_URL=http://<your LAN IP>:3001
   ```
2. Start the web app listening on the network:
   ```
   bun run dev:web -- --host
   ```
   Photo reading needs `STEPFUN_API_KEY` in `apps/web/.env` and `BB_READER_MODE=live` (or `cache_first`). The sample bill works without a key.
3. Start Expo (in Expo Go mode, since `expo-dev-client` is installed):
   ```
   bun run dev:native
   ```
4. Scan the QR code with Expo Go on the same Wi-Fi.

## Screens
- **Your bills** (drawer home): Take a photo, Choose from photos (up to 3 pages, downscaled to 2000 px JPEG), Try a sample bill (SB-01), and the list of bills started on this phone with live status (refreshes every 10 s). The list is stored on the device because `case.list` needs a signed-in user.
- **Case** (`/case/[id]`): lines read from the bill, Looks right (`bill.confirmLines` then `audit.run`), fair balance, flags with tier, savings, and the activity timeline. Polls every 5 s.
- **Account** (drawer): Better-T-Stack's sign in, sign up, API status, and Polar screens.

## Expo SDK version
Pinned to SDK 57 because the Play Store build of Expo Go supports SDK 57 (SDK 58 reaches the stores "within a few weeks" of its release, per the Expo changelog). Upgrade to 58 with `bunx expo install expo@latest --fix` when the store Expo Go catches up. The root `package.json` `overrides` (`react`, `react-dom`, `react-native-screens`) keep a single copy of each native module; update them with the SDK.

## Troubleshooting
- **`case.create` fails with `column ... does not exist`**: your local database is behind the schema. Run `cd packages/db && bun run db:push` (local database only, never the shared one), then retry. `db:migrate` fails on databases that were first built with `db:push`.
- **App can't reach the server**: `EXPO_PUBLIC_SERVER_URL` in `apps/native/.env` must be your computer's current Wi-Fi address (it changes between networks), and Expo must be restarted after editing it.
- **Run `bun install` at the repo root** after every pull or branch switch, then restart both servers.
