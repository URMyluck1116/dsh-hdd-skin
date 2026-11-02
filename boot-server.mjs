import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const file = path.join("C:/Users/Public/dsh-wallpaper", "boot-new.mp4");
const port = 18766;

if (!fs.existsSync(file)) {
  console.error("missing", file);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const stat = fs.statSync(file);
  const headers = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=3600",
  };
  const range = req.headers.range;
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    let start = match && match[1] ? Number.parseInt(match[1], 10) : 0;
    let end = match && match[2] ? Number.parseInt(match[2], 10) : stat.size - 1;
    if (!Number.isFinite(start) || start < 0) start = 0;
    if (!Number.isFinite(end) || end >= stat.size) end = stat.size - 1;
    if (start > end) {
      res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
      res.end();
      return;
    }
    res.writeHead(206, {
      ...headers,
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Content-Length": end - start + 1,
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { ...headers, "Content-Length": stat.size });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  fs.createReadStream(file).pipe(res);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error("port in use");
    process.exit(0);
  }
  console.error(error);
  process.exit(1);
});

server.listen(port, "127.0.0.1", () => {
  console.log("boot video server on http://127.0.0.1:" + port + "/boot-new.mp4");
});
