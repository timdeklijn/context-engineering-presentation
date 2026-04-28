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

- Model output quality is bounded by context quality
- Garbage in, garbage out
- Token limits force trade-offs: what to include, what to leave out
- Reproducibility: same context → consistent results

---

## Are you in control of your context?

What did you add? And what do you get for free? Is it benificial?

---

## What does your harness add?

Prompt injections, system prompt, tool calls?

---

## Compacting?

When?

---

## Skills

---

## MCP

---

## Review your context

Demo: how to get your full context?

```
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

does it work?

---

### Questions?