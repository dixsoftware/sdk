const fs = require("node:fs");
const path = require("node:path");

for (const file of ["dist/cli.cjs", "dist/cli.js"]) {
  const target = path.join(__dirname, "..", file);
  if (!fs.existsSync(target)) continue;
  const content = fs.readFileSync(target, "utf8");
  if (!content.startsWith("#!/usr/bin/env node")) {
    fs.writeFileSync(target, `#!/usr/bin/env node\n${content}`);
  }
}
