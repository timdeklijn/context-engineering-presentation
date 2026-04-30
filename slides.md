# Context Engineering

#### Thisworkz, Agentic Engineering Session

Tim de Klijn, Willem Bressens

07-05-2026

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

--

### Context Engineering

Designing and controlling the context that is fed to the model at each step.

--

## Why?

- Garbage in, garbage out
- Focussed context will improve output
- Token limits force trade-offs: what to include, what to leave out
- Reproducibility: same context → consistent results

---

## Are you in control of your context?

What did you add? And what do you get for free? Is it benificial?

---

## Memory

--

## Short Term Memory

Everything that lives inside your session.

--

## Long Term Memory

Everything that outlives a session:

- Markdown files: decisions, architecture, todo's
- vector/graph DB's

---

## What does your harness add?

Prompt injections, system prompt, tool calls?

---

## Compacting?

Opencode:

- **auto:** Automatically compact the session when context is full **(default: true)**.
- **prune:** Remove old tool outputs to save tokens **(default: true)**.
- **reserved:** Token buffer for compaction. Leaves enough window to avoid overflow during compaction

---

## Skills

<small>In `~/.claude/skills/explain-code/SKILL.md`:</small>

```md
-​--
description: Explains code with visual diagrams and analogies. Use when explaining how code works, teaching about a codebase, or when the user asks "how does this work?"
-​--

When explaining code, always include:

1. **Start with an analogy**: Compare the code to something from everyday life
2. **Draw a diagram**: Use ASCII art to show the flow, structure, or relationships
3. **Walk through the code**: Explain step-by-step what happens
4. **Highlight a gotcha**: What's a common mistake or misconception?

Keep explanations conversational. For complex concepts, use multiple analogies.
```

<small>https://code.claude.com/docs/en/skills</small>

---

## MCP

> Connect a server when you find yourself copying data into chat from another tool, like an issue tracker or a monitoring dashboard. Once connected, Claude can read and act on that system directly instead of working from what you paste.

<small>https://code.claude.com/docs/en/mcp</small>

---

## Review your context

opencode:

``` sh
/export
```

---

## Sub Agents

Demo: tmux agent?

```
pi tmux
```

---

## Cave Man Speak


> ...the caveman approach treats LLM output as a "lossy compression" problem, where the core information is preserved while the "filler" is discarded...

<small>Someone at LinkedIn</small>
---

### Questions?