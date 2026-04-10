#!/bin/bash
# Extract specific code sections from main branch StatusPage.vue

MAIN_STATUS=".temp/main-frontend/ui/app/pages/StatusPage.vue"

if [ ! -f "$MAIN_STATUS" ]; then
    echo "❌ Main branch StatusPage not found. Run extraction first."
    exit 1
fi

echo "📋 Available code sections to extract:"
echo ""
echo "  1. session-pool     - Session Pool Management UI"
echo "  2. settings         - Settings Configuration UI"
echo "  3. logs             - Real-time Logs UI"
echo "  4. sidebar          - Sidebar actions"
echo "  5. handlers         - All handler functions"
echo "  6. state            - State variables"
echo "  7. api-calls        - API fetch calls"
echo ""
echo "Usage: ./scripts/extract-section.sh <section-name>"
echo "Example: ./scripts/extract-section.sh session-pool"
