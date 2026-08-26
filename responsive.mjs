import { chromium } from "playwright-core";

const pages = [
  ["home", "http://localhost:3000/"],
  ["listings", "http://localhost:3000/listings"],
  ["listing", "http://localhost:3000/listing/1"],
  ["checkout", "http://localhost:3000/booking/1/checkout?checkIn=2026-08-28&checkOut=2026-08-30&guests=2"],
];
const viewports = [
  ["phone", { width: 390, height: 844 }],
  ["tablet", { width: 768, height: 1024 }],
  ["desktop", { width: 1440, height: 900 }],
];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = [];

for (const [vName, viewport] of viewports) {
  const page = await browser.newPage({ viewport });
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.setItem(
      "farm-stays-demo-user",
      JSON.stringify({
        id: "demo-guest-verify",
        email: "guest.verify@example.com",
        fullName: "Verify Guest",
        roles: ["guest"],
        language: "en",
      })
    );
  });
  for (const [pName, url] of pages) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(1800);
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      return {
        scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
        clientWidth: doc.clientWidth,
        overflow: Math.max(doc.scrollWidth, body.scrollWidth) - doc.clientWidth,
      };
    });
    const file = `/tmp/resp-${pName}-${vName}.png`;
    await page.screenshot({ path: file, fullPage: false });
    report.push({ pName, vName, overflow: overflow.overflow, scrollWidth: overflow.scrollWidth, clientWidth: overflow.clientWidth });
  }
  await page.close();
}

console.log(JSON.stringify(report, null, 2));
await browser.close();
