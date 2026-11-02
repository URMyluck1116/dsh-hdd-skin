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
const cut = css.indexOf("/* 滚动至底部按钮");
if (cut >= 0) css = css.slice(0, cut).trimEnd();
const rule = `

/* 滚动至底部按钮：与输入框一致——半透明菜单底色 + 同一套 backdrop blur */
button[class*="toBottom"], .V4vHZW_toBottom {
  background: var(--dsw-specific-menu) !important;
  border: 1px solid var(--dsw-alias-border-l2, rgba(140, 200, 255, 0.30)) !important;
  box-shadow: var(--dsw-elevation-soft) !important;
  color: var(--dsw-alias-state-business-primary, #4d8dff) !important;
  -webkit-backdrop-filter: var(--dsw-menu-backdrop-filter) !important;
  backdrop-filter: var(--dsw-menu-backdrop-filter) !important;
}
button[class*="toBottom"]:hover, .V4vHZW_toBottom:hover {
  background: var(--dsw-specific-menu) !important;
  filter: brightness(1.08);
}
button[class*="toBottom"] svg, .V4vHZW_toBottom svg {
  color: inherit !important;
}
`;
const next = css + rule;
const encoded = JSON.stringify(next);
const output = source.slice(0, start) + encoded + source.slice(cursor + 1);
fs.writeFileSync(file, output, "utf8");
console.log("replaced button rule, css chars", next.length);
