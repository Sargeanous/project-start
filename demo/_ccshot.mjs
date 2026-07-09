import { chromium } from "playwright";
const OUT = process.argv[2];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto("http://localhost:8080", { waitUntil: "networkidle" });
await p.locator("button", { hasText: "ADMO Control Room" }).first().click();
await p.locator(".hex-pin").first().waitFor({ timeout: 20000 });
await p.waitForTimeout(3500);
await p.screenshot({ path: OUT + "/cc-new-1.png" });
// click a pin -> popover
await p.locator(".hex-pin").nth(2).click();
await p.waitForTimeout(1200);
await p.screenshot({ path: OUT + "/cc-new-2.png" });
await b.close();
console.log("shots done");
