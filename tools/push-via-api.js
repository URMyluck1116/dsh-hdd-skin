const fs = require("fs");
const path = require("path");

const owner = process.argv[2];
const repo = process.argv[3];
const dir = process.argv[4];
const token = process.env.GITHUB_TOKEN;
const api = "https://api.github.com";
const branch = "main";

if (!token) {
  console.error("missing GITHUB_TOKEN");
  process.exit(1);
}

const headers = {
  Authorization: "Bearer " + token,
  Accept: "application/vnd.github+json",
  "User-Agent": "dsh-hdd-skin-publisher",
  "Content-Type": "application/json",
};

async function call(method, url, body) {
  const res = await fetch(api + url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (error) { data = text; }
  if (!res.ok) {
    const message = data && data.message ? data.message : text;
    throw new Error(method + " " + url + " -> " + res.status + " " + message);
  }
  return data;
}

function walk(current, prefix, out) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const full = path.join(current, entry.name);
    const rel = prefix ? prefix + "/" + entry.name : entry.name;
    if (entry.isDirectory()) walk(full, rel, out);
    else if (entry.isFile()) out.push({ full, rel });
  }
}

async function ensureInitCommit() {
  try {
    const ref = await call("GET", "/repos/" + owner + "/" + repo + "/git/ref/heads/" + branch);
    return ref.object.sha;
  } catch (error) {
    if (!String(error.message).includes("404") && !String(error.message).includes("409")) throw error;
  }
  const content = Buffer.from("init").toString("base64");
  await call("PUT", "/repos/" + owner + "/" + repo + "/contents/.github-init", {
    message: "chore: initialize repository",
    content,
  });
  const ref = await call("GET", "/repos/" + owner + "/" + repo + "/git/ref/heads/" + branch);
  return ref.object.sha;
}

async function main() {
  const parentSha = await ensureInitCommit();
  console.log("parent", parentSha);

  const files = [];
  walk(dir, "", files);
  console.log("files", files.length);

  const tree = [];
  for (const file of files) {
    const content = fs.readFileSync(file.full).toString("base64");
    const blob = await call("POST", "/repos/" + owner + "/" + repo + "/git/blobs", {
      content,
      encoding: "base64",
    });
    tree.push({ path: file.rel, mode: "100644", type: "blob", sha: blob.sha });
    console.log("blob", file.rel, blob.sha.slice(0, 8));
  }

  const treeResult = await call("POST", "/repos/" + owner + "/" + repo + "/git/trees", { tree });
  console.log("tree", treeResult.sha);

  const commit = await call("POST", "/repos/" + owner + "/" + repo + "/git/commits", {
    message: "feat: DSH HDD skin (sidebar theme, frame, sphere, mascot, battery balance, boot video)",
    tree: treeResult.sha,
    parents: [parentSha],
  });
  console.log("commit", commit.sha);

  await call("PATCH", "/repos/" + owner + "/" + repo + "/git/refs/heads/" + branch, {
    sha: commit.sha,
    force: false,
  });
  console.log("ref updated");

  console.log("done");
}

main().catch((error) => {
  console.error("ERROR", error.message);
  process.exit(1);
});
