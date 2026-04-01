import { config } from "../../../package.json";
import { getString } from "../../utils/locale";
import {
  cleanInline,
  firstValue,
  getFieldSafe,
  parseExtraMap,
  updateExtraField,
} from "./shared";
import type { MissingMetadataTranslationConfig } from "./types";

type MetadataTranslationFieldKey = "titleTranslation" | "abstractTranslation";
type MetadataTranslationWarningCode = "unavailable" | "failed";

type TranslateForZoteroTask = Partial<{
  result: string;
  status: "waiting" | "processing" | "success" | "fail";
}>;

type TranslateForZoteroAPI = {
  translate: (
    raw: string,
    options: {
      pluginID: string;
      itemID?: number;
    },
  ) => Promise<TranslateForZoteroTask>;
};

export interface MetadataTranslationWarning {
  code: MetadataTranslationWarningCode;
  message: string;
}

export interface MetadataTranslationAutofillReport {
  filledTitleCount: number;
  filledAbstractCount: number;
  warnings: MetadataTranslationWarning[];
}

const TRANSLATE_FOR_ZOTERO_ADDON_INSTANCE = "PDFTranslate";

function hasTranslationAutofillWork(config: MissingMetadataTranslationConfig) {
  return Boolean(config.enabled && (config.includeTitle || config.includeAbstract));
}

function getTranslateForZoteroAPI(): TranslateForZoteroAPI | null {
  const addonInstance = (Zotero as any)?.[TRANSLATE_FOR_ZOTERO_ADDON_INSTANCE];
  const api = addonInstance?.api;
  return api && typeof api.translate === "function"
    ? (api as TranslateForZoteroAPI)
    : null;
}

function getExistingTranslation(
  topItem: Zotero.Item,
  fieldKey: MetadataTranslationFieldKey,
) {
  const extraMap = parseExtraMap(getFieldSafe(topItem, "extra"));
  return cleanInline(
    firstValue(getFieldSafe(topItem, fieldKey), extraMap[fieldKey]),
  );
}

function normalizeTranslationResult(result: unknown) {
  return String(result || "").trim();
}

async function runExternalTranslation(
  api: TranslateForZoteroAPI,
  raw: string,
  itemID: number,
) {
  ztoolkit.log("[OB translation] calling api.translate, raw:", raw.slice(0, 50), "itemID:", itemID);
  const task = await api.translate(raw, {
    pluginID: config.addonID,
    itemID,
  });
  ztoolkit.log("[OB translation] task result:", task?.result?.slice(0, 50), "status:", task?.status);
  const result = normalizeTranslationResult(task?.result);
  if (task?.status && task.status !== "success") {
    throw new Error(result || "Translation task failed.");
  }
  if (!result) {
    throw new Error("Translation task returned an empty result.");
  }
  return result;
}

async function fillMissingTranslationsForItem(
  topItem: Zotero.Item,
  config: MissingMetadataTranslationConfig,
  api: TranslateForZoteroAPI,
) {
  const report = {
    filledTitleCount: 0,
    filledAbstractCount: 0,
    errors: [] as string[],
  };
  const title = cleanInline(getFieldSafe(topItem, "title"));
  const abstractNote = String(topItem.getField("abstractNote") || "").trim();
  const currentExtra = getFieldSafe(topItem, "extra");
  let nextExtra = currentExtra;
  const existingTitle = getExistingTranslation(topItem, "titleTranslation");
  const existingAbstract = getExistingTranslation(topItem, "abstractTranslation");

  ztoolkit.log(
    "[OB translation] item:", topItem.id,
    "title:", title,
    "abstract:", abstractNote.slice(0, 40),
    "existingTitle:", existingTitle,
    "existingAbstract:", existingAbstract,
    "includeTitle:", config.includeTitle,
    "includeAbstract:", config.includeAbstract,
  );

  if (config.includeTitle && title && !existingTitle) {
    try {
      const translatedTitle = await runExternalTranslation(api, title, topItem.id);
      nextExtra = updateExtraField(nextExtra, "titleTranslation", translatedTitle);
      if (nextExtra !== currentExtra) {
        report.filledTitleCount += 1;
      }
    } catch (error) {
      report.errors.push(cleanInline((error as Error)?.message || String(error)));
    }
  }

  const extraAfterTitle = nextExtra;
  if (
    config.includeAbstract &&
    abstractNote &&
    !existingAbstract
  ) {
    try {
      const translatedAbstract = await runExternalTranslation(
        api,
        abstractNote,
        topItem.id,
      );
      nextExtra = updateExtraField(
        nextExtra,
        "abstractTranslation",
        translatedAbstract,
      );
      if (nextExtra !== extraAfterTitle) {
        report.filledAbstractCount += 1;
      }
    } catch (error) {
      report.errors.push(cleanInline((error as Error)?.message || String(error)));
    }
  }

  if (nextExtra !== currentExtra) {
    ztoolkit.log("[OB translation] saving extra for item:", topItem.id, "nextExtra:", nextExtra.slice(0, 100));
    topItem.setField("extra", nextExtra);
    await topItem.saveTx({
      notifierData: {
        skipOB: true,
      },
    });
  } else {
    ztoolkit.log("[OB translation] no changes to extra for item:", topItem.id);
  }

  return report;
}

export async function autofillMissingMetadataTranslations(
  topItems: Zotero.Item[],
  config: MissingMetadataTranslationConfig,
): Promise<MetadataTranslationAutofillReport> {
  const report: MetadataTranslationAutofillReport = {
    filledTitleCount: 0,
    filledAbstractCount: 0,
    warnings: [],
  };

  ztoolkit.log(
    "[OB translation] config:",
    JSON.stringify(config),
    "hasWork:",
    hasTranslationAutofillWork(config),
  );

  if (!hasTranslationAutofillWork(config)) {
    return report;
  }

  const api = getTranslateForZoteroAPI();
  ztoolkit.log("[OB translation] api available:", Boolean(api));
  if (!api) {
    report.warnings.push({
      code: "unavailable",
      message: getString("obsidian-translateMissingMetadata-unavailable"),
    });
    return report;
  }

  for (const topItem of topItems) {
    const itemReport = await fillMissingTranslationsForItem(topItem, config, api);
    report.filledTitleCount += itemReport.filledTitleCount;
    report.filledAbstractCount += itemReport.filledAbstractCount;

    const detail = itemReport.errors.find(Boolean);
    if (detail && !report.warnings.some((warning) => warning.code === "failed")) {
      report.warnings.push({
        code: "failed",
        message: getString("obsidian-translateMissingMetadata-failed", {
          args: {
            detail,
          },
        }),
      });
    }
  }

  return report;
}
