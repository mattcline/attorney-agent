import { query } from "@anthropic-ai/claude-agent-sdk";
import type { PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import { parseArgs, displayFindings, promptApproval } from "./cli.js";
import { extractDocId, checkAuth } from "./google-docs.js";
import { buildAnalysisPrompt, buildEditingPrompt } from "./prompts/system-prompt.js";
import { analysisResultSchema } from "./types.js";
import type { AnalysisResult, ApprovedChange } from "./types.js";

// Prevent conflict when running from inside a Claude Code session
delete process.env.CLAUDECODE;

function gwsOnlyPermission(
  toolName: string,
  input: Record<string, unknown>,
): PermissionResult {
  if (toolName !== "Bash") {
    return { behavior: "deny", message: `Tool "${toolName}" is not allowed. Only Bash (with gws commands) is permitted.` };
  }

  const command = String(input.command ?? "");
  if (!command.trimStart().startsWith("gws ")) {
    return {
      behavior: "deny",
      message: `Only gws CLI commands are allowed. Received: "${command.slice(0, 80)}"`,
    };
  }

  return { behavior: "allow" };
}

async function runAnalysis(
  docId: string,
  agreementType: string,
): Promise<AnalysisResult> {
  const systemPrompt = buildAnalysisPrompt(agreementType, docId);

  console.log("\nStarting legal analysis...\n");

  let result: AnalysisResult | null = null;

  for await (const message of query({
    prompt: systemPrompt,
    options: {
      model: "claude-opus-4-6",
      tools: ["Bash"],
      allowedTools: ["Bash"],
      canUseTool: async (toolName, input) => gwsOnlyPermission(toolName, input),
      maxTurns: 15,
      outputFormat: {
        type: "json_schema",
        schema: analysisResultSchema,
      },
    },
  })) {
    if (message.type === "assistant" && message.message?.content) {
      for (const block of message.message.content) {
        if ("text" in block && block.text) {
          process.stdout.write(".");
        }
      }
    } else if (message.type === "result") {
      if (message.subtype === "success" && message.structured_output) {
        result = message.structured_output as AnalysisResult;
      } else if (message.subtype !== "success") {
        const errorResult = message as { stop_reason?: string | null };
        throw new Error(
          `Analysis failed: ${message.subtype}${errorResult.stop_reason ? ` (${errorResult.stop_reason})` : ""}`,
        );
      }
    }
  }

  console.log("\n");

  if (!result) {
    throw new Error(
      "Analysis completed but no structured output was returned. The model may not have produced valid JSON.",
    );
  }

  return result;
}

async function applyEdits(
  docId: string,
  approved: ApprovedChange[],
): Promise<void> {
  const actionable = approved.filter(
    (c) =>
      (c.decision === "approve" || c.decision === "modify") &&
      c.finding.proposedChange &&
      c.finding.proposedChange.type !== "comment_only",
  );

  if (actionable.length === 0) {
    console.log("No actionable edits to apply.");
    return;
  }

  const editPrompt = buildEditingPrompt(docId, approved);

  console.log(`\nApplying ${actionable.length} edit(s) to the document...\n`);

  for await (const message of query({
    prompt: editPrompt,
    options: {
      model: "claude-sonnet-4-6",
      tools: ["Bash"],
      allowedTools: ["Bash"],
      canUseTool: async (toolName, input) => gwsOnlyPermission(toolName, input),
      maxTurns: 30,
    },
  })) {
    if (message.type === "assistant" && message.message?.content) {
      for (const block of message.message.content) {
        if ("text" in block && block.text) {
          console.log(block.text);
        }
      }
    } else if (message.type === "result") {
      if (message.subtype === "success") {
        console.log("\nEdits applied successfully.");
      } else {
        console.error(`\nEdit phase ended with status: ${message.subtype}`);
      }
    }
  }
}

async function main(): Promise<void> {
  const { docId: rawDocId, agreementType } = parseArgs();

  let docId: string;
  try {
    docId = extractDocId(rawDocId);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }

  console.log(`Document ID: ${docId}`);
  console.log(`Agreement type: ${agreementType}`);

  const isAuthed = await checkAuth();
  if (!isAuthed) {
    console.error(
      "\nError: gws CLI is not authenticated.\n" +
        "Please run the following commands to set up authentication:\n\n" +
        "  gws auth setup    # Configure OAuth credentials\n" +
        "  gws auth login    # Log in with your Google account\n",
    );
    process.exit(1);
  }

  // Phase 1: Analysis
  const analysisResult = await runAnalysis(docId, agreementType);

  // Display findings to the attorney
  displayFindings(analysisResult);

  if (analysisResult.findings.length === 0) {
    console.log("No findings to review. The agreement looks good!");
    return;
  }

  // Human-in-the-loop: Attorney reviews and approves/rejects each finding
  const approved = await promptApproval(analysisResult.findings);

  const hasApproved = approved.some(
    (c) => c.decision === "approve" || c.decision === "modify",
  );

  if (!hasApproved) {
    console.log("No changes approved. No edits will be applied.");
    return;
  }

  // Phase 2: Apply approved edits
  await applyEdits(docId, approved);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
