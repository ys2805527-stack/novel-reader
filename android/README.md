# Read Book Android

Offline Android package of the reading and writing app, named Read Book.
Requires Android 8.0+ and a current Android System WebView. No server or internet connection is required.

All illustrations, TXT/EPUB parsing, local reading records and writing pages are bundled.
The Android system document picker handles book/avatar import and draft export without broad storage permissions.
Browser/PWA data is separate from this installed application's data.

## Build

Install JDK 17, Python 3 + Pillow, Android SDK platform 35 and build-tools 35.0.0.
Set `ANDROID_SDK_ROOT` to the SDK directory, then run `python3 android/build.py` from the repository root.
Output: `android/build/ReadBook-1.0.0.apk`.

The script creates a private signing key on first use. Keep `android/private-signing/` private and backed up:
future APK updates must use this same key. Never commit it to a public repository.
The private build backup contains this key to allow compatible personal updates.

## Validation

The build verifies the APK signature, resources and SDK requirements. Real-device UI, import/export,
keyboard and animation behavior still require an Android device; no device testing is claimed.
