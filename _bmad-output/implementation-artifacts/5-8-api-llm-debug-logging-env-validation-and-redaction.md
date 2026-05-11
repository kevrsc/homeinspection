# Story 5.8: API — LLM debug logging env validation and redaction

Status: done

## Story

As a security-conscious operator,  
I want **`LLM_DEBUG_LOG`** (or equivalent) to be **validated at startup**, **off by default in production-minded configs**, and **redacted** when enabled,  
So that inspection observations and full LLM payloads cannot leak to logs by misconfiguration.

## Acceptance Criteria

1. **Given** **`LLM_DEBUG_LOG`** is present in **`.env.example`**,  
   **When** the application starts,  
   **Then** the variable is **parsed and validated** (boolean or enumerated allowlist) via the same **`env.validation`** / config module patterns as other LLM settings—invalid values **fail fast** at bootstrap.

2. **And** when debug logging is enabled, logs **must not** include full raw observation payloads or complete model responses by default; if verbatim snippets are required for local dev, they are **truncated** and clearly tagged, with README warning.

3. **And** tests cover invalid env values and at least one assertion that sensitive fields are redacted or omitted in debug log code paths (mock logger or string capture).

## Tasks / Subtasks

- [x] Wire **`LLM_DEBUG_LOG`** through [`homeinspection-api/src/config/env.validation.ts`](../../homeinspection-api/src/config/env.validation.ts); tighten [`ollama-summarizer.adapter.ts`](../../homeinspection-api/src/modules/report/summarization/ollama-summarizer.adapter.ts) logging (truncated request/response/assistant previews; exported **`summarizeOllamaChatRequestJsonForDebug`** for tests).
- [x] Update **`.env.example`**, **README**, tests.

## Dev Notes

### Source

**Blind Hunter** (**2026-05-11**): high-risk payload logging under debug; **`LLM_DEBUG_LOG`** not validated in typed config.

## Change Log

- **2026-05-11:** Story created from code-review follow-ups (`ready-for-dev`).
- **2026-05-10:** Bootstrap validation (`true`/`false`/`1`/`0`/`yes`/`no`/`on`/`off`); default **`false`**; redacted/truncated debug logs; **`env.validation.spec`** + **`ollama-summarizer.adapter.spec`**; status **`done`**.
