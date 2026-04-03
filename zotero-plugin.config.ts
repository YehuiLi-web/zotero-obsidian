import pkg from "./package.json";
import { defineConfig } from "zotero-plugin-scaffold";
import { replaceInFile } from "replace-in-file";
import { bundleTypes } from "./scripts/types/bundleTypes.mjs";
import { promises as fs } from "fs";
import { join } from "path";

const TEST_PREFS = {};
const README_RELEASE_LINE = /^- \[Version .*\]\(.*\)$/gm;
const BUILD_TIME = new Date().toISOString();
const UPDATE_URL_TEMPLATE = `https://github.com/{{owner}}/{{repo}}/releases/download/release/${
  pkg.version.includes("-") ? "update-beta.json" : "update.json"
}`;
const XPI_DOWNLOAD_TEMPLATE =
  "https://github.com/{{owner}}/{{repo}}/releases/download/v{{version}}/{{xpiName}}.xpi";
const BUILD_PLACEHOLDER_KEYS = [
  "addonName",
  "addonID",
  "description",
  "author",
  "homepage",
  "updateURL",
  "buildVersion",
  "buildTime",
] as const;
// Disable user guide, keep in sync with src/modules/userGuide.ts
TEST_PREFS[`${pkg.config.prefsPrefix}.latestTourVersion`] = 1;

function resolveBuildTemplate(
  template: string,
  templateData: Record<string, string> = {},
) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) =>
    String(templateData[key] || ""),
  );
}

function getBuildPlaceholderValues(ctx: {
  dist: string;
  id?: string;
  name?: string;
  updateURL?: string;
  version?: string;
  templateData?: Record<string, string>;
}) {
  return {
    addonName: String(ctx.name || pkg.config.addonName),
    addonID: String(ctx.id || pkg.config.addonID),
    description: String(pkg.description || ""),
    author: String(pkg.author || ""),
    homepage: String(pkg.homepage || ""),
    updateURL: String(
      resolveBuildTemplate(
        ctx.updateURL || UPDATE_URL_TEMPLATE,
        ctx.templateData || {},
      ),
    ),
    buildVersion: String(ctx.version || pkg.version),
    buildTime: BUILD_TIME,
  };
}

function replaceBuildPlaceholders(
  contents: string,
  replacements: Record<string, string>,
) {
  let normalizedContents = contents;
  for (const [key, value] of Object.entries(replacements)) {
    normalizedContents = normalizedContents.replace(
      new RegExp(`__${key}__`, "g"),
      value,
    );
  }
  return normalizedContents;
}

function getUnresolvedBuildPlaceholders(contents: string) {
  return BUILD_PLACEHOLDER_KEYS.map((key) => `__${key}__`).filter((token) =>
    contents.includes(token),
  );
}

function parseFtlMessageKeys(contents: string) {
  return new Set(
    contents
      .split(/\r?\n/)
      .map((line) => line.match(/^([a-zA-Z0-9-]+)\s*=/)?.[1])
      .filter(Boolean) as string[],
  );
}

async function validateLocaleMessageOverrides() {
  const localeRoot = join("addon", "locale");
  const entries = await fs.readdir(localeRoot, { withFileTypes: true });
  const duplicatesByLocale: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const addonPath = join(localeRoot, entry.name, "addon.ftl");
    const mainWindowPath = join(localeRoot, entry.name, "mainWindow.ftl");
    try {
      const [addonContents, mainWindowContents] = await Promise.all([
        fs.readFile(addonPath, "utf8"),
        fs.readFile(mainWindowPath, "utf8"),
      ]);
      const addonKeys = parseFtlMessageKeys(addonContents);
      const duplicateKeys = [...parseFtlMessageKeys(mainWindowContents)]
        .filter((key) => addonKeys.has(key))
        .sort();
      if (duplicateKeys.length) {
        duplicatesByLocale.push(
          `${entry.name}: ${duplicateKeys.join(", ")}`,
        );
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }
      throw error;
    }
  }

  if (duplicatesByLocale.length) {
    throw new Error(
      `Duplicate Fluent message keys across addon.ftl and mainWindow.ftl:\n${duplicatesByLocale.join(
        "\n",
      )}`,
    );
  }
}

function patchDeprecatedChromeUtilsImports(contents: string) {
  return contents.replace(
    /return ChromeUtils\.import\(([^)]+)\);/g,
    'return ChromeUtils.importESModule($1.replace(/\\.jsm$/, ".sys.mjs"), { global: "contextual" });',
  );
}

async function collectFilesWithExtension(rootDir: string, extension: string) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(rootDir, entry.name);
      if (entry.isDirectory()) {
        return collectFilesWithExtension(fullPath, extension);
      }
      return fullPath.endsWith(extension) ? [fullPath] : [];
    }),
  );
  return files.flat();
}

async function patchBuildBundles(ctx: { dist: string }) {
  const contentDir = join(ctx.dist, "addon", "chrome", "content");
  let jsFiles: string[] = [];
  try {
    jsFiles = await collectFilesWithExtension(contentDir, ".js");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }

  await Promise.all(
    jsFiles.map(async (filePath) => {
      const contents = await fs.readFile(filePath, "utf8");
      const patchedContents = patchDeprecatedChromeUtilsImports(contents);
      if (patchedContents !== contents) {
        await fs.writeFile(filePath, patchedContents);
      }
      if (patchedContents.includes("ChromeUtils.import(")) {
        throw new Error(
          `Deprecated ChromeUtils.import() call remains in ${filePath}`,
        );
      }
    }),
  );
}

async function finalizeBuildArtifacts(ctx: {
  dist: string;
  id?: string;
  name?: string;
  updateURL?: string;
  version?: string;
  templateData?: Record<string, string>;
}) {
  await validateLocaleMessageOverrides();
  const manifestPath = join(ctx.dist, "addon", "manifest.json");
  const replacements = getBuildPlaceholderValues(ctx);
  const manifestContents = replaceBuildPlaceholders(
    await fs.readFile(manifestPath, "utf8"),
    replacements,
  );
  const manifest = JSON.parse(manifestContents);
  manifest.name = replacements.addonName;
  manifest.version = replacements.buildVersion;
  manifest.description = replacements.description;
  manifest.author = replacements.author;
  manifest.homepage_url = replacements.homepage;
  manifest.applications = manifest.applications || {};
  manifest.applications.zotero = {
    ...(manifest.applications.zotero || {}),
    id: replacements.addonID,
    update_url: replacements.updateURL,
  };
  new URL(manifest.homepage_url);
  new URL(manifest.applications.zotero.update_url);
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await patchBuildBundles(ctx);

  const filesToValidate = [
    manifestPath,
    join(ctx.dist, "addon", "chrome", "content", "preferencesPane.js"),
    join(
      ctx.dist,
      "addon",
      "chrome",
      "content",
      "scripts",
      `${pkg.config.addonRef}.js`,
    ),
  ];
  for (const filePath of filesToValidate) {
    try {
      const contents = await fs.readFile(filePath, "utf8");
      const unresolved = getUnresolvedBuildPlaceholders(contents);
      if (unresolved.length) {
        throw new Error(
          `Unresolved build placeholders in ${filePath}: ${unresolved.join(
            ", ",
          )}`,
        );
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }
      throw error;
    }
  }
}

export default defineConfig({
  source: ["src", "addon"],
  dist: "build",
  name: pkg.config.addonName,
  id: pkg.config.addonID,
  namespace: pkg.config.addonRef,
  updateURL: UPDATE_URL_TEMPLATE,
  xpiDownloadLink: XPI_DOWNLOAD_TEMPLATE,

  server: {
    asProxy: false,
  },

  build: {
    assets: ["addon/**/*.*", "scripts/types/**/*.*"],
    define: {
      ...pkg.config,
      author: pkg.author,
      description: pkg.description,
      homepage: pkg.homepage,
      updateURL: UPDATE_URL_TEMPLATE,
      buildVersion: pkg.version,
      buildTime: BUILD_TIME,
    },
    esbuildOptions: [
      {
        entryPoints: ["src/index.ts"],
        define: {
          __env__: `"${process.env.NODE_ENV}"`,
          __BUILD_TIME__: JSON.stringify(BUILD_TIME),
        },
        bundle: true,
        target: "firefox115",
        outfile: `addon/chrome/content/scripts/${pkg.config.addonRef}.js`,
      },
      {
        entryPoints: ["src/extras/*.ts"],
        define: {
          __env__: `"${process.env.NODE_ENV}"`,
          __BUILD_TIME__: JSON.stringify(BUILD_TIME),
        },
        outdir: "addon/chrome/content/scripts",
        bundle: true,
        target: ["firefox115"],
      },
      {
        entryPoints: ["src/modules/preferences/resources/preferencesPane.ts"],
        define: {
          __env__: `"${process.env.NODE_ENV}"`,
          __BUILD_TIME__: JSON.stringify(BUILD_TIME),
        },
        bundle: true,
        target: ["firefox115"],
        outfile: "addon/chrome/content/preferencesPane.js",
      },
    ],
    prefs: {
      prefix: pkg.config.prefsPrefix,
    },
    hooks: {
      "build:bundle": async (ctx) => {
        await Promise.all([
          replaceInFile({
            files: ["README.md"],
            from: README_RELEASE_LINE,
            to: `- [Version ${ctx.version}](${ctx.xpiDownloadLink})`,
          }) as Promise<any>,
          bundleTypes(),
        ]);
        const targetDir = join(ctx.dist, "addon", "chrome", "content");
        const preferencesPath = join(targetDir, "preferences.xhtml");
        await fs.mkdir(targetDir, { recursive: true });
        await fs.copyFile(
          "src/modules/preferences/resources/preferences.xhtml",
          preferencesPath,
        );
        await replaceInFile({
          files: [preferencesPath.replace(/\\/g, "/")],
          from: [/__addonRef__/g, /data-l10n-id="([^"]+)"/g],
          to: [pkg.config.addonRef, `data-l10n-id="${pkg.config.addonRef}-$1"`],
        } as any);
        const stylesDir = join(targetDir, "styles");
        await fs.mkdir(stylesDir, { recursive: true });
        await fs.copyFile(
          "src/modules/preferences/resources/preferences.css",
          join(stylesDir, "preferences.css"),
        );
        await finalizeBuildArtifacts(ctx);
        return;
      },
    },
  },
  release: {
    bumpp: {
      execute: "npm run build",
      all: true,
    },
  },
  test: {
    entries: ["test/"],
    prefs: TEST_PREFS,
    abortOnFail: true,
    hooks: {
      "test:prebuild": async (ctx) => {
        await finalizeBuildArtifacts(ctx);
      },
    },
    waitForPlugin: `() => Zotero.${pkg.config.addonRef}.data.initialized`,
  },

  // If you need to see a more detailed build log, uncomment the following line:
  // logLevel: "trace",
});
