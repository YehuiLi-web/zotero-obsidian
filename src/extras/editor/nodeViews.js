"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initNodeViews = initNodeViews;
const prosemirror_tables_1 = require("prosemirror-tables");
function initNodeViews(view) {
    // @ts-ignore
    const tableNodeViewProto = Object.getPrototypeOf(view.nodeViews.table());
    tableNodeViewProto.update = prosemirror_tables_1.TableView.prototype.update;
    tableNodeViewProto.ignoreMutation = prosemirror_tables_1.TableView.prototype.ignoreMutation;
    tableNodeViewProto.constructor = prosemirror_tables_1.TableView;
}
