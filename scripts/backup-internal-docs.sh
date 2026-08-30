#!/usr/bin/env bash
set -euo pipefail

# Script to sync gitignored documentation from memofs/docs to internal-docs repo

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEMOFS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET_DIR="${INTERNAL_DOCS_DIR:-"$(cd "$MEMOFS_DIR/../internal-docs" 2>/dev/null && pwd || echo "$MEMOFS_DIR/../internal-docs")"}"

if [ ! -d "$TARGET_DIR" ]; then
  echo "Creating target directory: $TARGET_DIR"
  mkdir -p "$TARGET_DIR"
fi

# Ensure target is a git repository
if [ ! -d "$TARGET_DIR/.git" ]; then
  echo "Initializing git repository in $TARGET_DIR"
  git -C "$TARGET_DIR" init -b main
fi

echo "Scanning for gitignored files in $MEMOFS_DIR/docs/..."

# Collect all ignored files under docs/
# We use a temporary file to safely handle spaces or special characters
TMP_FILE_LIST="$(mktemp)"
trap 'rm -f "$TMP_FILE_LIST"' EXIT

git -C "$MEMOFS_DIR" ls-files --others -i --exclude-standard docs > "$TMP_FILE_LIST"

COPIED_COUNT=0
MANAGED_FILES_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE_LIST" "$MANAGED_FILES_FILE"' EXIT

while IFS= read -r file; do
  [ -z "$file" ] && continue
  
  # Strip leading "docs/" prefix to mirror at root of internal-docs
  rel_path="${file#docs/}"
  echo "$rel_path" >> "$MANAGED_FILES_FILE"
  
  src_path="$MEMOFS_DIR/$file"
  dest_path="$TARGET_DIR/$rel_path"
  
  if [ -f "$src_path" ]; then
    mkdir -p "$(dirname "$dest_path")"
    cp -p "$src_path" "$dest_path"
    COPIED_COUNT=$((COPIED_COUNT + 1))
  fi
done < "$TMP_FILE_LIST"

echo "Copied $COPIED_COUNT gitignored documentation files to $TARGET_DIR."

# Remove files in managed directories of internal-docs that no longer exist in memofs/docs
if [ -s "$MANAGED_FILES_FILE" ]; then
  # List existing files in target repo excluding git/meta files
  while IFS= read -r dest_file; do
    [ -z "$dest_file" ] && continue
    # Normalize relative path
    rel_dest="${dest_file#./}"
    if [ "$rel_dest" != "README.md" ] && [ "$rel_dest" != ".gitignore" ] && ! grep -Fxq "$rel_dest" "$MANAGED_FILES_FILE"; then
      echo "Pruning deleted file from internal-docs: $rel_dest"
      rm -f "$TARGET_DIR/$rel_dest"
    fi
  done < <(cd "$TARGET_DIR" && find . -type f ! -path "./.git/*" ! -name ".gitignore" ! -name "README.md")
  
  # Clean empty directories
  find "$TARGET_DIR" -type d -empty ! -path "$TARGET_DIR/.git*" -delete 2>/dev/null || true
fi

# Stage and commit in target repository if changed
if [ -d "$TARGET_DIR/.git" ]; then
  STATUS=$(git -C "$TARGET_DIR" status --porcelain)
  if [ -n "$STATUS" ]; then
    git -C "$TARGET_DIR" add -A
    COMMIT_TIMESTAMP="$(date -u +"%Y-%m-%d %H:%M:%S UTC")"
    git -C "$TARGET_DIR" commit -m "backup: sync internal docs from memofs ($COMMIT_TIMESTAMP)"
    COMMIT_HASH=$(git -C "$TARGET_DIR" rev-parse --short HEAD)
    echo "Successfully committed changes in internal-docs [commit $COMMIT_HASH]."
  else
    echo "internal-docs is already up to date with latest memofs docs."
  fi
fi

echo "Internal docs backup completed successfully."
