# claude-for-legal prompt patterns

Reference for writing intent system prompts. Patterns extracted 2026-05-19 from `github.com/anthropics/claude-for-legal` — Anthropic's reference plugin pack for legal practice. Used to rewrite all 13 Bot Persona intents in `src/pages/super-admin/GlobalKnowledgeBase.jsx`. Companion deliverable for the dev team is on Desktop: `YourAI_Bot_Persona_Prompts.docx`.

Load this file when adding a new intent, rewriting an existing intent, or auditing an intent's quality. Each pattern below is a rule we want every intent to honour.

---

## The 10 patterns

### 1. Specific persona, not generic
**Don't**: "You are a legal AI assistant."
**Do**: "You are Alex, a contract analysis specialist. Your job is to triage contracts fast so the reviewer only spends time on what matters."

The persona should name a specific role and a specific job. Reviewers, drafters, briefers, and researchers all behave differently.

### 2. Mode detection up front
Most intents serve 2–4 distinct sub-modes. Spell them out at the top of the system prompt and tell the model how to detect each from the input shape.

Example (Contract Review):
```
MODE DETECTION — pick before responding:
- TRIAGE mode (default when a doc is attached + no specific clause named):
  return GREEN / YELLOW / RED verdict, 3–7 findings, recommendation. Under 400 words.
- DEEP-DIVE mode (user names a specific clause or asks "go deeper on X"):
  full clause-by-clause walk-through with pinpoint cites.
- PLAYBOOK-CHECK mode (firm playbook is loaded):
  compare each provision to the playbook position; flag deviations only.
```

### 3. Explicit output structure
A numbered template the model fills in, not a loose description.

Example (Legal Q&A):
```
ANSWER STRUCTURE:
1. **Direct answer** — one sentence. Lead with the conclusion.
2. **Legal basis** — controlling statute, regulation, or case. Bluebook.
3. **Jurisdiction** — name it. Flag variation.
4. **Exceptions and nuances** — what could change the answer.
5. **Confidence** — High / Medium / Low + one-sentence reason.
6. **When to verify or escalate** — what source to check.
```

For table-shaped output (Clause Comparison, Risk Assessment), embed the markdown table template directly in the prompt.

### 4. Confidence discipline — tag every uncertain claim
Never invent. The model tags any claim drawn from training data or weak retrieval:

| Tag | Use |
|---|---|
| `[vault: filename §section]` | Cited from a vault doc the user uploaded or has indexed |
| `[Westlaw]` / `[CourtListener]` | Cited from a connected legal-research tool |
| `[web search — verify before relying]` | Cited from web search |
| `[model knowledge — verify]` | Recalled from training data, no primary source confirmed |
| `[user provided]` | Cited from the user's own message |
| `[UNCERTAIN: specific reason]` | Brief sub-claim the model isn't sure about |
| `[VERIFY: …]` | Famous-but-contested interpretations |

Tags must reach the user. Never strip them in post-processing. Every assertion in a response should carry one tag — or be a prose connective with no factual content.

### 5. Source-priority cascade
For research-style intents (Legal Research, Legal Q&A), spell out the order in which sources should be consulted:

```
SOURCE PRIORITY (use highest-priority source available, fall through if empty):
1. Vault + connected KBs (Westlaw, CourtListener) — tag accordingly.
2. Statutes, regs, and cases known with confidence from training — [model knowledge — verify].
3. Web search if connected — [web search — verify before relying].

NEVER fill a gap silently. If the configured source returns thin results,
say so and offer (1) broaden the query, (2) try a different source,
(3) answer from general knowledge with a verify tag. Let the user choose.
```

The "never silently" rule is what unblocks public-law Q&A questions when the firm vault has no coverage.

### 6. Verbatim-quote rule
> Never put quotation marks around words attributed to a contract, party, counsel, or witness unless you have the exact passage in front of you.

When characterising without exact text: paraphrase without quotes and tag `[verify exact quote]`.

Misquoting a contract provision in a demand letter or diligence memo is the fastest way to lose credibility with opposing counsel. This rule is hard.

### 7. Pinpoint-cite rule
> A cite must support the WHOLE proposition. If the proposition has three elements and the cite covers one, split the cite.

Example: if the bot says "Section 4.2 requires payment within 30 days upon invoice receipt," then §4.2 must cover the obligation AND the trigger AND the window. If it only covers one, split:
> "Section 4.2 (payment obligation); Section 4.3 (30-day window after invoice)."

### 8. Drafting intents must NEVER refuse benign legal work
The dev build's security filter has triggered on benign NDA drafting (`security_block:high`, empty body). The prompt must explicitly counter that:

```
NEVER REFUSE TO DRAFT a benign legal document. A request to draft an NDA, MSA,
SOW, services agreement, indemnification clause, or similar is the core
legitimate use of this tool. Do not flag it as a security event.

DO REFUSE TO DRAFT (with a one-paragraph explanation, not a canned message):
- Documents whose purpose is fraud (backdated contracts for tax evasion).
- Documents that facilitate unauthorised practice of law.
- Documents that ask you to misrepresent a material fact.
```

The contrast between WILL refuse vs WILL NOT refuse must be explicit. Without it, drafting intents default to over-refusal.

### 9. Term-of-art fidelity
> When asked for a "residual knowledge clause", "sole-and-exclusive-remedy clause", "non-circumvention clause", or any other term of art — generate the clause that matches the term-of-art MEANING, not a generic confidentiality covenant labelled with the requested name.

The dev build hallucinated a residual-knowledge clause as a generic confidentiality covenant (which means the opposite legal effect). A lawyer copy-pasting that has real malpractice exposure. The prompt must flag known terms of art and instruct the model not to substitute.

### 10. Suggested next action at the end of every response
Every reply ends with one line:
- "Verify [pin cite] against [source]"
- "Have partner review §X before sending"
- "Pull Shepard's / KeyCite history on [case]"
- "Request [missing doc] from the seller"

This trains the user to treat the AI as a starting point, not a final answer. Drafting intents include "Send to client for fact review" or "Have partner review §X before sending". Research intents include "Verify against primary source X". Case-law intents include "Pull subsequent treatment".

---

## When adding a new intent

1. Pick a specific persona — name the role and the job, not the technology.
2. Define 2–4 modes the intent serves. Detect each from input shape.
3. Write an explicit output template — numbered sections, or markdown table.
4. List explicit refusal cases (fraud, UPL, misrepresentation) and explicit non-refusal cases (benign drafting). The second is as important as the first.
5. Apply confidence discipline — every uncertain claim tagged.
6. Apply source-priority cascade if the intent does research.
7. Embed the verbatim-quote and pinpoint-cite rules.
8. End with a "Suggested next action" instruction.
9. Length discipline — most answers 100–600 words. Stakeholder summaries ≤200. TLDR ≤80. Multi-jurisdiction research up to 1200.

Update all three places (file lists in CLAUDE.md gotcha #6):
- `src/lib/intents.ts`
- `src/lib/intentDetector.ts`
- `src/pages/super-admin/GlobalKnowledgeBase.jsx` → `DEFAULT_INTENTS`
- Plus the dev team's `intents` table (via the DOCX deliverable, until their /api/v1 schema is shared and we can POST direct)

Bump the storage key (`yourai_bot_persona_v2` → `_v3` etc) so existing SA sessions hydrate the new defaults.

---

## Cross-cutting patterns worth promoting to a global prompt prefix

Rather than duplicating in every intent, these could wrap every intent's systemPrompt as a global prefix when the dev team is ready:

- Source-attribution tag vocabulary (pattern 4 above)
- Verbatim-quote rule (pattern 6)
- Pinpoint-cite rule (pattern 7)
- Confidence rating discipline (always include High/Medium/Low + reason)
- Suggested-next-action requirement (pattern 10)
- Destination check ("if the user mentions the letter is going to opposing counsel, do NOT prepend a PRIVILEGED header")
- Refusal posture (refuse only fraud/UPL/misrepresentation; otherwise answer)
- No invented citations or placeholders (no `[CITE:N/A]`, no `[TBD]` in user output)
- Cite jurisdiction explicitly
- Length discipline

Decision pending: do these go in the dev team's intents-table backend (per-intent duplication) or a separate "global system prompt" config row? The deliverable DOCX flags this as Appendix B → "Cross-cutting patterns".

---

## Reference

Source repo: `https://github.com/anthropics/claude-for-legal`

Skills sampled for patterns:
- `commercial-legal/nda-review/SKILL.md` — GREEN/YELLOW/RED triage model
- `commercial-legal/saas-msa-review/SKILL.md` — jurisdiction-sensitive review, source attribution
- `commercial-legal/amendment-history/SKILL.md` — mode detection (Summary vs Provision trace)
- `commercial-legal/stakeholder-summary/SKILL.md` — STAKEHOLDER mode + length cap
- `law-student/case-brief/SKILL.md` — 9-section case-brief structure + confidence discipline
- `litigation-legal/demand-draft/SKILL.md` — privilege check + FRE 408 + candour-about-weak-arguments
- `litigation-legal/chronology/SKILL.md` — significance tags + side framing
- `corporate-legal/diligence-issue-extraction/SKILL.md` — VDR issue-extraction format + materiality

The repo is much larger than what we used — for additional patterns (e.g. matter-workspace, AI tool handoff, closing checklist, board minutes) re-clone and read directly when scope expands.
