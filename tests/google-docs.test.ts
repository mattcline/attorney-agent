import { describe, it, expect } from "vitest";
import { extractDocId } from "../src/google-docs.js";

describe("extractDocId", () => {
  it("extracts ID from a standard Google Docs URL", () => {
    const url =
      "https://docs.google.com/document/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ012345/edit";
    expect(extractDocId(url)).toBe("1aBcDeFgHiJkLmNoPqRsTuVwXyZ012345");
  });

  it("extracts ID from a Google Docs URL with query params", () => {
    const url =
      "https://docs.google.com/document/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ012345/edit?usp=sharing";
    expect(extractDocId(url)).toBe("1aBcDeFgHiJkLmNoPqRsTuVwXyZ012345");
  });

  it("extracts ID from a Google Docs URL without /edit", () => {
    const url =
      "https://docs.google.com/document/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ012345";
    expect(extractDocId(url)).toBe("1aBcDeFgHiJkLmNoPqRsTuVwXyZ012345");
  });

  it("extracts ID from a Google Drive open URL", () => {
    const url =
      "https://drive.google.com/open?id=1aBcDeFgHiJkLmNoPqRsTuVwXyZ012345";
    expect(extractDocId(url)).toBe("1aBcDeFgHiJkLmNoPqRsTuVwXyZ012345");
  });

  it("accepts a raw document ID", () => {
    expect(extractDocId("1aBcDeFgHiJkLmNoPqRsTuVwXyZ012345")).toBe(
      "1aBcDeFgHiJkLmNoPqRsTuVwXyZ012345",
    );
  });

  it("accepts an ID with hyphens and underscores", () => {
    expect(extractDocId("1a-Bc_DeFgHiJkLmNoPqRsTuVwXyZ0")).toBe(
      "1a-Bc_DeFgHiJkLmNoPqRsTuVwXyZ0",
    );
  });

  it("trims whitespace from input", () => {
    expect(extractDocId("  1aBcDeFgHiJkLmNoPqRsTuVwXyZ012345  ")).toBe(
      "1aBcDeFgHiJkLmNoPqRsTuVwXyZ012345",
    );
  });

  it("throws for an empty string", () => {
    expect(() => extractDocId("")).toThrow("Invalid Google Doc URL or ID");
  });

  it("throws for a non-Google URL", () => {
    expect(() => extractDocId("https://example.com/doc/123")).toThrow(
      "Invalid Google Doc URL or ID",
    );
  });

  it("throws for a short string that is not a valid ID", () => {
    expect(() => extractDocId("abc")).toThrow("Invalid Google Doc URL or ID");
  });

  it("throws for a string with invalid characters", () => {
    expect(() => extractDocId("invalid doc id with spaces!")).toThrow(
      "Invalid Google Doc URL or ID",
    );
  });
});
