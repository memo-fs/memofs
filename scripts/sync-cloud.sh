#!/usr/bin/env bash
set -euo pipefail

# Sync everything from the OSS repo (memofs) → private repo (memofs-cloud).
#
# The OSS repo contains only public packages — apps/cloud/ does not exist
# there (gitignored + physically removed). The private repo is the superset:
# it has everything the OSS repo has, PLUS apps/cloud/ (the cloud app).
#
# This script rsyncs the full OSS repo into the private repo, excluding:
#   - .git/          (private repo has its own history)
#   - apps/cloud/    (private repo owns this; never created or overwritten by rsync)
#   - build artifacts, node_modules, secrets, runtime data, etc.
#
# After rsync, it fixes .gitignore (re-removes the "apps/cloud" line that
# comes from the OSS repo) so the private repo keeps tracking apps/cloud/.
#
# Usage:
#   ./scripts/sync-cloud.sh                # sync + commit + push
#   ./scripts/sync-cloud.sh --no-push      # sync + commit, don't push
#   ./scripts/sync-cloud.sh --dry-run      # preview what rsync would change
#   ./scripts/sync-cloud.sh --commit-only  # skip rsync, just commit current state

PRIVATE_REPO_DIR="${PRIVATE_REPO_DIR:-$HOME/Desktop/projects/memofs-cloud}"
OSS_REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -d "$PRIVATE_REPO_DIR/.git" ]; then
	echo "Error: $PRIVATE_REPO_DIR is not a git repo."
	echo "Set PRIVATE_REPO_DIR to point at your memofs-cloud clone."
	exit 1
fi

PUSH=true
DRY_RUN=false
COMMIT_ONLY=false

for arg in "$@"; do
	case "$arg" in
		--no-push)     PUSH=false ;;
		--dry-run)     DRY_RUN=true; PUSH=false ;;
		--commit-only) COMMIT_ONLY=true ;;
	esac
done

# ── rsync ──────────────────────────────────────────────────────────────

if [ "$COMMIT_ONLY" = false ]; then
	echo "Syncing OSS → $PRIVATE_REPO_DIR"
	echo "(apps/cloud/ is preserved, not overwritten)"
	echo

	RSYNC_FLAGS="-av --delete
		--exclude .git
		--exclude apps/cloud
		--exclude node_modules
		--exclude .pnpm-store
		--exclude .memofs
		--exclude .tekmemo
		--exclude build
		--exclude dist
		--exclude .turbo
		--exclude .typecheck
		--exclude *.tsbuildinfo
		--exclude .DS_Store"

	if $DRY_RUN; then
		RSYNC_FLAGS="$RSYNC_FLAGS --dry-run"
	fi

	eval rsync $RSYNC_FLAGS \
		"$OSS_REPO_DIR/" \
		"$PRIVATE_REPO_DIR/"

	# Fix .gitignore: the OSS .gitignore has "apps/cloud" (it gitignores the
	# cloud app to keep it out of the public repo). That line would cause the
	# private repo to stop tracking apps/cloud/. Remove it after rsync.
	if [ "$DRY_RUN" = false ]; then
		if grep -q '^apps/cloud$' "$PRIVATE_REPO_DIR/.gitignore" 2>/dev/null; then
			sed -i '' '/^apps\/cloud$/d' "$PRIVATE_REPO_DIR/.gitignore"
			echo "Fixed .gitignore (removed apps/cloud line)"
		fi
	fi

	if $DRY_RUN; then
		echo
		echo "[dry-run] Done. No changes committed."
		exit 0
	fi
fi

# ── commit + push ──────────────────────────────────────────────────────

cd "$PRIVATE_REPO_DIR"

git add -A

if git diff --cached --quiet; then
	echo "No changes to sync."
	exit 0
fi

echo
echo "Staged changes:"
git diff --cached --stat

echo
CHANGED_FILES=$(git diff --cached --name-only | wc -l | tr -d ' ')
COMMIT_MSG="sync: from OSS repo

$CHANGED_FILES files changed.
Synced at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

git commit -m "$COMMIT_MSG"

if $PUSH; then
	git push origin HEAD
	echo
	echo "Pushed to origin."
else
	echo
	echo "Committed. Not pushed (--no-push)."
fi
