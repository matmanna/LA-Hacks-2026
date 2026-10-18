# In-app bill scanner (guided frame) — implementation plan

Owner: D (UI), A reviews flow. Written Sun 2026-10-18 07:30 PDT. **Freeze is 09:00**: this is time-boxed to 75 minutes of build plus 15 of device testing. If it is not working on a phone by 08:45, ship nothing and keep today's flow.

## 1. Goal

Replace the jump to the system camera with an in-app camera screen that guides the user to a readable photo:

- dimmed surround with a page-shaped window and mint corner brackets,
- one coaching line that changes with state,
- a trust line,
- a shutter, a thumbnail tray of captured pages (up to 3), and a mint Done,
- an after-capture "too dark" check with Retake / Use anyway.

Why: B's measured photo reading (`data/eval/extraction.json`, 35 photos) is 100% of lines on flat, well-lit photos and 81.4% in dim light. Guiding framing and catching dark shots moves real users toward the 100% case.

Reference: the "Ready" mockup (mint brackets, "Looks good. Tap to capture", page 1 thumbnail, Done).

## 2. What exists today (main, apps/native)

| File | Today |
|---|---|
| `app/scan.tsx` | Ink screen with a drawn `BillMock`, mint `Corner`s, a tip card, Bill / Upload / Paste text modes, "Try a sample bill", and a shutter that calls `fromPhotos(takePhoto)` |
| `lib/photos.ts` | `takePhoto()` uses `ImagePicker.launchCameraAsync` (the system camera); `toDataUrl()` resizes to 2000 px and returns a base64 JPEG data URL; `MAX_PAGES = 3` |
| `lib/pending.ts` | `holdPages(caseId, pages)` hands pages to `/case/[id]/reading`, which calls `client.bill.parsePhoto({ caseId, pages })` |
| `app.json` | `expo-image-picker` plugin with the camera permission string; no `expo-camera` |
| Installed | `expo-image-manipulator`, `expo-haptics`, `react-native-svg`, `react-native-reanimated`, `heroui-native`, `uniwind` |

Everything after `holdPages` stays unchanged. The `?caseId=` mode ("Add your itemized bill"), Upload, Paste text and Try a sample bill all stay.

## 3. Constraints

- **Expo Go (SDK 57).** Only modules bundled in Expo Go. `expo-camera` is; live edge detection (VisionCamera frame processors, ML Kit document scanner) is not. So there is **no live "page found" state** in this version: brackets are always mint and the hint is static before the first capture. Section 9 covers the dev-build upgrade.
- No new API or contract changes. Pages keep the shape `{ imageDataUrl, page }`, 1 to 3 pages, max 2000 px edge, JPEG 0.85.
- Design tokens from `global.css`: `--color-ink #0b1b2b`, `--color-mint #0f9d76`, `--color-mint-soft #d1fae5`, `--color-mint-ink #065f46`, cobalt `#1e4ed8`. Copy rules from shared context 8.6 (plain, grade 6 to 8, no alarm).

## 4. Design spec

Full-screen camera preview, ink status bar, safe-area aware.

| Element | Spec |
|---|---|
| Top bar | Left: close button 44 px circle `bg-white/10`, `Icon close` white. Center: "Scan your bill" (or "Add your itemized bill" with `caseId`), 15 px semibold white. Right: flash toggle 44 px circle (`bolt` / `bolt-off`), maps to `CameraView` `flash="off" \| "on"` |
| Window | Letter ratio 8.5:11 (0.773). Width = screen width minus 2 x 24 px, height = width / 0.773, capped so the bottom area fits; vertically centered in the space between the top bar and the coach pill |
| Dim mask | Everything outside the window `rgba(0,0,0,0.55)`. Build with 4 absolutely positioned Views (top, bottom, left, right bands) around the window: no SVG needed, cheap to render |
| Brackets | 4 L-shapes at the window corners, arm length 36 px, stroke 5 px, radius 6 px on the outer corner, `#0F9D76`. Reuse today's `Corner` component with new sizes |
| Coach pill | Centered under the window, 13 px medium, padding 8 x 14, fully rounded. Before capture: white text on `bg-white/15`, icon `scan`, "Fit the whole page inside the frame". After a capture: mint fill, white text, icon `check`, "Page N added. Add another or tap Done". At 3 pages: "3 pages added. Tap Done" and the shutter is hidden |
| Trust line | 11 px, `rgba(255,255,255,0.7)`, lock icon: "Only your bill is read. Nothing is sent until you confirm." |
| Bottom row | Left: last-page thumbnail 44 x 52, radius 6, 2 px white border, cobalt count badge 20 px (hidden when 0 pages; shows the Upload button instead). Center: shutter 76 px (4 px white ring, 60 px white disc; ring turns mint once a page exists). Right: "Done" mint pill (hidden when 0 pages; shows Paste text instead) |
| Sample | Keep "Try a sample bill" as a small white pill under the trust line when there is no `caseId` (judges need it) |
| Haptics | `Haptics.impactAsync(Light)` on capture, `notificationAsync(Success)` on Done |
| Busy | Shutter shows `ActivityIndicator` while `takePictureAsync` + resize run; ignore taps while busy |

Accessibility: shutter label "Take a photo of your bill, page N"; Done label "Done, N pages"; thumbnail label "Page N, tap to remove"; all targets at least 44 px; coach pill is a live region (`accessibilityLiveRegion="polite"`).

## 5. Too-dark check (after each capture)

Expo Go cannot read live frames, but `takePictureAsync({ exif: true })` returns EXIF. Calibrated on the team's 35 original iPhone photos (before metadata was stripped):

| Condition | BrightnessValue | ISO |
|---|---|---|
| flat / angle | 2.35 to 2.52 | 125 to 160 |
| crumpled (bright) | 1.89 to 2.21 | 200 to 250 |
| dim / dimangle | -3.65 to -2.69 | 1000 to 1250 |

Rule (`lib/capture-quality.ts`): **too dark if `BrightnessValue < 0`, or, when BrightnessValue is missing (most Android), if `ISOSpeedRatings >= 800`.** Unknown EXIF means no warning. This is a heuristic from 35 photos on one phone; say so in a code comment.

When too dark, show a bottom sheet over the preview: "This photo looks dark. Dim photos are harder to read." Buttons: **Retake** (primary, removes that page) and **Use anyway** (secondary, keeps it). Suggest turning on the flash in the body copy if flash is off.

## 6. Files and changes

1. **Install** `expo-camera` with `bunx expo install expo-camera` in `apps/native` (pins the SDK 57 version). Add the plugin to `app.json`: `["expo-camera", { "cameraPermission": "BetterBill uses the camera to photograph your hospital bill.", "microphonePermission": false, "recordAudioAndroid": false }]`.
2. **`lib/photos.ts`**: generalize `toDataUrl` to take `{ uri, width, height }` (the ImagePicker asset already matches); export `toPage(source, pageNumber)`. Keep `takePhoto` (renamed `takePhotoWithSystemCamera`) as the fallback and `choosePhotos` unchanged.
3. **`lib/capture-quality.ts`** (new): `isTooDark(exif?: Record<string, unknown>): boolean` with the rule in section 5, plus a tiny unit test of the table values if the package has a test runner (it does not today; then a dev-only assertion is enough).
4. **`components/bb/scanner/`** (new): `viewfinder.tsx` (mask + brackets, takes the window rect), `coach-pill.tsx`, `page-tray.tsx` (thumbnail + badge + Done), `shutter.tsx`, `dark-photo-sheet.tsx`. Export from `components/bb/index.ts`.
5. **`app/scan.tsx`**: render `CameraView` (`facing="back"`, `flash`, `ref`) full screen with the overlay. State: `pages: Page[]`, `busy`, `flash`, `darkPrompt: { index } | null`. Shutter: `ref.takePictureAsync({ quality: 1, exif: true, skipProcessing: false })` then `toPage`, then `isTooDark` to maybe open the sheet. Done: existing `fromPhotos(async () => pages)` path (create case, `saveCase`, `holdPages`, replace to `/case/[id]/reading`). Thumbnail tap: remove that page after a confirm.
6. **Permission and fallback**: `useCameraPermissions()`. If not granted, show a full-screen card: "Allow camera to scan your bill", **Allow camera** (requests), **Upload a photo instead** (`choosePhotos`), **Paste text**. If `CameraView` reports `onMountError`, fall back to `takePhotoWithSystemCamera`.
7. **Remove** the drawn `BillMock` and tip card from `scan.tsx` (the live preview replaces them).

No changes to `packages/api`, `packages/core`, routes after `/scan`, or the web app.

## 7. Build order (time-boxed)

| Min | Step | Done when |
|---|---|---|
| 0 to 10 | Branch `d/scanner-ui` (or `c/` if C builds), install `expo-camera`, plugin in `app.json`, restart Expo with `--clear` | Expo Go opens the app without a native-module error |
| 10 to 30 | `CameraView` full screen in `scan.tsx`, shutter captures one page through `toPage`, Done goes to reading | One live photo reaches `/case/[id]/reading` and parses |
| 30 to 50 | Viewfinder mask + brackets, coach pill states, trust line, top bar, flash | Matches the mockup on a 390 px iPhone |
| 50 to 65 | Page tray (thumbs, badge, remove), 3-page cap, haptics | Can add 3 pages and Done sends 3 |
| 65 to 75 | `isTooDark` + dark-photo sheet; permission card and fallbacks | Dim room shows the sheet; deny camera shows the card |
| 75 to 90 | Device test (section 8), Biome, types, PR with 390 px screenshots | Checklist passes |

## 8. Device test checklist

- [ ] iPhone in Expo Go: permission prompt appears once; deny, then card shows; Upload works from the card
- [ ] Flat, well-lit SB-01: one capture, Done, lines appear on the confirm screen
- [ ] Dim room: dark-photo sheet appears; Retake removes the page; Use anyway keeps it
- [ ] Three pages: badge counts 1, 2, 3; shutter hides at 3; Done sends 3 (`parsePhoto` accepts 1 to 3)
- [ ] `?caseId=` path (Add your itemized bill) still attaches pages to the same case
- [ ] Try a sample bill and Paste text still work
- [ ] Close returns to the previous screen; no camera left running (preview unmounts)
- [ ] VoiceOver reads shutter, Done and the coach pill
- [ ] Android in Expo Go if a teammate has one: capture works; no dark sheet false alarms in good light

## 9. Later: live page detection (dev build, not before freeze)

The app already has `expo-dev-client`. With an EAS or local dev build, add `react-native-vision-camera` and a document-detection frame processor (or `react-native-document-scanner-plugin`, which wraps VisionKit and ML Kit), then drive the bracket color from detected corners: white while searching, mint and snapped to the page edges when found, auto-capture after 1 second steady. Same overlay components; only the bracket positions and colors become live.

## 10. Risks

| Risk | Mitigation |
|---|---|
| `expo-camera` version mismatch with Expo Go SDK 57 | Install only via `bunx expo install`; if Expo Go errors, revert to today's flow |
| Large captures slow the phone | `toPage` already resizes to 2000 px before base64; keep `quality: 1` only for the capture, 0.85 for the upload |
| Venue Wi-Fi blocks Expo dev server | Run Expo with `--tunnel` for the demo device |
| Freeze at 09:00 | Hard stop at 08:45; ship only if section 8's first four boxes pass |
