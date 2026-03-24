"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const contextPane_1 = require("../elements/workspace/contextPane");
const detailsPane_1 = require("../elements/workspace/detailsPane");
const outlinePicker_1 = require("../elements/linkCreator/outlinePicker");
const notePicker_1 = require("../elements/linkCreator/notePicker");
const notePreview_1 = require("../elements/linkCreator/notePreview");
const outlinePane_1 = require("../elements/workspace/outlinePane");
const related_1 = require("../elements/workspace/related");
const workspace_1 = require("../elements/workspace/workspace");
const inboundCreator_1 = require("../elements/linkCreator/inboundCreator");
const outboundCreator_1 = require("../elements/linkCreator/outboundCreator");
const elements = {
    "zob-context": contextPane_1.ContextPane,
    "zob-outline": outlinePane_1.OutlinePane,
    "zob-details": detailsPane_1.DetailsPane,
    "zob-workspace": workspace_1.Workspace,
    "zob-note-picker": notePicker_1.NotePicker,
    "zob-note-outline": outlinePicker_1.OutlinePicker,
    "zob-note-preview": notePreview_1.NotePreview,
    "zob-inbound-creator": inboundCreator_1.InboundCreator,
    "zob-outbound-creator": outboundCreator_1.OutboundCreator,
    "zob-related-box": related_1.NoteRelatedBox,
};
for (const [key, constructor] of Object.entries(elements)) {
    if (!customElements.get(key)) {
        customElements.define(key, constructor);
    }
}
