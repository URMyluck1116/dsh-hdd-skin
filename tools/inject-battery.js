const fs = require("fs");

const bundlePath = process.argv[2];
const batteryPath = process.argv[3];
const imagePath = process.argv[4];

const img = fs.readFileSync(imagePath).toString("base64");
let code = fs.readFileSync(batteryPath, "utf8");
code = code.replace("__BATTERY_IMG__", "data:image/png;base64," + img);

let bundle = fs.readFileSync(bundlePath, "utf8");

// Remove a previous injection if present.
bundle = bundle.replace(/\/\* __DSH_BATTERY_START__ \*\/[\s\S]*?\/\* __DSH_BATTERY_END__ \*\/\n?/g, "");
bundle = bundle.replace(/\n\s*let disposeBattery = null;\n\s*try \{ disposeBattery = mountBattery\(ctx\); \} catch \(error\) \{\}/g, "");
bundle = bundle.replace(/\n\s*try \{ if \(disposeBattery\) disposeBattery\(\); \} catch \(error\) \{\}/g, "");

const block = "\n/* __DSH_BATTERY_START__ */\n" + code + "\n/* __DSH_BATTERY_END__ */\n";
const anchor = "exports.apply = apply;";
if (!bundle.includes(anchor)) {
  console.log("apply anchor not found");
  process.exit(1);
}
bundle = bundle.replace(anchor, block + anchor);

const callAnchor = "const disposeVideo = mountBootVideo(ctx);";
if (!bundle.includes(callAnchor)) {
  console.log("mount anchor not found");
  process.exit(2);
}
bundle = bundle.replace(callAnchor, callAnchor + "\n      let disposeBattery = null;\n      try { disposeBattery = mountBattery(ctx); } catch (error) {}");

const disposeAnchor = 'try { disposeVideo(); } catch (error) {}';
if (!bundle.includes(disposeAnchor)) {
  console.log("dispose anchor not found");
  process.exit(3);
}
bundle = bundle.replace(disposeAnchor, disposeAnchor + '\n        try { if (disposeBattery) disposeBattery(); } catch (error) {}');

fs.writeFileSync(bundlePath, bundle, "utf8");
console.log("injected battery, bundle chars", bundle.length);
