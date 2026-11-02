const fs = require("fs");

const file = process.argv[2];
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
if (css.includes("toBottom")) {
  console.log("button rule already present");
  process.exit(0);
}
const rule = `

/* 滚动至底部按钮：与输入框一致的背景/边框，箭头用主题色 */
button[class*="toBottom"], .V4vHZW_toBottom {
  background: #0a1729 !important;
  border: 1px solid #1d2f58 !important;
  color: var(--dsw-alias-state-business-primary, #4d8dff) !important;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35) !important;
  backdrop-filter: blur(6px);
}
button[class*="toBottom"]:hover, .V4vHZW_toBottom:hover {
  background: #0d1f38 !important;
  border-color: #2b4a86 !important;
}
button[class*="toBottom"] svg, .V4vHZW_toBottom svg {
  color: inherit !important;
}
`;
const next = css + rule;
const encoded = JSON.stringify(next);
const output = source.slice(0, start) + encoded + source.slice(cursor + 1);
fs.writeFileSync(file, output, "utf8");
console.log("patched css chars", next.length, "file chars", output.length);
