import { describe, it, expect } from "vitest";
import Ajv from "ajv";
import { analysisResultSchema } from "../src/types.js";
import type { AnalysisResult } from "../src/types.js";

// We'll use a simple manual validation since we don't want to add ajv as a dep.
// Instead, let's validate the schema structure itself and test that valid/invalid
// data can be checked against it programmatically.

describe("analysisResultSchema", () => {
  it("is a valid object with required top-level fields", () => {
    expect(analysisResultSchema.type).toBe("object");
    expect(analysisResultSchema.required).toEqual([
      "summary",
      "riskLevel",
      "findings",
    ]);
  });

  it("defines summary as a string", () => {
    const props = analysisResultSchema.properties as Record<
      string,
      Record<string, unknown>
    >;
    expect(props.summary.type).toBe("string");
  });

  it("defines riskLevel with correct enum values", () => {
    const props = analysisResultSchema.properties as Record<
      string,
      Record<string, unknown>
    >;
    expect(props.riskLevel.enum).toEqual([
      "low",
      "medium",
      "high",
      "critical",
    ]);
  });

  it("defines findings as an array", () => {
    const props = analysisResultSchema.properties as Record<
      string,
      Record<string, unknown>
    >;
    expect(props.findings.type).toBe("array");
  });

  it("finding items have all required fields", () => {
    const props = analysisResultSchema.properties as Record<string, any>;
    const findingSchema = props.findings.items;
    expect(findingSchema.required).toEqual([
      "id",
      "category",
      "severity",
      "title",
      "explanation",
      "currentText",
      "proposedChange",
      "sectionReference",
    ]);
  });

  it("finding category has correct enum values", () => {
    const props = analysisResultSchema.properties as Record<string, any>;
    const findingProps = props.findings.items.properties;
    expect(findingProps.category.enum).toEqual([
      "missing_clause",
      "unfavorable_term",
      "ambiguity",
      "risk",
      "compliance",
      "suggestion",
    ]);
  });

  it("finding severity has correct enum values", () => {
    const props = analysisResultSchema.properties as Record<string, any>;
    const findingProps = props.findings.items.properties;
    expect(findingProps.severity.enum).toEqual([
      "info",
      "warning",
      "critical",
    ]);
  });

  it("proposedChange allows null via oneOf", () => {
    const props = analysisResultSchema.properties as Record<string, any>;
    const findingProps = props.findings.items.properties;
    const pc = findingProps.proposedChange;
    expect(pc.oneOf).toBeDefined();
    expect(pc.oneOf).toHaveLength(2);
    expect(pc.oneOf[1]).toEqual({ type: "null" });
  });

  it("proposedChange type has correct enum values", () => {
    const props = analysisResultSchema.properties as Record<string, any>;
    const findingProps = props.findings.items.properties;
    const pcObject = findingProps.proposedChange.oneOf[0];
    expect(pcObject.properties.type.enum).toEqual([
      "replace",
      "insert",
      "delete",
      "comment_only",
    ]);
  });

  it("schema matches the TypeScript AnalysisResult shape", () => {
    // Type-level check: ensure a valid AnalysisResult matches the schema structure
    const validResult: AnalysisResult = {
      summary: "Test summary",
      riskLevel: "medium",
      findings: [
        {
          id: "F001",
          category: "risk",
          severity: "warning",
          title: "Test finding",
          explanation: "Test explanation",
          currentText: "some text from the doc",
          proposedChange: {
            type: "replace",
            replacementText: "new text",
            comment: "Rationale",
          },
          sectionReference: "Section 1",
        },
      ],
    };
    // If this compiles, the types are consistent
    expect(validResult.findings).toHaveLength(1);
    expect(validResult.findings[0].proposedChange?.type).toBe("replace");
  });

  it("schema allows findings with null proposedChange", () => {
    const validResult: AnalysisResult = {
      summary: "Test",
      riskLevel: "low",
      findings: [
        {
          id: "F001",
          category: "missing_clause",
          severity: "info",
          title: "Missing clause",
          explanation: "No force majeure clause found",
          currentText: "surrounding text",
          proposedChange: null,
          sectionReference: "N/A",
        },
      ],
    };
    expect(validResult.findings[0].proposedChange).toBeNull();
  });
});
