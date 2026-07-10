#!/usr/bin/env bash
set -euo pipefail

usage() {
  local code="${1:-0}"
  echo "Usage: $(basename "$0") --org <org> --topic <topic> [--since <ISO8601>] [--exclude-approved]"
  echo
  echo "List open, non-draft PRs across all repos in a GitHub org that share a topic."
  echo
  echo "Options:"
  echo "  --org              GitHub organization (required)"
  echo "  --topic            Repository topic to filter by (required)"
  echo "  --since            ISO 8601 cutoff timestamp (e.g., 2026-03-11T00:00:00Z). Only include"
  echo "                     PRs created or updated on or after this time. Default: no time filter."
  echo "  --exclude-approved Omit PRs with an APPROVED review decision"
  echo "  --help             Show this help message"
  exit "$code"
}

org=""
topic=""
since=""
exclude_approved=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --org)
      [[ $# -lt 2 || "$2" == --* ]] && { echo "Error: $1 requires a value" >&2; exit 1; }
      org="$2"; shift 2 ;;
    --topic)
      [[ $# -lt 2 || "$2" == --* ]] && { echo "Error: $1 requires a value" >&2; exit 1; }
      topic="$2"; shift 2 ;;
    --since)
      [[ $# -lt 2 || "$2" == --* ]] && { echo "Error: $1 requires a value" >&2; exit 1; }
      since="$2"; shift 2 ;;
    --exclude-approved) exclude_approved=true; shift ;;
    --help) usage ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$org" || -z "$topic" ]]; then
  echo "Error: --org and --topic are required" >&2
  usage 1
fi

if ! repo_names=$(gh repo list "$org" --topic="$topic" --limit=200 --json name --jq '.[].name'); then
  echo "Error: failed to list repositories for org '${org}' and topic '${topic}'." >&2
  exit 1
fi
mapfile -t repos <<< "$repo_names"

# mapfile on empty string produces a single empty element; treat as no results
if [[ ${#repos[@]} -eq 0 || (${#repos[@]} -eq 1 && -z "${repos[0]}") ]]; then
  echo "No repositories found in ${org} with topic '${topic}'." >&2
  exit 0
fi

echo "Found ${#repos[@]} repos with topic '${topic}'." >&2

if [[ -n "$since" ]] && ! [[ "$since" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(Z|[+-][0-9]{2}:[0-9]{2})$ ]]; then
  echo "Error: --since must be ISO 8601 (e.g., 2026-03-11T00:00:00Z)" >&2
  exit 1
fi

since_filter=""
if [[ -n "$since" ]]; then
  since_filter="| select(.updatedAt >= \"${since}\" or .createdAt >= \"${since}\")"
fi

approve_filter=""
if [[ "$exclude_approved" == "true" ]]; then
  approve_filter='| select(.reviewDecision != "APPROVED")'
fi

err=$(mktemp)
out=$(mktemp)
trap 'rm -f "$err" "$out"' EXIT

for repo in "${repos[@]}"; do
  if ! gh pr list \
    --repo "${org}/${repo}" \
    --limit 200 \
    --state open \
    --json number,title,author,createdAt,updatedAt,isDraft,url,reviewDecision \
    --jq "
      .[] |
      select(.isDraft == false)
      ${since_filter}
      ${approve_filter} |
      {repo: \"${repo}\"} + .
    " >> "$out" 2>"$err"; then
    echo "Warning: failed to list PRs for ${org}/${repo}: $(cat "$err")" >&2
  fi
done

jq -s 'group_by(.repo) | sort_by(.[0].repo) | map(sort_by(.updatedAt) | reverse) | flatten | .[]' "$out"
