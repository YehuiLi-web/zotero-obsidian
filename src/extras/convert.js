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
exports.note2rehype = note2rehype;
exports.rehype2remark = rehype2remark;
exports.rehype2note = rehype2note;
exports.remark2rehype = remark2rehype;
exports.remark2md = remark2md;
exports.remark2latex = remark2latex;
exports.md2remark = md2remark;
exports.content2diff = content2diff;
exports.md2html = md2html;
const unified_1 = require("unified");
const rehype_parse_1 = require("rehype-parse");
const rehype_remark_1 = require("rehype-remark");
const remark_rehype_1 = require("remark-rehype");
const rehype_stringify_1 = require("rehype-stringify");
const remark_parse_1 = require("remark-parse");
const remark_stringify_1 = require("remark-stringify");
const hast_util_to_mdast_1 = require("hast-util-to-mdast");
const mdast_util_to_markdown_1 = require("mdast-util-to-markdown");
const mdast_util_gfm_table_1 = require("mdast-util-gfm-table");
const hast_util_to_html_1 = require("hast-util-to-html");
const hast_util_to_text_1 = require("hast-util-to-text");
const remark_gfm_1 = require("remark-gfm");
const remark_math_1 = require("remark-math");
// visit may push nodes twice, use new Array(...new Set(nodes))
// if the you want to process nodes outside visit
const unist_util_visit_1 = require("unist-util-visit");
const unist_util_visit_parents_1 = require("unist-util-visit-parents");
const hastscript_1 = require("hastscript");
const diff_1 = require("diff");
function replace(targetNode, sourceNode) {
    targetNode.type = sourceNode.type;
    targetNode.tagName = sourceNode.tagName;
    targetNode.properties = sourceNode.properties;
    targetNode.value = sourceNode.value;
    targetNode.children = sourceNode.children;
}
function note2rehype(str) {
    const rehype = (0, unified_1.unified)()
        .use(remark_gfm_1.default)
        .use(remark_math_1.default)
        .use(rehype_parse_1.default, { fragment: true })
        .parse(str);
    // Make sure <br> is inline break. Remove \n before/after <br>
    const removeBlank = (node, parentNode, offset) => {
        const idx = parentNode.children.indexOf(node);
        const target = parentNode.children[idx + offset];
        if (target &&
            target.type === "text" &&
            !target.value.replace(/[\r\n]/g, "")) {
            parentNode.children.splice(idx + offset, 1);
        }
    };
    (0, unist_util_visit_parents_1.visitParents)(rehype, (_n) => _n.type === "element" && _n.tagName === "br", (_n, ancestors) => {
        if (ancestors.length) {
            const parentNode = ancestors[ancestors.length - 1];
            removeBlank(_n, parentNode, -1);
            removeBlank(_n, parentNode, 1);
        }
    });
    // Make sure <span> and <img> wrapped by <p>
    (0, unist_util_visit_parents_1.visitParents)(rehype, (_n) => _n.type === "element" && (_n.tagName === "span" || _n.tagName === "img"), (_n, ancestors) => {
        if (ancestors.length) {
            const parentNode = ancestors[ancestors.length - 1];
            if (parentNode === rehype) {
                const newChild = (0, hastscript_1.h)("span");
                replace(newChild, _n);
                const p = (0, hastscript_1.h)("p", [newChild]);
                replace(_n, p);
            }
        }
    });
    // Make sure empty <p> under root node is removed
    (0, unist_util_visit_parents_1.visitParents)(rehype, (_n) => _n.type === "element" && _n.tagName === "p", (_n, ancestors) => {
        if (ancestors.length) {
            const parentNode = ancestors[ancestors.length - 1];
            if (parentNode === rehype && !_n.children.length && !(0, hast_util_to_text_1.toText)(_n)) {
                parentNode.children.splice(parentNode.children.indexOf(_n), 1);
            }
        }
    });
    return rehype;
}
function rehype2remark(rehype) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield (0, unified_1.unified)()
            .use(rehype_remark_1.default, {
            handlers: {
                span: (h, node) => {
                    var _a, _b, _c, _d, _e, _f, _g, _h;
                    if ((_b = (_a = node.properties) === null || _a === void 0 ? void 0 : _a.style) === null || _b === void 0 ? void 0 : _b.includes("text-decoration: line-through")) {
                        return h(node, "delete", (0, rehype_remark_1.all)(h, node));
                    }
                    else if ((_d = (_c = node.properties) === null || _c === void 0 ? void 0 : _c.style) === null || _d === void 0 ? void 0 : _d.includes("background-color")) {
                        return h(node, "html", (0, hast_util_to_html_1.toHtml)(node));
                    }
                    else if ((_f = (_e = node.properties) === null || _e === void 0 ? void 0 : _e.style) === null || _f === void 0 ? void 0 : _f.includes("color")) {
                        return h(node, "html", (0, hast_util_to_html_1.toHtml)(node));
                    }
                    else if ((_h = (_g = node.properties) === null || _g === void 0 ? void 0 : _g.className) === null || _h === void 0 ? void 0 : _h.includes("math")) {
                        return h(node, "inlineMath", (0, hast_util_to_text_1.toText)(node).slice(1, -1));
                    }
                    else {
                        return h(node, "paragraph", (0, rehype_remark_1.all)(h, node));
                    }
                },
                pre: (h, node) => {
                    var _a, _b;
                    if ((_b = (_a = node.properties) === null || _a === void 0 ? void 0 : _a.className) === null || _b === void 0 ? void 0 : _b.includes("math")) {
                        return h(node, "math", (0, hast_util_to_text_1.toText)(node).slice(2, -2));
                    }
                    else {
                        const ret = hast_util_to_mdast_1.defaultHandlers.pre(h, node);
                        return ret;
                    }
                },
                u: (h, node) => {
                    return h(node, "u", (0, hast_util_to_text_1.toText)(node));
                },
                sub: (h, node) => {
                    return h(node, "sub", (0, hast_util_to_text_1.toText)(node));
                },
                sup: (h, node) => {
                    return h(node, "sup", (0, hast_util_to_text_1.toText)(node));
                },
                table: (h, node) => {
                    let hasStyle = false;
                    let hasHeader = false;
                    (0, unist_util_visit_1.visit)(node, (_n) => _n.type === "element" &&
                        ["tr", "td", "th"].includes(_n.tagName), (node) => {
                        if (node.properties.style) {
                            hasStyle = true;
                        }
                        if (!hasHeader && node.tagName === "th") {
                            hasHeader = true;
                        }
                    });
                    // if (0 && hasStyle) {
                    //   return h(node, "styleTable", toHtml(node));
                    // } else {
                    const tableNode = hast_util_to_mdast_1.defaultHandlers.table(h, node);
                    // Remove empty thead
                    if (!hasHeader) {
                        if (!tableNode.data) {
                            tableNode.data = {};
                        }
                        tableNode.data.bnRemove = true;
                    }
                    return tableNode;
                    // }
                },
                /*
                 * See https://github.com/windingwind/zotero-better-notes/issues/820
                 * The text content separated by non-text content (e.g. inline math)
                 * inside `li`(rehype) will be converted to `paragraph`(remark),
                 * which will be turned to line with \n in MD:
                 * ```rehype
                 * li: [text, text, inline-math, text]
                 * ```
                 * to
                 * ```remark
                 * listitem: [paragraph, inline-math, paragraph]
                 * ```
                 * to
                 * ```md
                 *  * text text
                 *    inline-math
                 *    text
                 * ```
                 */
                li: (h, node) => {
                    const mNode = hast_util_to_mdast_1.defaultHandlers.li(h, node);
                    // If no more than 1 children, skip
                    if (!mNode || mNode.children.length < 2) {
                        return mNode;
                    }
                    const children = [];
                    const paragraphNodes = ["list", "code", "math", "table"];
                    // Merge none-list nodes inside li into the previous paragraph node to avoid line break
                    while (mNode.children.length > 0) {
                        const current = mNode.children.shift();
                        let cached = children[children.length - 1];
                        // https://github.com/windingwind/zotero-better-notes/issues/1207
                        // Create a new paragraph node
                        if ((cached === null || cached === void 0 ? void 0 : cached.type) !== "paragraph") {
                            cached = {
                                type: "paragraph",
                                children: [],
                            };
                            children.push(cached);
                        }
                        if ((current === null || current === void 0 ? void 0 : current.type) === "paragraph") {
                            cached.children.push(...current.children);
                        }
                        // https://github.com/windingwind/zotero-better-notes/issues/1300
                        // @ts-ignore inlineMath is not in mdast
                        else if ((current === null || current === void 0 ? void 0 : current.type) === "inlineMath") {
                            cached.children.push({
                                type: "text",
                                value: " ",
                            });
                            cached.children.push(current);
                            cached.children.push({
                                type: "text",
                                value: " ",
                            });
                        }
                        else if ((current === null || current === void 0 ? void 0 : current.type) &&
                            !paragraphNodes.includes(current === null || current === void 0 ? void 0 : current.type)) {
                            cached.children.push(current);
                        }
                        else {
                            children.push(current);
                        }
                    }
                    mNode.children.push(...children);
                    return mNode;
                },
                wrapper: (h, node) => {
                    return h(node, "wrapper", (0, hast_util_to_text_1.toText)(node));
                },
                wrapperleft: (h, node) => {
                    return h(node, "wrapperleft", (0, hast_util_to_text_1.toText)(node));
                },
                wrapperright: (h, node) => {
                    return h(node, "wrapperright", (0, hast_util_to_text_1.toText)(node));
                },
                zhighlight: (h, node) => {
                    return h(node, "zhighlight", (0, hast_util_to_html_1.toHtml)(node));
                },
                zcitation: (h, node) => {
                    return h(node, "zcitation", (0, hast_util_to_html_1.toHtml)(node));
                },
                znotelink: (h, node) => {
                    return h(node, "znotelink", (0, hast_util_to_html_1.toHtml)(node));
                },
                zimage: (h, node) => {
                    return h(node, "zimage", (0, hast_util_to_html_1.toHtml)(node));
                },
            },
        })
            .run(rehype);
    });
}
function remark2md(remark) {
    const handlers = {
        code: (node) => {
            return "```\n" + node.value + "\n```";
        },
        u: (node) => {
            return "<u>" + node.value + "</u>";
        },
        sub: (node) => {
            return "<sub>" + node.value + "</sub>";
        },
        sup: (node) => {
            return "<sup>" + node.value + "</sup>";
        },
        inlineMath: (node) => {
            return "$" + node.value + "$";
        },
        styleTable: (node) => {
            return node.value;
        },
        wrapper: (node) => {
            return "\n<!-- " + node.value + " -->\n";
        },
        wrapperleft: (node) => {
            return "<!-- " + node.value + " -->\n";
        },
        wrapperright: (node) => {
            return "\n<!-- " + node.value + " -->";
        },
        zhighlight: (node) => {
            return node.value.replace(/(^<zhighlight>|<\/zhighlight>$)/g, "");
        },
        zcitation: (node) => {
            return node.value.replace(/(^<zcitation>|<\/zcitation>$)/g, "");
        },
        znotelink: (node) => {
            return node.value.replace(/(^<znotelink>|<\/znotelink>$)/g, "");
        },
        zimage: (node) => {
            return node.value.replace(/(^<zimage>|<\/zimage>$)/g, "");
        },
    };
    const tableHandler = (node) => {
        var _a;
        const tbl = (0, mdast_util_gfm_table_1.gfmTableToMarkdown)();
        // table must use same handlers as rest of pipeline
        const txt = (0, mdast_util_to_markdown_1.toMarkdown)(node, {
            extensions: [tbl],
            // Use the same handlers as the rest of the pipeline
            handlers,
        });
        if ((_a = node.data) === null || _a === void 0 ? void 0 : _a.bnRemove) {
            const lines = txt.split("\n");
            // Replace the first line cells from `|{multiple spaces}|{multiple spaces}|...` to `| <!-- --> | <!-- --> |...`
            lines[0] = lines[0].replace(/(\| +)+/g, (s) => {
                return s.replace(/ +/g, " <!-- --> ");
            });
            return lines.join("\n");
        }
        return txt;
    };
    return String((0, unified_1.unified)()
        .use(remark_gfm_1.default)
        .use(remark_math_1.default)
        .use(remark_stringify_1.default, {
        // Prevent recursive call
        handlers: Object.assign({}, handlers, {
            table: tableHandler,
        }),
    })
        .stringify(remark));
}
function remark2latex(remark) {
    return String((0, unified_1.unified)()
        .use(remark_gfm_1.default)
        .use(remark_math_1.default)
        .use(remark_stringify_1.default, {
        handlers: {
            text: (node) => {
                return node.value;
            },
        },
    })
        .stringify(remark));
}
function md2remark(str) {
    // Parse Obsidian-style image ![[xxx.png]]
    // Encode spaces in link, otherwise it cannot be parsed to image node
    str = str
        .replace(/!\[\[(.*)\]\]/g, (s) => `![](${s.slice(3, -2)})`)
        .replace(/!\[(.*)\]\((.*)\)/g, (match, altText, imageURL) => `![${altText}](${encodeURI(decodeURI(imageURL))})`);
    const remark = (0, unified_1.unified)()
        .use(remark_gfm_1.default)
        .use(remark_math_1.default)
        .use(remark_parse_1.default)
        .parse(str);
    // visit(
    //   remark,
    //   (_n) => _n.type === "image",
    //   (_n: any) => {
    //     _n.type = "html";
    //     _n.value = toHtml(
    //       h("img", {
    //         src: _n.url,
    //       })
    //     );
    //   }
    // );
    return remark;
}
function remark2rehype(remark) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield (0, unified_1.unified)()
            .use(remark_rehype_1.default, {
            allowDangerousHtml: true,
            // handlers: {
            //   code: (h, node) => {
            //     return h(node, "pre", [h(node, "text", node.value)]);
            //   },
            // },
        })
            .run(remark);
    });
}
function rehype2note(rehype) {
    // Del node
    (0, unist_util_visit_1.visit)(rehype, (node) => node.type === "element" && node.tagName === "del", (node) => {
        node.tagName = "span";
        node.properties.style = "text-decoration: line-through";
    });
    // Code node
    (0, unist_util_visit_parents_1.visitParents)(rehype, (node) => node.type === "element" && node.tagName === "code", (node, ancestors) => {
        const parent = ancestors.length
            ? ancestors[ancestors.length - 1]
            : undefined;
        if ((parent === null || parent === void 0 ? void 0 : parent.type) == "element" && (parent === null || parent === void 0 ? void 0 : parent.tagName) === "pre") {
            node.value = (0, hast_util_to_text_1.toText)(node, { whitespace: "pre-wrap" });
            // Remove \n at the end of code block, which is redundant
            if (node.value.endsWith("\n")) {
                node.value = node.value.slice(0, -1);
            }
            node.type = "text";
        }
    });
    // Table node with style
    (0, unist_util_visit_1.visit)(rehype, (node) => node.type === "element" && node.tagName === "table", (node) => {
        let hasStyle = false;
        let hasHeader = false;
        (0, unist_util_visit_1.visit)(node, (_n) => _n.type === "element" &&
            ["tr", "td", "th"].includes(_n.tagName), (node) => {
            var _a;
            if (node.properties.style) {
                hasStyle = true;
            }
            if (!hasHeader &&
                node.tagName === "th" &&
                ((_a = node.children[0]) === null || _a === void 0 ? void 0 : _a.value) !== "<!-- -->") {
                hasHeader = true;
            }
        });
        if (hasStyle) {
            node.value = (0, hast_util_to_html_1.toHtml)(node).replace(/[\r\n]/g, "");
            node.children = [];
            node.type = "raw";
        }
        if (!hasHeader) {
            const index = node.children.findIndex((_n) => _n.tagName === "thead");
            // Remove children before thead
            if (index > -1) {
                node.children = node.children.slice(index + 1);
            }
        }
    });
    // Convert thead to tbody
    (0, unist_util_visit_1.visit)(rehype, (node) => node.type === "element" && node.tagName === "thead", (node) => {
        node.value = (0, hast_util_to_html_1.toHtml)(node).slice(7, -8);
        node.children = [];
        node.type = "raw";
    });
    // Wrap lines in list with <span> (for diff)
    (0, unist_util_visit_parents_1.visitParents)(rehype, "text", (node, ancestors) => {
        const parent = ancestors.length
            ? ancestors[ancestors.length - 1]
            : undefined;
        if ((parent === null || parent === void 0 ? void 0 : parent.type) == "element" &&
            ["li", "td"].includes(parent === null || parent === void 0 ? void 0 : parent.tagName) &&
            node.value.replace(/[\r\n]/g, "")) {
            node.type = "element";
            node.tagName = "span";
            node.children = [
                { type: "text", value: node.value.replace(/[\r\n]/g, "") },
            ];
            node.value = undefined;
        }
    });
    // No empty breakline text node in list (for diff)
    (0, unist_util_visit_1.visit)(rehype, (node) => node.type === "element" &&
        (node.tagName === "li" || node.tagName === "td"), (node) => {
        var _a, _b;
        node.children = node.children.filter((_n) => _n.type === "element" ||
            (_n.type === "text" && _n.value.replace(/[\r\n]/g, "")));
        // https://github.com/windingwind/zotero-better-notes/issues/1300
        // For all math-inline node in list, remove 1 space from its sibling text node
        if (node.tagName === "li") {
            for (const p of node.children) {
                for (let idx = 0; idx < p.children.length; idx++) {
                    const _n = p.children[idx];
                    if ((_b = (_a = _n.properties) === null || _a === void 0 ? void 0 : _a.className) === null || _b === void 0 ? void 0 : _b.includes("math-inline")) {
                        if (idx > 0) {
                            const prev = p.children[idx - 1];
                            if (prev.type === "text" && prev.value.endsWith(" ")) {
                                prev.value = prev.value.slice(0, -1);
                            }
                        }
                        if (idx < p.children.length - 1) {
                            const next = p.children[idx + 1];
                            if (next.type === "text" && next.value.startsWith(" ")) {
                                next.value = next.value.slice(1);
                            }
                        }
                    }
                }
            }
        }
    });
    // Math node
    (0, unist_util_visit_1.visit)(rehype, (node) => {
        var _a, _b, _c, _d;
        return node.type === "element" &&
            (((_b = (_a = node.properties) === null || _a === void 0 ? void 0 : _a.className) === null || _b === void 0 ? void 0 : _b.includes("math-inline")) ||
                ((_d = (_c = node.properties) === null || _c === void 0 ? void 0 : _c.className) === null || _d === void 0 ? void 0 : _d.includes("math-display")));
    }, (node) => {
        if (node.properties.className.includes("math-inline")) {
            node.children = [
                { type: "text", value: "$" },
                ...node.children,
                { type: "text", value: "$" },
            ];
        }
        else if (node.properties.className.includes("math-display")) {
            node.children = [
                { type: "text", value: "$$" },
                ...node.children,
                { type: "text", value: "$$" },
            ];
            node.tagName = "pre";
        }
        node.properties.className = "math";
    });
    // Ignore link rel attribute, which exists in note
    (0, unist_util_visit_1.visit)(rehype, (node) => node.type === "element" && node.tagName === "a", (node) => {
        node.properties.rel = undefined;
    });
    // Ignore empty lines, as they are not parsed to md
    const tempChildren = [];
    const isEmptyNode = (_n) => (_n.type === "text" && !_n.value.trim()) ||
        (_n.type === "element" &&
            _n.tagName === "p" &&
            !_n.children.length &&
            !(0, hast_util_to_text_1.toText)(_n).trim());
    for (const child of rehype.children) {
        if (tempChildren.length &&
            isEmptyNode(tempChildren[tempChildren.length - 1]) &&
            isEmptyNode(child)) {
            continue;
        }
        tempChildren.push(child);
    }
    rehype.children = tempChildren;
    return (0, unified_1.unified)()
        .use(rehype_stringify_1.default, {
        allowDangerousCharacters: true,
        allowDangerousHtml: true,
    })
        .stringify(rehype);
}
function content2diff(oldStr, newStr) {
    const diff = (0, diff_1.diffChars)(oldStr, newStr);
    if (!diff)
        return [];
    return diff;
}
function md2html(md) {
    return __awaiter(this, void 0, void 0, function* () {
        const remark = md2remark(md);
        const rehype = yield remark2rehype(remark);
        const html = rehype2note(rehype);
        const parsedHTML = yield parseKatexHTML(html);
        return parsedHTML;
    });
}
function parseKatexHTML(html) {
    return __awaiter(this, void 0, void 0, function* () {
        const doc = new DOMParser().parseFromString(html, "text/html");
        // https://github.com/windingwind/zotero-better-notes/issues/1356
        doc
            .querySelectorAll("span.katex, span.katex-display")
            .forEach((katexSpan) => {
            var _a;
            // Look for the annotation element that holds the original TeX code.
            const annotation = katexSpan.querySelector('annotation[encoding="application/x-tex"]');
            if (annotation) {
                const isBlock = !!katexSpan.querySelector("math[display=block]");
                let container;
                if (isBlock) {
                    container = doc.createElement("pre");
                    container.innerHTML = `$$${annotation.textContent}$$`;
                }
                else {
                    container = doc.createElement("span");
                    container.innerHTML = `$${annotation.textContent}$`;
                }
                container.classList.add("math");
                // Replace the entire KaTeX span with the inline math string.
                (_a = katexSpan.parentNode) === null || _a === void 0 ? void 0 : _a.replaceChild(container, katexSpan);
            }
        });
        // linkedom does not support doc.body.innerHTML
        // @ts-ignore
        return globalThis._fakeDOM ? doc.toString() : doc.body.innerHTML;
    });
}
