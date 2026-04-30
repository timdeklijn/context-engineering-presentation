# Context Engineering

#### Thisworkz, Agentic Engineering Session

Tim de Klijn, Willem Bressens

07-05-2026

---

## You've already felt this problem

- You paste the same file into chat for the 10th time
- The model ignores half of it
- The response is confidently wrong

That's a context problem.

--

### Are you in control of your context?

What did you add? And what does your harness add for free?  
Is all of it beneficial?

---

## Definitions

So we speak the same language

--

### Agentic Loop

LLM runs in a loop: prompt → response → tool call → prompt → ...

--

### Context

Everything the model can see: system prompt, conversation history, tool results, files.

--

### Agent Harness

The runtime that drives the agentic loop: Claude Code, Codex CLI, OpenCode, etc.

--

### Token Cache

Reuse of previously computed KV-cache entries to avoid re-processing unchanged prefix tokens.

```
Without cache:   [system][history][tools][new prompt]  ← re-processed every time
With cache:      [system][history][tools] ✓  +  [new prompt]  ← only new tokens processed
```

--

### Context Engineering

Designing and controlling the context that is fed to the model at each step.

---

## Why does it matter?

- **Garbage in, garbage out** — model quality is bounded by context quality
- **Token limits** force trade-offs: what to include, what to leave out
- **Cost** — every token processed costs money; noise is waste
- **Reproducibility** — same context → consistent results

---

## Anatomy of a context window

Everything the model sees, in layers:

```
┌─────────────────────────────────────┐
│  System Prompt                      │  ← set by harness or you
├─────────────────────────────────────┤
│  Memory Files (AGENTS.md, etc.)     │  ← long-term context you control
├─────────────────────────────────────┤
│  Conversation History               │  ← grows every turn
├─────────────────────────────────────┤
│  Tool Results                       │  ← can be very large
├─────────────────────────────────────┤
│  Agent / Harness Injections         │  ← added automatically
├─────────────────────────────────────┤
│  Your current prompt                │
└─────────────────────────────────────┘
```

Understanding this map is the foundation of context engineering.

---

## What shapes your context?

--

### Things your harness adds

Prompt injections, system prompts, tool call scaffolding — automatically, whether you asked or not.

Know what your harness puts in before you blame the model.

--

### Compacting (OpenCode)

When the context window fills up, the harness has to make decisions:

- **auto:** Automatically compact the session when context is full **(default: true)**
- **prune:** Remove old tool outputs to save tokens **(default: true)**
- **reserved:** Token buffer for compaction — avoids overflow mid-session

Compaction is context engineering on autopilot. You can tune it, but you should understand when it fires.

---

## What you can control

--

## Memory

--

### Short-Term Memory

Everything that lives inside your current session.  
Grows automatically. Can be pruned by compaction.

--

### Long-Term Memory

Everything that outlives a session:

- **Markdown files** — decisions, architecture, todos (`AGENTS.md`, `CLAUDE.md`)
- **Vector / graph DBs** — semantic retrieval at scale

This is context you *deliberately* place in front of the model every time.

--

## Skills

<small>In `~/.claude/skills/explain-code/SKILL.md`:</small>

```md
---
description: Explains code with visual diagrams and analogies. Use when explaining how code works, teaching about a codebase, or when the user asks "how does this work?"
---

When explaining code, always include:

1. **Start with an analogy**: Compare the code to something from everyday life
2. **Draw a diagram**: Use ASCII art to show the flow, structure, or relationships
3. **Walk through the code**: Explain step-by-step what happens
4. **Highlight a gotcha**: What's a common mistake or misconception?

Keep explanations conversational. For complex concepts, use multiple analogies.
```

<small>https://code.claude.com/docs/en/skills</small>

--

## MCP

> Connect a server when you find yourself copying data into chat from another tool, like an issue tracker or a monitoring dashboard. Once connected, Claude can read and act on that system directly instead of working from what you paste.

<small>https://code.claude.com/docs/en/mcp</small>

---

## See it in action

Sub-agent demo:

- Multiple agents running in parallel, each with a scoped context
- Watch how what each agent *sees* determines what it *does*
- The harness coordinates — but you designed the context

---

## Review your context

Don't guess — inspect.

OpenCode:

```sh
/export
```

Look for:
- Repeated information
- Large tool outputs that are no longer relevant
- Harness injections you didn't expect

---

## One thing to do on Monday

Open your next session. Run `/export`.  
Look at what's actually in your context window.

Ask yourself: **would I have written this prompt myself?**

--

### Questions?
