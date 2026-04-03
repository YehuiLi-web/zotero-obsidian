function stringifyLogPart(part: unknown) {
  if (part instanceof Error) {
    return part.stack || part.message;
  }
  if (typeof part === "string") {
    return part;
  }
  try {
    return JSON.stringify(part);
  } catch (_error) {
    return String(part);
  }
}

function safeLog(...parts: unknown[]) {
  const toolkit = (globalThis as any).ztoolkit;
  if (toolkit?.log) {
    toolkit.log(...parts);
    return;
  }

  const message = parts.map((part) => stringifyLogPart(part)).join(" ");
  if (typeof Zotero !== "undefined" && typeof Zotero.debug === "function") {
    Zotero.debug(message);
    return;
  }
  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(message);
  }
}

export { safeLog };
