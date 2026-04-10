#!/bin/bash
# Quick comparison helper for main branch frontend code

TEMP_DIR=".temp/main-frontend"

echo "📂 Extracting main branch frontend files..."

# Create temp directory
mkdir -p "$TEMP_DIR"

# Extract key frontend files
files=(
    "ui/app/pages/StatusPage.vue"
    "ui/locales/en.json"
    "ui/locales/zh.json"
    "ui/app/router/index.js"
    "ui/app/App.vue"
)

for file in "${files[@]}"; do
    echo "  ✓ $file"
    git show main:"$file" > "$TEMP_DIR/$(basename "$file")" 2>/dev/null || echo "    (not found)"
done

echo ""
echo "✅ Files extracted to $TEMP_DIR/"
echo ""
echo "📋 Quick Commands:"
echo "  # Compare StatusPage"
echo "  code -d ui/app/pages/StatusPage.vue $TEMP_DIR/StatusPage.vue"
echo ""
echo "  # View main branch file"
echo "  less $TEMP_DIR/StatusPage.vue"
echo ""
echo "  # Search in main branch"
echo "  grep 'session' $TEMP_DIR/StatusPage.vue"
