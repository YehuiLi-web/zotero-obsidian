import { config } from "../../../package.json";
import { Root as HRoot } from "hast";
import { Change } from "diff";
import { visit } from "unist-util-visit";
import { MessageHelper } from "zotero-plugin-toolkit";

import { handlers } from "../../extras/convertWorker/main";

export {
  closeConvertServer,
  note2rehype,
  rehype2remark,
  rehype2note,
  remark2rehype,
  md2remark,
  remark2md,
  remark2latex,
  md2html,
  content2diff,
  replaceNode,
  collectUniqueNodes,
  NodeMode,
};

function closeConvertServer() {
  if (addon.data.convert.server) {
    addon.data.convert.server.destroy();
    addon.data.convert.server = undefined;
  }
}

async function getConvertServer() {
  if (addon.data.convert.server) {
    return addon.data.convert.server;
  }

  const worker = new Worker(
    `chrome://${config.addonRef}/content/scripts/convertWorker.js`,
    { name: "convertWorker" },
  );
  const server = new MessageHelper<typeof handlers>({
    canBeDestroyed: false,
    dev: __env__ === "development",
    name: "convertWorkerMain",
    target: worker,
    handlers: {},
  });
  server.start();
  await server.proxy._ping();
  addon.data.convert.server = server;
  return server;
}

async function note2rehype(
  ...args: Parameters<(typeof handlers)["note2rehype"]>
) {
  const server = await getConvertServer();
  return await server.proxy.note2rehype(...args);
}

async function rehype2remark(
  ...args: Parameters<(typeof handlers)["rehype2remark"]>
) {
  const server = await getConvertServer();
  return await server.proxy.rehype2remark(...args);
}

async function rehype2note(
  ...args: Parameters<(typeof handlers)["rehype2note"]>
) {
  const server = await getConvertServer();
  return await server.proxy.rehype2note(...args);
}

async function remark2rehype(
  ...args: Parameters<(typeof handlers)["remark2rehype"]>
) {
  const server = await getConvertServer();
  return await server.proxy.remark2rehype(...args);
}

async function md2remark(...args: Parameters<(typeof handlers)["md2remark"]>) {
  const server = await getConvertServer();
  return await server.proxy.md2remark(...args);
}

async function remark2md(...args: Parameters<(typeof handlers)["remark2md"]>) {
  const server = await getConvertServer();
  return await server.proxy.remark2md(...args);
}

async function remark2latex(
  ...args: Parameters<(typeof handlers)["remark2latex"]>
) {
  const server = await getConvertServer();
  return await server.proxy.remark2latex(...args);
}

async function md2html(...args: Parameters<(typeof handlers)["md2html"]>) {
  const server = await getConvertServer();
  return await server.proxy.md2html(...args);
}

async function content2diff(oldStr: string, newStr: string): Promise<Change[]> {
  const server = await getConvertServer();
  return await server.proxy.content2diff(oldStr, newStr);
}

function replaceNode(targetNode: any, sourceNode: any) {
  targetNode.type = sourceNode.type;
  targetNode.tagName = sourceNode.tagName;
  targetNode.properties = sourceNode.properties;
  targetNode.value = sourceNode.value;
  targetNode.children = sourceNode.children;
}

function collectUniqueNodes(
  rehype: HRoot | any,
  matcher: (node: any) => boolean,
) {
  const nodes: any[] = [];
  visit(rehype, matcher, (node) => nodes.push(node));
  return new Array(...new Set(nodes));
}

enum NodeMode {
  default = 0,
  wrap,
  replace,
  direct,
}
