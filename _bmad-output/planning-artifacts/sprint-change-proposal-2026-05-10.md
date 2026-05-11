# Sprint Change Proposal — 2026-05-10 (revised)

**Project:** homeinspection  
**Author:** Correct Course workflow  
**Stakeholder:** kev  

**Revision note:** README now marks **Phase 2 (persistence)** and **Phase 3 (async)** as **optional**. This proposal is narrowed to **implementing the AI phase only** — no persistence or async work is in scope for this sprint change unless you explicitly add it later.

---

## Section 1 — Issue Summary

### Problem statement

You want the **next delivery focus** to be **README Phase 4 — Add AI** only: a **new API** that returns an **LLM** summary and prioritization of inspection observations, backed by a **Docker-deployable LLM** for local/analysis use, with a defined prompt and a **structured response** (and errors) to the caller.

**Persistence and asynchronous PDF processing are out of scope** for this proposal per your README update (both phases optional).

### Context and discovery

- **PRD** (`prd.md`) still describes **V1** as Phase 1–centric and lists persistence, async, and AI as phased growth; it should be **lightly amended** so the **next slice** can be **AI-only** without implying MySQL or SQS are prerequisites.
- **Epics** (`epics.md`) end at Epic **4**; there is **no AI epic** yet.
- **Sprint status** shows **Epics 1–4 done**. Today’s integration path remains **synchronous upload → extract → observations in HTTP response** (no DB in the hot path).
- **README Phase 4** bullets **A** and **B** still mention **database** and **database read**. That conflicts with **optional persistence**. This proposal treats that as a **README wording gap**: Phase 4 should describe **where observations come from** when persistence is **off** (see Section 4.1).

### Evidence

- Root `README.MD`: Phase 2 “Optional - Persist…”; Phase 3 “Optional - Asynchronously…”; Phase 4 “Add AI”.
- `sprint-status.yaml`: no AI stories yet.

### README housekeeping

Phase 4 still lists **two bullets labeled “D.”** The final bullet should be **`E.`** — Return the LLM response to the API caller.

---

## Section 2 — Impact Analysis

### Epic impact

| Area | Impact |
|------|--------|
| **Epics 1–4 (done)** | No rollback. Optional follow-on: **Epic 4 web** may later call the AI endpoint (new story, separate). |
| **Missing epic** | **Single new epic (recommended id: Epic 5)** — **AI-assisted observation summary** (README Phase 4). |
| **Optional phases 2–3** | Explicitly **not part** of this proposal; may layer later without blocking AI if contracts are chosen carefully. |

### Story impact (AI epic only)

Candidate themes (refine into story files):

- **Observation input for the LLM** — Without DB, the API must accept **observations (and sections)** in a **stable JSON request body** (e.g. the same shape as the Phase 1 success payload, or a documented subset), *or* accept a **PDF** and **run extraction in-process** before prompting (higher latency/cost). **Recommendation:** **JSON-in-body** keeps parity with today’s clients and avoids duplicating PDF work unless you explicitly want PDF-only AI calls.
- **Docker LLM** — Compose/service definition, documented image/model pull, CPU/GPU notes.
- **Ports/adapters** — `AiSummarizationPort` + HTTP adapter to OpenAI-compatible or Ollama-style endpoint; **mock** in CI.
- **Prompt + output shape** — Summarize and prioritize for homeowners; return **structured JSON** (recommended) or constrained markdown per architecture decision.
- **`v1` HTTP surface** — New route under `/v1`, **auth + rate limiting** consistent with Epic 1, OpenAPI, failure matrix / fixtures updates.
- **Safety/copy** — Response or docs acknowledge **informational** output (aligned with UX-DR7 / disclaimer themes when UI consumes this).

### Artifact conflicts

| Artifact | Conflict | Resolution direction |
|----------|----------|---------------------|
| **PRD** | Implies ordering persistence → async → AI | Add **next slice = AI optional endpoint**; persistence/async remain **optional** enhancements. |
| **Architecture** | Phase 1 stateless; AI was deferred | Add **LLM integration** + **observation-input boundary** (JSON vs optional future repository). **No MySQL requirement** in this slice. |
| **Epics** | No AI breakdown | Add **one epic** with stories above; do **not** add persistence epic here. |
| **UX** | Primarily upload + list | **N/A** until UI surfaces AI; then extend Epic 4 with AI-specific disclaimer/loading patterns. |

### Technical impact

- **Docker Compose:** **API + LLM** (no DB container required for this proposal).
- **Env:** LLM base URL, model id, timeouts, optional keys; **no DSN** unless you adopt persistence separately.
- **Security:** Same guardrails as upload — **no sensitive payload logging** at info level.
- **Testing:** **Mock LLM** in CI; contract tests for success/error; optional heavier local compose tests documented manually.
- **CI:** Avoid GPU/network dependence in default pipeline.

---

## Section 3 — Recommended approach

**Selected path:** **Direct adjustment — AI-only epic**

1. Implement **README Phase 4** as **one epic** with **no dependency** on MySQL or SQS.
2. **Normalize observation input** without persistence: **preferred** — **request body** carries observations (from client after `POST /v1/report/upload`). Alternative — **PDF repost** + extract-then-LLM (document trade-offs).
3. **Leave optional Phase 2–3** untracked in this proposal; if persistence is added later, **extend** the AI port with a **repository adapter** and optionally align README Phase 4 A/B with “read from DB when enabled.”

**Rationale:** Matches your **optional persistence/async** decision while still delivering **summarize + prioritize** value on top of the **existing Phase 1 extraction contract**.

**Effort:** **Medium** (LLM wiring, contracts, tests, compose docs).  
**Risk:** **Medium** (latency, model variability); mitigate with timeouts, mocks, clear SLO notes.

**Rollback:** Not applicable to shipped epics; AI work is additive.

**PRD:** Prefer wording such as **“Next slice: AI summary endpoint (optional persistence/async unchanged)”** rather than renumbering historical MVP claims.

---

## Section 4 — Detailed change proposals

### 4.1 README.MD (root) — Phase 4 alignment with optional persistence

Keep Phase 4 scope as **AI**, but **replace DB-only wording** so it matches optional persistence:

**Proposed replacement for Phase 4 items A–E (conceptual — edit README to match):**

- **A.** Create a new API endpoint that returns an **LLM-generated** summary and prioritization of **inspection observations**.
- **B.** **Provide observations to the LLM** using **either**: (1) **observations included in the API request** (e.g. JSON from the Phase 1 upload response), **or** (2) when persistence is implemented, **load observations via the stored read path**.
- **C.** Provide **Docker** (or documented compose service) to run an **LLM** used for analysis.
- **D.** Use a **prompt** that summarizes and prioritizes observations **for the homeowner**.
- **E.** Return the LLM response **to the API caller** (structured JSON recommended).

**Plus:** Fix duplicate **D.** → **E.** on the current last bullet.

---

### 4.2 PRD (`prd.md`) — representative updates

- **Product scope / phased development:** State that **Phase 2 and Phase 3 are optional** in the README sense; **Phase 4 AI** may ship **without** them when observations are supplied **in-request**.
- **Post-MVP / growth:** List **AI endpoint** as the **current next capability**; persistence and async remain **optional** follow-ons.
- **New themes:** AI endpoint **functional** and **non-functional** notes (timeouts, deterministic errors, auth/rate limits, disclaimer stance).

---

### 4.3 Architecture (`architecture.md`) — addendum topics

- **Observation source for AI:** Primary = **DTO in request**; optional future = **persistence adapter** when Phase 2 exists.
- **LLM integration:** Sidecar or remote OpenAI-compatible API; **application port** + infra adapter.
- **SLO:** Timeout budget for LLM only (no DB read in baseline path).
- **Observability:** Correlation id, latency; avoid logging full prompts/observations.

---

### 4.4 Epics (`epics.md`) — single new epic

#### Epic 5: AI-assisted observation summary

**Goal:** Deliver README **Phase 4** with **no requirement** on optional persistence or async phases.

**Candidate stories:**

5.1 — Docker Compose (or documented) **LLM service** + env + model bootstrap docs  
5.2 — **AiSummarizationPort** + HTTP adapter + env configuration; **CI mock**  
5.3 — **Prompt** + output schema (summarize + prioritize);/version in config or code as appropriate  
5.4 — New **`v1` endpoint** + auth/rate limit parity + OpenAPI + examples  
5.5 — Tests: mock LLM; contract tests for success/error; developer doc note for optional full compose run  

*(Optional later story, out of scope here:* UI integration in Epic 4.*)*

---

## Section 5 — Implementation handoff

**Change scope:** **Moderate → leaning Minor** (single epic, no DB/SQS)

| Role | Responsibility |
|------|----------------|
| **Product / PO** | Approve **observation-input strategy** (JSON-in-body vs PDF-reextract); approve README Phase 4 wording update. |
| **Architect** | Lock route shape, response schema, LLM deployment pattern, timeouts. |
| **Developer** | Implement Epic 5; update OpenAPI / failure docs / compose; mock LLM in CI. |
| **UX (later)** | When showing AI in web client: disclaimer + loading/error patterns. |

**Success criteria**

- New **`v1` AI endpoint** documented in OpenAPI and callable with **prototype auth**.
- LLM runnable via **documented Docker** path for local demos.
- CI **does not** depend on live LLM, GPU, or MySQL.
- README Phase 4 **no longer implies DB is mandatory** for AI.

---

## Section 6 — Checklist execution log (revised)

### Section 1 — Understand the trigger

| ID | Status | Notes |
|----|--------|-------|
| 1.1 | [x] Done | Trigger: prioritize **AI phase**; persistence/async **optional**. |
| 1.2 | [x] Done | **Strategic pivot** / scope refinement after README update. |
| 1.3 | [x] Done | Evidence: README optional phases; sprint-status lacks AI epic. |

### Section 2 — Epic impact

| ID | Status | Notes |
|----|--------|-------|
| 2.1 | [x] Done | Epics 1–4 unchanged. |
| 2.2 | [x] Done | Add **Epic 5 (AI only)**; **no** persistence/async epic in this proposal. |
| 2.3 | [x] Done | Optional Epic 4 extension later for AI UI. |
| 2.4 | [x] Done | Does not obsolete prior epics; README/PRD need **wording** alignment. |
| 2.5 | [x] Done | Order: **AI next**; optional phases remain **when/if** prioritized. |

### Section 3 — Artifacts

| ID | Status | Notes |
|----|--------|-------|
| 3.1 | [x] Done | PRD phased narrative should mention **AI-without-DB** path. |
| 3.2 | [x] Done | Architecture: LLM + observation-input boundary (**no MySQL** in this slice). |
| 3.3 | [N/A] | UI unchanged until AI consumer story. |
| 3.4 | [x] Done | Compose **LLM**; CI mock; env docs. |

### Section 4 — Path forward

| ID | Result |
|----|--------|
| 4.1 | **Viable** — AI-only epic + README/PRD touch-ups. |
| 4.2 | **Not needed** — No rollback. |
| 4.3 | **Viable** — Clarify “next slice” without redefining entire MVP history. |
| 4.4 | **Done** — **Direct adjustment (AI-only)**. |

### Section 5 — Proposal components

| ID | Status |
|----|--------|
| 5.1–5.5 | [x] Done | Covered in Sections 1–5. |

### Section 6 — Final review

| ID | Status | Notes |
|----|--------|-------|
| 6.1 | [x] Done | Proposal scoped to **AI only**. |
| 6.2 | [x] Done | Align README Phase 4 A–B with optional persistence. |
| 6.3 | [!] Action-needed | **Your approval** if this revised proposal is the source of truth. |
| 6.4 | [!] Action-needed | After approval: `sprint-status.yaml` — add **epic-5** (+ stories) **only** for AI. |
| 6.5 | [!] Action-needed | Confirm owners for README + PRD + architecture edits vs implementation. |

---

## Next step (required)

**Do you approve this revised Sprint Change Proposal?** Reply **yes**, **no**, or **revise**.

If **yes**, recommended immediate actions:

1. Apply **README Phase 4** wording + **E.** fix (Section 4.1).
2. Update PRD / architecture / epics per Sections 4.2–4.4.
3. Append **Epic 5 (AI)** to `sprint-status.yaml` as **backlog** until the first story is pulled.

---

_Correct Course workflow — revised for kev (AI-only scope)._
