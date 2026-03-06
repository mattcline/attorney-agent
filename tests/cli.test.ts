import { describe, it, expect } from "vitest";
import { parseArgs, displayFindings } from "../src/cli.js";
import type { AnalysisResult, Finding } from "../src/types.js";

describe("parseArgs", () => {
  it("parses a doc URL as the first positional argument", () => {
    const result = parseArgs([
      "node",
      "agent.ts",
      "https://docs.google.com/document/d/abc123def456/edit",
    ]);
    expect(result.docId).toBe(
      "https://docs.google.com/document/d/abc123def456/edit",
    );
    expect(result.agreementType).toBe("general");
  });

  it("parses --type flag", () => {
    const result = parseArgs([
      "node",
      "agent.ts",
      "doc-id-here-1234567890",
      "--type",
      "nda",
    ]);
    expect(result.docId).toBe("doc-id-here-1234567890");
    expect(result.agreementType).toBe("nda");
  });

  it("parses -t shorthand flag", () => {
    const result = parseArgs([
      "node",
      "agent.ts",
      "doc-id-here-1234567890",
      "-t",
      "employment",
    ]);
    expect(result.agreementType).toBe("employment");
  });

  it("defaults agreement type to general", () => {
    const result = parseArgs(["node", "agent.ts", "doc-id-here-1234567890"]);
    expect(result.agreementType).toBe("general");
  });

  it("handles type flag before doc ID", () => {
    const result = parseArgs([
      "node",
      "agent.ts",
      "--type",
      "lease",
      "doc-id-here-1234567890",
    ]);
    expect(result.docId).toBe("doc-id-here-1234567890");
    expect(result.agreementType).toBe("lease");
  });
});

describe("displayFindings", () => {
  it("does not throw for a valid result with no findings", () => {
    const result: AnalysisResult = {
      summary: "Agreement looks good.",
      riskLevel: "low",
      findings: [],
    };
    expect(() => displayFindings(result)).not.toThrow();
  });

  it("does not throw for a result with findings", () => {
    const result: AnalysisResult = {
      summary: "Several issues found.",
      riskLevel: "high",
      findings: [
        {
          id: "F001",
          category: "risk",
          severity: "critical",
          title: "Missing limitation of liability",
          explanation: "The agreement has no cap on liability.",
          currentText: "Party A shall be liable for all damages",
          proposedChange: {
            type: "replace",
            replacementText:
              "Party A's liability shall not exceed the total fees paid",
            comment: "Standard market practice to cap liability",
          },
          sectionReference: "Section 8",
        },
        {
          id: "F002",
          category: "ambiguity",
          severity: "warning",
          title: "Vague termination clause",
          explanation: "Termination provisions are unclear.",
          currentText: "Either party may terminate at any time",
          proposedChange: null,
          sectionReference: "Section 12",
        },
      ],
    };
    expect(() => displayFindings(result)).not.toThrow();
  });

  it("handles all severity levels without error", () => {
    const makeFinding = (severity: "info" | "warning" | "critical"): Finding => ({
      id: "F001",
      category: "suggestion",
      severity,
      title: "Test",
      explanation: "Test",
      currentText: "text",
      proposedChange: null,
      sectionReference: "Section 1",
    });

    for (const sev of ["info", "warning", "critical"] as const) {
      const result: AnalysisResult = {
        summary: "Test",
        riskLevel: "low",
        findings: [makeFinding(sev)],
      };
      expect(() => displayFindings(result)).not.toThrow();
    }
  });

  it("handles all risk levels without error", () => {
    for (const risk of ["low", "medium", "high", "critical"] as const) {
      const result: AnalysisResult = {
        summary: "Test",
        riskLevel: risk,
        findings: [],
      };
      expect(() => displayFindings(result)).not.toThrow();
    }
  });
});
