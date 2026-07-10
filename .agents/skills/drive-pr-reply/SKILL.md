---
name: drive-pr-reply
description: Use when the operator asks to reply to PR comments, address PR feedback, respond to reviewers, or handle outstanding review threads on a PR they authored.
metadata:
  version: "2026.5.18"
---

# PR Reply

Process unresolved review comments on an open PR. You are the PR author — you
hold the domain context and decide what feedback is valid and in scope.

## Pre-conditions

The GitHub CLI (`gh`) must be installed and authenticated. Verify with:

```bash
gh auth status
```

If unavailable, instruct the operator to install and authenticate before
proceeding.

## Workflow

### 1. Identify the PR

If the operator provides a PR number or URL, use it directly. If the PR was
created earlier in the current conversation, use that. Otherwise, detect from
the current branch:

```bash
gh pr view --json number,url
```

### 2. Collect unresolved comments

Use the GraphQL API to fetch only unresolved review threads (the REST API has
no concept of thread resolution):

```bash
./fetch-threads.sh <owner> <repo> <number>
```

Filter to threads where `isResolved` is `false`. Each thread's `comments.nodes`
contains the full conversation in order. Each comment has both `id` (GraphQL
node ID, used for thread resolution) and `databaseId` (numeric ID, used for
replying via the REST API).

### 3. Assess each comment

For each unresolved thread, evaluate the feedback against these criteria:

- **Valid and in scope**: The comment identifies a real issue the current PR
  should fix. Implement the change.
- **Valid but out of scope**: The comment identifies a real issue, but fixing it
  belongs in a separate change. Do **not** implement it. Add to the out-of-scope
  list.
- **Not valid or not relevant**: The comment is based on a misunderstanding,
  applies to a different context, or conflicts with the PR's intent. Do **not**
  implement it.

You are the PR author. You decide what is valid and in scope. Do not adopt
changes just because a reviewer suggested them. If a comment raises a concern
you cannot assess (e.g., organizational policy, cross-team impact), flag it
and ask the operator before proceeding.

### 4. Implement valid in-scope feedback

For each comment assessed as valid and in scope, make the change and commit
individually. Do **not** push yet — batch all commits into a single push to
avoid wasteful CI runs and automated reviews.

1. Make the change in the codebase.
2. Commit with a message referencing the comment (e.g., `fix: address review
feedback on error handling`).
3. Repeat for all valid in-scope comments before proceeding.
4. Push once after all commits are ready.

### 5. Reply to every comment

After the push, reply to each unresolved comment using the numeric
`databaseId` from step 2 (not the GraphQL node ID — the REST API requires a
numeric integer):

```bash
./reply-comment.sh <owner> <repo> <number> <databaseId> <reply>
```

Do **not** use `gh pr comment` as a fallback if the reply call fails. It
posts top-level issue comments, not in-thread replies, creating off-thread
noise that cannot be deleted.

Reply format:

- **Implemented**: State what changed and why (e.g., "Updated to use the
  typed constant as suggested. Pushed in abc1234.")
- **Out of scope**: Acknowledge the point, state it's out of scope, and
  reference the F-number (e.g., "Good point, but this is out of scope for this
  change. Captured as F1 for follow-up.")
- **Not valid**: Explain concisely why the feedback doesn't apply (e.g., "The
  null check is intentional — this code path receives values from the legacy
  format that omits this field.")

### 6. Resolve threads

After replying, resolve the thread if:

- You implemented the feedback and pushed the change, **or**
- The last reply in the thread is from you (the author) and the reviewer has not
  pushed back, **or**
- You explained why the feedback doesn't apply and the reviewer accepted your
  response (no further pushback).

Resolve using the GraphQL mutation:

```bash
./resolve-thread.sh <thread_id>
```

The `thread_id` is the GraphQL node ID from the thread fetched in step 2.

Do **not** resolve a thread where the reviewer's last message indicates
disagreement or a follow-up question that you haven't answered.

### 7. Report out-of-scope items

After processing all comments, if any valid-but-out-of-scope items were
identified, present them to the operator as a follow-up list:

```markdown
## Out-of-scope items for follow-up

- **F1**: [Summary of item 1] — suggested by @reviewer in [comment link]
- **F2**: [Summary of item 2] — suggested by @reviewer in [comment link]
```

Suggest the operator capture these as tickets.
