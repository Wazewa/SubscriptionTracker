#!/usr/bin/env bash

set -euo pipefail

SOURCE_REMOTE="origin"
TARGET_REMOTE="github"
BASE_BRANCH="master"
LOCAL_PREFIX="github-pr"

fail() {
    echo
    echo "ERROR: $*" >&2
    exit 1
}

echo "=== Push to Sphere and GitHub ==="

# 1. Check repository

if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
    fail "Current directory is not a Git repository."
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

SOURCE_BRANCH="$(git branch --show-current)"

if [[ -z "$SOURCE_BRANCH" || "$SOURCE_BRANCH" == "$BASE_BRANCH" ]]; then
    fail "Switch to a task branch before running this script."
fi

SOURCE_COMMIT="$(git rev-parse HEAD)"

echo "[OK] Source branch: $SOURCE_BRANCH"
echo "[OK] Source commit: $SOURCE_COMMIT"

# 2. Check working tree

if [[ -n "$(git status --porcelain)" ]]; then
    fail "Working tree is not clean. Commit or stash your changes first."
fi

echo "[OK] Working tree is clean."

# 3. Check remotes

if ! git remote get-url "$SOURCE_REMOTE" >/dev/null 2>&1; then
    fail "Remote '$SOURCE_REMOTE' not found."
fi

if ! git remote get-url "$TARGET_REMOTE" >/dev/null 2>&1; then
    fail "Remote '$TARGET_REMOTE' not found."
fi

SOURCE_PUSH_URL="$(git remote get-url "$SOURCE_REMOTE")"
TARGET_PUSH_URL="$(git remote get-url "$TARGET_REMOTE")"

if [[ "$SOURCE_PUSH_URL" != *sferaplatform.ru* ]]; then
    fail "Source remote does not point to Sphere: $SOURCE_PUSH_URL"
fi

if [[ "$TARGET_PUSH_URL" != *github.com* ]]; then
    fail "Target remote does not point to GitHub: $TARGET_PUSH_URL"
fi

echo "[OK] Remotes point to Sphere and GitHub."

# 4. Fetch latest remote data

echo
echo "Fetching remote data..."

git fetch "$SOURCE_REMOTE" || fail "Could not fetch Sphere."
git fetch "$TARGET_REMOTE" || fail "Could not fetch GitHub."

SOURCE_BASE="${SOURCE_REMOTE}/${BASE_BRANCH}"
TARGET_BASE="${TARGET_REMOTE}/${BASE_BRANCH}"

SOURCE_TRACKING="${SOURCE_REMOTE}/${SOURCE_BRANCH}"
TARGET_TRACKING="${TARGET_REMOTE}/${SOURCE_BRANCH}"

LOCAL_TARGET_BRANCH="${LOCAL_PREFIX}/${SOURCE_BRANCH}"

# 5. Check required branches

for branch in \
    "$SOURCE_BASE" \
    "$TARGET_BASE" \
    "$SOURCE_TRACKING" \
    "$TARGET_TRACKING" \
    "$LOCAL_TARGET_BRANCH"
do
    if ! git rev-parse --verify "${branch}^{commit}" >/dev/null 2>&1; then
        fail "Required branch '$branch' not found."
    fi
done

echo "[OK] Required branches exist."

# 6. Check master trees

SOURCE_MASTER_TREE="$(git rev-parse "${SOURCE_BASE}^{tree}")"
TARGET_MASTER_TREE="$(git rev-parse "${TARGET_BASE}^{tree}")"

if [[ "$SOURCE_MASTER_TREE" != "$TARGET_MASTER_TREE" ]]; then
    fail "Sphere master and GitHub master have different file trees."
fi

echo "[OK] Master trees are identical."

# 7. Check source branch synchronization

if ! git merge-base --is-ancestor "$SOURCE_TRACKING" "$SOURCE_COMMIT"; then
    fail "Local source branch is behind or diverged from Sphere."
fi

if ! git merge-base --is-ancestor "$SOURCE_BASE" "$SOURCE_COMMIT"; then
    fail "Source branch does not contain the latest Sphere master."
fi

echo "[OK] Source branch can be pushed to Sphere."

# 8. Check GitHub helper branch

if ! git merge-base --is-ancestor "$TARGET_TRACKING" "$LOCAL_TARGET_BRANCH"; then
    fail "Local GitHub helper branch is behind or diverged from GitHub."
fi

if ! git merge-base --is-ancestor "$TARGET_BASE" "$LOCAL_TARGET_BRANCH"; then
    fail "GitHub helper branch does not contain the latest GitHub master."
fi

echo "[OK] GitHub helper branch is based on GitHub master."

# 9. Read Source-Commit from the latest helper commit

MARKER_LINES="$(
    git show -s --format=%B "$LOCAL_TARGET_BRANCH" |
    sed -n 's/^Source-Commit:[[:space:]]*//p'
)"

MARKER_COUNT="$(
    printf '%s\n' "$MARKER_LINES" |
    sed '/^[[:space:]]*$/d' |
    wc -l |
    tr -d ' '
)"

if [[ "$MARKER_COUNT" != "1" ]]; then
    fail "Latest GitHub helper commit must contain exactly one Source-Commit trailer."
fi

LAST_SOURCE_MARKER="$(
    printf '%s\n' "$MARKER_LINES" |
    tail -n 1
)"

if ! LAST_SOURCE_COMMIT="$(
    git rev-parse --verify "${LAST_SOURCE_MARKER}^{commit}" 2>/dev/null
)"; then
    fail "Source-Commit '$LAST_SOURCE_MARKER' cannot be resolved."
fi

echo "[OK] Last synchronized Sphere commit: $LAST_SOURCE_COMMIT"

# 10. Check synchronization point

if ! git merge-base --is-ancestor "$LAST_SOURCE_COMMIT" "$SOURCE_COMMIT"; then
    fail "Source history was rewritten or diverged from the last synchronization point."
fi

SOURCE_MARKER_TREE="$(git rev-parse "${LAST_SOURCE_COMMIT}^{tree}")"
TARGET_CURRENT_TREE="$(git rev-parse "${LOCAL_TARGET_BRANCH}^{tree}")"

if [[ "$SOURCE_MARKER_TREE" != "$TARGET_CURRENT_TREE" ]]; then
    fail "GitHub helper tree differs from the last synchronized Sphere commit."
fi

echo "[OK] Synchronization point is valid."

# 11. Prepare incremental patch

PATCH_FILE="$(mktemp)" || fail "Could not create temporary patch file."

trap 'rm -f "$PATCH_FILE"' EXIT

git diff --binary --full-index \
    "$LAST_SOURCE_COMMIT" \
    "$SOURCE_COMMIT" \
    > "$PATCH_FILE" || fail "Could not create incremental patch."

PATCH_EXISTS=false

if [[ -s "$PATCH_FILE" ]]; then
    PATCH_EXISTS=true
fi

if [[ "$LAST_SOURCE_COMMIT" == "$SOURCE_COMMIT" ]]; then
    echo "[OK] No new Sphere commits to transfer."
elif [[ "$PATCH_EXISTS" == true ]]; then
    echo "[OK] New changes detected."
else
    echo "[OK] Source commit changed, but file tree did not."
fi

# 12. Switch to GitHub helper branch

echo
echo "Switching to $LOCAL_TARGET_BRANCH..."

git switch "$LOCAL_TARGET_BRANCH" ||
    fail "Could not switch to GitHub helper branch."

# 13. Apply new changes if needed

if [[ "$LAST_SOURCE_COMMIT" != "$SOURCE_COMMIT" ]]; then

    if [[ "$PATCH_EXISTS" == true ]]; then
        echo "Applying incremental patch..."

        if ! git apply --index "$PATCH_FILE"; then
            echo
            echo "ERROR: Patch could not be applied cleanly."
            echo "Current branch: $LOCAL_TARGET_BRANCH"
            echo "Inspect the branch and resolve the conflict manually."
            exit 1
        fi

        git diff --cached --check ||
            fail "Whitespace errors detected in the staged patch."

        SOURCE_SUBJECT="$(git log -1 --format=%s "$SOURCE_COMMIT")"

        git commit \
            -m "chore: sync Sphere changes" \
            -m "Source-Commit: $SOURCE_COMMIT" \
            -m "Source-Subject: $SOURCE_SUBJECT" ||
            fail "Could not create GitHub synchronization commit."

    else
        git commit --allow-empty \
            -m "chore: record Sphere synchronization point" \
            -m "Source-Commit: $SOURCE_COMMIT" ||
            fail "Could not create synchronization marker commit."
    fi
fi

TARGET_COMMIT="$(git rev-parse HEAD)"

# 14. Verify resulting state

TARGET_MARKER="$(
    git show -s --format=%B HEAD |
    sed -n 's/^Source-Commit:[[:space:]]*//p'
)"

if ! RESOLVED_TARGET_MARKER="$(
    git rev-parse --verify "${TARGET_MARKER}^{commit}" 2>/dev/null
)"; then
    fail "Could not verify the new GitHub synchronization marker."
fi

if [[ "$RESOLVED_TARGET_MARKER" != "$SOURCE_COMMIT" ]]; then
    fail "GitHub synchronization marker does not match the source commit."
fi

SOURCE_TREE="$(git rev-parse "${SOURCE_COMMIT}^{tree}")"
TARGET_TREE="$(git rev-parse "${TARGET_COMMIT}^{tree}")"

if [[ "$SOURCE_TREE" != "$TARGET_TREE" ]]; then
    fail "Source and GitHub helper branches have different file trees."
fi

echo "[OK] GitHub helper branch matches the source tree."

# 15. Show publication plan

echo
echo "=== Publication plan ==="
echo "Sphere:"
echo "  Branch: $SOURCE_BRANCH"
echo "  Commit: $SOURCE_COMMIT"
echo
echo "GitHub:"
echo "  Branch: $SOURCE_BRANCH"
echo "  Commit: $TARGET_COMMIT"
echo "  Local branch: $LOCAL_TARGET_BRANCH"
echo

# 16. Push source branch to Sphere

CURRENT_SOURCE_REMOTE="$(git rev-parse "$SOURCE_TRACKING")"

if [[ "$CURRENT_SOURCE_REMOTE" != "$SOURCE_COMMIT" ]]; then
    echo "Pushing source branch to Sphere..."

    if ! git push "$SOURCE_PUSH_URL" \
        "${SOURCE_COMMIT}:refs/heads/${SOURCE_BRANCH}"; then

        echo "ERROR: Sphere push failed."
        echo "Local GitHub helper commit is preserved."

        git switch "$SOURCE_BRANCH" ||
            echo "Could not return to source branch."

        exit 1
    fi
else
    echo "[OK] Sphere is already up to date."
fi

# 17. Push helper branch to GitHub

CURRENT_TARGET_REMOTE="$(git rev-parse "$TARGET_TRACKING")"

if [[ "$CURRENT_TARGET_REMOTE" != "$TARGET_COMMIT" ]]; then
    echo "Pushing prepared branch to GitHub..."

    if ! git push "$TARGET_PUSH_URL" \
        "${TARGET_COMMIT}:refs/heads/${SOURCE_BRANCH}"; then

        echo "ERROR: GitHub push failed."
        echo "Sphere push may already have succeeded."
        echo "Local GitHub helper commit is preserved."
        echo "Run this script again after resolving the problem."

        git switch "$SOURCE_BRANCH" ||
            echo "Could not return to source branch."

        exit 1
    fi
else
    echo "[OK] GitHub is already up to date."
fi

# 18. Verify remote state

echo
echo "Verifying remote branches..."

git fetch "$SOURCE_REMOTE" ||
    fail "Could not verify Sphere after push."

git fetch "$TARGET_REMOTE" ||
    fail "Could not verify GitHub after push."

FINAL_SOURCE_SHA="$(git rev-parse "$SOURCE_TRACKING")"
FINAL_TARGET_SHA="$(git rev-parse "$TARGET_TRACKING")"

if [[ "$FINAL_SOURCE_SHA" != "$SOURCE_COMMIT" ]]; then
    echo "WARNING: Sphere branch changed after publication."
fi

if [[ "$FINAL_TARGET_SHA" != "$TARGET_COMMIT" ]]; then
    echo "WARNING: GitHub branch changed after publication."
fi

# 19. Return to source branch

git switch "$SOURCE_BRANCH" ||
    fail "Publication completed, but could not return to source branch."

echo
echo "=== Push completed ==="
echo "Sphere: $FINAL_SOURCE_SHA"
echo "GitHub: $FINAL_TARGET_SHA"
echo "Current branch: $SOURCE_BRANCH"
echo
echo "Both repositories have been processed."