# Running Sub-Agents with Pi

Sub-agents are additional `pi -p` processes launched in **visible tmux panes** so the user can watch them work. This document is the authoritative pattern — always follow it exactly.

---

## Environment Constants

Resolve these at runtime — never hardcode hashes or UIDs:

```bash
# Pi binary (known at install time — this path is stable on this machine)
PI=/Users/t38468/.npm-global/bin/pi

# node binary — derive from `which node` (works inside the pi harness)
NODE_BIN=$(dirname $(which node))
# e.g. /nix/store/0zb2cr3b9xlancr6s938s73pxfcbzji2-nodejs-22.22.2/bin

# User's tmux socket — the one NOT owned by root
TMUX_SOCK=$(stat -f "%Su %N" /tmp/tmux-*/default 2>/dev/null \
  | grep -v "^root" | head -1 | awk '{print $2}')
# e.g. /tmp/tmux-502/default
# Verify: tmux -S $TMUX_SOCK list-sessions
```

---

## The Required Pattern — tmux Panes

**Always** run sub-agents in tmux panes. Never use silent background jobs (`&` + `wait`) — the user cannot see the agents working.

### Full Template (2 agents — extend for N)

```bash
# ── 1. Resolve environment ────────────────────────────────────────────────────
PI=/Users/t38468/.npm-global/bin/pi
NODE_BIN=$(dirname $(which node))
TMUX_SOCK=$(stat -f "%Su %N" /tmp/tmux-*/default 2>/dev/null \
  | grep -v "^root" | head -1 | awk '{print $2}')

TARGET_WINDOW=$(tmux -S $TMUX_SOCK display-message -p \
  "#{session_name}:#{window_index}")

# ── 2. Pre-delete output files (pi runs as root; panes run as user) ───────────
rm -f /tmp/agent1_output.txt /tmp/agent2_output.txt

# ── 3. Write prompts to temp files to avoid quoting issues ───────────────────
cat > /tmp/agent1_prompt.txt << 'PROMPT'
Your full prompt for agent 1 here.
Can span multiple lines. Single quotes 'safe'. No escaping needed.
PROMPT

cat > /tmp/agent2_prompt.txt << 'PROMPT'
Your full prompt for agent 2 here.
PROMPT

# ── 4. Open panes ─────────────────────────────────────────────────────────────
tmux -S $TMUX_SOCK split-window -v -t "$TARGET_WINDOW" -l 40%
PANE1=$(tmux -S $TMUX_SOCK display-message -p -t "$TARGET_WINDOW" \
  "#{session_name}:#{window_index}.#{pane_index}")

tmux -S $TMUX_SOCK split-window -h -t "$PANE1"
PANE2=$(tmux -S $TMUX_SOCK display-message -p -t "$TARGET_WINDOW" \
  "#{session_name}:#{window_index}.#{pane_index}")

# ── 5. Launch agents ──────────────────────────────────────────────────────────
# Use > (not tee) to capture output. Add --no-session for ephemeral runs.
# Add --no-tools only if the agent does NOT need to read/write files.
tmux -S $TMUX_SOCK send-keys -t "$PANE1" \
  "export PATH=$NODE_BIN:\$PATH && $PI -p --no-session \
   \"\$(cat /tmp/agent1_prompt.txt)\" > /tmp/agent1_output.txt 2>&1" \
  Enter

tmux -S $TMUX_SOCK send-keys -t "$PANE2" \
  "export PATH=$NODE_BIN:\$PATH && $PI -p --no-session \
   \"\$(cat /tmp/agent2_prompt.txt)\" > /tmp/agent2_output.txt 2>&1" \
  Enter

# ── 6. Poll until both panes finish ───────────────────────────────────────────
# When pi runs, pane_current_command shows "node". The loop exits when both
# panes close (no "node" or "pi" remains in the window's pane list).
WINDOW=$(echo $PANE1 | cut -d. -f1)
while tmux -S $TMUX_SOCK list-panes -t "$WINDOW" \
      -F "#{pane_current_command}" 2>/dev/null | grep -qE "node|pi"; do
  sleep 2
done

# ── 7. Close panes ────────────────────────────────────────────────────────────
tmux -S $TMUX_SOCK kill-pane -t "$PANE2" 2>/dev/null || true
tmux -S $TMUX_SOCK kill-pane -t "$PANE1" 2>/dev/null || true

# ── 8. Read results ───────────────────────────────────────────────────────────
cat /tmp/agent1_output.txt
cat /tmp/agent2_output.txt
```

### Scaling to N Agents

Repeat the `split-window` + `send-keys` + output file pattern for each additional agent. For more than 2–3 agents, create a new tmux **window** instead of crowding one with splits:

```bash
tmux -S $TMUX_SOCK new-window
AGENT_WINDOW=$(tmux -S $TMUX_SOCK display-message -p -t "$TARGET_WINDOW" \
  "#{session_name}:#{window_index}")
# then split that new window for your agents
```

Update the polling loop to list panes across all agent windows/panes.

---

## Passing Context to Sub-Agents

For long context or file contents, write to a temp file and include it in the prompt heredoc:

```bash
cat > /tmp/agent1_prompt.txt << PROMPT
Analyse the following code and suggest improvements:

$(cat /path/to/file.ts)

Return your suggestions as a numbered list.
PROMPT
```

Or pass a file path and instruct the agent to read it with its tools (preferred for large files, requires tools to be enabled).

---

## Key Flags

| Flag | When to use |
|---|---|
| `-p` / `--print` | **Always** for sub-agents — non-interactive, exits when done |
| `--no-session` | **Always** for sub-agents — ephemeral, avoids cluttering session storage |
| `--no-tools` | Only when the agent is answering questions; **omit** if it needs to read/write files |
| `--model <name>` | Override model (e.g. `--model claude-opus-4-5` for heavier reasoning tasks) |

---

## Gotchas & Lessons Learned

| # | Problem | Fix |
|---|---|---|
| 1 | `pi` and `node` are not on the tmux pane PATH | `export PATH=$NODE_BIN:$PATH` at the start of every pane command |
| 2 | Output files owned by root block user-pane writes | `rm -f` the output files from within pi **before** launching panes |
| 3 | `tee` fails silently on root-owned files | Use `>` redirection only |
| 4 | Single quotes in prompts break `send-keys` quoting | Write prompts to temp files with heredocs; read with `$(cat ...)` |
| 5 | `tmux` without `-S` targets pi's own server, not the user's | Always pass `-S $TMUX_SOCK` to every tmux command |
| 6 | `grep -c` on a missing file returns a multi-line string | Use `grep -q` / `grep -E` for boolean checks |
| 7 | `NODE_PATH` nix store hash changes on updates | Derive with `dirname $(which node)` — never hardcode the hash |
| 8 | Pane closes before you `kill-pane` it | Append `2>/dev/null || true` to kill-pane calls |
| 9 | direnv/nix devshell takes time to init in new panes | Export PATH directly rather than relying on direnv auto-activation |
