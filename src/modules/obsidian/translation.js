"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autofillMissingMetadataTranslations = autofillMissingMetadataTranslations;
const package_json_1 = require("../../../package.json");
const locale_1 = require("../../utils/locale");
const shared_1 = require("./shared");
const TRANSLATE_FOR_ZOTERO_ADDON_INSTANCE = "PDFTranslate";
function hasTranslationAutofillWork(config) {
    return Boolean(config.enabled && (config.includeTitle || config.includeAbstract));
}
function getTranslateForZoteroAPI() {
    const addonInstance = Zotero === null || Zotero === void 0 ? void 0 : Zotero[TRANSLATE_FOR_ZOTERO_ADDON_INSTANCE];
    const api = addonInstance === null || addonInstance === void 0 ? void 0 : addonInstance.api;
    return api && typeof api.translate === "function"
        ? api
        : null;
}
function getExistingTranslation(topItem, fieldKey) {
    const extraMap = (0, shared_1.parseExtraMap)((0, shared_1.getFieldSafe)(topItem, "extra"));
    return (0, shared_1.cleanInline)((0, shared_1.firstValue)((0, shared_1.getFieldSafe)(topItem, fieldKey), extraMap[fieldKey]));
}
function normalizeTranslationResult(result) {
    return String(result || "").trim();
}
function runExternalTranslation(api, raw, itemID) {
    return __awaiter(this, void 0, void 0, function* () {
        const task = yield api.translate(raw, {
            pluginID: package_json_1.config.addonID,
            itemID,
        });
        const result = normalizeTranslationResult(task === null || task === void 0 ? void 0 : task.result);
        if ((task === null || task === void 0 ? void 0 : task.status) && task.status !== "success") {
            throw new Error(result || "Translation task failed.");
        }
        if (!result) {
            throw new Error("Translation task returned an empty result.");
        }
        return result;
    });
}
function fillMissingTranslationsForItem(topItem, config, api) {
    return __awaiter(this, void 0, void 0, function* () {
        const report = {
            filledTitleCount: 0,
            filledAbstractCount: 0,
            errors: [],
        };
        const title = (0, shared_1.cleanInline)((0, shared_1.getFieldSafe)(topItem, "title"));
        const abstractNote = String(topItem.getField("abstractNote") || "").trim();
        const currentExtra = (0, shared_1.getFieldSafe)(topItem, "extra");
        let nextExtra = currentExtra;
        if (config.includeTitle && title && !getExistingTranslation(topItem, "titleTranslation")) {
            try {
                const translatedTitle = yield runExternalTranslation(api, title, topItem.id);
                nextExtra = (0, shared_1.updateExtraField)(nextExtra, "titleTranslation", translatedTitle);
                if (nextExtra !== currentExtra) {
                    report.filledTitleCount += 1;
                }
            }
            catch (error) {
                report.errors.push((0, shared_1.cleanInline)((error === null || error === void 0 ? void 0 : error.message) || String(error)));
            }
        }
        const extraAfterTitle = nextExtra;
        if (config.includeAbstract &&
            abstractNote &&
            !getExistingTranslation(topItem, "abstractTranslation")) {
            try {
                const translatedAbstract = yield runExternalTranslation(api, abstractNote, topItem.id);
                nextExtra = (0, shared_1.updateExtraField)(nextExtra, "abstractTranslation", translatedAbstract);
                if (nextExtra !== extraAfterTitle) {
                    report.filledAbstractCount += 1;
                }
            }
            catch (error) {
                report.errors.push((0, shared_1.cleanInline)((error === null || error === void 0 ? void 0 : error.message) || String(error)));
            }
        }
        if (nextExtra !== currentExtra) {
            topItem.setField("extra", nextExtra);
            yield topItem.saveTx({
                notifierData: {
                    skipOB: true,
                },
            });
        }
        return report;
    });
}
function autofillMissingMetadataTranslations(topItems, config) {
    return __awaiter(this, void 0, void 0, function* () {
        const report = {
            filledTitleCount: 0,
            filledAbstractCount: 0,
            warnings: [],
        };
        if (!hasTranslationAutofillWork(config)) {
            return report;
        }
        const api = getTranslateForZoteroAPI();
        if (!api) {
            report.warnings.push({
                code: "unavailable",
                message: (0, locale_1.getString)("obsidian-translateMissingMetadata-unavailable"),
            });
            return report;
        }
        for (const topItem of topItems) {
            const itemReport = yield fillMissingTranslationsForItem(topItem, config, api);
            report.filledTitleCount += itemReport.filledTitleCount;
            report.filledAbstractCount += itemReport.filledAbstractCount;
            const detail = itemReport.errors.find(Boolean);
            if (detail && !report.warnings.some((warning) => warning.code === "failed")) {
                report.warnings.push({
                    code: "failed",
                    message: (0, locale_1.getString)("obsidian-translateMissingMetadata-failed", {
                        args: {
                            detail,
                        },
                    }),
                });
            }
        }
        return report;
    });
}
