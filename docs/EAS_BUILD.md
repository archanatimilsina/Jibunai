# EAS Build setup

## What was fixed in this repo
- **Native modules aligned**: `expo install --fix` + pinned `expo-asset@57.0.20`
  (deduped; `expo-doctor` 20/21 — the last check needs network and passes online).
- **Stale `android/` removed from git**: the committed native project predated
  the audio/music/notification plugins, and EAS ignores `app.json` plugins
  when a native dir is present. Native code is now generated fresh by EAS on
  every build (`/android` + `/ios` stay gitignored, managed workflow).
- **Permissions + plugins**: `expo-audio`, `expo-music-library` (auto-added),
  `READ_MEDIA_AUDIO`, `SCHEDULE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED`,
  `NSAppleMusicUsageDescription`. Verified linked via autolinking resolve.
- **`eas.json`**: remote version source (auto-bump), dev profile builds an APK,
  all profiles read the backend URL from the `EXPO_PUBLIC_API_URL` secret.

## One-time setup
```bash
npm install -g eas-cli        # or: npx eas-cli
eas login                      # ArchanaArea Expo account (owner in app.json)
eas secret:create --scope project --name EXPO_PUBLIC_API_URL \
  --value https://portfolio-79vi.onrender.com
eas credentials                # Android: let EAS manage the keystore (default)
                               # iOS: needs an Apple Developer account + identifiers
```

## Build commands
```bash
# Dev client (install on your phone, then: npx expo start --dev-client)
eas build --platform android --profile development
eas build --platform ios --profile development   # needs Apple Developer

# Testable APK (internal distribution, installable link/QR)
eas build --platform android --profile preview

# Store builds
eas build --platform android --profile production
eas build --platform ios --profile production
```

## After installing the dev build
```bash
npx expo start --dev-client
# scan the QR with the dev build (same Wi-Fi). Backend:
# - emulator: EXPO_PUBLIC_API_URL=http://10.0.2.2:8000
# - physical device: your machine's LAN IP, e.g. http://192.168.1.5:8000
#   (set via local .env — .env is gitignored; never commit URLs)
```

## Notes
- iOS simulator has no music library — test the player on a real device.
  Android emulator needs audio pushed in (`adb push song.mp3 /sdcard/Music`).
- First cloud build takes 15–40 min (native toolchains). Later builds are cached.
- `eas submit` needs store listings + Apple App ID / Google service account —
  out of scope until release; the `submit.production` stub is ready.
- If a build ever behaves like an old version: `npx expo prebuild --clean`
  locally, confirm `npx expo-doctor` is green, rebuild.

## EAS Update — build once, update over the air

`expo-updates` is installed and wired (`app.json` → `updates.url` +
`runtimeVersion: { policy: appVersion }`). Each build profile has a
channel (`development` / `preview` / `production`), so a build pulls
updates published to the branch of the same name.

One-time native build (do this AFTER any native/plugin change):

```bash
eas build --platform android --profile preview      # testable APK
eas build --platform android --profile production   # store build
```

Then ship JS-only changes with no rebuild:

```bash
npm run update:preview                 # or: eas update --branch preview -m "fix goals list"
npm run update:production              # or: eas update --branch production -m "..."
```

The app checks for updates on launch (`ON_LOAD`) and applies them on
next restart. Rules of thumb:

- OTA covers JS, assets, and most config. It does NOT cover: new/changed
  native modules or plugins, `app.json` plugin edits, splash/icon changes
  that need native resources, or a bumped `version` (that changes the
  runtime version, so republish the update after rebuilding).
- `appVersionSource: remote` auto-bumps `version` per build — every fresh
  native build is a new runtime version, so run the matching
  `npm run update:<profile>` again after rebuilding.
- `EXPO_PUBLIC_API_URL` is baked into the JS bundle: an update carries the
  value from the machine that ran `eas update`. Changing the backend URL
  for existing installs = publish an update, not a rebuild.
