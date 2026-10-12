import { chromium } from "playwright";
import path from "node:path";

const baseUrl = "http://localhost:5173";
const screenshotsDir = path.resolve(process.cwd(), "screenshots");

async function main() {
  console.log("Launching headless browser for 16:9 full HD screenshots (1920x1080)...");
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // 1. Home Page (16:9)
  console.log("Capturing 01-home-page.png...");
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator(".opportunity-card").first().waitFor();
  await page.screenshot({ path: path.join(screenshotsDir, "01-home-page.png") });

  // 2. Opportunity Details (16:9)
  console.log("Capturing 02-opportunity-details.png...");
  await page.goto(`${baseUrl}/opportunities/1`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "What a Typical Session Looks Like" }).waitFor();
  await page.screenshot({ path: path.join(screenshotsDir, "02-opportunity-details.png") });

  // 3. Log In to access authenticated screens
  console.log("Logging in as demo user...");
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"], #login-email').fill("realadmin@example.com");
  await page.locator('input[type="password"], #login-password').fill("realAdminPassword123!");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/admin", { timeout: 15000 });

  // 4. Multi-step Sign-Up Form (16:9)
  console.log("Capturing 03-signup-form.png...");
  await page.goto(`${baseUrl}/signup/1`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Personal Information" }).waitFor();
  await page.screenshot({ path: path.join(screenshotsDir, "03-signup-form.png") });

  // 5. My Applications (16:9)
  console.log("Capturing 04-my-applications.png...");
  await page.goto(`${baseUrl}/my-applications`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotsDir, "04-my-applications.png") });

  // 6. Admin Dashboard (16:9)
  console.log("Capturing 05-admin-dashboard.png...");
  await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });
  await page.locator(".admin-page, .admin-tabs").first().waitFor();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotsDir, "05-admin-dashboard.png") });

  await browser.close();
  console.log("All 16:9 full HD screenshots captured successfully in screenshots/ !");
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
