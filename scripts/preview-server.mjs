import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const port = Number(process.env.PORT || 3000);
const desktopHtmlPath = join(process.cwd(), "docs", "ui-preview.html");
const mobileHtmlPath = join(process.cwd(), "docs", "mobile-preview.html");

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://localhost:${port}`);
  const htmlPath = url.pathname.startsWith("/mobile") ? mobileHtmlPath : desktopHtmlPath;
  const html = await readFile(htmlPath, "utf8");
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(html);
});

server.listen(port, () => {
  console.log(`UI preview running at http://localhost:${port}`);
});
