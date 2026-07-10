#!/usr/bin/env bash
set -euo pipefail

thread_id="${1:?Usage: resolve-thread.sh <thread_id>}"

gh api graphql -f query="
mutation {
  resolveReviewThread(input: {threadId: \"${thread_id}\"}) {
    thread { isResolved }
  }
}"
