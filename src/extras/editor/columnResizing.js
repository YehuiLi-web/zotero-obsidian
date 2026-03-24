"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResizeState = exports.columnResizingPluginKey = void 0;
exports.columnResizing = columnResizing;
exports.handleDecorations = handleDecorations;
const prosemirror_state_1 = require("prosemirror-state");
const prosemirror_view_1 = require("prosemirror-view");
const prosemirror_tables_1 = require("prosemirror-tables");
const prosemirror_tables_2 = require("prosemirror-tables");
const prosemirror_tables_3 = require("prosemirror-tables");
const prosemirror_tables_4 = require("prosemirror-tables");
/**
 * @public
 */
exports.columnResizingPluginKey = new prosemirror_state_1.PluginKey("tableColumnResizing");
/**
 * @public
 */
function columnResizing({ handleWidth = 5, cellMinWidth = 25, defaultCellMinWidth = 100, View = prosemirror_tables_3.TableView, lastColumnResizable = true, } = {}) {
    const plugin = new prosemirror_state_1.Plugin({
        key: exports.columnResizingPluginKey,
        state: {
            init(_, state) {
                var _a, _b;
                const nodeViews = (_b = (_a = plugin.spec) === null || _a === void 0 ? void 0 : _a.props) === null || _b === void 0 ? void 0 : _b.nodeViews;
                const tableName = (0, prosemirror_tables_1.tableNodeTypes)(state.schema).table.name;
                if (View && nodeViews) {
                    nodeViews[tableName] = (node, view) => {
                        return new View(node, defaultCellMinWidth, view);
                    };
                }
                return new ResizeState(-1, false, false);
            },
            apply(tr, prev) {
                return prev.apply(tr);
            },
        },
        props: {
            attributes: (state) => {
                const pluginState = exports.columnResizingPluginKey.getState(state);
                return pluginState && pluginState.activeHandle > -1
                    ? { class: "resize-cursor" }
                    : {};
            },
            handleDOMEvents: {
                mousemove: (view, event) => {
                    handleMouseMove(view, event, handleWidth, lastColumnResizable);
                },
                mouseleave: (view) => {
                    handleMouseLeave(view);
                },
                mousedown: (view, event) => {
                    handleMouseDown(view, event, cellMinWidth, defaultCellMinWidth);
                },
            },
            decorations: (state) => {
                const pluginState = exports.columnResizingPluginKey.getState(state);
                if (pluginState && pluginState.activeHandle > -1) {
                    return handleDecorations(state, pluginState.activeHandle);
                }
            },
            nodeViews: {},
        },
    });
    return plugin;
}
/**
 * @public
 */
class ResizeState {
    constructor(activeHandle, dragging, selecting, position = 0) {
        this.activeHandle = activeHandle;
        this.dragging = dragging;
        this.selecting = selecting;
        this.position = position;
    }
    apply(tr) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const state = this;
        const action = tr.getMeta(exports.columnResizingPluginKey);
        // If action provides a selecting flag, update it; otherwise keep the current one.
        const newSelecting = action && typeof action.selecting === "boolean"
            ? action.selecting
            : state.selecting;
        // Only update the handle if a setHandle is provided AND we're not in selecting mode.
        if (action && action.setHandle != null && !newSelecting) {
            return new ResizeState(action.setHandle, false, newSelecting, state.position);
        }
        if (action && action.setDragging !== undefined) {
            return new ResizeState(action.setDragging === null ? -1 : state.activeHandle, action.setDragging, newSelecting, action.setDragging
                ? // @ts-ignore
                    _currentEditorInstance._editorCore.view.state.selection.$anchor.pos
                : 0);
        }
        if (state.activeHandle > -1 && tr.docChanged) {
            let handle = tr.mapping.map(state.activeHandle, -1);
            if (!(0, prosemirror_tables_4.pointsAtCell)(tr.doc.resolve(handle))) {
                handle = -1;
            }
            return new ResizeState(handle, state.dragging, newSelecting, state.position);
        }
        return new ResizeState(state.activeHandle, state.dragging, newSelecting, state.position);
    }
}
exports.ResizeState = ResizeState;
function handleMouseMove(view, event, handleWidth, lastColumnResizable) {
    if (!view.editable)
        return;
    const pluginState = exports.columnResizingPluginKey.getState(view.state);
    if (!pluginState)
        return;
    if (!pluginState.dragging) {
        const target = domCellAround(event.target);
        let cell = -1;
        if (target) {
            const { left, right } = target.getBoundingClientRect();
            if (event.clientX - left <= handleWidth)
                cell = edgeCell(view, event, "left", handleWidth);
            else if (right - event.clientX <= handleWidth)
                cell = edgeCell(view, event, "right", handleWidth);
        }
        if (cell != pluginState.activeHandle) {
            if (!lastColumnResizable && cell !== -1) {
                const $cell = view.state.doc.resolve(cell);
                const table = $cell.node(-1);
                const map = prosemirror_tables_2.TableMap.get(table);
                const tableStart = $cell.start(-1);
                const col = map.colCount($cell.pos - tableStart) +
                    $cell.nodeAfter.attrs.colspan -
                    1;
                if (col == map.width - 1) {
                    return;
                }
            }
            updateHandle(view, cell);
        }
    }
}
function handleMouseLeave(view) {
    if (!view.editable)
        return;
    const pluginState = exports.columnResizingPluginKey.getState(view.state);
    if (pluginState && pluginState.activeHandle > -1 && !pluginState.dragging)
        updateHandle(view, -1);
}
function handleMouseDown(view, event, cellMinWidth, defaultCellMinWidth) {
    var _a;
    if (!view.editable)
        return false;
    const win = (_a = view.dom.ownerDocument.defaultView) !== null && _a !== void 0 ? _a : window;
    const pluginState = exports.columnResizingPluginKey.getState(view.state);
    if (!pluginState || pluginState.activeHandle == -1) {
        if (pluginState === null || pluginState === void 0 ? void 0 : pluginState.dragging) {
            return false;
        }
        // If the mousedown event is not on a resize handle, record being in non-resize drag mode
        view.dispatch(view.state.tr.setMeta(exports.columnResizingPluginKey, {
            selecting: true,
        }));
    }
    else {
        const cell = view.state.doc.nodeAt(pluginState.activeHandle);
        const width = currentColWidth(view, pluginState.activeHandle, cell.attrs);
        view.dispatch(view.state.tr.setMeta(exports.columnResizingPluginKey, {
            setDragging: { startX: event.clientX, startWidth: width },
        }));
        displayColumnWidth(view, pluginState.activeHandle, width, defaultCellMinWidth);
        event.preventDefault();
    }
    function finish(event) {
        win.removeEventListener("mouseup", finish);
        win.removeEventListener("mousemove", move);
        const pluginState = exports.columnResizingPluginKey.getState(view.state);
        if (pluginState === null || pluginState === void 0 ? void 0 : pluginState.dragging) {
            const tr = updateColumnWidth(view, pluginState.activeHandle, draggedWidth(pluginState.dragging, event, cellMinWidth));
            tr.setMeta(exports.columnResizingPluginKey, {
                setDragging: null,
                selecting: false,
            });
            // Reset selection to prevent dragging text
            tr.setSelection(prosemirror_state_1.TextSelection.create(tr.doc, (pluginState === null || pluginState === void 0 ? void 0 : pluginState.position) || 0));
            view.dispatch(tr);
        }
        else {
            view.dispatch(view.state.tr.setMeta(exports.columnResizingPluginKey, {
                selecting: false,
            }));
        }
    }
    function move(event) {
        if (!event.which)
            return finish(event);
        const pluginState = exports.columnResizingPluginKey.getState(view.state);
        if (!pluginState)
            return;
        if (pluginState.dragging) {
            const dragged = draggedWidth(pluginState.dragging, event, cellMinWidth);
            displayColumnWidth(view, pluginState.activeHandle, dragged, defaultCellMinWidth);
        }
    }
    win.addEventListener("mouseup", finish);
    win.addEventListener("mousemove", move);
    return true;
}
function currentColWidth(view, cellPos, { colspan, colwidth }) {
    const width = colwidth && colwidth[colwidth.length - 1];
    if (width)
        return width;
    const dom = view.domAtPos(cellPos);
    const node = dom.node.childNodes[dom.offset];
    let domWidth = node.offsetWidth, parts = colspan;
    if (colwidth)
        for (let i = 0; i < colspan; i++)
            if (colwidth[i]) {
                domWidth -= colwidth[i];
                parts--;
            }
    return domWidth / parts;
}
function domCellAround(target) {
    while (target && target.nodeName != "TD" && target.nodeName != "TH")
        target =
            target.classList && target.classList.contains("ProseMirror")
                ? null
                : target.parentNode;
    return target;
}
function edgeCell(view, event, side, handleWidth) {
    // posAtCoords returns inconsistent positions when cursor is moving
    // across a collapsed table border. Use an offset to adjust the
    // target viewport coordinates away from the table border.
    const offset = side == "right" ? -handleWidth : handleWidth;
    const found = view.posAtCoords({
        left: event.clientX + offset,
        top: event.clientY,
    });
    if (!found)
        return -1;
    const { pos } = found;
    const $cell = (0, prosemirror_tables_4.cellAround)(view.state.doc.resolve(pos));
    if (!$cell)
        return -1;
    if (side == "right")
        return $cell.pos;
    const map = prosemirror_tables_2.TableMap.get($cell.node(-1)), start = $cell.start(-1);
    const index = map.map.indexOf($cell.pos - start);
    return index % map.width == 0 ? -1 : start + map.map[index - 1];
}
function draggedWidth(dragging, event, resizeMinWidth) {
    const offset = event.clientX - dragging.startX;
    return Math.max(resizeMinWidth, dragging.startWidth + offset);
}
function updateHandle(view, value) {
    // If the view has non-empty selection in table, don't update the handle
    if (view.state.selection.from !== view.state.selection.to) {
        return;
    }
    view.dispatch(view.state.tr.setMeta(exports.columnResizingPluginKey, { setHandle: value }));
}
function updateColumnWidth(view, cell, width) {
    const $cell = view.state.doc.resolve(cell);
    const table = $cell.node(-1), map = prosemirror_tables_2.TableMap.get(table), start = $cell.start(-1);
    const col = map.colCount($cell.pos - start) + $cell.nodeAfter.attrs.colspan - 1;
    const tr = view.state.tr;
    for (let row = 0; row < map.height; row++) {
        const mapIndex = row * map.width + col;
        // Rowspanning cell that has already been handled
        if (row && map.map[mapIndex] == map.map[mapIndex - map.width])
            continue;
        const pos = map.map[mapIndex];
        const attrs = table.nodeAt(pos).attrs;
        const index = attrs.colspan == 1 ? 0 : col - map.colCount(pos);
        if (attrs.colwidth && attrs.colwidth[index] == width)
            continue;
        const colwidth = attrs.colwidth
            ? attrs.colwidth.slice()
            : zeroes(attrs.colspan);
        colwidth[index] = width;
        tr.setNodeMarkup(start + pos, null, Object.assign(Object.assign({}, attrs), { colwidth: colwidth }));
    }
    return tr;
}
function displayColumnWidth(view, cell, width, defaultCellMinWidth) {
    const $cell = view.state.doc.resolve(cell);
    const table = $cell.node(-1), start = $cell.start(-1);
    const col = prosemirror_tables_2.TableMap.get(table).colCount($cell.pos - start) +
        $cell.nodeAfter.attrs.colspan -
        1;
    let dom = view.domAtPos($cell.start(-1)).node;
    while (dom && dom.nodeName != "TABLE") {
        dom = dom.parentNode;
    }
    if (!dom)
        return;
    (0, prosemirror_tables_3.updateColumnsOnResize)(table, dom.firstChild, dom, defaultCellMinWidth, col, width);
}
function zeroes(n) {
    return Array(n).fill(0);
}
function handleDecorations(state, cell) {
    var _a;
    const decorations = [];
    const $cell = state.doc.resolve(cell);
    const table = $cell.node(-1);
    if (!table) {
        return prosemirror_view_1.DecorationSet.empty;
    }
    const map = prosemirror_tables_2.TableMap.get(table);
    const start = $cell.start(-1);
    const col = map.colCount($cell.pos - start) + $cell.nodeAfter.attrs.colspan - 1;
    for (let row = 0; row < map.height; row++) {
        const index = col + row * map.width;
        // For positions that have either a different cell or the end
        // of the table to their right, and either the top of the table or
        // a different cell above them, add a decoration
        if ((col == map.width - 1 || map.map[index] != map.map[index + 1]) &&
            (row == 0 || map.map[index] != map.map[index - map.width])) {
            const cellPos = map.map[index];
            const pos = start + cellPos + table.nodeAt(cellPos).nodeSize - 1;
            const dom = document.createElement("div");
            dom.className = "column-resize-handle";
            if ((_a = exports.columnResizingPluginKey.getState(state)) === null || _a === void 0 ? void 0 : _a.dragging) {
                decorations.push(prosemirror_view_1.Decoration.node(start + cellPos, start + cellPos + table.nodeAt(cellPos).nodeSize, {
                    class: "column-resize-dragging",
                }));
            }
            decorations.push(prosemirror_view_1.Decoration.widget(pos, dom));
        }
    }
    return prosemirror_view_1.DecorationSet.create(state.doc, decorations);
}
