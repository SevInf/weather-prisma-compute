#!/usr/bin/env bash
set -euo pipefail

owner="${1:?Usage: fetch-threads.sh <owner> <repo> <number>}"
repo="${2:?Usage: fetch-threads.sh <owner> <repo> <number>}"
number="${3:?Usage: fetch-threads.sh <owner> <repo> <number>}"

gh api graphql -f query="
query {
  repository(owner: \"${owner}\", name: \"${repo}\") {
    pullRequest(number: ${number}) {
      reviewThreads(first: 100) {
        nodes {
          isResolved
          path
          line
          comments(first: 20) {
            nodes {
              databaseId
              id
              body
              author { login }
              isMinimized
            }
          }
        }
      }
    }
  }
}"
