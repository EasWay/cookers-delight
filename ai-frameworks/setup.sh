#!/usr/bin/env bash
# Setup script for Cookers Delight AI frameworks
# Run from the project root: bash ai-frameworks/setup.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Cookers Delight AI Frameworks Setup ==="
echo ""

# 1. Everything-Claude Code (Node.js)
echo "[1/4] Installing Everything-Claude Code dependencies..."
cd "$SCRIPT_DIR/everything-claude-code"
npm install --no-audit --no-fund --loglevel=error
echo "    Done."

# 2. Claude-mem (Node.js)
echo "[2/4] Installing Claude-mem dependencies..."
cd "$SCRIPT_DIR/claude-mem"
npm install --no-audit --no-fund --loglevel=error
echo "    Done."

# 3. Browser-use (Python)
echo "[3/4] Installing Browser-use Python dependencies..."
cd "$SCRIPT_DIR/browser-use"
pip install -e . --quiet --ignore-installed 2>/dev/null || pip install -e . --quiet
echo "    Done."

# 4. n8n-MCP note (pre-built dist available)
echo "[4/4] n8n-MCP: using pre-built dist (no install needed)."
echo "      Set N8N_API_URL and N8N_API_KEY env vars to connect to your n8n instance."

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Skills available in .claude/skills/:"
ls "$SCRIPT_DIR/../.claude/skills/" | sed 's/^/  \//'
echo ""
echo "MCP servers configured in .claude/settings.json:"
echo "  - n8n-mcp (n8n workflow automation)"
echo ""
echo "See CLAUDE.md for full documentation."
