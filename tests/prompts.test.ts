import { describe, it, expect } from "vitest";
import {
  buildAnalysisPrompt,
  buildEditingPrompt,
} from "../src/prompts/system-prompt.js";
import {
  getChecklist,
  getSupportedTypes,
} from "../src/prompts/agreement-types.js";
import type { ApprovedChange, Finding } from "../src/types.js";

describe("buildAnalysisPrompt", () => {
  it("includes the document ID", () => {
    const prompt = buildAnalysisPrompt("nda", "test-doc-123");
    expect(prompt).toContain("test-doc-123");
  });

  it("includes the agreement type", () => {
    const prompt = buildAnalysisPrompt("employment", "doc-id");
    expect(prompt).toContain("employment");
  });

  it("includes the gws command to read the document", () => {
    const prompt = buildAnalysisPrompt("nda", "doc-id");
    expect(prompt).toContain("gws docs documents get --document-id doc-id");
  });

  it("includes severity guidelines", () => {
    const prompt = buildAnalysisPrompt("general", "doc-id");
    expect(prompt).toContain("critical");
    expect(prompt).toContain("warning");
    expect(prompt).toContain("info");
  });

  it("includes the checklist for the agreement type", () => {
    const prompt = buildAnalysisPrompt("nda", "doc-id");
    expect(prompt).toContain("Confidential Information");
  });

  it("includes gws-only restriction", () => {
    const prompt = buildAnalysisPrompt("nda", "doc-id");
    expect(prompt).toContain("ONLY use commands starting with `gws`");
  });
});

describe("buildEditingPrompt", () => {
  const baseFinding: Finding = {
    id: "F001",
    category: "unfavorable_term",
    severity: "critical",
    title: "Unlimited liability",
    explanation: "Liability should be capped.",
    currentText: "Party A is liable for all damages",
    proposedChange: {
      type: "replace",
      replacementText: "Party A's liability shall not exceed total fees",
      comment: "Standard cap",
    },
    sectionReference: "Section 5",
  };

  it("includes the document ID", () => {
    const changes: ApprovedChange[] = [
      { findingId: "F001", decision: "approve", finding: baseFinding },
    ];
    const prompt = buildEditingPrompt("doc-123", changes);
    expect(prompt).toContain("doc-123");
  });

  it("includes the approved change details", () => {
    const changes: ApprovedChange[] = [
      { findingId: "F001", decision: "approve", finding: baseFinding },
    ];
    const prompt = buildEditingPrompt("doc-123", changes);
    expect(prompt).toContain("Party A is liable for all damages");
    expect(prompt).toContain("Party A's liability shall not exceed total fees");
  });

  it("uses modified text when decision is modify", () => {
    const changes: ApprovedChange[] = [
      {
        findingId: "F001",
        decision: "modify",
        finding: baseFinding,
        modifiedText: "Custom replacement text",
      },
    ];
    const prompt = buildEditingPrompt("doc-123", changes);
    expect(prompt).toContain("Custom replacement text");
  });

  it("excludes rejected changes", () => {
    const changes: ApprovedChange[] = [
      { findingId: "F001", decision: "reject", finding: baseFinding },
    ];
    const prompt = buildEditingPrompt("doc-123", changes);
    expect(prompt).not.toContain("Party A is liable for all damages");
  });

  it("handles delete type changes", () => {
    const deleteFinding: Finding = {
      ...baseFinding,
      proposedChange: {
        type: "delete",
        comment: "Remove redundant clause",
      },
    };
    const changes: ApprovedChange[] = [
      { findingId: "F001", decision: "approve", finding: deleteFinding },
    ];
    const prompt = buildEditingPrompt("doc-123", changes);
    expect(prompt).toContain("Delete text");
  });

  it("handles insert type changes", () => {
    const insertFinding: Finding = {
      ...baseFinding,
      proposedChange: {
        type: "insert",
        replacementText: "New clause text here",
        comment: "Add missing clause",
      },
    };
    const changes: ApprovedChange[] = [
      { findingId: "F001", decision: "approve", finding: insertFinding },
    ];
    const prompt = buildEditingPrompt("doc-123", changes);
    expect(prompt).toContain("Insert text after");
    expect(prompt).toContain("New clause text here");
  });

  it("handles comment_only type changes", () => {
    const commentFinding: Finding = {
      ...baseFinding,
      proposedChange: {
        type: "comment_only",
        comment: "Consider adding a force majeure clause",
      },
    };
    const changes: ApprovedChange[] = [
      { findingId: "F001", decision: "approve", finding: commentFinding },
    ];
    const prompt = buildEditingPrompt("doc-123", changes);
    expect(prompt).toContain("comment-only");
  });

  it("includes gws batchUpdate example", () => {
    const changes: ApprovedChange[] = [
      { findingId: "F001", decision: "approve", finding: baseFinding },
    ];
    const prompt = buildEditingPrompt("doc-123", changes);
    expect(prompt).toContain("batchUpdate");
    expect(prompt).toContain("replaceAllText");
  });
});

describe("getChecklist", () => {
  it("returns a checklist for nda", () => {
    const checklist = getChecklist("nda");
    expect(checklist).toContain("Confidential Information");
  });

  it("returns a checklist for employment", () => {
    const checklist = getChecklist("employment");
    expect(checklist).toContain("Non-compete");
  });

  it("returns a checklist for real estate purchase", () => {
    const checklist = getChecklist("real estate purchase");
    expect(checklist).toContain("Title examination");
  });

  it("returns a checklist for saas", () => {
    const checklist = getChecklist("saas");
    expect(checklist).toContain("SLA");
  });

  it("returns a checklist for lease", () => {
    const checklist = getChecklist("lease");
    expect(checklist).toContain("Security deposit");
  });

  it("returns a checklist for consulting", () => {
    const checklist = getChecklist("consulting");
    expect(checklist).toContain("Independent contractor");
  });

  it("resolves aliases to the correct checklist", () => {
    expect(getChecklist("non-disclosure agreement")).toContain(
      "Confidential Information",
    );
    expect(getChecklist("employment agreement")).toContain("Non-compete");
    expect(getChecklist("real estate purchase agreement")).toContain(
      "Title examination",
    );
    expect(getChecklist("commercial lease")).toContain("Security deposit");
    expect(getChecklist("independent contractor agreement")).toContain(
      "Independent contractor",
    );
  });

  it("is case-insensitive", () => {
    expect(getChecklist("NDA")).toContain("Confidential Information");
    expect(getChecklist("Employment")).toContain("Non-compete");
  });

  it("returns general checklist for unknown types", () => {
    const checklist = getChecklist("some-unknown-type");
    expect(checklist).toContain("General Agreement Checklist");
  });
});

describe("getSupportedTypes", () => {
  it("returns an array of supported types", () => {
    const types = getSupportedTypes();
    expect(types).toContain("nda");
    expect(types).toContain("employment");
    expect(types).toContain("lease");
    expect(types).toContain("saas");
    expect(types).toContain("consulting");
    expect(types).toContain("real estate purchase");
  });
});
