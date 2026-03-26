import { chromium } from "playwright";
import fs from "node:fs";

const url = process.argv[2];
const outDir = process.argv[3] || "artifacts";

if (!url) {
  console.error("Usage: node pages_verify.mjs <PAGE_URL> [OUT_DIR]");
  process.exit(1);
}

await (async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const safeOut = (p) => p.replace(/[\\/:*?"<>|]+/g, "_");
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  fs.mkdirSync(outDir, { recursive: true });
  const screenshotPath = `${outDir}/${safeOut("page")}-${ts}.png`;
  const htmlPath = `${outDir}/${safeOut("page")}-${ts}.html`;
  const consoleLogPath = `${outDir}/${safeOut("console")}-${ts}.txt`;

  const consoleLines = [];
  page.on("console", (msg) => consoleLines.push(`[console] ${msg.type()}: ${msg.text()}`));
  page.on("pageerror", (err) => consoleLines.push(`[pageerror] ${err.message}`));

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  // 断言点（尽量鲁棒）：页面标题/标题栏 + fund 表格行数 > 0 + 至少有 sparkline svg
  const h1 = page.locator("h1");
  await h1.first().waitFor({ timeout: 30000 });
  const h1Text = (await h1.first().innerText()).trim();
  if (!h1Text.includes("基金")) {
    throw new Error(`Unexpected h1 text: ${h1Text}`);
  }

  const rows = page.locator("#fundTable tbody tr");
  const count = await rows.count();
  if (count < 1) {
    throw new Error(`Expected fund table rows >= 1, got ${count}`);
  }

  // sparkline mock points >=2，会渲染 svg
  const svgs = page.locator("#fundTable svg");
  const svgCount = await svgs.count();
  if (svgCount < 1) {
    // 不强制，但通常应该至少有 svg
    consoleLines.push(`[warn] expected sparkline svg >= 1, got ${svgCount}`);
  }

  await page.screenshot({ path: screenshotPath, fullPage: true });
  const html = await page.content();
  fs.writeFileSync(htmlPath, html, "utf-8");

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(consoleLogPath, consoleLines.join("\n"), "utf-8");

  await browser.close();
  console.log("OK:", { url, screenshotPath, htmlPath, consoleLogPath });
})();

