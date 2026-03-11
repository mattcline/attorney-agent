# Attorney Agent: Improvement Priorities

What actually matters, in order.

---

## 1. Evals and Benchmarking

You can't improve what you can't measure. Right now there's no way to know if a prompt change made things better or worse.

**What this looks like:** A set of 10-20 test documents (Google Docs or plain text fixtures) with known issues — missing indemnification clauses, one-sided termination rights, vague IP assignments, etc. Each document has a ground-truth list of expected findings. Run the agent, score precision and recall against the ground truth, track it over time. This is the foundation everything else depends on.

---

## 2. Edit Reliability

This is the biggest trust problem. The agent quotes text from the document in `currentText`, then uses `ReplaceAllText` to find and replace it. If the quote is off by a single character — wrong whitespace, missing punctuation, slightly paraphrased — the edit silently fails (0 occurrences found) or the agent warns and skips it. The user approved a change that didn't happen, and may not notice.

**What this looks like:** Move away from text-quoting as the edit mechanism. Google Docs supports index-based operations (`insertText`, `deleteContentRange`) via the batch update API. The agent could reference content by document position rather than hoping a verbatim quote matches. Alternatively, add a verification step: after all edits, re-fetch the document and confirm each change was actually applied, reporting any that weren't.

---

## 3. Prompt Refinement with Few-Shot Examples

The analysis prompt tells the agent *what* to look for but doesn't show it *how*. Adding 2-3 concrete examples of good findings — with realistic `currentText` quotes, proper severity assignments, and well-formed `proposedChange` objects — would improve consistency, reduce hallucinated quotes, and give the model a clear target format to follow.

**What this looks like:** Add an `examples` section to the system prompt with sample findings across different categories (missing clause, unfavorable term, ambiguity). Each example should demonstrate exact-match quoting discipline and proportionate severity. This is a low-effort, high-impact change.

---

## 4. Large Document Handling

There's no chunking, summarization, or context window awareness. The agent fetches the full document text via `gws docs documents get` and passes it into the conversation. Long legal agreements (M&A docs, commercial leases, enterprise SaaS agreements) can easily exceed the context window, and the model will either truncate, lose detail in the middle, or fail outright.

**What this looks like:** Detect document length before analysis. For documents that approach context limits, split into logical sections (by heading or page break), analyze each section independently, then merge and deduplicate findings. The section boundaries matter — splitting mid-clause would cause missed issues.

---

## 5. RAG for Large Documents and Precedent Matching

Section 4 covers chunking and summarization for single large documents — the minimum needed to not blow the context window. RAG goes further: embed those chunks, store them in a vector database, and retrieve only the relevant pieces at query time. This also unlocks cross-document analysis, which is where the real legal value is.

**When RAG matters vs. current approach.** For a 5-page NDA, the current single-pass approach is fine — the whole document fits in context and the model sees everything. RAG becomes necessary in two scenarios: (1) the document is too large to fit in context even after chunking (100-page M&A agreements, CC&Rs, inspection reports), and (2) you want to compare the current document against a library of past contracts ("is this indemnification clause stronger or weaker than what we usually accept?").

**What this looks like:**

- **Legal-aware chunking.** Split by section, clause, and sub-clause boundaries — not fixed token counts. A termination clause split across two chunks loses its meaning. Use document structure (headings, numbered sections) as primary split points, with sentence boundaries as fallback for unstructured text.
- **Per-document vector store.** For a single large document, embed each chunk and retrieve the top-k chunks relevant to each checklist item. The agent reviews a focused window of relevant clauses rather than the full document. This extends the chunking strategy in #4 with semantic retrieval instead of sequential processing.
- **Clause library for precedent matching.** Embed clauses from past reviewed contracts, tagged by type (indemnification, termination, IP assignment, liability cap). When reviewing a new contract, retrieve similar clauses from the library and surface differences: "This liability cap is $50K; your last three vendor agreements had $500K caps." This is the cross-document pattern tracking that was previously deprioritized — RAG makes it practical without requiring the agent to hold multiple documents in memory.
- **Hybrid retrieval (BM25 + vector).** Legal text depends on exact terminology — "best efforts" vs. "reasonable efforts" vs. "commercially reasonable efforts" have materially different legal meanings. Pure semantic search might treat these as equivalent. Combine BM25 (exact keyword matching) with vector similarity to catch both semantic relevance and terminological precision.

---

## 6. Multi-Format Support

Legal work runs on Word docs and PDFs, not just Google Docs. Supporting `.docx` and `.pdf` input would dramatically expand where this tool is useful.

**What this looks like:** For analysis, this is straightforward — extract text from Word/PDF and feed it through the same analysis pipeline. For editing, Word docs can be modified programmatically (e.g., via `python-docx`). PDFs are effectively read-only, so the output would be a redline or comment summary rather than direct edits. Start with Word.

---

## 7. Structured Edit Plans (Not Free-Form Agent Loops)

The editing phase currently gives the agent a list of approved changes and lets it figure out the `gws` commands on its own, one at a time, across up to 30 turns. This is slow, non-deterministic, and occasionally produces malformed commands. Since the approved changes already contain structured `currentText`/`proposedChange` data, the edits could be applied programmatically — no agent loop needed for straightforward replacements.

**What this looks like:** Apply simple replace/insert/delete operations directly in code using the Google Docs batch update API. Reserve the agent loop only for complex edits that require judgment (e.g., restructuring a clause). This would be faster, cheaper, and more reliable.

---

## 8. Conversation History Storage

Sessions are ephemeral — there's no record of what the agent analyzed, what messages were exchanged, or what tool calls were made during a review. When an edit fails or a finding looks wrong, there's no way to go back and see the agent's reasoning. No audit trail, no debugging, no way to learn from past runs.

**What this looks like:** Capture all messages from both `query()` calls (analysis and edit phases), including assistant responses, tool use, and structured outputs. Store each session alongside metadata: document ID, agreement type, timestamp, findings count, and approval decisions.

Use a lightweight local storage approach — SQLite or JSON files in a `.attorney-agent/` directory. No database server needed. Each session gets a record keyed by document ID and timestamp, with the full message transcript and metadata queryable independently.

Enable retrieving past session transcripts by document ID or date range. This is useful for:

- **Debugging failed edits** — see the exact agent reasoning and tool calls that led to a bad `ReplaceAllText` match
- **Audit trail** — know what was reviewed, when, and what changes were approved or skipped
- **Prompt improvement** — review how the agent handled edge cases across real documents to inform prompt changes
- **Eval support** — feeds directly into the benchmarking work in #1; you can't score agent behavior you didn't record

---

## What I'd Deprioritize

**Agreement type auto-detection.** The user picks the agreement type today. Auto-detection is a nice-to-have, but wrong detection would apply the wrong checklist, which is worse than asking.
