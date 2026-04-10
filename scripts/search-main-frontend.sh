#!/bin/bash
# Quick search helper for main branch frontend code

MAIN_FRONTEND=".temp/main-frontend/ui"

if [ $# -eq 0 ]; then
    echo "Usage: ./scripts/search-main-frontend.sh <keyword>"
    echo ""
    echo "Examples:"
    echo "  ./scripts/search-main-frontend.sh session"
    echo "  ./scripts/search-main-frontend.sh handleLogout"
    echo "  ./scripts/search-main-frontend.sh fetch("
    exit 1
fi

keyword="$1"

echo "🔍 Searching for: '$keyword' in main branch frontend code"
echo "============================================"
echo ""

# Search in StatusPage
if [ -f "$MAIN_FRONTEND/app/pages/StatusPage.vue" ]; then
    echo "📄 StatusPage.vue:"
    grep -n "$keyword" "$MAIN_FRONTEND/app/pages/StatusPage.vue" | head -20
    echo ""
fi

# Search in i18n
if [ -f "$MAIN_FRONTEND/locales/en.json" ]; then
    echo "🌐 en.json:"
    grep -n "$keyword" "$MAIN_FRONTEND/locales/en.json" | head -10
    echo ""
fi

# Search in router
if [ -f "$MAIN_FRONTEND/app/router/index.js" ]; then
    echo "🔀 router/index.js:"
    grep -n "$keyword" "$MAIN_FRONTEND/app/router/index.js"
    echo ""
fi

# Search in all files
echo "📂 All frontend files:"
grep -r -n "$keyword" "$MAIN_FRONTEND" --include="*.vue" --include="*.js" --include="*.json" | head -30
