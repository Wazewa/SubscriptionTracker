#!/usr/bin/env bash

set -euo pipefail

SOURCE_REMOTE="origin"
TARGET_REMOTE="github"
BASE_BRANCH="master"
LOCAL_PREFIX="github-pr"

SOURCE_BRANCH="$(git branch --show-current)"
SOURCE_COMMIT="$(git rev-parse HEAD)"

echo "=== GitHub PR preparation ==="

# 1. Check required remotes
for remote in "$SOURCE_REMOTE" "$TARGET_REMOTE"; do
    if ! git remote get-url "$remote" >/dev/null 2>&1; then
        echo "ERROR: Remote '$remote' not found."
        exit 1
    fi
done

SOURCE_PUSH_URL="$(git remote get-url "$SOURCE_REMOTE")"
TARGET_PUSH_URL="$(git remote get-url "$TARGET_REMOTE")"

# Protect against accidentally pushing to the wrong repositories.
if [[ "$SOURCE_PUSH_URL" != *sferaplatform.ru* ]]; then
    echo "ERROR: Source remote does not point to Sphere."
    echo "URL: $SOURCE_PUSH_URL"
    exit 1
fi

if [[ "$TARGET_PUSH_URL" != *github.com* ]]; then
    echo "ERROR: Target remote does not point to GitHub."
    echo "URL: $TARGET_PUSH_URL"
    exit 1
fi

echo "[OK] Remotes point to Sphere and GitHub."

# 2. Check source branch
if [[ -z "$SOURCE_BRANCH" || "$SOURCE_BRANCH" == "$BASE_BRANCH" ]]; then
    echo "ERROR: Switch to a task branch before running this script."
    exit 1
fi

echo "[OK] Source branch: $SOURCE_BRANCH"

# 3. Check working tree
if [[ -n "$(git status --porcelain)" ]]; then
    echo "ERROR: Working tree is not clean."
    echo "Commit or stash your changes before running this script."
    exit 1
fi

echo "[OK] Working tree is clean."

# 4. Fetch latest remote data
echo "Fetching latest remote data..."
git fetch "$SOURCE_REMOTE"
git fetch "$TARGET_REMOTE"

SOURCE_BASE="${SOURCE_REMOTE}/${BASE_BRANCH}"
TARGET_BASE="${TARGET_REMOTE}/${BASE_BRANCH}"

# 5. Check required remote branches
for branch in "$SOURCE_BASE" "$TARGET_BASE"; do
    if ! git rev-parse --verify "$branch" >/dev/null 2>&1; then
        echo "ERROR: Required branch '$branch' not found."
        exit 1
    fi
done

echo "[OK] Required remote branches exist."

# 6. Compare master trees
SOURCE_TREE="$(git rev-parse "${SOURCE_BASE}^{tree}")"
TARGET_TREE="$(git rev-parse "${TARGET_BASE}^{tree}")"

if [[ "$SOURCE_TREE" != "$TARGET_TREE" ]]; then
    echo "ERROR: Sphere master and GitHub master have different file trees."
    echo "Synchronize master branches before continuing."
    exit 1
fi

echo "[OK] Master branches contain identical files."

# 7. Check source branch synchronization
if ! REMOTE_SOURCE="$(git ls-remote --heads "$SOURCE_PUSH_URL" "refs/heads/${SOURCE_BRANCH}")"; then
    echo "ERROR: Could not check Sphere source branch."
    exit 1
fi

if [[ -z "$REMOTE_SOURCE" ]]; then
    echo "[OK] Source branch will be published to Sphere for the first time."
elif [[ "$SOURCE_COMMIT" != "${REMOTE_SOURCE%%$'\t'*}" ]]; then
    echo "ERROR: Local source branch differs from Sphere."
    echo "Push or synchronize your source branch before continuing."
    exit 1
else
    echo "[OK] Source branch is synchronized with Sphere."
fi

if ! git merge-base --is-ancestor "$SOURCE_BASE" "$SOURCE_COMMIT"; then
    echo "ERROR: Source branch does not contain the latest Sphere master."
    echo "Update it manually and retry."
    exit 1
fi

# 8. Check target branch availability
LOCAL_TARGET_BRANCH="${LOCAL_PREFIX}/${SOURCE_BRANCH}"

if ! git check-ref-format --branch "$LOCAL_TARGET_BRANCH" >/dev/null 2>&1; then
    echo "ERROR: Invalid target branch name."
    exit 1
fi

if git show-ref --verify --quiet "refs/heads/${LOCAL_TARGET_BRANCH}"; then
    echo "ERROR: Local target branch already exists."
    echo "Inspect or rename it before retrying."
    exit 1
fi

if ! REMOTE_TARGET="$(git ls-remote --heads "$TARGET_PUSH_URL" "refs/heads/${SOURCE_BRANCH}")"; then
    echo "ERROR: Could not check GitHub target branch."
    exit 1
fi

if [[ -n "$REMOTE_TARGET" ]]; then
    echo "ERROR: GitHub target branch already exists."
    exit 1
fi

echo "[OK] Target branch names are available."

# 9. Prepare task patch
PATCH_FILE="$(mktemp)"
trap 'rm -f "$PATCH_FILE"' EXIT

git diff --binary --full-index "${SOURCE_BASE}...${SOURCE_COMMIT}" > "$PATCH_FILE"

if [[ ! -s "$PATCH_FILE" ]]; then
    echo "ERROR: No task changes found."
    exit 1
fi

echo "[OK] Task changes prepared."

# 10. Create local target branch
echo "Creating local GitHub branch..."
git switch -c "$LOCAL_TARGET_BRANCH" "$TARGET_BASE"

# 11. Apply task changes
echo "Applying task changes..."

if ! git apply --index "$PATCH_FILE"; then
    echo "ERROR: Patch could not be applied cleanly."
    echo "Target branch preserved for inspection:"
    echo "$LOCAL_TARGET_BRANCH"
    exit 1
fi

git diff --cached --check

echo "[OK] Task changes applied."

# 12. Create GitHub commit
git diff --cached --stat
git diff --cached --name-status

echo
read -r -p "Create GitHub commit? [y/N] " COMMIT_CONFIRM

if [[ ! "$COMMIT_CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Cancelled. Target branch preserved:"
    echo "$LOCAL_TARGET_BRANCH"
    exit 0
fi

git commit \
    -m "Prepare GitHub PR for ${SOURCE_BRANCH}" \
    -m "Source-Commit: $SOURCE_COMMIT"

TARGET_COMMIT="$(git rev-parse HEAD)"

# 13. Confirm publication
echo
echo "=== Publication plan ==="
echo "Sphere branch: $SOURCE_BRANCH"
echo "Sphere commit: $SOURCE_COMMIT"
echo "GitHub branch: $SOURCE_BRANCH"
echo "GitHub commit: $TARGET_COMMIT"
echo "Local preparation branch: $LOCAL_TARGET_BRANCH"
echo

read -r -p "Push source branch to Sphere and prepared branch to GitHub? [y/N] " PUSH_CONFIRM

if [[ ! "$PUSH_CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Publication cancelled."
    echo "Prepared branch preserved: $LOCAL_TARGET_BRANCH"
    exit 0
fi

# 14. Push original source commit to Sphere only
echo "Pushing source branch to Sphere..."

if ! git push "$SOURCE_PUSH_URL" \
    "${SOURCE_COMMIT}:refs/heads/${SOURCE_BRANCH}"; then
    echo "ERROR: Sphere push failed."
    echo "Prepared branch preserved: $LOCAL_TARGET_BRANCH"
    exit 1
fi

echo "[OK] Source branch pushed to Sphere."

# 15. Push prepared commit to GitHub only
echo "Pushing prepared branch to GitHub..."

if ! git push "$TARGET_PUSH_URL" \
    "${TARGET_COMMIT}:refs/heads/${SOURCE_BRANCH}"; then
    echo "ERROR: GitHub push failed."
    echo "Sphere push succeeded, but GitHub push did not."
    echo "Retry GitHub publication from the current branch with:"
    echo "git push \"$TARGET_PUSH_URL\" \"${TARGET_COMMIT}:refs/heads/${SOURCE_BRANCH}\""
    echo "Prepared branch preserved: $LOCAL_TARGET_BRANCH"
    exit 1
fi

echo "[OK] Prepared branch pushed to GitHub."

# 16. Return to source branch
git switch "$SOURCE_BRANCH"

echo
echo "=== Preparation completed successfully ==="
echo "Sphere branch: $SOURCE_BRANCH"
echo "GitHub branch: $SOURCE_BRANCH"
echo
echo "Create Pull Requests:"
echo "Sphere: check the repository's Pull Requests page."
echo "GitHub: https://github.com/Wazewa/SubscriptionTracker/pull/new/${SOURCE_BRANCH}"
