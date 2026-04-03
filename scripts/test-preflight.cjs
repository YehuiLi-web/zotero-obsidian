const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const RUNTIME_ENV = "ZOTERO_PLUGIN_ZOTERO_BIN_PATH";
const REPO_ROOT = path.resolve(__dirname, "..");

function isFile(filePath) {
  return (
    Boolean(filePath) &&
    fs.existsSync(filePath) &&
    fs.statSync(filePath).isFile()
  );
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function readTrackedSourceJsFiles() {
  const output = execFileSync("git", ["ls-files", "--", "src"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  return output
    .split(/\r?\n/)
    .map((filePath) => filePath.trim())
    .filter(
      (filePath) =>
        filePath.endsWith(".js") &&
        fs.existsSync(path.join(REPO_ROOT, filePath)),
    );
}

function failTrackedSourceJsCheck() {
  const trackedJsFiles = readTrackedSourceJsFiles();
  const duplicateJsFiles = trackedJsFiles.filter((filePath) =>
    fs.existsSync(path.join(REPO_ROOT, filePath.replace(/\.js$/, ".ts"))),
  );
  const obsoleteJsFiles = trackedJsFiles.filter(
    (filePath) =>
      filePath === "src/modules/preferenceWindow.js" ||
      filePath.startsWith("src/modules/obsidian/prefsUI/"),
  );
  const failures = unique([...duplicateJsFiles, ...obsoleteJsFiles]).sort();
  if (!failures.length) {
    return;
  }

  console.error(
    "[test-preflight] Remove tracked generated/dead JavaScript under src before runtime tests:",
  );
  for (const filePath of failures) {
    console.error(`  ${filePath}`);
  }
  process.exit(1);
}

function getCandidatePaths() {
  const candidates = [];

  if (process.platform === "win32") {
    candidates.push(
      path.join(process.env.ProgramFiles || "", "Zotero", "zotero.exe"),
    );
    candidates.push(
      path.join(process.env["ProgramFiles(x86)"] || "", "Zotero", "zotero.exe"),
    );
    candidates.push(
      path.join(
        process.env.LOCALAPPDATA || "",
        "Programs",
        "Zotero",
        "Zotero.exe",
      ),
    );
  } else if (process.platform === "darwin") {
    candidates.push("/Applications/Zotero.app/Contents/MacOS/zotero");
    candidates.push(
      path.join(
        process.env.HOME || "",
        "Applications",
        "Zotero.app",
        "Contents",
        "MacOS",
        "zotero",
      ),
    );
  } else {
    candidates.push("/usr/lib/zotero/zotero");
    candidates.push("/opt/zotero/zotero");
    candidates.push("/usr/local/bin/zotero");
  }

  return unique(candidates);
}

function printExamples(examplePath) {
  if (process.platform === "win32") {
    console.error("PowerShell:");
    console.error(`  $env:${RUNTIME_ENV} = '${examplePath}'`);
    console.error("  npm run test");
    console.error("CMD:");
    console.error(`  set ${RUNTIME_ENV}=${examplePath}`);
    console.error("  npm run test");
    return;
  }

  console.error(`  export ${RUNTIME_ENV}='${examplePath}'`);
  console.error("  npm run test");
}

const configuredPath = process.env[RUNTIME_ENV];

failTrackedSourceJsCheck();

if (isFile(configuredPath)) {
  console.log(`[test-preflight] Using Zotero runtime: ${configuredPath}`);
  process.exit(0);
}

if (configuredPath) {
  console.error(
    `[test-preflight] ${RUNTIME_ENV} is set, but the file does not exist:`,
  );
  console.error(`  ${configuredPath}`);
  console.error(
    "Update the path or unset the variable before re-running runtime tests.",
  );
  process.exit(1);
}

const discoveredPaths = getCandidatePaths().filter(isFile);
const suggestedPath = discoveredPaths[0] || "<path-to-zotero-binary>";

console.error(
  `[test-preflight] Runtime tests require a local Zotero executable via ${RUNTIME_ENV}.`,
);

if (discoveredPaths.length) {
  console.error("[test-preflight] Found possible Zotero installation(s):");
  for (const filePath of discoveredPaths) {
    console.error(`  ${filePath}`);
  }
  console.error(
    "[test-preflight] Set the environment variable before running npm run test.",
  );
  printExamples(suggestedPath);
  process.exit(1);
}

console.error(
  "[test-preflight] No local Zotero executable was detected in common locations.",
);
console.error(
  "Install Zotero 8 or point the environment variable to an existing binary.",
);
console.error(
  "[test-preflight] Build-only verification remains available via npm run build.",
);
printExamples(suggestedPath);
process.exit(1);
