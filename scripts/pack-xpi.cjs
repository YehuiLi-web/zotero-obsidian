const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const pkg = require("../package.json");

function kebabCase(value) {
  return String(value || "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .toLowerCase();
}

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index < 0 || index === process.argv.length - 1) {
    return "";
  }
  return String(process.argv[index + 1] || "").trim();
}

const buildDir = path.resolve(__dirname, "..", "build");
const addonDir = path.join(buildDir, "addon");
const requestedName = getArgValue("--name");
const xpiName =
  requestedName || kebabCase(pkg.config?.addonName || pkg.name || "plugin");
const xpiPath = path.join(buildDir, `${xpiName}.xpi`);

if (!fs.existsSync(addonDir)) {
  throw new Error(`Addon directory not found: ${addonDir}`);
}

if (fs.existsSync(xpiPath)) {
  fs.rmSync(xpiPath, { force: true });
}

const zip = new AdmZip();
zip.addLocalFolder(addonDir);
zip.writeZip(xpiPath);

console.log(`Packed XPI: ${xpiPath}`);
