#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { DOMParser } from "@xmldom/xmldom";

const targetPath = resolve(
  process.cwd(),
  "src/modules/preferences/resources/preferences.xhtml",
);

async function main() {
  const xml = await readFile(targetPath, "utf-8");
  const errors = [];
  const parser = new DOMParser({
    errorHandler: {
      warning: () => {
        /* ignore warnings */
      },
      error: (msg) => errors.push(msg),
      fatalError: (msg) => errors.push(msg),
    },
  });
  const dom = parser.parseFromString(xml, "application/xml");
  if (
    dom.getElementsByTagName("parsererror").length ||
    !dom.documentElement
  ) {
    errors.push("DOMParser reported a parsererror element.");
  }

  if (!errors.length) {
    console.log("preferences.xhtml parsed successfully ✔");
    return;
  }

  console.error("preferences.xhtml failed XML validation:");
  for (const err of errors) {
    console.error(`  • ${err}`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error("Unexpected failure while validating preferences.xhtml");
  console.error(err);
  process.exit(1);
});
