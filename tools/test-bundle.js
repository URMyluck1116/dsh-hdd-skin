const fs = require("fs");
const vm = require("vm");

const file = process.argv[2];
const code = fs.readFileSync(file, "utf8");
const sandbox = {};
sandbox.window = {
  __ModuleLoader__: {
    load(spec) { sandbox.__spec = spec; },
  },
};
sandbox.console = console;
vm.createContext(sandbox);
try {
  vm.runInContext(code, sandbox, { filename: file });
} catch (error) {
  console.log("EVAL_ERROR", error && error.message);
  process.exit(2);
}
if (!sandbox.__spec) {
  console.log("NO_SPEC");
  process.exit(3);
}
try {
  const exportsObj = sandbox.__spec.factory(() => ({}));
  console.log("id", sandbox.__spec.id);
  console.log("keys", Object.keys(exportsObj || {}));
  console.log("apply", typeof (exportsObj && exportsObj.apply));
  console.log("inject", JSON.stringify(exportsObj && exportsObj.inject));
} catch (error) {
  console.log("FACTORY_ERROR", error && (error.stack || error.message));
  process.exit(4);
}
