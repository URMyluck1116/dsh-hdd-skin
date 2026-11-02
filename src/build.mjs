function expandMascotClones(svg) {
  const marker = '<g id="dsh-fairy-image" class="dsh-fairy-image">';
  const start = svg.indexOf(marker);
  if (start < 0) return svg;
  let index = start + marker.length;
  let depth = 1;
  while (depth > 0) {
    const nextOpen = svg.indexOf("<g", index);
    const nextClose = svg.indexOf("</g>", index);
    if (nextClose < 0) return svg;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1;
      index = nextOpen + 2;
    } else {
      depth -= 1;
      index = nextClose + 4;
    }
  }
  const inner = svg.slice(start + marker.length, index - 4);
  const useRe = /<use href="#dsh-fairy-image" class="(dsh-fairy-glitch-\d+)" clip-path="url\((#dsh-fairy-slice-\d+)\)"\s*\/>/g;
  return svg.replace(useRe, (all, cls, clip) => `<g class="${cls}" clip-path="url(${clip})">${inner}</g>`);
}
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const imgPath = process.argv[2];
const outPath = process.argv[3];
const dir = path.dirname(fileURLToPath(import.meta.url));

const b64 = fs.readFileSync(imgPath).toString("base64");
const frameB64 = fs.readFileSync(path.join(dir, "frame.png")).toString("base64");
const hddB64 = fs.readFileSync(path.join(dir, "hdd.png")).toString("base64");
const sphereB64 = fs.readFileSync(path.join(dir, "sphere.svg")).toString("base64");
const mascotCss = fs.readFileSync(path.join(dir, "mascot.css"), "utf8").replace(/^\uFEFF/, "");
const mascotSvgRaw = fs.readFileSync(path.join(dir, "mascot-eye.svg"), "utf8").replace(/^\uFEFF/, "");
const mascotSvg = expandMascotClones(mascotSvgRaw);
fs.writeFileSync(path.join(dir, "mascot-eye-expanded.svg"), mascotSvg);
const mascotPulse = fs.readFileSync(path.join(dir, "mascot-pulse.svg"), "utf8").replace(/^\uFEFF/, "");
const mascotHalo = fs.readFileSync(path.join(dir, "mascot-halo.svg"), "utf8").replace(/^\uFEFF/, "");
const mascotJs = fs.readFileSync(path.join(dir, "mascot.js"), "utf8").replace(/^\uFEFF/, "");

const css = [
  mascotCss,
  fs.readFileSync(path.join(dir, "wallpaper.css"), "utf8")
    .replace("__IMG__", b64)
    .replace("__FRAME__", frameB64)
    .replace("__HDD__", hddB64)
    .replace("__SPHERE__", sphereB64),
].join("\n");

const forcedState = process.env.DSH_FAIRY_STATE || "";

const client = `window.__ModuleLoader__.load({
  id: "dsh-plugin-wallpaper",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const inject = [];
    const FAIRY_FORCED_STATE = ${JSON.stringify(forcedState)};
    const MASCOT_SVG = ${JSON.stringify(mascotSvg)};
    const MASCOT_PULSE = ${JSON.stringify(mascotPulse)};
    const MASCOT_HALO = ${JSON.stringify(mascotHalo)};
    const SPHERE_DATA_URI = ${JSON.stringify("data:image/svg+xml;base64," + sphereB64)};
${mascotJs}
    function apply(ctx) {
      document.getElementById("dsh-fairy-debug")?.remove();
      for (const old of document.querySelectorAll("style[data-dsh-wallpaper]")) old.remove();
      const style = document.createElement("style");
      style.setAttribute("data-dsh-wallpaper", "");
      style.textContent = ${JSON.stringify(css)};
      document.head.appendChild(style);

      const html = document.documentElement;
      const body = document.body;
      const prevScheme = html.style.colorScheme;
      const hadDarkAttribute = body.hasAttribute("data-ds-dark-theme");

      const enforce = () => {
        if (html.style.colorScheme !== "dark") html.style.colorScheme = "dark";
        if (!body.hasAttribute("data-ds-dark-theme")) body.setAttribute("data-ds-dark-theme", "");
      };
      enforce();

      const observer = new MutationObserver(enforce);
      observer.observe(body, { attributes: true, attributeFilter: ["data-ds-dark-theme"] });
      observer.observe(html, { attributes: true, attributeFilter: ["style"] });

      const disposeFairy = mountFairyPet(ctx);
      const disposeSphere = mountSphere(ctx);
      const disposeVideo = mountBootVideo(ctx);

      ctx.on("dispose", () => {
        observer.disconnect();
        if (!hadDarkAttribute) body.removeAttribute("data-ds-dark-theme");
        if (prevScheme) html.style.colorScheme = prevScheme;
        else html.style.removeProperty("color-scheme");
        try { disposeFairy(); } catch (error) {}
        try { disposeSphere(); } catch (error) {}
        try { disposeVideo(); } catch (error) {}
        style.remove();
      });
    }
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
`;

fs.writeFileSync(outPath, client);
console.log("wrote", outPath, client.length, "chars", "css", css.length);

