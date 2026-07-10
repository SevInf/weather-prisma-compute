---
name: claude-code-transcripts
description: Use when the operator wants to view, export, or browse Claude Code conversation transcripts as HTML. Also use when asked about session history, conversation logs, or sharing Claude Code sessions.
---

# Claude Code Transcripts

Convert Claude Code JSONL conversation logs into browsable HTML using Simon Willison's `claude-code-transcripts` tool. Runs directly via `uvx` when Python is available, falls back to Docker when it's not.

**Announce at start:** "I'm using the claude-code-transcripts skill to generate a transcript command."

## Workflow

**Do not execute the command yourself.** The default subcommand is an interactive TUI that requires a real terminal. Validate, prepare, then give the operator a ready-to-paste command.

### Step 1: Validate

Run this yourself:

```bash
test -d "$HOME/.claude/projects" || echo "NO_CLAUDE_DATA"
```

If the Claude data directory doesn't exist, stop and tell the operator. There's nothing to convert.

### Step 2: Check for local Python

Run `which uvx` or `which python3` to check if the operator has Python tooling locally. If `uvx` is available, use the **direct path** (no Docker). If not, use the **Docker path**. Docker is a fallback for operators who don't have or don't want local Python — it shouldn't be the default when it's not needed.

### Step 3: Ask the operator for options

Prompt the operator with a structured question for:

1. **Output directory** — default is `/tmp/claude-transcripts`. Let them change it or accept the default.
2. **Mode** — `local` (default, interactive TUI to pick one session) or `all` (convert every session into a browsable archive).
3. **Session limit** (local mode only) — default is `50`. The tool's own default is 10 which is too few for most users. Let them change it or accept the default.

The tool also supports `json <file-or-url>` for converting a single file directly — if the operator asks for this, pass it as the subcommand with the path/URL argument.

### Step 4: Present the command

Write the command to `/tmp/claude-transcripts.sh` with the resolved `OUTPUT_DIR`, make it executable, then tell the operator to run it. This avoids copy-paste issues with multi-line commands in terminal rendering.

**Direct path** (when `uvx` is available locally):

```bash
cat > /tmp/claude-transcripts.sh << 'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
OUTPUT_DIR="<RESOLVED_OUTPUT_DIR>"
mkdir -p "$OUTPUT_DIR"
uvx claude-code-transcripts <MODE> <LIMIT_FLAG> --output "$OUTPUT_DIR"
SCRIPT
chmod +x /tmp/claude-transcripts.sh
```

**Docker path** (fallback when no local Python):

```bash
cat > /tmp/claude-transcripts.sh << 'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
OUTPUT_DIR="<RESOLVED_OUTPUT_DIR>"
mkdir -p "$OUTPUT_DIR"
docker run --rm -it \
  -v "$HOME/.claude":"$HOME/.claude":ro \
  -v "$OUTPUT_DIR":"$OUTPUT_DIR" \
  -e HOME="$HOME" \
  -e UV_CACHE_DIR=/tmp/uv-cache \
  -e UV_TOOL_DIR=/tmp/uv-tools \
  -w "$OUTPUT_DIR" \
  ghcr.io/astral-sh/uv:python3.13-bookworm \
  uvx claude-code-transcripts <MODE> <LIMIT_FLAG> --output "$OUTPUT_DIR"
SCRIPT
chmod +x /tmp/claude-transcripts.sh
```

Replace `<RESOLVED_OUTPUT_DIR>` with the actual output directory path, `<MODE>` with `local` or `all` (or `json <path>` if requested), and `<LIMIT_FLAG>` with `--limit N` for local mode (omit entirely for `all` mode). Then tell the operator:

```
/tmp/claude-transcripts.sh
```

### Step 5: After the operator runs it

Tell the operator where the output landed and give them a `file://` URL to open in a browser: `file://$OUTPUT_DIR/index.html`

Let them know the script is reusable — they can run it again to pick a different session. Each run overwrites the output directory.

### Step 6: Offer cleanup

After the operator has had a chance to view the transcripts, ask if they want to clean up. If yes, remove the script and the output directory:

```bash
rm -f /tmp/claude-transcripts.sh
rm -rf "$OUTPUT_DIR"
```

## References

- https://simonwillison.net/2025/Dec/25/claude-code-transcripts/
- https://pypi.org/project/claude-code-transcripts/

## Design Notes

**Why two paths?** The direct `uvx` path is simpler and faster. Docker exists as a fallback for operators who don't have or don't want local Python installed. Don't use Docker when `uvx` is available — it adds unnecessary complexity.

**Docker specifics:** Runs as container-default root because Claude Code creates JSONL files with `chmod 600`; `--user` causes silent permission failures. The `:ro` mount prevents writes. `UV_CACHE_DIR` and `UV_TOOL_DIR` redirect uv's cache to the container's ephemeral `/tmp` so nothing touches the read-only home mount.

## Troubleshooting

If the operator reports errors, check this table:

| Symptom                                                                            | Fix                                                              |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `Projects folder not found: /root/.claude/projects`                                | Add `-e HOME="$HOME"`                                            |
| `No local sessions found`                                                          | Remove `--user` flag; must run as root                           |
| `Failed to initialize cache` or `failed to create directory .local/share/uv/tools` | Add `-e UV_CACHE_DIR=/tmp/uv-cache -e UV_TOOL_DIR=/tmp/uv-tools` |
| Output disappears after container exits                                            | `--output` must point to a mounted host path                     |
