#!/usr/bin/env bash

set -euo pipefail

SOURCE_REMOTE="origin"
TARGET_REMOTE="github"
BASE_BRANCH="master"
LOCAL_PREFIX="github-pr"

echo "=== GitHub PR preparation ==="

# 1. Check required remotes
for remote in "$SOURCE_REMOTE" "$TARGET_REMOTE"; do
    if ! git remote get-url "$remote" >/dev/null 2>&1; then
        echo "ERROR: Remote '$remote' not found."
        exit 1
    fi
done

echo "[OK] Required remotes exist."

# 2. Check working tree
OTHER_CHANGES="$(git status --porcelain -- . ':!scripts/prepare-github-pr.sh')"

if [[ -n "$OTHER_CHANGES" ]]; then
    echo "ERROR: Working tree contains changes outside this script."
    echo "$OTHER_CHANGES"
    exit 1
fi

echo "[OK] No changes outside the preparation script."

# 3. Determine source branch
SOURCE_BRANCH="$(git branch --show-current)"

if [[ -z "$SOURCE_BRANCH" || "$SOURCE_BRANCH" == "$BASE_BRANCH" ]]; then
    echo "ERROR: Switch to a task branch before running this script."
    exit 1
fi

echo "[OK] Source branch: $SOURCE_BRANCH"

# 4. Fetch latest remote data
echo "Fetching latest remote data..."
git fetch "$SOURCE_REMOTE"
git fetch "$TARGET_REMOTE"

SOURCE_BASE="${SOURCE_REMOTE}/${BASE_BRANCH}"
TARGET_BASE="${TARGET_REMOTE}/${BASE_BRANCH}"
SOURCE_TRACKING="${SOURCE_REMOTE}/${SOURCE_BRANCH}"

# 5. Check base branches
for branch in "$SOURCE_BASE" "$TARGET_BASE" "$SOURCE_TRACKING"; do
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
    exit 1
fi

echo "[OK] Master branches contain identical files."

# 7. Check source branch synchronization
if [[ "$(git rev-parse HEAD)" != "$(git rev-parse "$SOURCE_TRACKING")" ]]; then
    echo "ERROR: Local source branch differs from Sphere."
    echo "Push or synchronize your source branch before continuing."
    exit 1
fi

if ! git merge-base --is-ancestor "$SOURCE_BASE" HEAD; then
    echo "ERROR: Source branch does not contain the latest Sphere master."
    echo "Update it manually and retry."
    exit 1
fi

echo "[OK] Source branch is synchronized with Sphere."
echo "[OK] Source branch contains the latest Sphere master."

# 8. Determine target branch names
LOCAL_TARGET_BRANCH="${LOCAL_PREFIX}/${SOURCE_BRANCH}"

if ! git check-ref-format --branch "$LOCAL_TARGET_BRANCH" >/dev/null 2>&1; then
    echo "ERROR: Invalid target branch name."
    exit 1
fi

if git show-ref --verify --quiet "refs/heads/${LOCAL_TARGET_BRANCH}"; then
    echo "ERROR: Local branch '$LOCAL_TARGET_BRANCH' already exists."
    exit 1
fi

if git show-ref --verify --quiet "refs/remotes/${TARGET_REMOTE}/${SOURCE_BRANCH}"; then
    echo "ERROR: GitHub branch '$SOURCE_BRANCH' already exists."
    exit 1
fi

echo "[OK] Target branch names are available."

# 9. Create patch with task changes
PATCH_FILE="$(mktemp)"
trap 'rm -f "$PATCH_FILE"' EXIT

git diff --binary --full-index "${SOURCE_BASE}...HEAD" > "$PATCH_FILE"

if [[ ! -s "$PATCH_FILE" ]]; then
    echo "ERROR: No changes found in the source branch."
    exit 1
fi

echo "[OK] Task changes prepared."

# 10. Create local branch from GitHub master
echo "Creating local target branch..."
git switch -c "$LOCAL_TARGET_BRANCH" "$TARGET_BASE"

# 11. Apply task changes
echo "Applying task changes..."

if ! git apply --index "$PATCH_FILE"; then
    echo "ERROR: Patch could not be applied cleanly."
    echo "The target branch was preserved for inspection."
    exit 1
fi

echo "[OK] Task changes applied."

# 12. Show result
echo
echo "=== Prepared changes ==="

git diff --cached --check
git diff --cached --stat
echo
git diff --cached --name-status

echo
echo "=== Preparation completed ==="
echo "Local branch: $LOCAL_TARGET_BRANCH"
echo "GitHub branch: $SOURCE_BRANCH"
echo
echo "Review the staged changes before committing."
echo "Then run:"
echo "  git diff --cached"
echo "  git commit -m \"your commit message\""
echo "  git push $TARGET_REMOTE HEAD:refs/heads/$SOURCE_BRANCH"
echo
echo "No commits or pushes were performed."
