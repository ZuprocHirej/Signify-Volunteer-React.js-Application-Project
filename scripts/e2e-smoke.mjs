import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const root = new URL("..", import.meta.url).pathname.replace(/^\/(.:)/, "$1");
const clientDir = `${root}/client`;
const serverDir = `${root}/server`;
const baseUrl = process.env.E2E_BASE_URL || "http://localhost:5173";
const apiUrl = process.env.E2E_API_URL || "http://localhost:3000";
const startedProcesses = [];

function startDevServer(directory) {
  const child = spawn("npm", ["run", "dev"], {
    cwd: directory,
    shell: true,
    stdio: "inherit",
    windowsHide: false,
  });
  startedProcesses.push(child);
  return child;
}

async function waitFor(url, label, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = `${response.status} ${response.statusText}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await delay(500);
  }

  throw new Error(`${label} did not become ready: ${lastError}`);
}

async function clearBrowserState(context) {
  await context.clearCookies();
}

async function run() {
  const serverHealth = await fetch(`${apiUrl}/api/health`).catch(() => null);
  if (!serverHealth?.ok) startDevServer(serverDir);
  await waitFor(`${apiUrl}/api/health`, "Backend");

  let clientWasAlreadyRunning = false;
  try {
    clientWasAlreadyRunning = (await fetch(baseUrl)).ok;
  } catch {
    // The client will be started below.
  }
  if (!clientWasAlreadyRunning) startDevServer(clientDir);
  await waitFor(baseUrl, "Frontend");

  const browser = await chromium.launch();
  const context = await browser.newContext();
  await clearBrowserState(context);
  const page = await context.newPage();
  const email = `e2e-${Date.now()}@example.com`;
  const password = "TestPassword123!";
  const firstName = "Automation";
  const lastName = "Tester";
  let accountCreated = false;

  try {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(".opportunity-card").first().waitFor();
    if ((await page.locator(".opportunity-card").count()) < 1) {
      throw new Error("No volunteer opportunities were loaded.");
    }

    // Verify Homepage persuasion & storytelling additions
    await page.getByRole("heading", { name: "Make an Impact Today" }).waitFor();
    await page.locator(".home-impact-mission").waitFor();
    await page.locator(".home-impact-stats").waitFor();
    await page.getByRole("heading", { name: "Stories from Our Volunteers" }).waitFor();

    // Click Apply Now on opportunity card -> navigates to OpportunityDetailPage
    await page.getByRole("button", { name: "Apply Now" }).first().click();
    await page.waitForURL(/\/opportunities\/\d+$/);
    await page.getByRole("heading", { name: "What a Typical Session Looks Like" }).waitFor();
    await page.getByRole("heading", { name: "Who You'll Be Working With" }).waitFor();
    await page.getByRole("heading", { name: "What to Bring & Preparation" }).waitFor();

    // Click Apply Now on OpportunityDetailPage -> redirects unauthenticated user to login
    await page.getByRole("button", { name: "Apply Now" }).click();
    await page.waitForURL(/\/login/);
    await page.getByRole("link", { name: "Create an account" }).click();

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill("DifferentPassword123!");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.getByText("Passwords do not match.").waitFor();

    await page.getByLabel("Confirm password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    try {
      await page.waitForURL(/\/signup/, { timeout: 30000 });
      accountCreated = true;
    } catch {
      const visibleErrors = await page.locator(".error").allTextContents();
      throw new Error(`Registration did not navigate to /signup (at ${page.url()}): ${visibleErrors.join(" | ") || "no visible error"}`);
    }
    await page.getByRole("main").getByText("Step 1 of 4").waitFor();

    await page.getByRole("button", { name: /Next: Availability/ }).click();
    await page.getByText("First name is required.").waitFor();

    await page.locator('input[name="firstName"]').fill(firstName);
    await page.locator('input[name="lastName"]').fill(lastName);
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="phone"]').fill("55512345678");
    await page.locator('input[name="age"]').fill("25");
    await page.locator('input[name="city"]').fill("Springfield");
    await page.getByRole("button", { name: /Next: Availability/ }).click();
    await page.getByRole("main").getByText("Step 2 of 4").waitFor();

    // Verify wizard draft persistence and URL opportunity recovery across reload
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("main").getByText("Step 2 of 4").waitFor();

    await page.locator(".slot-btn").first().click();
    await page.locator('textarea[name="experience"]').fill("Automated end-to-end test submission.");
    await page.getByRole("button", { name: /Next: More Info/ }).click();

    await page.locator('select[name="heardAbout"]').selectOption({ label: "School / University" });
    await page.locator('input[type="checkbox"]').last().check();
    await page.getByRole("button", { name: /Review Application/ }).click();
    await page.getByRole("heading", { name: "Review Your Application" }).waitFor();

    await page.getByRole("button", { name: "Confirm & Submit" }).click();
    await page.getByRole("heading", { name: "Thank you for signing up!" }).waitFor();

    // Verify draft was cleared from sessionStorage upon submission
    const remainingDraft = await page.evaluate(() => sessionStorage.getItem("volunteer_signup_draft_1"));
    if (remainingDraft) {
      throw new Error("Draft was not cleared from sessionStorage after submission.");
    }

    await page.getByRole("button", { name: "View My Applications" }).click();
    await page.getByRole("heading", { name: "My Applications" }).waitFor();
    try {
      await page.getByText(`${firstName} ${lastName}`).waitFor();
    } catch {
      throw new Error(`Application was not visible after submission: ${(await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 600)}`);
    }

    await page.reload({ waitUntil: "networkidle" });
    try {
      await page.getByText(`${firstName} ${lastName}`).waitFor();
    } catch {
      throw new Error(`Application did not survive reload: ${(await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 600)}`);
    }

    // Verify database-level unique constraint prevents duplicate submission with 409
    const token = await page.evaluate(() => localStorage.getItem("volunteer_portal_token"));
    const dupRes = await fetch(`${apiUrl}/api/applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        volunteerId: 1,
        firstName,
        lastName,
        email,
        phone: "55512345678",
        age: "25",
        city: "Springfield",
        availability: ["Mon-Morning"],
        experience: "Test",
        skills: ["Communication"],
        heardAbout: "School / University",
        agreeTerms: true,
      }),
    });
    if (dupRes.status !== 409) {
      throw new Error(`Expected 409 Conflict for duplicate application, got ${dupRes.status}`);
    }

    // ── Test Rubric REST Endpoints & Validation ──
    // 1. Validation 400 Bad Request test
    const invalidRes = await fetch(`${apiUrl}/api/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (invalidRes.status !== 400) {
      throw new Error(`Expected 400 Bad Request for empty application body, got ${invalidRes.status}`);
    }
    const invalidJson = await invalidRes.json();
    const fieldErrors = invalidJson.details || invalidJson.errors;
    if (!fieldErrors || !fieldErrors.firstName) {
      throw new Error(`Expected field errors in 400 validation response, got ${JSON.stringify(invalidJson)}`);
    }

    // 2. Fetch list of applications and retrieve single application by ID (GET /api/applications/:id)
    const listRes = await fetch(`${apiUrl}/api/applications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const apps = await listRes.json();
    if (!apps || apps.length === 0) {
      throw new Error("No application returned from GET /api/applications.");
    }
    const applicationId = apps[0].id;

    const singleAppRes = await fetch(`${apiUrl}/api/applications/${applicationId}`);
    if (singleAppRes.status !== 200) {
      throw new Error(`Expected 200 for GET /api/applications/${applicationId}, got ${singleAppRes.status}`);
    }
    const singleApp = await singleAppRes.json();
    if (singleApp.email !== email) {
      throw new Error(`Single application email mismatch: expected ${email}, got ${singleApp.email}`);
    }

    // 3. Test 404 for non-existent application and opportunity
    const notFoundAppRes = await fetch(`${apiUrl}/api/applications/999999`);
    if (notFoundAppRes.status !== 404) {
      throw new Error(`Expected 404 for GET /api/applications/999999, got ${notFoundAppRes.status}`);
    }
    const notFoundOppRes = await fetch(`${apiUrl}/api/volunteers/999999`);
    if (notFoundOppRes.status !== 404) {
      throw new Error(`Expected 404 for GET /api/volunteers/999999, got ${notFoundOppRes.status}`);
    }

    // 4. Test User-Facing Application Withdrawal (DELETE /api/applications/:id via UI)
    // Setup dialog listener to accept the window.confirm prompt
    page.once("dialog", (dialog) => dialog.accept());
    const withdrawBtn = page.getByRole("button", { name: /Withdraw Application/i }).first();
    await withdrawBtn.click();

    // Verify success banner appears and card is removed from DOM immediately without page reload
    await page.locator(".success-banner").waitFor();
    const remainingCardsCount = await page.locator(".application-card").count();
    if (remainingCardsCount !== 0) {
      throw new Error("Application card was not removed from DOM after withdrawal.");
    }

    // Verify that the withdrawn application now returns 404 from the API
    const postWithdrawRes = await fetch(`${apiUrl}/api/applications/${applicationId}`);
    if (postWithdrawRes.status !== 404) {
      throw new Error(`Expected 404 for withdrawn application ${applicationId}, got ${postWithdrawRes.status}`);
    }

    // Verify that attempting to delete the non-existent application returns 404
    const doubleDeleteRes = await fetch(`${apiUrl}/api/applications/${applicationId}`, {
      method: "DELETE",
    });
    if (doubleDeleteRes.status !== 404) {
      throw new Error(`Expected 404 when deleting already withdrawn application, got ${doubleDeleteRes.status}`);
    }

    console.log(`PASS: registration, validation, application submission, single-record retrieval, and live UI withdrawal (${email})`);
  } finally {
    if (accountCreated && !page.isClosed()) {
      try {
        await page.evaluate(async () => {
          const token = localStorage.getItem("volunteer_portal_token");
          if (!token) return;
          const response = await fetch("/api/auth/me", {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) throw new Error(`Cleanup returned HTTP ${response.status}.`);
        });
        console.log("Cleaned up the E2E account, application, and restored opportunity capacity.");
      } catch (error) {
        console.error(`WARNING: E2E cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    await browser.close();
  }
}

try {
  await run();
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  for (const child of startedProcesses) {
    child.kill();
  }
}
