#!/usr/bin/env bash
set -euo pipefail

# Script to restore internal documentation from internal-docs repo back to memofs/docs/

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEMOFS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_DIR="${INTERNAL_DOCS_DIR:-"$(cd "$MEMOFS_DIR/../internal-docs" 2>/dev/null && pwd || echo "$MEMOFS_DIR/../internal-docs")"}"
DEST_DOCS_DIR="$MEMOFS_DIR/docs"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "Error: source directory $SOURCE_DIR not found." >&2
  exit 1
fi

mkdir -p "$DEST_DOCS_DIR"

echo "Restoring internal docs from $SOURCE_DIR to $DEST_DOCS_DIR..."

RESTORED_COUNT=0

while IFS= read -r file; do
  [ -z "$file" ] && continue
  rel_path="${file#./}"
  
  # Skip git metadata and repository description files
  if [ "$rel_path" = ".gitignore" ] || [ "$rel_path" = "README.md" ]; then
    continue
  fi
  
  src_file="$SOURCE_DIR/$rel_path"
  dest_file="$DEST_DOCS_DIR/$rel_path"
  
  mkdir -p "$(dirname "$dest_file")"
  cp -p "$src_file" "$dest_file"
  RESTORED_COUNT=$((RESTORED_COUNT + 1))
done < <(cd "$SOURCE_DIR" && find . -type f ! -path "./.git/*")

echo "Successfully restored $RESTORED_COUNT files into $DEST_DOCS_DIR."
