# Running Sub-Agents with Pi

Sub-agents are additional `pi -p` processes launched in **visible tmux panes** so the user can watch them work. This document is the authoritative pattern — always follow it exactly.

---

## Environment Constants

Resolve these at runtime — never hardcode hashes or UIDs:

```bash
# Pi binary — resolve from PATH (works on macOS and Linux)
PI=$(which pi)

# node binary — derive from `which node` (works inside the pi harness)
NODE_BIN=$(dirname $(which node))
# e.g. /nix/store/6x6v11xjf0psckgqmyhfyhw9bdma0rn6-nodejs-22.22.2/bin

# User's tmux socket — location and stat syntax differ by OS
if [[ "$(uname)" == "Darwin" ]]; then
  # macOS (BSD stat): sockets live in /tmp/tmux-*/
  TMUX_SOCK=$(stat -f "%Su %N" /tmp/tmux-*/default 2>/dev/null \
    | grep -v "^root" | head -1 | awk '{print $2}')
  # e.g. /tmp/tmux-502/default
else
  # Linux (GNU stat): sockets live in /run/user/<uid>/tmux-<uid>/
  TMUX_SOCK=$(stat -c "%U %n" /run/user/*/tmux-*/default 2>/dev/null \
    | grep -v "^root" | head -1 | awk '{print $2}')
  # e.g. /run/user/1000/tmux-1000/default
fi

# Verify: tmux -S $TMUX_SOCK list-sessions
```

---

## The Required Pattern — tmux Panes

**Always** run sub-agents in tmux panes. Never use silent background jobs (`&` + `wait`) — the user cannot see the agents working.

### Full Template (2 agents — extend for N)

```bash
# ── 1. Resolve environment ────────────────────────────────────────────────────
PI=$(which pi)
NODE_BIN=$(dirname $(which node))

if [[ "$(uname)" == "Darwin" ]]; then
  TMUX_SOCK=$(stat -f "%Su %N" /tmp/tmux-*/default 2>/dev/null \
    | grep -v "^root" | head -1 | awk '{print $2}')
else
  TMUX_SOCK=$(stat -c "%U %n" /run/user/*/tmux-*/default 2>/dev/null \
    | grep -v "^root" | head -1 | awk '{print $2}')
fi

TARGET_WINDOW=$(tmux -S $TMUX_SOCK display-message -p \
  "#{session_name}:#{window_index}")

# ── 2. Pre-delete output and result files ────────────────────────────────────
# On macOS pi runs as root, so files must be removed before panes write them.
# On Linux pi runs as the user, but pre-deletion is still good hygiene.
# _output.txt  = raw pi stdout (thoughts + tool calls) — for debugging only
# _result.md   = clean deliverable written by the agent via its write tool
rm -f /tmp/agent1_output.txt /tmp/agent2_output.txt
rm -f /tmp/agent1_result.md  /tmp/agent2_result.md

# ── 3. Write prompts to temp files to avoid quoting issues ───────────────────
cat > /tmp/agent1_prompt.txt << 'PROMPT'
Your full prompt for agent 1 here.
Can span multiple lines. Single quotes 'safe'. No escaping needed.

When you have finished, write your result — and ONLY your result, no preamble
or reasoning — to /tmp/agent1_result.md using the write tool.
PROMPT

cat > /tmp/agent2_prompt.txt << 'PROMPT'
Your full prompt for agent 2 here.

When you have finished, write your result — and ONLY your result, no preamble
or reasoning — to /tmp/agent2_result.md using the write tool.
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
# Check pane_current_command for each specific agent pane by filtering on
# pane_index. When node exits the command flips to bash/sh and the loop exits.
# DO NOT check pane_current_command across the whole window — the orchestrator
# (pi) is itself a node process in that window, so that check never exits.
# DO NOT check whether the pane index disappears — panes do NOT auto-close
# when the command finishes; they sit at a shell prompt indefinitely.
# Sleep briefly first — node takes a moment to start. Without this the poll
# may see bash/zsh (not yet node) and exit immediately before work begins.
sleep 3
PANE1_IDX=$(echo $PANE1 | cut -d. -f2)
PANE2_IDX=$(echo $PANE2 | cut -d. -f2)
WINDOW=$(echo $PANE1 | cut -d. -f1)
while tmux -S $TMUX_SOCK list-panes -t "$WINDOW" \
      -F "#{pane_index}:#{pane_current_command}" 2>/dev/null \
    | grep -E "^(${PANE1_IDX}|${PANE2_IDX}):" \
    | grep -qE "node|pi"; do
  sleep 2
done

# ── 7. Close panes ────────────────────────────────────────────────────────────
tmux -S $TMUX_SOCK kill-pane -t "$PANE2" 2>/dev/null || true
tmux -S $TMUX_SOCK kill-pane -t "$PANE1" 2>/dev/null || true

# ── 8. Read results ───────────────────────────────────────────────────────────
# Read the clean result files written by the agents, NOT the raw output.
# The raw _output.txt files are available for debugging if needed.
cat /tmp/agent1_result.md
cat /tmp/agent2_result.md
```

### Sequential Pipelines

When Agent 2 depends on Agent 1's output, run them in separate stages — one pane + poll per agent — and inject the result between stages:

```bash
# Stage 1 — run Agent 1 alone
tmux -S $TMUX_SOCK split-window -v -t "$TARGET_WINDOW" -l 40%
PANE1=$(tmux -S $TMUX_SOCK display-message -p -t "$TARGET_WINDOW" \
  "#{session_name}:#{window_index}.#{pane_index}")
tmux -S $TMUX_SOCK send-keys -t "$PANE1" \
  "export PATH=$NODE_BIN:\$PATH && $PI -p --no-session \
   \"\$(cat /tmp/agent1_prompt.txt)\" > /tmp/agent1_output.txt 2>&1" Enter
sleep 3
PANE1_IDX=$(echo $PANE1 | cut -d. -f2); WINDOW=$(echo $PANE1 | cut -d. -f1)
while tmux -S $TMUX_SOCK list-panes -t "$WINDOW" \
      -F "#{pane_index}:#{pane_current_command}" 2>/dev/null \
    | grep -E "^${PANE1_IDX}:" | grep -qE "node|pi"; do sleep 2; done
tmux -S $TMUX_SOCK kill-pane -t "$PANE1" 2>/dev/null || true

# Inject Agent 1's result into Agent 2's prompt (unquoted heredoc so
# $(...) expands — never use << 'PROMPT' when you need interpolation)
RESULT1=$(cat /tmp/agent1_result.md)
cat > /tmp/agent2_prompt.txt << PROMPT
Using the notes below, do something with them.

${RESULT1}

Write your result to /tmp/agent2_result.md using the write tool.
PROMPT

# Stage 2 — run Agent 2
tmux -S $TMUX_SOCK split-window -v -t "$TARGET_WINDOW" -l 40%
PANE2=$(tmux -S $TMUX_SOCK display-message -p -t "$TARGET_WINDOW" \
  "#{session_name}:#{window_index}.#{pane_index}")
tmux -S $TMUX_SOCK send-keys -t "$PANE2" \
  "export PATH=$NODE_BIN:\$PATH && $PI -p --no-session \
   \"\$(cat /tmp/agent2_prompt.txt)\" > /tmp/agent2_output.txt 2>&1" Enter
sleep 3
PANE2_IDX=$(echo $PANE2 | cut -d. -f2); WINDOW=$(echo $PANE2 | cut -d. -f1)
while tmux -S $TMUX_SOCK list-panes -t "$WINDOW" \
      -F "#{pane_index}:#{pane_current_command}" 2>/dev/null \
    | grep -E "^${PANE2_IDX}:" | grep -qE "node|pi"; do sleep 2; done
tmux -S $TMUX_SOCK kill-pane -t "$PANE2" 2>/dev/null || true
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

## Result Files — Clean Output for the Orchestrator

Every sub-agent prompt **must** end with an explicit instruction to write its
deliverable to a dedicated result file:

```
When you have finished, write your result — and ONLY your result, no preamble
or reasoning — to /tmp/agentN_result.md using the write tool.
```

Why this matters:
- `pi -p` stdout contains thinking traces, tool-call XML, and status lines that
  bloat the orchestrator's context and confuse downstream reasoning.
- The `_result.md` file contains only the structured answer the orchestrator
  actually needs.
- The `_output.txt` file is still captured for the user to watch/debug but is
  **never fed back to the orchestrator**.

Shape the result file to match what the orchestrator will consume:
- A list of findings → use markdown bullet points or numbered list
- Code → fenced code blocks with language tag
- Structured data → a small markdown table or YAML front-matter + body
- Multiple sections → use `##` headings so the orchestrator can parse them

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
| 2 | Output files owned by root block user-pane writes (macOS only — pi runs as root there) | `rm -f` the output files from within pi **before** launching panes |
| 3 | `tee` fails silently on root-owned files (macOS only) | Use `>` redirection only |
| 4 | Single quotes in prompts break `send-keys` quoting | Write prompts to temp files with heredocs; read with `$(cat ...)` |
| 5 | `tmux` without `-S` targets pi's own server, not the user's | Always pass `-S $TMUX_SOCK` to every tmux command |
| 6 | `grep -c` on a missing file returns a multi-line string | Use `grep -q` / `grep -E` for boolean checks |
| 7 | `NODE_PATH` nix store hash changes on updates | Derive with `dirname $(which node)` — never hardcode the hash |
| 8 | Pane closes before you `kill-pane` it | Append `2>/dev/null || true` to kill-pane calls |
| 9 | direnv/nix devshell takes time to init in new panes | Export PATH directly rather than relying on direnv auto-activation |
| 10 | macOS uses BSD `stat -f "%Su %N"`, Linux uses GNU `stat -c "%U %n"` | Branch on `$(uname)` when resolving the tmux socket path |
| 11 | tmux socket on Linux is at `/run/user/<uid>/tmux-<uid>/default`, not `/tmp/tmux-*/` | Use the OS-aware socket detection snippet from the template |
| 12 | Orchestrator reads raw `_output.txt` and gets flooded with thinking/tool traces | Always read `_result.md` (written by the agent) — never feed `_output.txt` to the orchestrator |
| 13 | Agent forgets to write result file — orchestrator reads empty/missing file | Prompt must explicitly say "write your result to /tmp/agentN_result.md using the write tool" as the **last instruction** |
| 14 | Polling loop for `node\|pi` in pane commands never exits | The orchestrator is itself a `node` process in the same window — `list-panes` always finds it. Filter `pane_index:pane_current_command` to check only the **specific agent panes** (see step 6 template) |
| 15 | Polling loop on pane-index disappearance never exits | Panes do **not** auto-close when the command finishes — they sit at a shell prompt. Check `pane_current_command` flipping away from `node`/`pi` instead |
| 16 | Poll exits immediately before agent has done any work | `node` takes a moment to start after `send-keys`. Without `sleep 3` before the loop, `pane_current_command` is still `bash`/`zsh` and the condition is false from the first check |
