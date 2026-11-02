const fs = require("fs");

const file = process.argv[2];
const out = process.argv[3];
const source = fs.readFileSync(file, "utf8");
const marker = "style.textContent = ";
const index = source.indexOf(marker);
if (index < 0) {
  console.log("marker not found");
  process.exit(1);
}
const start = index + marker.length;
let cursor = start + 1;
let escaped = false;
while (cursor < source.length) {
  const ch = source[cursor];
  if (escaped) escaped = false;
  else if (ch === "\\") escaped = true;
  else if (ch === '"') break;
  cursor += 1;
}
const json = source.slice(start, cursor + 1);
let css;
try {
  css = JSON.parse(json);
} catch (error) {
  console.log("parse error", error.message);
  process.exit(2);
}
fs.writeFileSync(out, css, "utf8");
console.log("css chars", css.length, "->", out);
