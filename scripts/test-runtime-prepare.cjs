const fs = require("fs");
const path = require("path");

const testStatePath = path.join(process.cwd(), ".scaffold", "test");

try {
  fs.rmSync(testStatePath, {
    recursive: true,
    force: true,
  });
  console.log(`[test-runtime-prepare] Reset ${testStatePath}`);
} catch (error) {
  console.error(
    `[test-runtime-prepare] Failed to reset ${testStatePath}: ${error.message}`,
  );
  process.exit(1);
}
