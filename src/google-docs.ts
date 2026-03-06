import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const GOOGLE_DOCS_URL_PATTERNS = [
  /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/,
  /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
];

const DOC_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function extractDocId(input: string): string {
  const trimmed = input.trim();

  for (const pattern of GOOGLE_DOCS_URL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  if (DOC_ID_PATTERN.test(trimmed) && trimmed.length > 10) {
    return trimmed;
  }

  throw new Error(
    `Invalid Google Doc URL or ID: "${trimmed}"\n` +
      "Expected a Google Docs URL (https://docs.google.com/document/d/DOC_ID/edit) or a document ID.",
  );
}

export async function checkAuth(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("gws", ["auth", "status"]);
    return stdout.toLowerCase().includes("active")
      || stdout.toLowerCase().includes("logged in")
      || stdout.toLowerCase().includes("authenticated");
  } catch {
    return false;
  }
}
