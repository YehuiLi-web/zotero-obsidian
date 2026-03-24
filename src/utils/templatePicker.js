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
exports.openTemplatePicker = openTemplatePicker;
const package_json_1 = require("../../package.json");
function openTemplatePicker() {
    return __awaiter(this, arguments, void 0, function* (options = {}) {
        const { multiSelect = false, filterPrefix = "", selected = [], templates: providedTemplates, } = options;
        const templates = providedTemplates && providedTemplates.length
            ? [...providedTemplates]
            : addon.api.template.getTemplateKeys().filter((template) => !addon.api.template.SYSTEM_TEMPLATE_NAMES.includes(template) &&
                (!filterPrefix || template.startsWith(filterPrefix)));
        const args = {
            templates,
            multiSelect,
            selected: [...selected],
            deferred: Zotero.Promise.defer(),
        };
        // @ts-ignore
        // args.wrappedJSObject = args;
        Services.ww.openWindow(
        // @ts-ignore
        null, `chrome://${package_json_1.config.addonRef}/content/templatePicker.xhtml`, "_blank", "chrome,modal,centerscreen,resizable=yes", args);
        yield args.deferred.promise;
        return args.selected;
    });
}
