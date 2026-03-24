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
exports.NotePreview = void 0;
const package_json_1 = require("../../../package.json");
const base_1 = require("../base");
const wait_1 = require("../../utils/wait");
class NotePreview extends base_1.PluginCEBase {
    constructor() {
        super(...arguments);
        this.noteOutline = [];
    }
    get content() {
        return MozXULElement.parseXULToFragment(`
<linkset>
  <html:link
    rel="stylesheet"
    href="chrome://${package_json_1.config.addonRef}/content/styles/linkCreator/notePreview.css"
  ></html:link>
</linkset>
<hbox class="toolbar">
  <hbox class="toolbar-start"></hbox>
  <hbox class="toolbar-middle"></hbox>
  <hbox class="toolbar-end"></hbox>
</hbox>
<vbox id="bn-note-preview-content" class="container">
  <iframe
    id="bn-note-preview"
    class="container"
    type="content"
  ></iframe>
</vbox>
`);
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    render(options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const iframe = this.querySelector("#bn-note-preview");
            const activeElement = document.activeElement;
            iframe.contentDocument.documentElement.innerHTML = `<html>
    <head>
      <title></title>
      <link
        rel="stylesheet"
        type="text/css"
        href="chrome://zotero-platform/content/zotero.css"
      />
      <link
        rel="stylesheet"
        type="text/css"
        href="chrome://${package_json_1.config.addonRef}/content/lib/css/github-markdown.css"
      />
      <link
        rel="stylesheet"
        href="chrome://${package_json_1.config.addonRef}/content/lib/css/katex.min.css"
        crossorigin="anonymous"
      />
      <style>
        html {
          color-scheme: light dark;
          background: var(--material-sidepane);
        }
        body {
          overflow-x: clip;
        }
        #inserted {
          border: var(--material-border);
          box-shadow: 0 2px 5px color-mix(in srgb, var(--material-background) 15%, transparent);
          border-radius: 4px;
          background: var(--material-background);
          padding: 10px;
          transition: all 0.3s ease;
        }
        #inserted:hover {
          box-shadow: 0 5px 15px color-mix(in srgb, var(--material-background) 20%, transparent);
          background: var(--color-background50);
        }
      </style>
    </head>
    <body>
      <div>${options.before}</div>
      <div id="inserted">${options.middle}</div>
      <div>${options.after}</div>
    </body>
  </html>
  `;
            activeElement === null || activeElement === void 0 ? void 0 : activeElement.focus();
            yield (0, wait_1.waitUtilAsync)(() => { var _a; return ((_a = iframe.contentDocument) === null || _a === void 0 ? void 0 : _a.readyState) === "complete"; });
            // Scroll the inserted section into the center of the iframe
            const inserted = (_a = iframe.contentDocument) === null || _a === void 0 ? void 0 : _a.getElementById("inserted");
            if (inserted) {
                const rect = inserted.getBoundingClientRect();
                const container = inserted.parentElement;
                container.scrollTo({
                    top: container.scrollTop +
                        rect.top -
                        container.clientHeight / 2 +
                        rect.height,
                    behavior: "smooth",
                });
            }
        });
    }
}
exports.NotePreview = NotePreview;
