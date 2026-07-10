#!/usr/bin/env bash
set -euo pipefail

owner="${1:?Usage: reply-comment.sh <owner> <repo> <number> <comment_id> <reply>}"
repo="${2:?Usage: reply-comment.sh <owner> <repo> <number> <comment_id> <reply>}"
number="${3:?Usage: reply-comment.sh <owner> <repo> <number> <comment_id> <reply>}"
comment_id="${4:?Usage: reply-comment.sh <owner> <repo> <number> <comment_id> <reply>}"
reply="${5:?Usage: reply-comment.sh <owner> <repo> <number> <comment_id> <reply>}"

# Write reply to a temp file instead of passing directly to avoid
# shell escaping issues with markdown content.
TMPFILE="/tmp/pr-reply.${comment_id}.md"
trap 'rm -f "$TMPFILE"' EXIT
touch "$TMPFILE"
echo "$reply" > "$TMPFILE"

gh api "repos/${owner}/${repo}/pulls/${number}/comments" \
  -F body=@"$TMPFILE" \
  -F in_reply_to="$comment_id"
