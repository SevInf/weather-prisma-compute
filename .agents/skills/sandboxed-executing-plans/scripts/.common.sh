#!/usr/bin/env bash
# common.sh: Shared functions for sandbox scripts

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

ok() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }

# run command as original user when running under sudo
# bwrap restrictions only apply to unprivileged users, so tests must run as user
# -H sets HOME to target user's home directory
run_as_user() {
    if [[ -n "${SUDO_USER:-}" && "$EUID" -eq 0 ]]; then
        sudo -H -u "$SUDO_USER" "$@"
    else
        "$@"
    fi
}

# test if bwrap works (as original user, not root)
test_bwrap_as_user() {
    run_as_user bwrap --ro-bind / / /bin/true 2>/dev/null
}

# get original user's home directory
get_user_home() {
    if [[ -n "${SUDO_USER:-}" && "$HOME" == "/root" ]]; then
        getent passwd "$SUDO_USER" | cut -d: -f6
    else
        echo "$HOME"
    fi
}

# find claude CLI binary
find_claude_bin() {
    local user_home
    user_home="$(get_user_home)"

    if command -v claude &>/dev/null; then
        command -v claude
    elif [[ -x "$user_home/.local/bin/claude" ]]; then
        echo "$user_home/.local/bin/claude"
    fi
}
