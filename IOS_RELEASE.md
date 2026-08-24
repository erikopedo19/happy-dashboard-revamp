# Cutzioo — iOS App Store release

## Identity

| Field | Value |
| --- | --- |
| App name | Cutzioo |
| Bundle ID | `com.cutzioo.app` |
| Min iOS | 15.0 |
| Orientation | Portrait |
| Category | Business |

## One-time setup (macOS)

1. Create the App ID `com.cutzioo.app` in the Apple Developer portal and the matching app record in App Store Connect.
2. Sign in to Xcode → Settings → Accounts with the team that owns that App ID.
3. In the repo:
   ```bash
   npm install
   npx cap add ios      # only if ios/App does not exist yet
   npx cap sync ios
   ```
4. Remove the live-reload server URL before shipping: in `capacitor.config.ts` the `server` block must be absent for store builds (the release script assumes the bundled `dist` is used).

## Build + export

```bash
APPLE_TEAM_ID=ABCDE12345 npm run ios:release
```

Optional env: `BUNDLE_ID`, `MARKETING_VERSION` (default `1.0.0`), `BUILD_NUMBER` (default timestamp).

Artifacts land in `build/ios/export/*.ipa`.

## Upload to TestFlight / App Store

```bash
APPLE_TEAM_ID=ABCDE12345 \
ASC_API_KEY_ID=XXXX ASC_API_ISSUER_ID=YYYY \
npm run ios:upload
```

Or with an Apple ID app-specific password: `APPLE_ID=… APPLE_APP_PASSWORD=… UPLOAD=1 ./scripts/ios-release.sh`

## Signing

Automatic signing with `-allowProvisioningUpdates`; Xcode creates/renews the App Store distribution profile for `com.cutzioo.app` under your team. `ios/ExportOptions.plist` uses `method: app-store-connect`, strips Swift symbols and uploads dSYMs.

## Submission checklist

- App icon 1024×1024 present in the asset catalog (already generated).
- Privacy Policy URL: https://cutzioo.com/privacy — Terms: https://cutzioo.com/terms
- Data collected: account email, bookings, usage analytics (declare in App Privacy).
- Encryption: uses only standard HTTPS → set `ITSAppUsesNonExemptEncryption = false`.
- Demo account for review: provide a barber login with sample appointments.
