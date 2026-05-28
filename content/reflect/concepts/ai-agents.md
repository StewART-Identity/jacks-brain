---
title: "AI Agents"
summary: "Software systems that use LLMs to autonomously plan, tool-call, and complete multi-step tasks — the primary architecture behind agentic AI applications."
type: concept
created: 2026-05-28
updated: 2026-05-28
subjects:
  - artificial-intelligence
tags:
  - agents
  - llm
  - autonomous
  - tool-use
  - planning
  - open-source
  - agentic-ai
confidence: high
---

An AI agent is a software system that wraps a large language model (LLM) with a loop: the model receives a goal, selects tools to call, observes results, and iterates until the task is complete or a stopping condition is met. The key properties that distinguish agents from plain LLM calls are **autonomy** (the model decides the next step), **tool use** (the model can execute code, call APIs, search the web, etc.), and **memory** (context is persisted across turns).

## Core Components

- **Planner** — the LLM reasoning step that decides what to do next
- **Tools** — external capabilities the agent can invoke (web search, code execution, file I/O, API calls)
- **Memory** — short-term (in-context), long-term (vector store or structured DB), and episodic (conversation history)
- **Orchestrator** — the loop that feeds observations back to the planner until completion

## Frameworks and Tooling

The 2025–2026 ecosystem produced a wave of open source agent frameworks. [[reflect/sources/2026-05-28-pasted-image-1779941792374|Fireship's March 2026 survey]] highlighted seven emerging tools: **Agency Agents**, **PromptFoo**, **MicroFish**, **NanoChat**, **Impeccable**, **Heretic**, and **OpenViking**. See [[reflect/concepts/open-source-ai-tooling]] for broader context on the tooling landscape.

## Evaluation

A persistent challenge in agent development is reliability — agents can loop, hallucinate tool calls, or produce "slop" (low-quality automated output) at scale. Tools like PromptFoo address this by providing systematic prompt and agent evaluation pipelines.

## Related

- [[reflect/entities/fireship]] — YouTube channel that covers agent tooling trends
- [[reflect/concepts/open-source-ai-tooling]] — the broader ecosystem of open source AI developer tools
