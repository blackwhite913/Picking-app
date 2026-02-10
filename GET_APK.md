# Get APK Without Installing Java/Android SDK

## ⚡ Fastest Method: GitHub Actions (Recommended)

Build the APK in the cloud automatically - **no local setup needed!**

### Step 1: Push to GitHub

```bash
cd /Users/mohamedayaansheikh/Desktop/Test/Warehouse-ly/warehouse-mobile-app

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Add Android APK support"

# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/warehouse-mobile-app.git
git branch -M main
git push -u origin main
```

### Step 2: Trigger the Build

1. Go to your GitHub repository
2. Click on **"Actions"** tab
3. Click **"Build Android APK"** workflow
4. Click **"Run workflow"** → **"Run workflow"**

GitHub will build the APK in the cloud (takes ~5 minutes)

### Step 3: Download the APK

1. When the workflow completes, click on the workflow run
2. Scroll down to **"Artifacts"**
3. Download **"warehouse-picker-debug-apk"**
4. Extract the ZIP file to get `app-debug.apk`

### Step 4: Share the APK

**Option A: Google Drive**
1. Upload `app-debug.apk` to Google Drive
2. Right-click → Share → "Anyone with the link"
3. Copy the link

**Option B: Dropbox**
1. Upload to Dropbox
2. Create shareable link

**Option C: WeTransfer** (no account needed)
1. Go to https://wetransfer.com/
2. Upload APK
3. Get download link (valid for 7 days)

### Step 5: Install on Zebra

1. Open the link on Zebra scanner
2. Download the APK
3. Tap to install
4. If prompted, allow installation from unknown sources

---

## 🛠️ Alternative: Install Java Locally

If you prefer to build locally:

### 1. Install Java

**macOS (with Homebrew):**
```bash
brew install openjdk@17
```

**Add to your `~/.zshrc`:**
```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$PATH"
```

**Reload shell:**
```bash
source ~/.zshrc
```

### 2. Build APK

```bash
cd /Users/mohamedayaansheikh/Desktop/Test/Warehouse-ly/warehouse-mobile-app
npm run android:build
```

### 3. APK Location

```
android/app/build/outputs/apk/debug/app-debug.apk
```

### 4. Quick Deploy Script

Run the automated deployment script:
```bash
./deploy-apk.sh
```

This will:
- Build the APK
- Show you the file size
- Offer to copy to Desktop
- Give you installation options

---

## 📱 Installing the APK

### Method 1: ADB (USB Connection)

```bash
# Enable USB debugging on Zebra first
adb install app-debug.apk
```

### Method 2: Direct Download

1. Upload APK to cloud storage
2. Open link on Zebra browser
3. Download and install

### Method 3: File Transfer

```bash
# Copy to device storage
adb push app-debug.apk /sdcard/Download/

# Then on device:
# Open Files app → Downloads → tap app-debug.apk
```

### Method 4: Email

1. Email the APK to yourself
2. Open email on Zebra
3. Download and install attachment

---

## 🔧 DataWedge Configuration

After installing, configure DataWedge on the Zebra:

1. Open **DataWedge** app
2. Create new profile: **"WarehousePicking"**
3. Set these values:

| Setting | Value |
|---------|-------|
| Package | `com.warehouse.picker` |
| Intent Action | `com.warehouse.picker.SCAN` |
| Intent Delivery | Broadcast intent |
| Keystroke Output | **DISABLED** ❌ |

**Full details:** See [BUILD_ANDROID.md](./BUILD_ANDROID.md)

---

## 📦 File Sizes

Expected APK sizes:
- **Debug APK**: ~8-12 MB
- **Release APK**: ~6-8 MB (when signed and optimized)

---

## ⚠️ Troubleshooting

### "Unable to locate a Java Runtime"
→ Use GitHub Actions method (no Java needed)  
OR install Java as shown above

### "gradlew: Permission denied"
```bash
chmod +x android/gradlew
npm run android:build
```

### "App not installed" on Zebra
1. Uninstall old version first
2. Enable "Install from unknown sources"
3. Try again

### Can't download APK on Zebra
- Check internet connection
- Try a different cloud storage service
- Use ADB USB installation instead

---

## 🎯 Summary

**Easiest path:**
1. Push code to GitHub ← 2 minutes
2. Run GitHub Actions ← 5 minutes (automated)
3. Download APK ← 1 minute
4. Upload to Google Drive ← 1 minute
5. Share link with Zebra ← instant

**Total time: ~10 minutes, no local setup needed!**

---

## 📚 Additional Resources

- [BUILD_ANDROID.md](./BUILD_ANDROID.md) - Complete build guide
- [QUICK_DEPLOY.md](./QUICK_DEPLOY.md) - Deployment options
- [ANDROID_CONVERSION_SUMMARY.md](./ANDROID_CONVERSION_SUMMARY.md) - Technical details

---

**Need help?** Check the troubleshooting sections in BUILD_ANDROID.md
