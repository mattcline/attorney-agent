export type FindingCategory =
  | "missing_clause"
  | "unfavorable_term"
  | "ambiguity"
  | "risk"
  | "compliance"
  | "suggestion";

export type Severity = "info" | "warning" | "critical";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type ChangeType = "replace" | "insert" | "delete" | "comment_only";

export type ApprovalDecision = "approve" | "reject" | "modify" | "skip";

export interface ProposedChange {
  type: ChangeType;
  replacementText?: string;
  comment: string;
}

export interface Finding {
  id: string;
  category: FindingCategory;
  severity: Severity;
  title: string;
  explanation: string;
  currentText: string;
  proposedChange: ProposedChange | null;
  sectionReference: string;
}

export interface AnalysisResult {
  summary: string;
  riskLevel: RiskLevel;
  findings: Finding[];
}

export interface ApprovedChange {
  findingId: string;
  decision: ApprovalDecision;
  finding: Finding;
  modifiedText?: string;
}

export const analysisResultSchema: Record<string, unknown> = {
  type: "object",
  required: ["summary", "riskLevel", "findings"],
  additionalProperties: false,
  properties: {
    summary: {
      type: "string",
      description: "Executive summary of the legal analysis",
    },
    riskLevel: {
      type: "string",
      enum: ["low", "medium", "high", "critical"],
      description: "Overall risk level of the agreement",
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        required: [
          "id",
          "category",
          "severity",
          "title",
          "explanation",
          "currentText",
          "proposedChange",
          "sectionReference",
        ],
        additionalProperties: false,
        properties: {
          id: {
            type: "string",
            description: "Unique finding identifier, e.g. F001",
          },
          category: {
            type: "string",
            enum: [
              "missing_clause",
              "unfavorable_term",
              "ambiguity",
              "risk",
              "compliance",
              "suggestion",
            ],
          },
          severity: {
            type: "string",
            enum: ["info", "warning", "critical"],
          },
          title: {
            type: "string",
            description: "Short title summarizing the finding",
          },
          explanation: {
            type: "string",
            description: "Detailed explanation of the issue and its implications",
          },
          currentText: {
            type: "string",
            description:
              "Exact text quoted from the document. Must match verbatim for ReplaceAllText.",
          },
          proposedChange: {
            oneOf: [
              {
                type: "object",
                required: ["type", "comment"],
                additionalProperties: false,
                properties: {
                  type: {
                    type: "string",
                    enum: ["replace", "insert", "delete", "comment_only"],
                  },
                  replacementText: {
                    type: "string",
                    description:
                      "The replacement text. Required for replace and insert types.",
                  },
                  comment: {
                    type: "string",
                    description: "Rationale for the proposed change",
                  },
                },
              },
              { type: "null" },
            ],
          },
          sectionReference: {
            type: "string",
            description:
              "Reference to the section of the document, e.g. Section 3.2",
          },
        },
      },
    },
  },
};
