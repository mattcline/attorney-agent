import { getChecklist } from "./agreement-types.js";
import type { ApprovedChange } from "../types.js";

export function buildAnalysisPrompt(
  agreementType: string,
  docId: string,
): string {
  const checklist = getChecklist(agreementType);

  return `You are a senior legal review specialist with extensive experience analyzing ${agreementType} agreements. Your task is to perform a comprehensive legal analysis of a Google Doc.

## Instructions

1. First, read the document by running:
   gws docs documents get --document-id ${docId}

2. Analyze the document thoroughly, paying attention to:
   - Missing or incomplete clauses
   - Unfavorable or one-sided terms
   - Ambiguous language that could be exploited
   - Legal risks and liabilities
   - Compliance issues
   - Suggestions for improvement

3. For every finding, you MUST quote the exact text from the document in the "currentText" field. This text will be used for automated find-and-replace operations, so it must match the document verbatim. If a finding is about a missing clause, quote the surrounding text where the clause should be inserted.

4. Assign severity levels as follows:
   - "critical": Issues that could cause significant legal liability, financial loss, or render the agreement unenforceable
   - "warning": Issues that are unfavorable, create moderate risk, or deviate from market standards
   - "info": Suggestions for improvement, minor clarifications, or best practices

5. Assign an overall risk level:
   - "critical": Multiple critical findings, agreement should not be signed as-is
   - "high": One or more critical findings, significant revision needed
   - "medium": Several warnings, some revision recommended
   - "low": Minor issues only, agreement is generally sound

## Agreement-Specific Checklist for ${agreementType}

${checklist}

## Important Rules

- ONLY use commands starting with \`gws\` — no other shell commands are allowed
- Quote text EXACTLY as it appears in the document — character-perfect matching is required
- Assign finding IDs sequentially: F001, F002, F003, etc.
- Be thorough but practical — focus on legally significant issues, not stylistic preferences
- If the document cannot be read (permission denied, not found), report the error clearly`;
}

export function buildEditingPrompt(
  docId: string,
  approvedChanges: ApprovedChange[],
): string {
  const changeInstructions = approvedChanges
    .filter((c) => c.decision === "approve" || c.decision === "modify")
    .map((change, i) => {
      const finding = change.finding;
      const proposed = finding.proposedChange;
      if (!proposed) return "";

      const effectiveText =
        change.decision === "modify" && change.modifiedText
          ? change.modifiedText
          : proposed.replacementText;

      switch (proposed.type) {
        case "replace":
          return `### Edit ${i + 1}: ${finding.title} (${finding.id})
- Action: Replace text
- Find: "${finding.currentText}"
- Replace with: "${effectiveText}"
- Rationale: ${proposed.comment}`;

        case "insert":
          return `### Edit ${i + 1}: ${finding.title} (${finding.id})
- Action: Insert text after
- Find: "${finding.currentText}"
- Insert after it: "${effectiveText}"
- Rationale: ${proposed.comment}`;

        case "delete":
          return `### Edit ${i + 1}: ${finding.title} (${finding.id})
- Action: Delete text
- Find: "${finding.currentText}"
- Replace with: "" (empty string)
- Rationale: ${proposed.comment}`;

        case "comment_only":
          return `### Edit ${i + 1}: ${finding.title} (${finding.id})
- Action: No text change needed — this was a comment-only finding
- Note: ${proposed.comment}`;

        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n\n");

  return `You are applying approved legal edits to a Google Doc. Process each edit carefully, one at a time.

## Target Document
Document ID: ${docId}

## How to Apply Edits

For each text replacement, use the gws CLI batchUpdate with a ReplaceAllText request:

gws docs documents batchUpdate --document-id ${docId} --request '{"requests":[{"replaceAllText":{"containsText":{"text":"FIND_TEXT","matchCase":true},"replaceText":"REPLACE_TEXT"}}]}'

## Important Rules

- ONLY use commands starting with \`gws\` — no other shell commands are allowed
- Process ONE edit at a time and verify each succeeds before moving to the next
- If a replacement returns 0 occurrences found, report it as a warning and move on
- If a replacement matches more than once, SKIP it and report as a warning to avoid unintended changes
- Escape special characters in the JSON properly (quotes, newlines, etc.)
- For comment-only findings, no document changes are needed

## Approved Edits to Apply

${changeInstructions}

## After All Edits

Report a summary of:
- How many edits were successfully applied
- Any edits that were skipped (with reasons)
- Any errors encountered`;
}
