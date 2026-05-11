# Story 5.9: API — observation summary parser strictness and normalization metadata

Status: done

## Story

As an API consumer,  
I want invalid LLM output to **fail loudly** when appropriate and any **normalization** of ranks or text to be **visible** in the contract or response metadata,  
So that silent coercion does not mask model regressions or corrupt legitimate observation text embedded in rationale fields.

## Acceptance Criteria

1. **Given** model JSON that violates the **strict** **`ObservationSummary`** contract (after product defines “strict vs tolerant” policy in Dev Notes),  
   **When** the parser processes it,  
   **Then** the outcome matches the policy: either **422** with **`SUMMARIZATION_INVALID_RESPONSE`** (or equivalent) **or** a documented tolerance list (alternate keys) with tests proving each tolerated shape.

2. **And** if **`rank`** values are **reordered or renumbered** to contiguous **`1..n`**, the API either preserves model ranks when valid **or** adds **`normalized: true`** (or similar) on **`ObservationSummary`** / per-item metadata **and** documents the behavior in OpenAPI (additive field acceptable if non-breaking for existing clients).

3. **And** pre-parse text repairs (**`<thinking>`** stripping, trailing-comma fixes) are either removed, guarded so they cannot alter string contents inside JSON strings incorrectly, or replaced with a safer parse pipeline—supported by regression tests with adversarial strings.

4. **And** **`npm run test`** and **`openapi:check`** pass; failure matrix updated if new error surfaces.

## Tasks / Subtasks

- [x] Product/engineering decision in Dev Notes: **tolerant parse** for common LLM drift (alternate keys, fences, balanced JSON extraction, trailing commas) with **422** on true contract violations; documented inline in parser module.  
- [x] Implement in [`parse-observation-summary.ts`](../../homeinspection-api/src/modules/report/summarization/parse-observation-summary.ts) + [`parse-observation-summary.spec.ts`](../../homeinspection-api/src/modules/report/summarization/parse-observation-summary.spec.ts); prefix-only thinking/reasoning strip so JSON string contents are not corrupted.  
- [x] OpenAPI + types: optional **`ranksNormalized`** on **`ObservationSummary`** when ranks are re-sorted or renumbered to **1..n**.

## Dev Notes

### Source

**Blind Hunter** (**2026-05-11**): permissive parser masking failures; regex repairs on raw text; rank normalization without visibility.

### Policy (AC **#1** / **#2**)

Keep pragmatic **tolerant** parsing for known benign shapes (existing tests remain the contract). Emit **`ranksNormalized: true`** on the **`ObservationSummary`** payload when the server reorders items or rewrites ranks to contiguous **1..n**; omit the field when the model output already matched that shape and array order.

## Change Log

- **2026-05-11:** Story created from code-review follow-ups (`ready-for-dev`).
- **2026-05-10:** **`ranksNormalized`**, prefix-only thinking strip + adversarial tests, OpenAPI **`ObservationSummary`**; status **`done`**.
