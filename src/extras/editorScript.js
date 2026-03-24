"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObsidianBridgeEditorAPI = void 0;
// The prosemirror imports are only for type hint
const prosemirror_model_1 = require("prosemirror-model");
const plugins_1 = require("./editor/plugins");
function fromHTML(schema, html, slice) {
    const domNode = document.createElement("div");
    domNode.innerHTML = html;
    const fragment = document.createDocumentFragment();
    while (domNode.firstChild) {
        fragment.appendChild(domNode.firstChild);
    }
    if (slice) {
        return prosemirror_model_1.DOMParser.fromSchema(schema).parseSlice(fragment);
    }
    else {
        return prosemirror_model_1.DOMParser.fromSchema(schema).parse(fragment);
    }
}
function getSliceFromHTML(state, html) {
    return fromHTML(state.schema, html, true);
}
function getNodeFromHTML(state, html) {
    return fromHTML(state.schema, html);
}
function setSelection(anchor, head) {
    return (state, dispatch) => {
        const { tr, selection } = state;
        const _TextSelection = selection.constructor;
        tr.setSelection(_TextSelection.create(tr.doc, anchor, head));
        dispatch && dispatch(tr);
    };
}
// Code from https://github.com/ueberdosis/tiptap/tree/main/packages/core/src/helpers
function objectIncludes(object1, object2) {
    const keys = Object.keys(object2);
    if (!keys.length) {
        return true;
    }
    return !!keys.filter((key) => object2[key] === object1[key]).length;
}
function findMarkInSet(marks, type, attributes = {}) {
    return marks.find((item) => {
        return item.type === type && objectIncludes(item.attrs, attributes);
    });
}
function isMarkInSet(marks, type, attributes = {}) {
    return !!findMarkInSet(marks, type, attributes);
}
function getMarkRange($pos, type, attributes = {}) {
    if (!$pos || !type) {
        return;
    }
    const start = $pos.parent.childAfter($pos.parentOffset);
    if (!start.node) {
        return;
    }
    const mark = findMarkInSet(start.node.marks, type, attributes);
    if (!mark) {
        return;
    }
    let startIndex = $pos.index();
    let startPos = $pos.start() + start.offset;
    let endIndex = startIndex + 1;
    let endPos = startPos + start.node.nodeSize;
    findMarkInSet(start.node.marks, type, attributes);
    while (startIndex > 0 &&
        mark.isInSet($pos.parent.child(startIndex - 1).marks)) {
        startIndex -= 1;
        startPos -= $pos.parent.child(startIndex).nodeSize;
    }
    while (endIndex < $pos.parent.childCount &&
        isMarkInSet($pos.parent.child(endIndex).marks, type, attributes)) {
        endPos += $pos.parent.child(endIndex).nodeSize;
        endIndex += 1;
    }
    return {
        from: startPos,
        to: endPos,
    };
}
function getMarkRangeAtCursor(state, type) {
    const { selection } = state;
    const { $from } = selection;
    const start = $from.parent.childAfter($from.parentOffset);
    if (start.node) {
        const mark = start.node.marks.find((mark) => mark.type.name === type.name);
        if (mark) {
            return getMarkRange($from, type, mark.attrs);
        }
    }
    return null;
}
function deleteRange(from, to) {
    return (state, dispatch) => {
        const { tr } = state;
        console.log("Delete Node", from, to);
        tr.delete(from, to);
        dispatch(tr);
    };
}
function deleteRangeAtCursor(searchType) {
    return (state, dispatch) => {
        const range = getMarkRangeAtCursor(state, searchType);
        if (range) {
            const from = range.from;
            const to = range.to;
            return deleteRange(from, to)(state, dispatch);
        }
    };
}
function replaceRange(from, to, text, type, attrs) {
    return (state, dispatch) => {
        const { tr } = state;
        if (typeof attrs === "string") {
            attrs = JSON.parse(attrs);
        }
        const node = state.schema.text(text || state.doc.textBetween(from, to), [
            type.create(attrs),
        ]);
        console.log("Replace Node", from, to, node);
        tr.replaceWith(from, to, node);
        dispatch(tr);
    };
}
function replaceRangeNode(from, to, text, nodeType, nodeAttrs, markType, markAttrs, select) {
    return (state, dispatch) => {
        const { tr } = state;
        if (typeof nodeAttrs === "string") {
            nodeAttrs = JSON.parse(nodeAttrs);
        }
        if (typeof markAttrs === "string") {
            markAttrs = JSON.parse(markAttrs);
        }
        const node = nodeType.create(nodeAttrs, state.schema.text(text || state.doc.textBetween(from, to)), markType ? [markType.create(markAttrs)] : []);
        console.log("Replace Node", from, to, node);
        tr.replaceWith(from, to, node);
        if (select) {
            setSelection(from + node.nodeSize, from)(state);
        }
        dispatch(tr);
    };
}
function replaceRangeAtCursor(text, type, attrs, searchType) {
    return (state, dispatch) => {
        const range = getMarkRangeAtCursor(state, searchType);
        if (range) {
            const from = range.from;
            const to = range.to;
            return replaceRange(from, to, text, type, attrs)(state, dispatch);
        }
    };
}
function moveRange(from, to, delta) {
    return (state, dispatch) => {
        const { tr, selection } = state;
        const _TextSelection = selection.constructor;
        const slice = state.doc.slice(from, to);
        console.log("Move Node", from, to, delta, slice);
        tr.delete(from, to);
        tr.insert(from + delta, slice.content);
        tr.setSelection(_TextSelection.create(tr.doc, from + delta));
        tr.scrollIntoView();
        dispatch(tr);
    };
}
function updateMarkRangeAtCursor(type, attrs) {
    return (state, dispatch) => {
        const { tr, selection, doc } = state;
        let { from, to } = selection;
        const { $from, empty } = selection;
        if (empty) {
            const range = getMarkRangeAtCursor(state, type);
            if (range) {
                from = range.from;
                to = range.to;
            }
        }
        const hasMark = doc.rangeHasMark(from, to, type);
        if (hasMark) {
            tr.removeMark(from, to, type);
        }
        tr.addStoredMark(type.create(attrs));
        if (to > from) {
            tr.addMark(from, to, type.create(attrs));
        }
        dispatch(tr);
    };
}
function removeMarkRangeAtCursor(type) {
    return (state, dispatch) => {
        const { tr, selection } = state;
        let { from, to } = selection;
        const { $from, empty } = selection;
        if (empty) {
            const range = getMarkRangeAtCursor(state, type);
            if (range) {
                from = range.from;
                to = range.to;
            }
        }
        tr.ensureMarks([]);
        if (to > from) {
            tr.removeMark(from, to, type);
        }
        dispatch(tr);
    };
}
function getHeadingLevelInRange(from, to) {
    return (state) => {
        let level = -1;
        state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name === "heading") {
                level = node.attrs.level;
            }
        });
        return level;
    };
}
function updateHeadingsInRange(from, to, levelOffset) {
    return (state, dispatch) => {
        let { tr } = state;
        state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name === "heading") {
                tr = tr.setNodeMarkup(pos, state.schema.nodes.heading, {
                    level: node.attrs.level + levelOffset,
                });
            }
        });
        dispatch(tr);
    };
}
function refocusEditor(callback) {
    const scrollTop = document.querySelector(".editor-core").scrollTop;
    const input = document.createElement("input");
    input.style.position = "absolute";
    input.style.opacity = "0";
    document.body.append(input);
    input.focus();
    input.offsetTop;
    setTimeout(() => {
        document.querySelector(".primary-editor").focus();
        input.remove();
        document.querySelector(".editor-core").scrollTop = scrollTop;
        setTimeout(callback, 0);
    }, 0);
}
function updateImageDimensions(nodeID, width, height, state, dispatch) {
    const { tr } = state;
    state.doc.descendants((node, pos) => {
        if (node.type.name === "image" && node.attrs.nodeID === nodeID) {
            // tr.step(new SetAttrsStep(pos, { ...node.attrs, width, height }));
            // tr.setMeta("addToHistory", false);
            // tr.setMeta("system", true);
            tr.setNodeMarkup(pos, node.type, Object.assign(Object.assign({}, node.attrs), { width, height }), node.marks);
            dispatch(tr);
            return false;
        }
    });
}
function updateTableSize(pinLeft, pinTop) {
    var _a;
    const view = _currentEditorInstance._editorCore.view;
    console.log("Update table size");
    // Get document height and store in CSS variable
    const height = (_a = view.dom.parentElement) === null || _a === void 0 ? void 0 : _a.clientHeight;
    document.body.style.setProperty("--editor-max-height", `${height}px`);
    if (typeof pinLeft === "boolean") {
        document.body.classList.toggle("pin-table-left", pinLeft);
    }
    if (typeof pinTop === "boolean") {
        document.body.classList.toggle("pin-table-top", pinTop);
    }
}
window.addEventListener("resize", () => updateTableSize());
exports.ObsidianBridgeEditorAPI = {
    deleteRange,
    deleteRangeAtCursor,
    replaceRange,
    replaceRangeNode,
    replaceRangeAtCursor,
    moveRange,
    updateMarkRangeAtCursor,
    removeMarkRangeAtCursor,
    refocusEditor,
    updateImageDimensions,
    getHeadingLevelInRange,
    updateHeadingsInRange,
    getSliceFromHTML,
    getNodeFromHTML,
    setSelection,
    initPlugins: plugins_1.initPlugins,
    updateTableSize,
};
// @ts-ignore
window.ObsidianBridgeEditorAPI = exports.ObsidianBridgeEditorAPI;
