# Travel Assistant MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bilingual internal travel Q&A MVP with strict knowledge-grounded answers, admin content management via URL key, and feedback buttons.

**Architecture:** Use a single Next.js App Router app. Store knowledge and feedback in local JSON files under `data/`. Chat API performs rule-based classification and retrieval first, then calls Qwen Plus through OpenAI-compatible endpoint only when knowledge matches exist.

**Tech Stack:** Next.js, React, TypeScript, Node.js fs/path, Vitest.

## Global Constraints

- No login system; admin access only via `/admin?key=...` and backend `ADMIN_KEY` validation.
- Strict mode: when no reliable knowledge hit, return explicit fallback and human handoff guidance.
- Response format must be `Conclusion -> Details with sources -> Next steps`.
- UI should be concise and Apple-like with CN/EN toggle and feedback buttons.
- Data source is official internal knowledge only; never fabricate policy.

---

### Task 1: Project scaffold and baseline config

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `app/page.tsx`

**Interfaces:**
- Produces: runnable Next.js app shell, environment variable contract.

- [ ] **Step 1: Add project dependencies and scripts**
- [ ] **Step 2: Add TypeScript and Next.js config files**
- [ ] **Step 3: Add base layout, global style, and placeholder home page**
- [ ] **Step 4: Verify `npm run build` can compile baseline**
- [ ] **Step 5: Commit baseline scaffold**

### Task 2: Knowledge model, retrieval, and Qwen client

**Files:**
- Create: `types/knowledge.ts`
- Create: `lib/i18n.ts`
- Create: `lib/knowledge-store.ts`
- Create: `lib/retrieval.ts`
- Create: `lib/qwen-client.ts`
- Create: `data/knowledge.json`

**Interfaces:**
- Produces: `searchKnowledge(query, lang)` and `generateGroundedAnswer(...)`.

- [ ] **Step 1: Define knowledge entry schema and bilingual labels**
- [ ] **Step 2: Implement JSON read/write helpers for knowledge + feedback**
- [ ] **Step 3: Implement strict retrieval and category inference**
- [ ] **Step 4: Implement Qwen OpenAI-compatible client wrapper**
- [ ] **Step 5: Add seeded knowledge entries covering major scenarios**
- [ ] **Step 6: Commit retrieval and model layer**

### Task 3: API routes (chat/admin/feedback)

**Files:**
- Create: `app/api/chat/route.ts`
- Create: `app/api/admin/knowledge/route.ts`
- Create: `app/api/admin/knowledge/[id]/route.ts`
- Create: `app/api/feedback/route.ts`
- Create: `data/feedback.json`

**Interfaces:**
- Consumes: retrieval + qwen client + knowledge store.
- Produces: stable JSON APIs for user and admin pages.

- [ ] **Step 1: Implement `/api/chat` strict flow and fallback behavior**
- [ ] **Step 2: Implement admin list/create/update/delete APIs with key validation**
- [ ] **Step 3: Implement feedback submit API**
- [ ] **Step 4: Add error handling and response typing**
- [ ] **Step 5: Commit API layer**

### Task 4: User and admin UI

**Files:**
- Modify: `app/page.tsx`
- Create: `app/admin/page.tsx`
- Create: `components/language-toggle.tsx`
- Create: `components/chat-panel.tsx`
- Create: `components/admin-panel.tsx`
- Create: `components/feedback-buttons.tsx`

**Interfaces:**
- Consumes: API routes.
- Produces: bilingual user chat UI and admin management UI.

- [ ] **Step 1: Build bilingual copy and language toggle**
- [ ] **Step 2: Build chat interaction UI with response section formatting**
- [ ] **Step 3: Build helpful/unhelpful feedback actions**
- [ ] **Step 4: Build admin table and create/edit forms**
- [ ] **Step 5: Commit UI layer**

### Task 5: Tests, docs, and release readiness

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/retrieval.test.ts`
- Create: `tests/chat-fallback.test.ts`
- Create: `tests/admin-auth.test.ts`
- Modify: `README.md`

**Interfaces:**
- Produces: verifiable behavior and runbook.

- [ ] **Step 1: Add unit tests for retrieval ranking and strict fallback decision**
- [ ] **Step 2: Add unit test for admin key enforcement**
- [ ] **Step 3: Run test suite and fix failures**
- [ ] **Step 4: Update README with setup, env, run, admin usage**
- [ ] **Step 5: Commit verification and docs**
