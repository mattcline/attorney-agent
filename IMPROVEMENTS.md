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

## 5. Multi-Format Support

Legal work runs on Word docs and PDFs, not just Google Docs. Supporting `.docx` and `.pdf` input would dramatically expand where this tool is useful.

**What this looks like:** For analysis, this is straightforward — extract text from Word/PDF and feed it through the same analysis pipeline. For editing, Word docs can be modified programmatically (e.g., via `python-docx`). PDFs are effectively read-only, so the output would be a redline or comment summary rather than direct edits. Start with Word.

---

## 6. Structured Edit Plans (Not Free-Form Agent Loops)

The editing phase currently gives the agent a list of approved changes and lets it figure out the `gws` commands on its own, one at a time, across up to 30 turns. This is slow, non-deterministic, and occasionally produces malformed commands. Since the approved changes already contain structured `currentText`/`proposedChange` data, the edits could be applied programmatically — no agent loop needed for straightforward replacements.

**What this looks like:** Apply simple replace/insert/delete operations directly in code using the Google Docs batch update API. Reserve the agent loop only for complex edits that require judgment (e.g., restructuring a clause). This would be faster, cheaper, and more reliable.

---

## What I'd Deprioritize

**Cross-document memory / pattern tracking.** Each document review is independent. Tracking patterns across a client's agreements sounds useful in theory, but the complexity isn't justified until the core review loop is rock-solid. Build this later, if ever.

**Agreement type auto-detection.** The user picks the agreement type today. Auto-detection is a nice-to-have, but wrong detection would apply the wrong checklist, which is worse than asking.
