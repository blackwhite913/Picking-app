# Building Android APK for Zebra TC21

This guide explains how to build, install, and configure the Warehouse Picking app as a native Android APK for Zebra TC21 scanners.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Building the APK](#building-the-apk)
3. [Installing on Zebra TC21](#installing-on-zebra-tc21)
4. [DataWedge Configuration](#datawedge-configuration)
5. [Troubleshooting](#troubleshooting)
6. [Advanced Configuration](#advanced-configuration)

---

## Prerequisites

### Development Environment

1. **Node.js** (v16 or higher)
   ```bash
   node --version
   ```

2. **Java Development Kit (JDK)** (v11 or higher)
   ```bash
   java -version
   ```
   - Download from: https://adoptium.net/ (Eclipse Temurin recommended)
   - Set `JAVA_HOME` environment variable

3. **Android SDK**
   - Install via [Android Studio](https://developer.android.com/studio) (recommended)
   - Or install SDK command-line tools only
   - Required SDK version: API 24 (Android 7.0) or higher
   - Set `ANDROID_HOME` environment variable

4. **Gradle** (comes with Android Studio)
   - Alternatively, use the Gradle wrapper (`./gradlew`) included in the project

### Verify Installation

```bash
# Check Java
java -version

# Check Android SDK (if ANDROID_HOME is set)
echo $ANDROID_HOME

# Check Gradle wrapper
cd android && ./gradlew --version && cd ..
```

---

## Quick Start: GitHub Actions Cloud Build

Don't want to install Java/Android SDK locally? Use the automated GitHub Actions workflow to build in the cloud:

### Steps:

1. **Push code to GitHub** (workflow already exists at `.github/workflows/build-android.yml`)
2. Go to your repository's **Actions** tab
3. Click **"Build Android APK"** workflow
4. Click **"Run workflow"** → **"Run workflow"**
5. Wait ~5 minutes for build to complete
6. Download APK from the **"Artifacts"** section (warehouse-picker-debug-apk)
7. Extract the ZIP file to get `app-debug.apk`
8. Upload to Google Drive/Dropbox and share with Zebra devices

**Benefits:**
- ✅ No local Java/Android SDK installation required
- ✅ Consistent build environment
- ✅ Build from any machine
- ✅ Free for public repositories

**Note:** The workflow configuration is already set up in `.github/workflows/build-android.yml` and will build automatically on pushes to main/master branches, or can be triggered manually.

---

## Building the APK

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Build the Web Assets

```bash
npm run build
```

This creates optimized production files in the `dist/` directory.

### Step 3: Sync Capacitor

```bash
npm run android:sync
```

This copies the web assets to the Android project and updates native dependencies.

### Step 4: Build Debug APK

```bash
npm run android:build
```

Or manually:

```bash
cd android
./gradlew assembleDebug
cd ..
```

**Output:** `android/app/build/outputs/apk/debug/app-debug.apk`

### Step 5: Build Release APK (Optional)

For production deployment with code optimization:

```bash
npm run android:build:release
```

**Output:** `android/app/build/outputs/apk/release/app-release-unsigned.apk`

**Note:** Release APKs must be signed before installation. See [Signing Release APKs](#signing-release-apks) below.

---

## Installing on Zebra TC21

### Method 1: ADB (Recommended for Development)

1. **Enable Developer Options** on the Zebra device:
   - Go to `Settings > About phone`
   - Tap `Build number` 7 times
   - Go back to `Settings > Developer options`
   - Enable `USB debugging`

2. **Connect device** via USB cable

3. **Install APK**:
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

4. **Launch the app**:
   - Find "Warehouse Picking" in the app drawer
   - Or via ADB: `adb shell am start -n com.warehouse.picker/.MainActivity`

### Method 2: Zebra StageNow (Enterprise Deployment)

1. **Create StageNow Profile**:
   - Open StageNow on your workstation
   - Create a new profile for app deployment
   - Add the APK file to the profile

2. **Generate Barcode**:
   - StageNow generates a series of barcodes
   - Print the barcode sheet

3. **Deploy to Devices**:
   - Scan the barcodes with each Zebra TC21
   - The app will be installed automatically

### Method 3: Direct File Transfer

1. **Copy APK** to device storage (via USB or cloud)
2. **Open file manager** on Zebra device
3. **Tap the APK** file
4. **Allow installation** from unknown sources (if prompted)
5. **Install** the app

---

## DataWedge Configuration

The app uses DataWedge intents for barcode scanning. Configure as follows:

### Step 1: Open DataWedge

- On Zebra device, open the **DataWedge** app
- This is pre-installed on Zebra scanners

### Step 2: Create New Profile

1. Tap `⋮` (menu) → **New Profile**
2. Name: `WarehousePicking`
3. Tap the profile to configure

### Step 3: Associate with App

1. **Associated apps** → **New app/activity**
2. **Package**: `com.warehouse.picker`
3. **Activity**: `*` (wildcard - all activities)

### Step 4: Configure Input

1. **Barcode input** → Enable
2. **Decoders**: Enable all required barcode types
   - Common types: Code 128, Code 39, EAN-13, UPC-A, QR Code
3. **Scanner selection**: Internal imager (default)

### Step 5: Configure Output

**IMPORTANT:** Configure Intent output, NOT keyboard output.

1. **Keystroke output** → **Disable** ❌
2. **Intent output** → **Enable** ✅

#### Intent Configuration:

| Setting | Value |
|---------|-------|
| Intent action | `com.warehouse.picker.SCAN` |
| Intent category | `android.intent.category.DEFAULT` |
| Intent delivery | **Broadcast intent** (Start Activity also works) |

#### Intent Extras:

| Extra Key | Value |
|-----------|-------|
| Source | `com.symbol.datawedge.data_string` |
| Decode data | `com.symbol.datawedge.data_string` |

### Step 6: Test DataWedge

1. Open the Warehouse Picking app
2. Press the scanner trigger
3. Scan a barcode
4. The app should respond to the scan

If scanning doesn't work, check the [Troubleshooting](#troubleshooting) section.

---

## Troubleshooting

### Build Issues

#### "Unable to locate a Java Runtime"

- Install JDK 11+ and set `JAVA_HOME`:
  ```bash
  export JAVA_HOME=/path/to/jdk
  export PATH=$JAVA_HOME/bin:$PATH
  ```

#### "SDK location not found"

- Set `ANDROID_HOME`:
  ```bash
  export ANDROID_HOME=/path/to/android-sdk
  export PATH=$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools:$PATH
  ```

- Or create `android/local.properties`:
  ```properties
  sdk.dir=/path/to/android-sdk
  ```

#### Gradle build fails

- Clean and rebuild:
  ```bash
  npm run android:clean
  npm run android:build
  ```

### Installation Issues

#### "App not installed"

- Uninstall old version first:
  ```bash
  adb uninstall com.warehouse.picker
  adb install android/app/build/outputs/apk/debug/app-debug.apk
  ```

#### USB debugging not authorized

- Check device screen for authorization prompt
- If not appearing, try:
  ```bash
  adb kill-server
  adb start-server
  adb devices
  ```

### Scanner Issues

#### Scanner trigger does nothing

1. **Check DataWedge profile is active**:
   - Open DataWedge
   - Ensure `WarehousePicking` profile has a green checkmark

2. **Verify app association**:
   - Profile should activate when Warehouse Picking app is open

3. **Check intent action**:
   - Must be exactly: `com.warehouse.picker.SCAN`
   - Case-sensitive!

4. **Enable keyboard wedge as fallback**:
   - Temporarily enable Keystroke output to verify scanner works
   - If this works, the issue is with Intent configuration

#### Scans are duplicated

- The app has built-in debouncing (500ms)
- Check if multiple DataWedge profiles are active
- Ensure only `WarehousePicking` profile is enabled for this app

#### App receives keyboard input instead of intents

- Disable Keystroke output in DataWedge
- Ensure Intent output is enabled
- Restart the app after DataWedge changes

### Runtime Issues

#### App rotates on tilt

- This should not happen - orientation is locked in AndroidManifest.xml
- Check `android:screenOrientation="portrait"` is set

#### Viewport jumps or resizes

- Check `android:windowSoftInputMode="adjustNothing"` is set
- This prevents keyboard from resizing the WebView

#### Backend API calls fail

1. **Check network connection**:
   - Ensure device has WiFi/cellular data

2. **Verify backend URL**:
   - Check `.env.production`:
     ```env
     VITE_API_BASE_URL=https://warehouse-iybackend-not-another-bill.vercel.app/api
     ```

3. **CORS issues**:
   - Backend must allow `capacitor://localhost` origin
   - Add to backend CORS configuration

4. **Certificate errors** (HTTPS):
   - Ensure backend has valid SSL certificate

---

## Advanced Configuration

### Signing Release APKs

For production deployment, release APKs must be signed:

1. **Generate keystore**:
   ```bash
   keytool -genkey -v -keystore warehouse-release.keystore \
     -alias warehouse-picker -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Create signing config** in `android/app/build.gradle`:
   ```gradle
   android {
       signingConfigs {
           release {
               storeFile file("../../warehouse-release.keystore")
               storePassword "your-password"
               keyAlias "warehouse-picker"
               keyPassword "your-password"
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
               minifyEnabled false
               proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
           }
       }
   }
   ```

3. **Build signed APK**:
   ```bash
   npm run android:build:release
   ```

**Security:** Keep the keystore file secure and NEVER commit it to version control!

### Remote Loading (Optional)

By default, the app bundles all web assets locally for offline operation. To load the frontend from a remote server:

1. **Deploy frontend to Vercel** or another hosting service

2. **Update `capacitor.config.ts`**:
   ```typescript
   server: {
     url: 'https://your-warehouse-app.vercel.app',
     cleartext: false,
     androidScheme: 'https'
   }
   ```

3. **Configure CORS** on the web server to allow `capacitor://localhost`

4. **Rebuild APK**:
   ```bash
   npm run android:sync
   npm run android:build
   ```

**Trade-offs:**
- ✅ Pros: Update app without rebuilding APK
- ❌ Cons: Requires internet connection, slower initial load

### Disable Battery Optimization

For warehouse environments where the app runs all day:

1. **Settings** → **Apps** → **Warehouse Picking**
2. **Battery** → **Battery optimization**
3. **Not optimized** → Select app → **Don't optimize**

This prevents Android from killing the app in the background.

### Custom App Icons

Replace icons in `android/app/src/main/res/`:

- `mipmap-hdpi/` (72x72)
- `mipmap-mdpi/` (48x48)
- `mipmap-xhdpi/` (96x96)
- `mipmap-xxhdpi/` (144x144)
- `mipmap-xxxhdpi/` (192x192)

Or use [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/) to generate all sizes.

---

## Testing Checklist

Before deploying to production, verify:

- [ ] APK installs successfully on Zebra TC21
- [ ] App launches without errors
- [ ] Portrait orientation is locked (no rotation on tilt)
- [ ] Viewport remains stable (no jumps on tilt/trigger)
- [ ] Scanner trigger activates scanning
- [ ] Barcodes are captured correctly in all screens:
  - [ ] Login screen
  - [ ] Picking screen (item barcodes)
  - [ ] Tote modal (tote barcodes)
  - [ ] Routing screen (tote and location barcodes)
- [ ] Backend API calls succeed
- [ ] Login flow works with PIN
- [ ] Full picking workflow completes successfully
- [ ] App stays awake during use (screen doesn't dim)
- [ ] No performance issues or lag

---

## Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review Capacitor docs: https://capacitorjs.com/docs/android
3. Review Zebra DataWedge docs: https://techdocs.zebra.com/datawedge/

---

## Build Output Locations

- **Debug APK**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK**: `android/app/build/outputs/apk/release/app-release.apk`
- **Build logs**: `android/app/build/outputs/logs/`

---

**Last updated:** February 2026
