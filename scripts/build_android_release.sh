#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS_DIR="$ROOT_DIR/.build-tools"
ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$TOOLS_DIR/android-sdk}"
GRADLE_VERSION="${GRADLE_VERSION:-8.10.2}"
GRADLE_HOME="$TOOLS_DIR/gradle-$GRADLE_VERSION"
KEYSTORE_FILE="${EMS_RELEASE_STORE_FILE:-$ROOT_DIR/build/release/faizan-brothers-ems.jks}"
KEYSTORE_PASSWORD="${EMS_RELEASE_STORE_PASSWORD:-changeit-release}"
KEY_ALIAS="${EMS_RELEASE_KEY_ALIAS:-faizan-brothers-ems}"
KEY_PASSWORD="${EMS_RELEASE_KEY_PASSWORD:-$KEYSTORE_PASSWORD}"

mkdir -p "$TOOLS_DIR" "$ANDROID_SDK_ROOT/cmdline-tools" "$ROOT_DIR/build/release"

if [[ ! -x "$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager" ]]; then
  echo "Installing Android command line tools..."
  CMDLINE_ZIP="$TOOLS_DIR/commandlinetools-linux.zip"
  curl -fsSL "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" -o "$CMDLINE_ZIP"
  rm -rf "$ANDROID_SDK_ROOT/cmdline-tools/latest" "$TOOLS_DIR/cmdline-tools"
  unzip -q "$CMDLINE_ZIP" -d "$TOOLS_DIR"
  mv "$TOOLS_DIR/cmdline-tools" "$ANDROID_SDK_ROOT/cmdline-tools/latest"
fi

export ANDROID_SDK_ROOT
export ANDROID_HOME="$ANDROID_SDK_ROOT"
export PATH="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$PATH"

yes | sdkmanager --licenses >/dev/null || true
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"

if [[ ! -x "$GRADLE_HOME/bin/gradle" ]]; then
  echo "Installing Gradle $GRADLE_VERSION..."
  GRADLE_ZIP="$TOOLS_DIR/gradle-$GRADLE_VERSION-bin.zip"
  curl -fsSL "https://services.gradle.org/distributions/gradle-$GRADLE_VERSION-bin.zip" -o "$GRADLE_ZIP"
  unzip -q "$GRADLE_ZIP" -d "$TOOLS_DIR"
fi

if [[ ! -f "$KEYSTORE_FILE" ]]; then
  echo "Generating local release keystore for signed artifacts..."
  keytool -genkeypair \
    -keystore "$KEYSTORE_FILE" \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 4096 \
    -validity 10000 \
    -dname "CN=Faizan Brothers EMS, OU=Field Operations, O=Faizan and Brothers, L=Karachi, ST=Sindh, C=PK"
fi

export EMS_RELEASE_STORE_FILE="$KEYSTORE_FILE"
export EMS_RELEASE_STORE_PASSWORD="$KEYSTORE_PASSWORD"
export EMS_RELEASE_KEY_ALIAS="$KEY_ALIAS"
export EMS_RELEASE_KEY_PASSWORD="$KEY_PASSWORD"

"$GRADLE_HOME/bin/gradle" --no-daemon --stacktrace -p "$ROOT_DIR" clean :app:assembleRelease :app:bundleRelease

mkdir -p "$ROOT_DIR/artifacts/android"
cp "$ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk" "$ROOT_DIR/artifacts/android/faizan-brothers-ems-release.apk"
cp "$ROOT_DIR/android/app/build/outputs/bundle/release/app-release.aab" "$ROOT_DIR/artifacts/android/faizan-brothers-ems-release.aab"

echo "Release APK: $ROOT_DIR/artifacts/android/faizan-brothers-ems-release.apk"
echo "Release AAB: $ROOT_DIR/artifacts/android/faizan-brothers-ems-release.aab"
