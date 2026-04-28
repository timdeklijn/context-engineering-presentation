const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 8000;

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".map": "application/json",
  ".md": "text/markdown",
};

// --- Live reload via Server-Sent Events ---
const clients = [];

function notifyClients() {
  clients.forEach((res) => res.write("data: reload\n\n"));
}

// Watch project files for changes
const WATCH_FILES = ["index.html", "slides.md"];
WATCH_FILES.forEach((file) => {
  const fp = path.join(__dirname, file);
  fs.watchFile(fp, { interval: 300 }, () => {
    console.log(`Change detected: ${file}`);
    notifyClients();
  });
});

const server = http.createServer((req, res) => {
  // SSE endpoint for live reload
  if (req.url === "/__reload") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write("\n");
    clients.push(res);
    req.on("close", () => {
      const idx = clients.indexOf(res);
      if (idx !== -1) clients.splice(idx, 1);
    });
    return;
  }

  let filePath = req.url === "/" ? "/index.html" : req.url;
  filePath = path.join(__dirname, filePath);

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(err.code === "ENOENT" ? 404 : 500);
      res.end(err.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`Presentation running at http://localhost:${PORT}`);
});
