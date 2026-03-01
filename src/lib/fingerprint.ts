import crypto from "crypto";

/**
 * Generates a consistent fingerprint for error grouping.
 *
 * Strategy:
 * 1. Use error type + first meaningful stack frame (file + function + line)
 * 2. If no stack trace, use error type + message
 *
 * This groups errors that come from the same location,
 * even if the message includes dynamic data.
 */
export function generateFingerprint(params: {
  type: string;
  message: string;
  stacktrace?: string;
}): string {
  const { type, message, stacktrace } = params;

  let fingerprintSource: string;

  if (stacktrace) {
    const firstFrame = extractFirstMeaningfulFrame(stacktrace);
    if (firstFrame) {
      fingerprintSource = `${type}:${firstFrame}`;
    } else {
      fingerprintSource = `${type}:${normalizeMessage(message)}`;
    }
  } else {
    fingerprintSource = `${type}:${normalizeMessage(message)}`;
  }

  return crypto.createHash("sha256").update(fingerprintSource).digest("hex");
}

/**
 * Extracts the first meaningful stack frame.
 * Looks for patterns like "at functionName (file:line:col)"
 * or "file:line:col"
 */
function extractFirstMeaningfulFrame(stacktrace: string): string | null {
  const lines = stacktrace.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Match "at Function (file:line:col)" or "at file:line:col"
    const atMatch = trimmed.match(
      /at\s+(?:(.+?)\s+)?\(?(.+?):(\d+):(\d+)\)?/
    );
    if (atMatch) {
      const [, fn, file, lineNum] = atMatch;
      return `${fn || "anonymous"}@${file}:${lineNum}`;
    }

    // Match "file:line:col" (Firefox/Safari style)
    const directMatch = trimmed.match(/^(.+?)@(.+?):(\d+):(\d+)$/);
    if (directMatch) {
      const [, fn, file, lineNum] = directMatch;
      return `${fn || "anonymous"}@${file}:${lineNum}`;
    }
  }

  return null;
}

/**
 * Normalizes a message by removing dynamic parts (numbers, hashes, UUIDs).
 */
function normalizeMessage(message: string): string {
  return message
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      "<uuid>"
    )
    .replace(/\b\d+\b/g, "<n>")
    .trim();
}
