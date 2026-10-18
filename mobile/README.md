# BetterBill mobile (Expo)

Take or choose photos of a hospital bill, upload them, confirm the lines, and watch the case status change over time. Talks to the same oRPC API as the web app (`/api/rpc`). UI is placeholder until the mobile design files land.

This folder is a standalone Expo SDK 58 project, not a Bun workspace member, so its dependencies do not touch the web app's lockfile.

## Run on your phone with Expo Go

1. Start the web app so the phone can reach it on your network (port 3001):
   ```
   bun run dev:web -- --host
   ```
   Photo reading needs `STEPFUN_API_KEY` in `apps/web/.env` and `BB_READER_MODE=live` (or `cache_first`). With `cache_only` and no key, photos fail with "We could not read this photo right now". The sample bill works without a key.
2. Start Expo:
   ```
   cd mobile
   bun install
   bun run start
   ```
3. Scan the QR code with Expo Go (same Wi-Fi as the computer).

The app calls `http://<your computer's LAN IP>:3001` by default (taken from the Metro host). To use another server, such as a Vercel preview:
```
EXPO_PUBLIC_API_URL=https://<preview-url> bun run start
```

## What works
- Take a photo (camera) or choose up to 3 pages from the library; images are downscaled to 2000 px and sent as JPEG data URLs to `bill.parsePhoto`.
- "Try a sample bill" starts synthetic bill SB-01.
- Case screen: lines read from the bill, "Looks right" (runs `bill.confirmLines` then `audit.run`), fair balance, flags with tier, savings, and the activity timeline from `event.list`. It polls every 5 seconds while open, and pull to refresh works on both screens.
- "Your bills" lists the cases started on this phone (stored on the device, since `case.list` needs an account).

## Not built yet
Line editing, evidence sheet, letter approval, sign in, and the real design.

## Checks
```
bun run check-types
bunx expo-doctor
```
