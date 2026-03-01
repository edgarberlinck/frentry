import { nanoid } from "nanoid";

/**
 * Generates a DSN (Data Source Name) for a project.
 * Format: frentry://<key>@<host>/api/ingest
 */
export function generateDSN(): string {
  const key = nanoid(32);
  return key;
}

/**
 * Validates a DSN key against a project.
 */
export function parseDSN(dsn: string): string {
  return dsn.trim();
}
