const { copyFileSync, mkdirSync, rmSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const outputDir = join(root, "www");
const files = ["index.html", "styles.css", "app.js"];

rmSync(outputDir, { force: true, recursive: true });
mkdirSync(outputDir, { recursive: true });

for (const file of files) {
  copyFileSync(join(root, file), join(outputDir, file));
}

console.log(`Prepared ${files.length} web files in www/`);
