#!/usr/bin/env bash
# Build the fox-code VS Code extension and package it as a VSIX.
#
# Steps:
#   1. Build the bundled CLI binary (packages/opencode/dist → packages/kilo-vscode/bin/)
#   2. Prepare the auto-generated SDK
#   3. Build the extension bundle (TypeScript + esbuild production)
#   4. Package as fox-code.vsix via @vscode/vsce
#
# Output: packages/kilo-vscode/out/fox-code.vsix

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXT_DIR="$SCRIPT_DIR/packages/kilo-vscode"
OUT_DIR="$EXT_DIR/out"

echo "=== Building fox-code extension ==="

# Ensure output directory exists
mkdir -p "$OUT_DIR"

# Step 1: Build the CLI binary
echo "[1/4] Building CLI binary..."
(
  cd "$EXT_DIR"
  bun run prepare:cli-binary
)

# Step 2: Prepare the SDK
echo "[2/4] Preparing SDK..."
(
  cd "$EXT_DIR"
  bun run prepare:sdk
)

# Step 3: Build the extension bundle (production)
echo "[3/4] Building extension bundle..."
(
  cd "$EXT_DIR"
  bun run bundle:production
)

# Step 4: Package as VSIX
echo "[4/4] Packaging fox-code.vsix..."
(
  cd "$EXT_DIR"
  bunx vsce package --no-dependencies -o "$OUT_DIR/fox-code.vsix"
)

echo "=== Done ==="
echo "Output: $OUT_DIR/fox-code.vsix"
