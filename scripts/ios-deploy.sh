#!/usr/bin/env bash
# Build, install, and launch The Storm Watcher on a connected iPhone (USB or Wi-Fi).
# Usage:
#   npm run ios:deploy          # auto-detect device
#   IOS_DEVICE_ID=<uuid> npm run ios:deploy   # specific device
set -euo pipefail

BUNDLE_ID="com.stormwatcher.app"
SCHEME="App"
PROJECT="ios/App/App.xcodeproj"
BUILD_DIR="/tmp/tsw-build"

cd "$(dirname "$0")/.."

# 1. Pick device — env var wins, else first non-Mac, non-Simulator iOS device.
# xcodebuild needs the hardware ECID (00008XXX-XXXXXXXXXXXXXXXX), which xctrace
# exposes; devicectl list shows the CoreDevice UUID instead.
if [ -n "${IOS_DEVICE_ID:-}" ]; then
  DEVICE_ID="$IOS_DEVICE_ID"
  DEVICE_NAME="device"
else
  LINE=$(xcrun xctrace list devices 2>&1 \
    | grep -E "^[^[:space:]].*\([0-9]+\.[0-9]+" \
    | grep -v "Simulator" \
    | grep -v "MacBook" \
    | grep -v "Mac" \
    | head -1)
  DEVICE_ID=$(echo "$LINE" | grep -oE '\([0-9A-F]{8}-[0-9A-F]{16}\)' | tr -d '()')
  DEVICE_NAME=$(echo "$LINE" | sed -E 's/ \([0-9.]+\) \([0-9A-F-]+\)$//')
fi

if [ -z "$DEVICE_ID" ]; then
  echo "❌ No connected iOS device found."
  echo "   Plug in via USB once, or set IOS_DEVICE_ID=<ECID> if Wi-Fi paired."
  echo "   Find ECID with: xcrun xctrace list devices"
  exit 1
fi

echo "📱 Target: $DEVICE_NAME ($DEVICE_ID)"

# 2. Build the web bundle and sync into the iOS shell.
echo "📦 Building web assets..."
npm run build --silent
echo "🔄 Syncing to iOS..."
npx cap sync ios

# 3. Compile the Xcode project against this device.
echo "🔨 xcodebuild..."
xcodebuild -project "$PROJECT" \
  -scheme "$SCHEME" \
  -configuration Debug \
  -destination "platform=iOS,id=$DEVICE_ID" \
  -allowProvisioningUpdates \
  -derivedDataPath "$BUILD_DIR" \
  -quiet \
  build

APP_PATH="$BUILD_DIR/Build/Products/Debug-iphoneos/App.app"
if [ ! -d "$APP_PATH" ]; then
  echo "❌ Build output missing: $APP_PATH"
  exit 1
fi

# 4. Install and launch.
echo "⬇️  Installing..."
xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH" 2>&1 \
  | grep -E "App installed|error|Error" || true

echo "🚀 Launching..."
xcrun devicectl device process launch --device "$DEVICE_ID" "$BUNDLE_ID" 2>&1 \
  | grep -E "Launched|error|Error" || true

echo "✅ Done."
