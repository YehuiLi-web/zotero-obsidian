"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XHTML_NS = void 0;
exports.getFieldSafe = getFieldSafe;
exports.parseExtraMap = parseExtraMap;
exports.updateExtraField = updateExtraField;
exports.hasFrontmatterKey = hasFrontmatterKey;
exports.firstValue = firstValue;
exports.cleanInline = cleanInline;
exports.normalizeMarkdown = normalizeMarkdown;
exports.normalizeStableValue = normalizeStableValue;
exports.stableJSONStringify = stableJSONStringify;
exports.yamlQuote = yamlQuote;
exports.isPlainObject = isPlainObject;
exports.yamlListBlock = yamlListBlock;
exports.escapeTableValue = escapeTableValue;
exports.getDateYear = getDateYear;
exports.formatAbstractLines = formatAbstractLines;
exports.getScalarJSONValue = getScalarJSONValue;
const XHTML_NS = "http://www.w3.org/1999/xhtml";
exports.XHTML_NS = XHTML_NS;
function getFieldSafe(item, key) {
    try {
        return String(item.getField(key) || "");
    }
    catch (e) {
        return "";
    }
}
function parseExtraMap(extraText) {
    const result = {};
    for (const rawLine of String(extraText || "").split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) {
            continue;
        }
        const dividerIndex = line.indexOf(":");
        if (dividerIndex < 0) {
            continue;
        }
        const key = line.slice(0, dividerIndex).trim();
        const value = line.slice(dividerIndex + 1).trim();
        if (key && !(key in result)) {
            result[key] = value;
        }
    }
    return result;
}
function updateExtraField(extraText, key, value, aliases = [key]) {
    const normalizedValue = cleanInline(value);
    const aliasSet = new Set(aliases.map((alias) => cleanInline(alias)));
    const nextLines = [];
    let replaced = false;
    for (const rawLine of String(extraText || "").split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) {
            continue;
        }
        const dividerIndex = line.indexOf(":");
        const currentKey = dividerIndex >= 0 ? cleanInline(line.slice(0, dividerIndex)) : "";
        if (!currentKey || !aliasSet.has(currentKey)) {
            nextLines.push(line);
            continue;
        }
        if (!replaced && normalizedValue) {
            nextLines.push(`${key}: ${normalizedValue}`);
            replaced = true;
        }
    }
    if (!replaced && normalizedValue) {
        nextLines.push(`${key}: ${normalizedValue}`);
    }
    return nextLines.join("\n");
}
function hasFrontmatterKey(meta, key) {
    return Object.prototype.hasOwnProperty.call(meta, key);
}
function firstValue(...values) {
    for (const value of values) {
        if (value !== "" && value !== null && value !== undefined) {
            return value;
        }
    }
    return "";
}
function cleanInline(value) {
    return String(value || "")
        .replace(/\r?\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function normalizeMarkdown(markdown) {
    return String(markdown || "").replace(/\r\n/g, "\n");
}
function normalizeStableValue(value) {
    if (Array.isArray(value)) {
        return value.map((item) => normalizeStableValue(item));
    }
    if (isPlainObject(value)) {
        return Object.keys(value)
            .sort()
            .reduce((result, key) => {
            result[key] = normalizeStableValue(value[key]);
            return result;
        }, {});
    }
    return value;
}
function stableJSONStringify(value) {
    return JSON.stringify(normalizeStableValue(value));
}
function yamlQuote(value) {
    return `"${cleanInline(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function yamlListBlock(key, values) {
    const items = values.map((value) => cleanInline(value)).filter(Boolean);
    if (!items.length) {
        return `${key}: []`;
    }
    return [key + ":", ...items.map((value) => `  - ${yamlQuote(value)}`)].join("\n");
}
function escapeTableValue(value) {
    return value.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}
function getDateYear(date) {
    const match = cleanInline(date).match(/(19|20)\d{2}/);
    return match ? match[0] : "";
}
function formatAbstractLines(text) {
    const lines = String(text || "")
        .split(/\r?\n/)
        .map((line) => line.trim());
    return lines.filter((line, index, all) => line || index < all.length - 1);
}
function getScalarJSONValue(value) {
    if (value === null || value === undefined) {
        return "";
    }
    if (typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean") {
        return String(value);
    }
    if (Array.isArray(value) &&
        value.every((item) => ["string", "number", "boolean"].includes(typeof item))) {
        return value
            .map((item) => cleanInline(item))
            .filter(Boolean)
            .join("；");
    }
    return "";
}
