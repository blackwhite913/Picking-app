#!/bin/bash

# Deploy APK Script
# This script helps you build and share the warehouse picker APK

set -e

echo "🏗️  Warehouse Picker - APK Deployment Tool"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo -e "${RED}❌ Java is not installed${NC}"
    echo ""
    echo "Please install Java JDK 11+ to build the APK:"
    echo ""
    echo "For macOS (with Homebrew):"
    echo "  brew install openjdk@17"
    echo "  export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
    echo ""
    echo "Or download from: https://adoptium.net/"
    echo ""
    echo "Alternative: Use GitHub Actions to build in the cloud"
    echo "See QUICK_DEPLOY.md for instructions"
    exit 1
fi

echo -e "${GREEN}✓ Java found${NC}"
java -version

# Check if Android SDK is available
if [ ! -d "android" ]; then
    echo -e "${RED}❌ Android platform not found${NC}"
    echo "Run: npx cap add android"
    exit 1
fi

echo -e "${GREEN}✓ Android platform found${NC}"
echo ""

# Build the APK
echo "📦 Building APK..."
npm run android:build

if [ $? -eq 0 ]; then
    APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
    
    if [ -f "$APK_PATH" ]; then
        echo ""
        echo -e "${GREEN}✅ APK built successfully!${NC}"
        echo ""
        echo "📍 APK Location:"
        echo "   $APK_PATH"
        echo ""
        echo "📊 APK Size:"
        ls -lh "$APK_PATH" | awk '{print "   " $5}'
        echo ""
        
        # Offer to copy to Desktop for easy sharing
        read -p "Copy APK to Desktop for easy sharing? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp "$APK_PATH" ~/Desktop/warehouse-picker.apk
            echo -e "${GREEN}✓ Copied to ~/Desktop/warehouse-picker.apk${NC}"
        fi
        
        echo ""
        echo "🚀 Next Steps:"
        echo ""
        echo "Option 1: Install via ADB"
        echo "  adb install $APK_PATH"
        echo ""
        echo "Option 2: Share via Google Drive/Dropbox"
        echo "  1. Upload the APK to Google Drive or Dropbox"
        echo "  2. Generate a shareable link"
        echo "  3. Open link on Zebra scanner and download"
        echo ""
        echo "Option 3: Transfer via USB"
        echo "  adb push $APK_PATH /sdcard/Download/"
        echo "  Then install from file manager on device"
        echo ""
        echo "📚 For DataWedge setup, see: BUILD_ANDROID.md"
        
    else
        echo -e "${RED}❌ APK file not found at expected location${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Build failed${NC}"
    echo "Check the error messages above"
    exit 1
fi
