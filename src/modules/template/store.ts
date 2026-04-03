import { config } from "../../../package.json";

export {
  ChunkedTemplatePrefStore,
  TEMPLATE_PREFS,
  TEMPLATE_VALUE_CHUNK_SIZE,
  decodeLegacyTemplateValue,
  splitTemplateValueIntoChunks,
};

export interface TemplateStore {
  getKeys(): string[];
  setKeys(keys: string[]): void;
  getValue(key: string): string | undefined;
  setValue(key: string, value: string): void;
  deleteKey(key: string): boolean;
}

const TEMPLATE_PREFS = {
  keys: `${config.prefsPrefix}.templateKeys`,
  legacyValuePrefix: `${config.prefsPrefix}.template.`,
  chunkCountPrefix: `${config.prefsPrefix}.templateChunkCount.`,
  chunkValuePrefix: `${config.prefsPrefix}.templateChunk.`,
} as const;

const TEMPLATE_VALUE_CHUNK_SIZE = 2048;

class ChunkedTemplatePrefStore implements TemplateStore {
  getKeys(): string[] {
    const rawKeys = Zotero.Prefs.get(TEMPLATE_PREFS.keys, true);
    if (!rawKeys) {
      return [];
    }
    try {
      return JSON.parse(String(rawKeys));
    } catch (error) {
      ztoolkit.log(error);
      return [];
    }
  }

  setKeys(keys: string[]): void {
    const normalizedKeys = [...new Set(keys.filter(Boolean))];
    Zotero.Prefs.set(
      TEMPLATE_PREFS.keys,
      JSON.stringify(normalizedKeys),
      true,
    );
  }

  getValue(key: string): string | undefined {
    const chunkCount = this.getChunkCount(key);
    if (chunkCount > 0) {
      return this.readChunkedValue(key, chunkCount);
    }

    const legacyValue = Zotero.Prefs.get(this.getLegacyPref(key), true);
    if (typeof legacyValue === "undefined") {
      return;
    }

    const migratedValue = decodeLegacyTemplateValue(String(legacyValue));
    this.setKey(key);
    this.writeChunkedValue(key, migratedValue);
    Zotero.Prefs.clear(this.getLegacyPref(key), true);
    return migratedValue;
  }

  setValue(key: string, value: string): void {
    this.setKey(key);
    this.writeChunkedValue(key, String(value ?? ""));
    Zotero.Prefs.clear(this.getLegacyPref(key), true);
  }

  deleteKey(key: string): boolean {
    const keys = this.getKeys();
    const index = keys.indexOf(key);
    if (index >= 0) {
      keys.splice(index, 1);
      this.setKeys(keys);
    }
    this.clearChunkedValue(key);
    Zotero.Prefs.clear(this.getLegacyPref(key), true);
    return true;
  }

  private setKey(key: string) {
    const keys = this.getKeys();
    if (!keys.includes(key)) {
      keys.push(key);
      this.setKeys(keys);
    }
  }

  private getLegacyPref(key: string) {
    return `${TEMPLATE_PREFS.legacyValuePrefix}${key}`;
  }

  private getChunkCountPref(key: string) {
    return `${TEMPLATE_PREFS.chunkCountPrefix}${key}`;
  }

  private getChunkPref(key: string, index: number) {
    return `${TEMPLATE_PREFS.chunkValuePrefix}${key}.${index}`;
  }

  private getChunkCount(key: string) {
    const rawCount = Zotero.Prefs.get(this.getChunkCountPref(key), true);
    if (typeof rawCount !== "number") {
      return 0;
    }
    return Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 0;
  }

  private readChunkedValue(key: string, chunkCount: number) {
    const chunks: string[] = [];
    for (let index = 0; index < chunkCount; index += 1) {
      const chunk = Zotero.Prefs.get(this.getChunkPref(key, index), true);
      chunks.push(typeof chunk === "string" ? chunk : "");
    }
    return chunks.join("");
  }

  private writeChunkedValue(key: string, value: string) {
    this.clearChunkedValue(key);
    const chunks = splitTemplateValueIntoChunks(value);
    Zotero.Prefs.set(this.getChunkCountPref(key), chunks.length, true);
    chunks.forEach((chunk, index) => {
      Zotero.Prefs.set(this.getChunkPref(key, index), chunk, true);
    });
  }

  private clearChunkedValue(key: string) {
    const chunkCount = this.getChunkCount(key);
    for (let index = 0; index < chunkCount; index += 1) {
      Zotero.Prefs.clear(this.getChunkPref(key, index), true);
    }
    Zotero.Prefs.clear(this.getChunkCountPref(key), true);
  }
}

function decodeLegacyTemplateValue(rawValue: string) {
  try {
    const parsedValue = JSON.parse(rawValue);
    return typeof parsedValue === "string" ? parsedValue : rawValue;
  } catch (error) {
    return rawValue;
  }
}

function splitTemplateValueIntoChunks(
  value: string,
  chunkSize: number = TEMPLATE_VALUE_CHUNK_SIZE,
) {
  const normalizedValue = String(value ?? "");
  if (chunkSize < 1 || normalizedValue.length <= chunkSize) {
    return [normalizedValue];
  }

  const chunks: string[] = [];
  for (let index = 0; index < normalizedValue.length; index += chunkSize) {
    chunks.push(normalizedValue.slice(index, index + chunkSize));
  }
  return chunks;
}
