import { safeLog } from "./log";

/** Extract a human-readable message from an unknown error value. */
export function getErrorMessage(
  error: unknown,
  fallback = "Unknown error",
): string {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String(error ?? "");
  const message = String(rawMessage || "").trim();
  return message || fallback;
}

export function logError(
  context: string,
  error: unknown,
  ...details: unknown[]
): string {
  const message = getErrorMessage(error);
  safeLog(`[ObsidianBridge] ${context}:`, error, ...details);
  return message;
}

type ReportErrorOptions = {
  hint?: boolean;
  hintText?: string;
  fallbackMessage?: string;
  includeContextInHint?: boolean;
  details?: unknown[];
};

export function reportError(
  context: string,
  error: unknown,
  options: ReportErrorOptions = {},
): string {
  const message = logError(context, error, ...(options.details || []));
  if (!options.hint) {
    return message;
  }
  try {
    const { showHint } = require("./hint");
    const hintMessage =
      options.hintText ||
      (options.includeContextInHint === false ? message : `${context}: ${message}`);
    showHint(hintMessage || options.fallbackMessage || `${context}: error`);
  } catch (_error) {
    // hint system unavailable during early init
  }
  return message;
}

/**
 * Log an error and optionally show a user-visible hint.
 *
 * Uses `safeLog` (works before plugin init) for logging and a lazy
 * `require("./hint")` so this module can be imported from anywhere
 * without pulling in the full hint dependency chain.
 */
export function logAndHint(
  context: string,
  error: unknown,
  hintText?: string,
) {
  return reportError(context, error, {
    hint: true,
    hintText,
    includeContextInHint: !hintText,
  });
}
