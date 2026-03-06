import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type {
  AnalysisResult,
  ApprovedChange,
  ApprovalDecision,
  Finding,
} from "./types.js";
import { getSupportedTypes } from "./prompts/agreement-types.js";

export interface ParsedArgs {
  docId: string;
  agreementType: string;
}

export function parseArgs(argv: string[] = process.argv): ParsedArgs {
  const args = argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  let docId = "";
  let agreementType = "general";

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "--type" || args[i] === "-t") && args[i + 1]) {
      agreementType = args[i + 1];
      i++;
    } else if (!args[i].startsWith("-") && !docId) {
      docId = args[i];
    }
  }

  if (!docId) {
    console.error("Error: Google Doc URL or ID is required.\n");
    printUsage();
    process.exit(1);
  }

  return { docId, agreementType };
}

function printUsage(): void {
  console.log(`Usage: npx tsx src/agent.ts <doc-url-or-id> [options]

Arguments:
  doc-url-or-id    Google Docs URL or document ID

Options:
  --type, -t       Agreement type (default: "general")
  --help, -h       Show this help message

Supported agreement types:
  ${getSupportedTypes().join(", ")}
  (or any custom type — will use general checklist)

Examples:
  npx tsx src/agent.ts "https://docs.google.com/document/d/DOC_ID/edit" --type "nda"
  npx tsx src/agent.ts DOC_ID -t "employment"
`);
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "\x1b[31m", // red
  warning: "\x1b[33m",  // yellow
  info: "\x1b[36m",     // cyan
};

const RISK_COLORS: Record<string, string> = {
  critical: "\x1b[41m\x1b[37m", // white on red
  high: "\x1b[31m",             // red
  medium: "\x1b[33m",           // yellow
  low: "\x1b[32m",              // green
};

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

export function displayFindings(result: AnalysisResult): void {
  const riskColor = RISK_COLORS[result.riskLevel] ?? "";
  console.log(
    `\n${BOLD}═══════════════════════════════════════════════════════════${RESET}`,
  );
  console.log(`${BOLD}  LEGAL ANALYSIS RESULTS${RESET}`);
  console.log(
    `${BOLD}═══════════════════════════════════════════════════════════${RESET}\n`,
  );

  console.log(`${BOLD}Overall Risk Level:${RESET} ${riskColor}${result.riskLevel.toUpperCase()}${RESET}\n`);
  console.log(`${BOLD}Summary:${RESET} ${result.summary}\n`);

  if (result.findings.length === 0) {
    console.log("No findings to report.\n");
    return;
  }

  const criticalCount = result.findings.filter(
    (f) => f.severity === "critical",
  ).length;
  const warningCount = result.findings.filter(
    (f) => f.severity === "warning",
  ).length;
  const infoCount = result.findings.filter(
    (f) => f.severity === "info",
  ).length;

  console.log(
    `${BOLD}Findings:${RESET} ${criticalCount} critical, ${warningCount} warnings, ${infoCount} info\n`,
  );

  for (const finding of result.findings) {
    displayFinding(finding);
  }
}

function displayFinding(finding: Finding): void {
  const color = SEVERITY_COLORS[finding.severity] ?? "";
  console.log(
    `${BOLD}───────────────────────────────────────────────────────────${RESET}`,
  );
  console.log(
    `${color}[${finding.severity.toUpperCase()}]${RESET} ${BOLD}${finding.id}: ${finding.title}${RESET}`,
  );
  console.log(`${DIM}Category: ${finding.category} | Section: ${finding.sectionReference}${RESET}`);
  console.log(`\n${finding.explanation}\n`);
  console.log(`${DIM}Current text:${RESET} "${truncate(finding.currentText, 200)}"`);

  if (finding.proposedChange) {
    const pc = finding.proposedChange;
    console.log(`${DIM}Proposed (${pc.type}):${RESET} ${pc.replacementText ? `"${truncate(pc.replacementText, 200)}"` : "(no text change)"}`);
    console.log(`${DIM}Rationale:${RESET} ${pc.comment}`);
  }
  console.log();
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

export async function promptApproval(
  findings: Finding[],
): Promise<ApprovedChange[]> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const approved: ApprovedChange[] = [];

  console.log(
    `\n${BOLD}═══════════════════════════════════════════════════════════${RESET}`,
  );
  console.log(`${BOLD}  REVIEW FINDINGS${RESET}`);
  console.log(
    `${BOLD}═══════════════════════════════════════════════════════════${RESET}`,
  );
  console.log(
    `\nFor each finding, choose an action:`,
  );
  console.log(
    `  ${BOLD}a${RESET} = approve  |  ${BOLD}r${RESET} = reject  |  ${BOLD}m${RESET} = modify text  |  ${BOLD}s${RESET} = skip`,
  );
  console.log(
    `  ${BOLD}A${RESET} = approve ALL remaining  |  ${BOLD}L${RESET} = reject ALL remaining\n`,
  );

  let approveAll = false;
  let rejectAll = false;

  for (const finding of findings) {
    if (!finding.proposedChange) {
      approved.push({
        findingId: finding.id,
        decision: "skip",
        finding,
      });
      continue;
    }

    if (rejectAll) {
      approved.push({
        findingId: finding.id,
        decision: "reject",
        finding,
      });
      continue;
    }

    if (approveAll) {
      approved.push({
        findingId: finding.id,
        decision: "approve",
        finding,
      });
      continue;
    }

    const color = SEVERITY_COLORS[finding.severity] ?? "";
    console.log(
      `${color}[${finding.severity.toUpperCase()}]${RESET} ${BOLD}${finding.id}: ${finding.title}${RESET}`,
    );
    console.log(`  Current: "${truncate(finding.currentText, 120)}"`);
    if (finding.proposedChange.replacementText) {
      console.log(
        `  Proposed: "${truncate(finding.proposedChange.replacementText, 120)}"`,
      );
    }

    let decision: ApprovalDecision | null = null;
    let modifiedText: string | undefined;

    while (!decision) {
      const answer = await rl.question(`  Action [a/r/m/s/A/L]: `);
      const trimmed = answer.trim();

      switch (trimmed) {
        case "a":
          decision = "approve";
          break;
        case "r":
          decision = "reject";
          break;
        case "s":
          decision = "skip";
          break;
        case "m":
          modifiedText = await rl.question(`  Enter modified replacement text: `);
          decision = "modify";
          break;
        case "A":
          decision = "approve";
          approveAll = true;
          console.log("  → Approving all remaining findings.");
          break;
        case "L":
          decision = "reject";
          rejectAll = true;
          console.log("  → Rejecting all remaining findings.");
          break;
        default:
          console.log("  Invalid choice. Use a/r/m/s/A/L.");
      }
    }

    approved.push({
      findingId: finding.id,
      decision,
      finding,
      modifiedText,
    });
  }

  rl.close();

  const approveCount = approved.filter(
    (c) => c.decision === "approve" || c.decision === "modify",
  ).length;
  const rejectCount = approved.filter((c) => c.decision === "reject").length;
  const skipCount = approved.filter((c) => c.decision === "skip").length;

  console.log(`\n${BOLD}Review Summary:${RESET} ${approveCount} approved, ${rejectCount} rejected, ${skipCount} skipped\n`);

  return approved;
}
