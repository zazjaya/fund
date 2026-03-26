import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, "docs");

async function main() {
  const server = (await import("http")).createServer((req, res) => {
    let filePath = path.join(docsDir, req.url === "/" ? "index.html" : req.url);
    if (!fs.existsSync(filePath)) { res.writeHead(404); res.end(); return; }
    const ext = path.extname(filePath);
    const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json" };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/`;
  console.log(`Local server: ${url}`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  });
  const page = await browser.newPage();

  const errors = [];
  page.on("pageerror", e => errors.push(e.message));

  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3000);

  // 1. 检查表格存在
  const fundTable = await page.locator("#fundTable").count();
  const specialTable = await page.locator("#specialTable").count();
  console.log(`[CHECK] fundTable exists: ${fundTable > 0}`);
  console.log(`[CHECK] specialTable exists: ${specialTable > 0}`);

  // 2. 检查数据行数
  const fundRows = await page.locator("#fundTable tbody tr").count();
  const specialRows = await page.locator("#specialTable tbody tr").count();
  console.log(`[CHECK] fundTable rows: ${fundRows}`);
  console.log(`[CHECK] specialTable rows: ${specialRows}`);

  // 3. 检查 J(日) 列
  const jCells = await page.locator("#fundTable tbody td[data-kdjj-d]").allTextContents();
  const jWithData = jCells.filter(t => t.trim() && t.trim() !== "--" && t.trim() !== "...");
  console.log(`[CHECK] J(日) cells total: ${jCells.length}, with data: ${jWithData.length}`);
  if (jWithData.length > 0) console.log(`[CHECK] J(日) sample: ${jWithData.slice(0, 3).join(", ")}`);

  // 4. 检查阶段列
  const phaseCells = await page.locator("#fundTable tbody td[data-phase]").allTextContents();
  const phaseWithData = phaseCells.filter(t => t.trim() && t.trim() !== "--" && t.trim() !== "...");
  console.log(`[CHECK] 阶段 cells total: ${phaseCells.length}, with data: ${phaseWithData.length}`);
  if (phaseWithData.length > 0) console.log(`[CHECK] 阶段 sample: ${phaseWithData.slice(0, 3).join(", ")}`);

  // 5. 检查建议列
  const adviceCells = await page.locator("#fundTable tbody td[data-advice]").allTextContents();
  const adviceWithData = adviceCells.filter(t => t.trim() && t.trim() !== "--" && t.trim() !== "...");
  console.log(`[CHECK] 建议 cells total: ${adviceCells.length}, with data: ${adviceWithData.length}`);
  if (adviceWithData.length > 0) console.log(`[CHECK] 建议 sample: ${adviceWithData[0].substring(0, 60)}`);

  // 6. 检查原因列
  const reasonCells = await page.locator("#fundTable tbody td[data-reason]").allTextContents();
  const reasonWithData = reasonCells.filter(t => t.trim() && t.trim() !== "--" && t.trim() !== "...");
  console.log(`[CHECK] 原因 cells total: ${reasonCells.length}, with data: ${reasonWithData.length}`);

  // 7. 检查管理基金按钮（默认隐藏，密钥输入后显示）
  const manageBtn = await page.locator("#manageFundsBtn").count();
  console.log(`[CHECK] 管理基金按钮存在(DOM): ${manageBtn > 0}`);

  // 8. 截图
  const ssPath = path.join(__dirname, "artifacts", "local_verify.png");
  fs.mkdirSync(path.dirname(ssPath), { recursive: true });
  try {
    await page.screenshot({ path: ssPath, fullPage: false, timeout: 15000 });
    console.log(`[CHECK] 截图已保存: ${ssPath}`);
  } catch (e) {
    console.warn(`[WARN] 截图失败: ${e.message}`);
  }

  // 9. 控制台错误
  console.log(`[CHECK] JS errors: ${errors.length}`);
  if (errors.length > 0) errors.forEach(e => console.log(`  ERROR: ${e}`));

  // 汇总
  const pass = fundRows > 0 && jWithData.length > 0 && phaseWithData.length > 0
    && adviceWithData.length > 0 && reasonWithData.length > 0 && errors.length === 0
    && manageBtn > 0;
  console.log(`\n=== OVERALL: ${pass ? "PASS" : "FAIL"} ===`);

  await browser.close();
  server.close();
  process.exit(pass ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
