#!/usr/bin/env bash
# Cutzioo — iOS App Store release build
#
# Usage:
#   APPLE_TEAM_ID=ABCDE12345 ./scripts/ios-release.sh            # archive + export .ipa
#   APPLE_TEAM_ID=ABCDE12345 UPLOAD=1 ./scripts/ios-release.sh   # + upload to App Store Connect
#
# Requires (macOS only): Xcode 15+, CocoaPods, Node 18+.
# Upload requires an app-specific password or API key:
#   ASC_API_KEY_ID / ASC_API_ISSUER_ID / ASC_API_KEY_PATH   (preferred)
#   or APPLE_ID / APPLE_APP_PASSWORD

set -euo pipefail

APP_NAME="Cutzioo"
SCHEME="App"
BUNDLE_ID="${BUNDLE_ID:-com.cutzioo.app}"
MARKETING_VERSION="${MARKETING_VERSION:-1.0.0}"
BUILD_NUMBER="${BUILD_NUMBER:-$(date +%Y%m%d%H%M)}"
TEAM_ID="${APPLE_TEAM_ID:-}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$ROOT/build/ios"
ARCHIVE_PATH="$BUILD_DIR/$APP_NAME.xcarchive"
EXPORT_DIR="$BUILD_DIR/export"
WORKSPACE="$ROOT/ios/App/App.xcworkspace"

if [[ -z "$TEAM_ID" ]]; then
  echo "❌ APPLE_TEAM_ID is required (Apple Developer Team ID, e.g. ABCDE12345)."
  exit 1
fi

export CAP_RELEASE=1   # drops the live-reload server URL from capacitor.config.ts

echo "📦 1/5 Building web bundle (production)…"
npm run build

echo "🔄 2/5 Syncing Capacitor iOS project…"
npx cap sync ios

if [[ ! -d "$ROOT/ios/App" ]]; then
  echo "❌ ios/App not found. Run: npx cap add ios"
  exit 1
fi

echo "🧾 3/5 Applying release identity (bundle id / version / signing)…"
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $MARKETING_VERSION" \
  "$ROOT/ios/App/App/Info.plist" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" \
  "$ROOT/ios/App/App/Info.plist" 2>/dev/null || true
# Skip the export-compliance questionnaire on every TestFlight upload
/usr/libexec/PlistBuddy -c "Add :ITSAppUsesNonExemptEncryption bool false" \
  "$ROOT/ios/App/App/Info.plist" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Set :ITSAppUsesNonExemptEncryption false" \
    "$ROOT/ios/App/App/Info.plist" 2>/dev/null || true
# Portrait-only, matching the App Store listing
/usr/libexec/PlistBuddy -c "Delete :UISupportedInterfaceOrientations" \
  "$ROOT/ios/App/App/Info.plist" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :UISupportedInterfaceOrientations array" \
  "$ROOT/ios/App/App/Info.plist" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :UISupportedInterfaceOrientations:0 string UIInterfaceOrientationPortrait" \
  "$ROOT/ios/App/App/Info.plist" 2>/dev/null || true


mkdir -p "$BUILD_DIR"
sed "s/\$(DEVELOPMENT_TEAM)/$TEAM_ID/" "$ROOT/ios/ExportOptions.plist" > "$BUILD_DIR/ExportOptions.plist"

echo "🏗  4/5 Archiving (Release)…"
xcodebuild -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  PRODUCT_BUNDLE_IDENTIFIER="$BUNDLE_ID" \
  MARKETING_VERSION="$MARKETING_VERSION" \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  CODE_SIGN_STYLE=Automatic \
  -allowProvisioningUpdates \
  clean archive

echo "📤 5/5 Exporting signed .ipa…"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportOptionsPlist "$BUILD_DIR/ExportOptions.plist" \
  -exportPath "$EXPORT_DIR" \
  -allowProvisioningUpdates

IPA="$(ls "$EXPORT_DIR"/*.ipa | head -n1)"
echo "✅ Built: $IPA  (v$MARKETING_VERSION build $BUILD_NUMBER)"

if [[ "${UPLOAD:-0}" == "1" ]]; then
  echo "🚀 Uploading to App Store Connect…"
  if [[ -n "${ASC_API_KEY_ID:-}" ]]; then
    xcrun altool --upload-app -f "$IPA" -t ios \
      --apiKey "$ASC_API_KEY_ID" --apiIssuer "$ASC_API_ISSUER_ID"
  else
    xcrun altool --upload-app -f "$IPA" -t ios \
      -u "$APPLE_ID" -p "$APPLE_APP_PASSWORD"
  fi
  echo "✅ Upload complete — check App Store Connect → TestFlight."
fi
