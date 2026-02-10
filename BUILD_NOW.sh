#!/bin/bash

echo "🚀 Quick Setup for GitHub Actions Build"
echo "========================================"
echo ""
echo "This will:"
echo "  1. Initialize git repository"
echo "  2. Commit all files"
echo "  3. Show you next steps to push to GitHub"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

cd /Users/mohamedayaansheikh/Desktop/Test/Warehouse-ly/warehouse-mobile-app

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo "📁 Initializing git repository..."
    git init
    git branch -M main
else
    echo "✓ Git repository already initialized"
fi

# Add all files
echo "📦 Adding files..."
git add .

# Commit
echo "💾 Creating commit..."
git commit -m "Add Android APK support with Capacitor" || echo "Files already committed"

echo ""
echo "✅ Repository ready!"
echo ""
echo "📤 NEXT STEPS:"
echo ""
echo "1. Go to GitHub.com and create a new repository"
echo "   → https://github.com/new"
echo "   → Name it: warehouse-mobile-app"
echo "   → Keep it Public (for free Actions)"
echo "   → Don't initialize with README"
echo ""
echo "2. Run these commands:"
echo ""
echo "   git remote add origin https://github.com/YOUR_USERNAME/warehouse-mobile-app.git"
echo "   git push -u origin main"
echo ""
echo "3. Go to your GitHub repository:"
echo "   → Click 'Actions' tab"
echo "   → Click 'Build Android APK'"
echo "   → Click 'Run workflow' → 'Run workflow'"
echo ""
echo "4. Wait ~5 minutes for build to complete"
echo ""
echo "5. Download APK from 'Artifacts' section"
echo ""
echo "6. Upload to Google Drive and share link"
echo ""
echo "📚 Full guide: see BUILD_ANDROID.md"
echo ""
