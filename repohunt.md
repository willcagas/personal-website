Below is a **full PRD + TDD + project context** for **RepoHunt / Issue2Outreach** (an “Outbound Engine” for devtools), designed explicitly for the hackathon constraints: **Impact 40%**, **3-minute recommended demo inside 4 minutes**, **live demo + backup video required**, and **manual prize tracks** (Hardcore Infra / Best Devtool) you should apply for.  

---

# Project Context

## Event constraints and why this project fits

* Hackathon “What to Build” explicitly includes **Outbound Engines**. 
* Judging weights heavily favor **Impact Potential (40%)**. 
* Presentations are **4 minutes total**, with **3 minutes recommended demo** + **1 minute Q&A**. 
* **Live demo is required** and **backup video is required**. 
* **Manual application prize tracks** include **Most Hardcore Infra** and **Best Devtool**. 

RepoHunt is a near-perfect fit because it’s (1) easy to understand quickly, (2) extremely demo-visual, and (3) lets you show “hardcore infra” via parallel agents + observability.

---

# PRD: RepoHunt (Issue2Outreach)

## 1) One-liner

RepoHunt continuously scans GitHub issues/discussions for specific “pain signatures,” generates a **real, reviewed fix artifact**, and produces a **ready-to-send helpful outreach draft** (human-in-the-loop).

## 2) Problem

Devtools startups die without distribution. The highest conversion moment is when a developer is actively blocked and asking for help (issues/discussions). But founders can’t monitor thousands of repos, triage context, craft high-quality fixes, and respond fast—consistently.

## 3) Target users

**Primary persona:** Devtools founder / first GTM hire (wants scalable inbound/outbound without spam).
**Secondary persona:** Devrel / Support engineer (wants “draft answers with correct code” + consistent tone).

## 4) Goals (hackathon-ready)

1. **Find** relevant dev pain reliably (deterministic search + extraction).
2. **Prove helpfulness** by generating a concrete artifact (snippet/patch) and running a review gate.
3. **Draft outreach** that is helpful-first and non-spammy (default: draft only).
4. **Show traces + metrics live** (observability is judge candy).
5. **Parallelism demo** (Hardcore Infra vibes).

## 5) Non-goals (to stay inside 8–20h build window)

* Fully autonomous posting to public GitHub (no auto-spam).
* Perfect universal code fixes across all languages.
* Complex multi-agent “research loops” across the entire web.

## 6) MVP scope (what you can ship for stage)

### Inputs

* A set of **Pain Signatures** (keywords/regex + short natural-language description)
* A set of **Sources** to watch (GitHub search queries, repo list, and/or issue URL list)

### Outputs

* A **Lead** object (issue URL + extracted context + match reason)
* A **Fix Artifact** (code snippet or small patch file)
* A **Review status** (pass/fail)
* An **Outreach Draft** (email body OR comment body)
* A **Trace** for the whole run

### Core user flow

1. User sets “pain signatures” + watch scope.
2. Superset runs parallel agents to scan sources. 
3. Browser Use opens matching issues and extracts structured context. 
4. Model generates fix artifact.
5. Cubic reviews artifact (optional but powerful safety gate). 
6. If passed, system sends draft to a demo inbox via AgentMail. 
7. Laminar shows trace + decision log. 

## 7) Success metrics (demo + “VC-ish”)

* **Time-to-draft**: < 60 seconds from “found issue” → “draft ready”
* **Precision**: ≥ 80% of found leads are actually relevant (manual judging)
* **Safety**: 0 messages sent without human approval (in MVP)
* **Observability**: 100% of runs have Laminar traces

## 8) Key product decisions (to avoid “spam bot” vibes)

* Default mode is **Draft-Only** (to internal inbox).
* Outreach is **help-first**: starts with an actionable fix; product mention is optional and minimal.
* Hard gate: “No draft unless we produced a fix artifact and it passes review.”

## 9) Sponsor integration (explicit + judge-visible)

This is the part that screams “we used the sponsor ecosystem”:

* **Browser Use**: “framework for building reliable web agents” 
* **Superset**: “run multiple AI coding agents in parallel from one terminal” 
* **Laminar**: “tracing, evals, and observability for AI agents” 
* **AgentMail**: “email inbox API for agent send/receive/automation workflows” 
* **Cubic (optional)**: “AI-powered code review to catch bugs faster” 
* **Convex (optional but nice)**: “TypeScript backend with live reactivity and zero setup” 
* **Vercel (optional)**: deploy dashboard fast 
* **Daytona (optional)**: sandboxed agent runs 

## 10) Demo plan (3 minutes)

Because the rubric encourages a tight demo window :

* **0:00–0:25** Problem + “we only draft when we have a real fix”
* **0:25–1:05** Superset terminal: 4 parallel agents scanning 
* **1:05–1:45** Browser Use opens the issue and extracts context 
* **1:45–2:20** Show fix artifact + Cubic review pass 
* **2:20–2:40** AgentMail sends the draft to inbox 
* **2:40–3:00** Laminar trace view for the run 

(And you comply with “live demo + backup video required.”) 

---

# TDD: Technical Design Doc

## 1) Architecture overview

**Design principle:** deterministic pipeline + human-in-the-loop send, optimized for demo reliability.

**High-level components**

1. **Web UI (Next.js/React)**: configure watchlists, view leads, view drafts, approve/send.
2. **Backend (Convex)**: data model + live status board + job triggers.
3. **Agent Orchestrator (Superset CLI)**: parallel “scanner” agents.
4. **Browser Runner (Browser Use)**: deterministic extraction from web pages.
5. **LLM**: generates structured summary + code artifact + outreach draft.
6. **Review Gate (Cubic)**: validates generated artifact before draft is “green”.
7. **Observability (Laminar)**: traces each run end-to-end.
8. **Email (AgentMail)**: draft delivery (and optional send).

This aligns cleanly with the hackathon’s “Sponsor Stack (Build Categories)” layout: Superset as IDE/agents, Browser Use as web agent, Laminar as observability, AgentMail as agent emails, Cubic as code review, Convex/Vercel as app backend/frontend. 

## 2) Data model (Convex)

**Tables**

### `watchlists`

* `id`
* `name`
* `sources`: array of `{type: "github_search"|"repo_list"|"url_list", queryOrUrls}`
* `painSignatures`: array of `{id, label, keywords[], regex?, instructions}`
* `createdAt`, `updatedAt`

### `leads`

* `id`
* `watchlistId`
* `sourceType`
* `url`
* `title`
* `matchedSignatureId`
* `extractedContext`: `{stack, errorLogs, repro, env, snippets, authorHandle}`
* `status`: `"FOUND"|"QUALIFIED"|"FIX_GENERATED"|"REVIEW_PASSED"|"DRAFT_READY"|"SENT"|"REJECTED"`
* `score`: number (0–1)
* `createdAt`

### `runs`

* `id`
* `leadId`
* `traceId` (Laminar)
* `startedAt`, `endedAt`
* `stepStatuses`: map
* `costEstimate`
* `result`: `"SUCCESS"|"FAIL"`

### `artifacts`

* `id`
* `leadId`
* `type`: `"SNIPPET"|"PATCH"|"PR_LINK"|"DRAFT_EMAIL"|"DRAFT_COMMENT"`
* `content` (string / json)
* `createdAt`

### `approvals`

* `id`
* `leadId`
* `approvedBy`
* `approvedAt`
* `sendMode`: `"DRAFT_ONLY"|"SEND_EMAIL"`
* `notes`

## 3) Key workflows

### A) Parallel scanning (Superset)

Superset is used to run multiple scanning workers in parallel. 
Each worker:

1. Loads watchlist config
2. Queries GitHub search pages (or repo issue listings)
3. Emits candidate URLs + matched signature into Convex (`leads` with status `FOUND`)

### B) Qualification + extraction (Browser Use)

Browser Use navigates to the issue page and extracts:

* title, labels, stack hints
* error logs (expand collapsibles, scroll)
* reproduction steps
  This matters because it’s the “agent in browser” part and you can show it live. 

### C) Fix generation (LLM)

Given extracted context, generate:

* “help-first” answer
* code snippet or patch diff
* minimal assumptions + how to validate

### D) Review gate (Cubic)

Send patch/snippet to Cubic and record pass/fail. 
If fail → status `REJECTED` (no draft).

### E) Draft delivery (AgentMail)

If review passes, generate an outreach draft and deliver to a controlled inbox using AgentMail. 
Default: **Draft-only**, no external sends.

### F) Tracing (Laminar)

Every run writes:

* inputs (signature, URL)
* extraction summary
* generation prompt hash
* review result
* final draft
  Laminar is literally “tracing, evals, observability.” 

## 4) Interfaces

### UI pages

* `/watchlists` (create/edit)
* `/leads` (pipeline board)
* `/leads/:id` (context + artifacts + approve/send)
* `/runs/:id` (Laminar trace deep link)

### Convex functions (examples)

* `createWatchlist()`
* `upsertLeadFound(url, signatureId, watchlistId, …)`
* `startRun(leadId)`
* `saveExtraction(leadId, extractedContext)`
* `saveArtifact(leadId, type, content)`
* `setLeadStatus(leadId, status)`
* `recordApproval(leadId, sendMode, notes)`

## 5) Reliability + demo-safety

* Curate a small “known good” set of GitHub issues for stage rehearsal.
* Every step has a timeout + fallback.
* Because demos must be live and backup videos required , you prepare a 45–60s backup clip of the full run.

## 6) Safety / anti-spam guardrails

* **No automatic public posting** in MVP.
* **No external email sends** unless the user explicitly presses Approve.
* Per-target **cooldown** (never “double message” the same author).
* Store only what you need (issue text + link + extracted logs).

## 7) Deployment plan (hackathon realistic)

* UI: Vercel deploy (optional but nice) 
* Backend: Convex 
* Orchestrator + Browser runs: can run locally for demo, or inside Daytona sandbox for extra “infra credibility.” 

## 8) Testing plan (fast, effective)

* Unit tests for:

  * signature matching logic
  * lead dedupe
  * status transitions (state machine)
* Integration “golden run” test:

  * fixed issue URL → expected extracted fields present → artifact created → review result recorded → draft produced
* Smoke test:

  * Superset parallel scan returns at least 1 lead in < 30s

## 9) Prize strategy

Apply manually to:

* **Most Hardcore Infra** (Superset parallelism + sandbox story) 
* **Best Devtool** (this is literally a devtool growth engine) 

---

# Build checklist (what your team actually does in ~8 hours)

1. Convex schema + lead pipeline statuses
2. Basic Next.js UI: watchlist editor + lead board
3. Superset CLI script that produces leads in parallel
4. Browser Use extraction skill for GitHub issue page
5. LLM “fix + draft” prompt templates
6. Laminar tracing wrapper around every run
7. AgentMail integration (send draft to demo inbox)
8. (Optional) Cubic review gate

---

If you want, I can also drop in a **“copy-paste” hackathon README** (setup + env vars + demo script + backup video plan) that matches the required submission format and keeps your run consistent under stage pressure.
