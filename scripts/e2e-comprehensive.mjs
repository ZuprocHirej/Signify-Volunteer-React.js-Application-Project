import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("..", import.meta.url));
const clientDir = `${root}/client`;
const serverDir = `${root}/server`;
const baseUrl = process.env.E2E_BASE_URL || "http://localhost:5173";
const apiUrl = process.env.E2E_API_URL || "http://localhost:3000";
const startedProcesses = [];
const tokenKey = "volunteer_portal_token";
let adminFixtureName = "";

function readLocalEnvValue(name) {
  try {
    const envFile = readFileSync(`${serverDir}/.env`, "utf8");
    const line = envFile.split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`));
    return line?.slice(name.length + 1).trim() || "";
  } catch {
    return "";
  }
}

const adminEmail = process.env.E2E_ADMIN_EMAIL || process.env.ADMIN_EMAIL || readLocalEnvValue("ADMIN_EMAIL");
const adminPassword = process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || readLocalEnvValue("ADMIN_PASSWORD");
const headed = process.env.E2E_HEADED === "true";
const slowMo = Number(process.env.E2E_SLOW_MO || (headed ? 500 : 0));
const keepOpen = process.env.E2E_KEEP_OPEN === "true";

function startDevServer(directory) {
  const child = spawn("npm", ["run", "dev"], {
    cwd: directory,
    shell: true,
    stdio: "inherit",
    windowsHide: false,
  });
  startedProcesses.push(child);
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

async function ensureServers() {
  if (!(await fetch(`${apiUrl}/api/health`).catch(() => null))?.ok) startDevServer(serverDir);
  await waitFor(`${apiUrl}/api/health`, "Backend");
  if (!(await fetch(baseUrl).catch(() => null))?.ok) startDevServer(clientDir);
  await waitFor(baseUrl, "Frontend");
}

async function expectText(page, text) {
  await page.getByText(text, { exact: true }).waitFor();
}

async function expectUrl(page, pattern) {
  if (pattern.test(page.url())) return;
  try {
    await page.waitForURL(pattern, { timeout: 10000 });
  } catch {
    throw new Error(`Expected URL ${pattern}, received ${page.url()}.`);
  }
}

async function clearSession(page) {
  await page.context().clearCookies();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle" });
}

async function login(page, email, password, expectedUrlPattern) {
  let targetPattern = expectedUrlPattern;
  if (!targetPattern) {
    try {
      const url = new URL(page.url());
      const returnTo = url.searchParams.get("returnTo");
      if (returnTo) {
        const escaped = returnTo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        targetPattern = new RegExp(`${escaped}$`);
      } else {
        targetPattern = /\/$/;
      }
    } catch {
      targetPattern = /\/$/;
    }
  }
  if (!page.url().includes("/login")) {
    const loginLink = page.getByRole("link", { name: "Log in" });
    if ((await loginLink.count()) > 0 && (await loginLink.isVisible())) {
      await loginLink.click();
    } else {
      await page.goto(`${baseUrl}/login`);
    }
  }
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  try {
    await expectUrl(page, targetPattern);
  } catch (error) {
    const message = await page.locator(".error").allTextContents();
    throw new Error(`${error instanceof Error ? error.message : String(error)} Login errors: ${message.join(" | ") || "none"}`);
  }
}

async function logout(page) {
  await page.getByRole("button", { name: "Log out" }).click();
  await page.getByRole("link", { name: "Log in" }).waitFor();
  await page.getByRole("link", { name: "My Applications", exact: true }).waitFor({ state: "detached" });
  const storedToken = await page.evaluate((key) => localStorage.getItem(key), tokenKey);
  if (storedToken) throw new Error("Logout left the JWT in localStorage.");
}

async function fillValidStepOne(page, email) {
  await page.locator('input[name="firstName"]').fill("Automation");
  await page.locator('input[name="lastName"]').fill("Tester");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="phone"]').fill("55512345678");
  await page.locator('input[name="age"]').fill("25");
  await page.locator('input[name="city"]').fill("Springfield");
}

async function openFirstOpportunity(page) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator(".opportunity-card").first().waitFor();
  const card = page.locator(".opportunity-card").first();
  const name = (await card.locator("h3").innerText()).trim();
  await card.getByRole("button", { name: "Apply Now" }).click();
  await expectUrl(page, /\/opportunities\/\d+$/);
  await expectText(page, "What a Typical Session Looks Like");
  await expectText(page, "Who You'll Be Working With");
  await expectText(page, "What to Bring & Preparation");
  await page.getByRole("button", { name: "Apply Now" }).click();
  await expectUrl(page, /\/signup(\/\d+)?$/);
  return name;
}

async function waitBeforeClosing() {
  if (!keepOpen) return;
  console.log("E2E browser is still open. Press Enter in this terminal to close it.");
  await new Promise((resolve) => process.stdin.once("data", resolve));
}

async function testHomeAndTheme(page) {
  await clearSession(page);
  const cards = page.locator(".opportunity-card");
  await cards.first().waitFor();
  const initialCount = await cards.count();
  if (initialCount < 1) throw new Error("Home page did not load opportunities.");
  await cards.first().locator("img.opportunity-card-image").waitFor();

  await page.getByRole("button", { name: "Toggle color theme" }).click();
  if (!(await page.locator(".app-shell.dark").count())) throw new Error("Theme toggle did not enable dark mode.");
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  if (await page.locator(".app-shell.dark").count()) throw new Error("Theme toggle did not restore light mode.");

  const firstName = (await cards.first().locator("h3").innerText()).trim();
  await page.getByPlaceholder("Search opportunities...").fill(firstName);
  if ((await cards.count()) < 1) throw new Error("Opportunity search hid the matching result.");
  await page.getByPlaceholder("Search opportunities...").fill("no-opportunity-with-this-name");
  await expectText(page, "No opportunities match your search.");
  await page.getByPlaceholder("Search opportunities...").fill("");

  for (const category of ["Education", "Environment", "Outreach"]) {
    await page.getByRole("button", { name: category, exact: true }).click();
    const visibleCards = page.locator(".opportunity-card");
    for (let index = 0; index < await visibleCards.count(); index += 1) {
      const badge = await visibleCards.nth(index).locator(".badge").innerText();
      if (badge.trim().toLowerCase() !== category.toLowerCase()) {
        throw new Error(`${category} filter displayed a ${badge} opportunity.`);
      }
    }
  }
  await page.getByRole("button", { name: "All", exact: true }).click();
  if ((await cards.count()) !== initialCount) throw new Error("All filter did not restore the opportunity list.");

  const errorPage = await page.context().newPage();
  await errorPage.route("**/api/volunteers", (route) => route.fulfill({ status: 500, body: "{}" }));
  await errorPage.goto(baseUrl, { waitUntil: "networkidle" });
  await expectText(errorPage, "Could not load opportunities. Is the API server running?");
  await errorPage.close();

  const opportunityResponse = await page.request.get(`${apiUrl}/api/volunteers/1`);
  if (!opportunityResponse.ok()) throw new Error("Existing opportunity lookup failed.");
  const missingOpportunityResponse = await page.request.get(`${apiUrl}/api/volunteers/999999999`);
  if (missingOpportunityResponse.status() !== 404) throw new Error("Missing opportunity did not return 404.");

  // Check storytelling, urgent row, and volunteer testimonials on homepage
  await page.locator(".home-impact-mission").waitFor();
  await page.locator(".home-impact-stats").waitFor();
  await page.getByRole("heading", { name: "Stories from Our Volunteers" }).waitFor();
  await page.locator(".testimonials-grid .testimonial-card").first().waitFor();

  const testimonialsResponse = await page.request.get(`${apiUrl}/api/testimonials`);
  if (!testimonialsResponse.ok()) throw new Error("Public testimonials endpoint failed.");
  const testimonials = await testimonialsResponse.json();
  if (!Array.isArray(testimonials) || testimonials.length < 1) throw new Error("Public testimonials was empty.");

  const siteSettingsResponse = await page.request.get(`${apiUrl}/api/site-settings`);
  if (!siteSettingsResponse.ok()) throw new Error("Public site-settings endpoint failed.");
  const siteSettings = await siteSettingsResponse.json();
  if (!siteSettings.missionStatement || !Array.isArray(siteSettings.stats)) {
    throw new Error("Public site-settings payload is malformed.");
  }
}

async function testAuthAndGuards(page, email, password) {
  await clearSession(page);
  await page.goto(`${baseUrl}/my-applications`, { waitUntil: "networkidle" });
  await expectUrl(page, /\/login\?returnTo=%2Fmy-applications/);
  await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });
  await expectUrl(page, /\/login\?returnTo=%2Fadmin/);

  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  const passwordInput = page.getByLabel("Password", { exact: true });
  await passwordInput.fill(password);
  const toggle = page.getByRole("button", { name: "Show password" });
  await toggle.click();
  if (await passwordInput.getAttribute("type") !== "text") throw new Error("Show password did not reveal the password.");
  await page.getByRole("button", { name: "Hide password" }).click();
  if (await passwordInput.getAttribute("type") !== "password") throw new Error("Hide password did not mask the password.");

  await page.getByLabel("Email").fill("invalid-email");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  if (await page.getByLabel("Email").evaluate((input) => input.validity.valid)) {
    throw new Error("Invalid login email was not rejected by browser validation.");
  }
  await page.getByLabel("Email").fill(email);
  await passwordInput.fill("short");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expectText(page, "Password must be at least 8 characters.");
  await passwordInput.fill("WrongPassword123!");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expectText(page, "Email or password is incorrect.");

  await page.goto(`${baseUrl}/register`, { waitUntil: "networkidle" });
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.locator(".password-input-wrapper").first().getByRole("button", { name: "Show password" }).click();
  if (await page.getByLabel("Password", { exact: true }).getAttribute("type") !== "text") throw new Error("Registration password toggle failed.");
  await page.locator(".password-input-wrapper").first().getByRole("button", { name: "Hide password" }).click();
  await page.getByLabel("Email").fill("invalid-email");
  await page.getByRole("button", { name: "Create account" }).click();
  if (await page.getByLabel("Email").evaluate((input) => input.validity.valid)) {
    throw new Error("Invalid registration email was not rejected by browser validation.");
  }

}

async function testSecurityHardening(page, userEmail, userPassword) {
  const userToken = await page.evaluate((key) => localStorage.getItem(key), tokenKey);
  if (!userToken) throw new Error("Security tests could not find the regular user's JWT.");

  const adminRequests = [
    { method: "GET", path: "/api/admin/opportunities" },
    { method: "POST", path: "/api/admin/opportunities", data: { name: "Denied", type: "Outreach", description: "Denied", spotsLeft: 1 } },
    { method: "PATCH", path: "/api/admin/opportunities/999999999", data: { name: "Denied" } },
    { method: "DELETE", path: "/api/admin/opportunities/999999999" },
    { method: "GET", path: "/api/admin/applications" },
    { method: "PATCH", path: "/api/admin/applications/999999999/status", data: { status: "approved" } },
    { method: "DELETE", path: "/api/admin/applications/999999999" },
    { method: "GET", path: "/api/admin/testimonials" },
    { method: "POST", path: "/api/admin/testimonials", data: { quote: "Denied", author: "Denied", role: "Denied" } },
    { method: "PATCH", path: "/api/admin/testimonials/999999999", data: { quote: "Denied" } },
    { method: "DELETE", path: "/api/admin/testimonials/999999999" },
    { method: "GET", path: "/api/admin/site-settings" },
    { method: "PATCH", path: "/api/admin/site-settings", data: { missionStatement: "Denied", stats: [{ value: "1", label: "Denied" }] } },
  ];

  for (const request of adminRequests) {
    const response = await page.request.fetch(`${apiUrl}${request.path}`, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${userToken}`,
        ...(request.data ? { "Content-Type": "application/json" } : {}),
      },
      ...(request.data ? { data: request.data } : {}),
    });
    if (response.status() !== 403) {
      throw new Error(`Regular user received HTTP ${response.status()} for ${request.method} ${request.path}.`);
    }
  }

  const allowedOriginResponse = await page.request.get(`${apiUrl}/api/health`, {
    headers: { Origin: "http://localhost:5173" },
  });
  if (allowedOriginResponse.headers()["access-control-allow-origin"] !== "http://localhost:5173") {
    throw new Error("Configured frontend origin was not allowed by CORS.");
  }
  const deniedOriginResponse = await page.request.get(`${apiUrl}/api/health`, {
    headers: { Origin: "http://malicious.example" },
  });
  if (deniedOriginResponse.headers()["access-control-allow-origin"]) {
    throw new Error("Unconfigured origin was allowed by CORS.");
  }
  if (allowedOriginResponse.headers()["x-content-type-options"] !== "nosniff") {
    throw new Error("Helmet security headers were not applied.");
  }

  await page.evaluate((key) => localStorage.setItem(key, "expired-or-invalid-token"), tokenKey);
  await page.goto(`${baseUrl}/my-applications`, { waitUntil: "networkidle" });
  await expectText(page, "Your session expired, please log in again.");
  await expectUrl(page, /\/login\?message=.*returnTo=.*my-applications/);
  const clearedToken = await page.evaluate((key) => localStorage.getItem(key), tokenKey);
  if (clearedToken) throw new Error("Expired JWT handling did not clear localStorage.");
  await login(page, userEmail, userPassword);

  if (!adminEmail || !adminPassword) throw new Error("Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run capacity E2E coverage.");
  const adminLoginResponse = await page.request.post(`${apiUrl}/api/auth/login`, {
    data: { email: adminEmail, password: adminPassword },
  });
  if (!adminLoginResponse.ok()) throw new Error("Capacity test could not log in as the admin.");
  const { token: adminToken } = await adminLoginResponse.json();
  let capacityOpportunityId;
  const capacityAccounts = [];

  try {
    const opportunityResponse = await page.request.post(`${apiUrl}/api/admin/opportunities`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        name: `E2E Last Spot ${Date.now()}`,
        type: "Outreach",
        description: "Created by concurrent capacity coverage.",
        spotsLeft: 1,
      },
    });
    if (!opportunityResponse.ok()) throw new Error("Capacity test opportunity could not be created.");
    capacityOpportunityId = (await opportunityResponse.json()).id;

    for (let index = 0; index < 2; index += 1) {
      const email = `e2e-capacity-${Date.now()}-${index}@example.com`;
      const response = await page.request.post(`${apiUrl}/api/auth/register`, {
        data: { email, password: userPassword },
      });
      if (!response.ok()) throw new Error(`Capacity test account ${index + 1} could not be created.`);
      const body = await response.json();
      capacityAccounts.push({ email, token: body.token });
    }

    const applicationData = (email) => ({
      volunteerId: capacityOpportunityId,
      firstName: "Capacity",
      lastName: "Tester",
      email,
      phone: "55512345678",
      age: "25",
      city: "Springfield",
      availability: ["Mon-Morning"],
      experience: "Concurrent capacity test.",
      skills: [],
      heardAbout: "Other",
      agreeTerms: true,
    });
    const submissions = await Promise.all(capacityAccounts.map((account) => page.request.post(`${apiUrl}/api/applications`, {
      headers: { Authorization: `Bearer ${account.token}` },
      data: applicationData(account.email),
    })));
    const statusCodes = submissions.map((response) => response.status()).sort((left, right) => left - right);
    if (statusCodes.join(",") !== "201,400") {
      throw new Error(`Concurrent last-spot submissions returned ${statusCodes.join(",")} instead of one 201 and one 400.`);
    }
  } finally {
    for (const account of capacityAccounts) {
      const response = await page.request.delete(`${apiUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${account.token}` },
      });
      if (!response.ok()) console.error(`WARNING: capacity account cleanup returned HTTP ${response.status()}.`);
    }
    if (capacityOpportunityId) {
      const response = await page.request.delete(`${apiUrl}/api/admin/opportunities/${capacityOpportunityId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!response.ok()) console.error(`WARNING: capacity opportunity cleanup returned HTTP ${response.status()}.`);
    }
  }
}

async function testRegistrationAndWizard(page, email, password) {
  await clearSession(page);
  await page.goto(`${baseUrl}/register`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill("DifferentPassword123!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expectText(page, "Passwords do not match.");
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expectUrl(page, /\/$/);

  if (!(await page.getByRole("link", { name: "My Applications" }).count())) throw new Error("Authenticated navbar is missing My Applications.");
  await page.goto(`${baseUrl}/my-applications`, { waitUntil: "networkidle" });
  await expectText(page, "No applications yet");
  const applicationsErrorPage = await page.context().newPage();
  await applicationsErrorPage.route("**/api/applications", (route) => route.fulfill({ status: 503, body: JSON.stringify({ message: "Applications unavailable" }), headers: { "Content-Type": "application/json" } }));
  await applicationsErrorPage.goto(`${baseUrl}/my-applications`, { waitUntil: "networkidle" });
  await applicationsErrorPage.getByRole("alert").waitFor();
  await applicationsErrorPage.close();
  const duplicateResponse = await page.request.post(`${apiUrl}/api/auth/register`, {
    data: { email, password },
  });
  if (duplicateResponse.status() !== 409) throw new Error("Duplicate registration was not rejected with 409.");
  await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });
  await expectUrl(page, /\/$/);
  const forbiddenResponse = await page.request.get(`${apiUrl}/api/admin/opportunities`, {
    headers: { Authorization: `Bearer ${await page.evaluate((key) => localStorage.getItem(key), tokenKey)}` },
  });
  if (forbiddenResponse.status() !== 403) throw new Error("Regular user admin API access was not rejected with 403.");
  await logout(page);
  await login(page, email, password);

  const opportunityName = await openFirstOpportunity(page);

  await page.getByRole("button", { name: /Next: Availability/ }).click();
  await expectText(page, "First name is required.");
  await fillValidStepOne(page, email);
  await page.getByRole("button", { name: /Next: Availability/ }).click();
  await page.getByRole("main").getByText("Step 2 of 4", { exact: true }).waitFor();
  await page.getByRole("button", { name: /Next: More Info/ }).click();
  await expectText(page, "Please select at least one available time slot.");
  const slotButtons = page.locator(".slot-btn");
  const slotCount = await slotButtons.count();
  for (let index = 0; index < slotCount; index += 1) {
    await slotButtons.nth(index).click();
    if (!(await slotButtons.nth(index).evaluate((button) => button.classList.contains("slot-btn-active")))) {
      throw new Error(`Availability slot ${index + 1} did not activate.`);
    }
  }
  for (let index = 0; index < slotCount; index += 1) {
    await slotButtons.nth(index).click();
    if (await slotButtons.nth(index).evaluate((button) => button.classList.contains("slot-btn-active"))) {
      throw new Error(`Availability slot ${index + 1} did not toggle off.`);
    }
  }
  await slotButtons.first().click();
  await page.locator('textarea[name="experience"]').fill("Automated end-to-end test submission.");
  await page.getByRole("button", { name: /Next: More Info/ }).click();
  await page.getByRole("main").getByText("Step 3 of 4", { exact: true }).waitFor();

  const skillInputs = page.locator(".skills-grid input[type='checkbox']");
  const skillCount = await skillInputs.count();
  for (let index = 0; index < skillCount; index += 1) {
    await skillInputs.nth(index).check();
  }
  if (await skillInputs.evaluateAll((inputs) => inputs.some((input) => !input.checked))) {
    throw new Error("Not every skill checkbox could be selected.");
  }
  const firstSkill = skillInputs.first();
  await page.getByRole("button", { name: /Review Application/ }).click();
  await expectText(page, "You must agree to the volunteer terms and code of conduct.");
  await page.locator('select[name="heardAbout"]').selectOption({ label: "School / University" });
  await page.locator('input[type="checkbox"]').last().check();
  await page.getByRole("button", { name: /Review Application/ }).click();
  await expectText(page, "Review Your Application");
  await page.getByRole("heading", { name: opportunityName, exact: true }).waitFor();
  await expectText(page, "Automation Tester");
  await expectText(page, "Automated end-to-end test submission.");

  await page.getByRole("button", { name: "← Back" }).click();
  await page.getByRole("main").getByText("Step 3 of 4", { exact: true }).waitFor();
  if (!(await firstSkill.isChecked())) throw new Error("Wizard Back lost selected skills.");

  // Verify reload restores Step 3 and formData from sessionStorage
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("main").getByText("Step 3 of 4", { exact: true }).waitFor();
  if (!(await firstSkill.isChecked())) throw new Error("Wizard reload did not restore selected skills from sessionStorage.");

  await page.getByRole("button", { name: /Review Application/ }).click();
  await page.getByRole("button", { name: "Clear" }).click();
  await page.getByRole("main").getByText("Step 1 of 4", { exact: true }).waitFor();
  if ((await page.locator('input[name="firstName"]').inputValue()) !== "") throw new Error("Clear did not reset the wizard.");

  await fillValidStepOne(page, email);
  await page.getByRole("button", { name: /Next: Availability/ }).click();
  await page.locator(".slot-btn").first().click();
  await page.locator('textarea[name="experience"]').fill("Automated end-to-end test submission.");
  await page.getByRole("button", { name: /Next: More Info/ }).click();
  await page.locator('select[name="heardAbout"]').selectOption({ label: "School / University" });
  await page.locator('input[type="checkbox"]').last().check();
  await page.getByRole("button", { name: /Review Application/ }).click();
  await page.route("**/api/applications", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ status: 503, body: JSON.stringify({ message: "Submission service unavailable" }), headers: { "Content-Type": "application/json" } });
      return;
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "Confirm & Submit" }).click();
  await page.getByRole("alert").filter({ hasText: "Submission service unavailable" }).waitFor();
  await page.unroute("**/api/applications");
  await page.getByRole("button", { name: "Confirm & Submit" }).click();
  await page.getByRole("heading", { name: "Thank you for signing up!" }).waitFor();
  await page.getByText(opportunityName, { exact: true }).last().waitFor();
  await page.getByRole("button", { name: "View My Applications" }).click();
  await expectUrl(page, /\/my-applications$/);
  const submittedCard = page.locator(".application-card").filter({ hasText: "Automation Tester" }).first();
  await submittedCard.waitFor();
  await submittedCard.getByText("Pending", { exact: true }).waitFor();
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".application-card").filter({ hasText: "Automation Tester" }).first().waitFor();

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.goto(`${baseUrl}/signup`, { waitUntil: "networkidle" });
  await expectUrl(page, /\/$/);
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const appliedOpportunityCard = page.locator(".opportunity-card").filter({ hasText: opportunityName }).first();
  await appliedOpportunityCard.getByText("You've already applied to this opportunity.").waitFor();
  await appliedOpportunityCard.getByRole("link", { name: "View My Applications" }).waitFor();
  const applyButton = appliedOpportunityCard.getByRole("button", { name: /Already applied|Apply Now/ });
  await applyButton.click();
  if (page.url().includes("/opportunities/")) {
    await expectText(page, "You've already applied to this opportunity.");
    const detailApplyBtn = page.getByRole("button", { name: "Already Applied" });
    await detailApplyBtn.waitFor();
    if (!(await detailApplyBtn.isDisabled())) throw new Error("Apply button on detail page was not disabled when already applied.");
  }
  if (await page.getByText("Step 1 of 4", { exact: true }).count()) {
    throw new Error("Duplicate application opened the multi-step form.");
  }

  // Verify database-level unique constraint prevents duplicate submission with 409
  const userToken = await page.evaluate((key) => localStorage.getItem(key), tokenKey);
  const dupApiResponse = await page.request.post(`${apiUrl}/api/applications`, {
    headers: { Authorization: `Bearer ${userToken}` },
    data: {
      volunteerId: 1,
      firstName: "Automation",
      lastName: "Tester",
      email,
      phone: "09171234567",
      age: "25",
      city: "Springfield",
      availability: ["Mon-Morning"],
      experience: "Test",
      skills: ["Communication"],
      heardAbout: "School / University",
      agreeTerms: true,
    },
  });
  if (dupApiResponse.status() !== 409) {
    throw new Error(`Expected 409 Conflict from database unique constraint, got ${dupApiResponse.status()}`);
  }

  const browseAccountEmail = `e2e-browse-${Date.now()}@example.com`;
  const browseAccountResponse = await page.request.post(`${apiUrl}/api/auth/register`, {
    data: { email: browseAccountEmail, password },
  });
  if (!browseAccountResponse.ok()) throw new Error("Success navigation test account could not be created.");
  const { token: browseAccountToken } = await browseAccountResponse.json();
  try {
    await page.evaluate(({ key, token }) => localStorage.setItem(key, token), { key: tokenKey, token: browseAccountToken });
    await page.reload({ waitUntil: "networkidle" });
    const browseOpportunityName = await openFirstOpportunity(page);
    await fillValidStepOne(page, browseAccountEmail);
    await page.getByRole("button", { name: /Next: Availability/ }).click();
    await page.locator(".slot-btn").first().click();
    await page.getByRole("button", { name: /Next: More Info/ }).click();
    await page.locator('select[name="heardAbout"]').selectOption({ label: "Other" });
    await page.locator('input[type="checkbox"]').last().check();
    await page.getByRole("button", { name: /Review Application/ }).click();
    await page.getByRole("button", { name: "Confirm & Submit" }).click();
    await page.getByRole("heading", { name: "Thank you for signing up!" }).waitFor();
    await page.getByText(browseOpportunityName, { exact: true }).last().waitFor();
    await page.getByRole("button", { name: "Browse more opportunities" }).click();
    await expectUrl(page, /\/$/);

    // ── Test Rubric Endpoints & UI Withdrawal for Browse Account ──
    // 1. Validation 400 Bad Request check
    const invalidAppRes = await page.request.post(`${apiUrl}/api/applications`, {
      headers: { "Content-Type": "application/json" },
      data: {},
    });
    if (invalidAppRes.status() !== 400) {
      throw new Error(`Expected 400 Bad Request for empty application body, got ${invalidAppRes.status()}`);
    }
    const invalidJson = await invalidAppRes.json();
    const fieldErrors = invalidJson.details || invalidJson.errors;
    if (!fieldErrors || !fieldErrors.firstName) {
      throw new Error(`Expected field errors in 400 validation response, got ${JSON.stringify(invalidJson)}`);
    }

    // 2. Fetch single application by ID (GET /api/applications/:id)
    const browseAppsRes = await page.request.get(`${apiUrl}/api/applications`, {
      headers: { Authorization: `Bearer ${browseAccountToken}` },
    });
    const browseApps = await browseAppsRes.json();
    if (!browseApps || browseApps.length === 0) {
      throw new Error("Browse account application list was empty.");
    }
    const browseAppId = browseApps[0].id;

    const singleAppRes = await page.request.get(`${apiUrl}/api/applications/${browseAppId}`);
    if (singleAppRes.status() !== 200) {
      throw new Error(`Expected 200 for GET /api/applications/${browseAppId}, got ${singleAppRes.status()}`);
    }
    const singleApp = await singleAppRes.json();
    if (singleApp.email !== browseAccountEmail) {
      throw new Error(`Single application email mismatch: expected ${browseAccountEmail}, got ${singleApp.email}`);
    }

    // 3. Test 404 handling for non-existent entities
    const notFoundAppRes = await page.request.get(`${apiUrl}/api/applications/999999`);
    if (notFoundAppRes.status() !== 404) {
      throw new Error(`Expected 404 for GET /api/applications/999999, got ${notFoundAppRes.status()}`);
    }
    const notFoundOppRes = await page.request.get(`${apiUrl}/api/volunteers/999999`);
    if (notFoundOppRes.status() !== 404) {
      throw new Error(`Expected 404 for GET /api/volunteers/999999, got ${notFoundOppRes.status()}`);
    }

    // 4. Test live UI Application Withdrawal on My Applications page
    await page.goto(`${baseUrl}/my-applications`, { waitUntil: "networkidle" });
    await page.locator(".application-card").first().waitFor();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: /Withdraw Application/i }).first().click();
    await page.locator(".success-banner").waitFor();

    const remainingCards = await page.locator(".application-card").count();
    if (remainingCards !== 0) {
      throw new Error("Application card was not removed from DOM immediately upon withdrawal.");
    }

    // Confirm DB record is gone (404)
    const postWithdrawRes = await page.request.get(`${apiUrl}/api/applications/${browseAppId}`);
    if (postWithdrawRes.status() !== 404) {
      throw new Error(`Expected 404 for withdrawn application ${browseAppId}, got ${postWithdrawRes.status()}`);
    }

    await logout(page);
  } finally {
    const cleanupResponse = await page.request.delete(`${apiUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${browseAccountToken}` },
    });
    if (!cleanupResponse.ok()) console.error(`WARNING: success navigation cleanup returned HTTP ${cleanupResponse.status()}.`);
  }
  await login(page, email, password);
}

async function testAdmin(page, userEmail, userPassword) {
  if (!adminEmail || !adminPassword) throw new Error("Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin E2E coverage.");
  await logout(page);
  await login(page, adminEmail, adminPassword);
  await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Admin Panel", exact: true }).waitFor();
  await expectText(page, "Volunteer opportunities");

  const uniqueName = `E2E Opportunity ${Date.now()}`;
  adminFixtureName = uniqueName;
  const form = page.locator(".admin-form");
  await form.locator("input").nth(0).fill(uniqueName);
  await form.locator("input").nth(1).fill("Outreach");
  await form.locator('input[type="number"]').fill("2");
  await form.locator("textarea").nth(0).fill("Created by comprehensive E2E coverage.");
  await form.locator("textarea").nth(1).fill("Session details created by comprehensive E2E.");
  await form.locator("textarea").nth(2).fill("Team details created by comprehensive E2E.");
  await form.locator("textarea").nth(3).fill("Preparation details created by comprehensive E2E.");
  await form.getByRole("button", { name: "Create opportunity" }).click();
  await expectText(page, "Opportunity created.");
  await expectText(page, uniqueName);

  const row = page.locator(".admin-row").filter({ hasText: uniqueName });
  await row.getByText("✓ Custom storytelling sections configured").waitFor();
  await row.getByRole("button", { name: "Edit" }).click();
  await expectText(page, "Save changes");
  if ((await form.locator("textarea").nth(1).inputValue()) !== "Session details created by comprehensive E2E.") {
    throw new Error("Opportunity storytelling sessionDetails was not loaded in the edit form.");
  }
  await page.getByRole("button", { name: "Cancel edit" }).click();
  await expectText(page, "Create opportunity");
  await row.getByRole("button", { name: "Edit" }).click();
  await form.locator("textarea").nth(0).fill("Updated by comprehensive E2E coverage.");
  await form.getByRole("button", { name: "Save changes" }).click();
  await expectText(page, "Opportunity updated.");
  await row.getByText("Updated by comprehensive E2E coverage.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Refresh data" }).click();
  await row.waitFor();

  await row.getByRole("button", { name: "Set as priority" }).click();
  await expectText(page, "Opportunity marked as priority.");
  await row.locator(".priority-badge").waitFor();
  await row.getByRole("button", { name: "Remove priority" }).click();
  await expectText(page, "Priority status removed.");

  const applicationTab = page.getByRole("tab", { name: /Applications/ });
  await applicationTab.click();
  await expectText(page, "Applications");
  const applicationRows = page.locator(".application-row");
  if ((await applicationRows.count()) < 1) throw new Error("Admin application list did not show the submitted application.");
  const userApplication = applicationRows.filter({ hasText: userEmail });
  await userApplication.first().getByRole("button", { name: /Automation Tester/ }).click();
  await expectText(page, "Automated end-to-end test submission.");
  await userApplication.first().getByRole("button", { name: /Automation Tester/ }).click();
  if (await userApplication.first().getByText("Automated end-to-end test submission.").count()) {
    throw new Error("Application details did not collapse.");
  }
  await userApplication.first().getByRole("button", { name: /Automation Tester/ }).click();
  await expectText(page, "Automated end-to-end test submission.");
  await userApplication.first().getByRole("button", { name: "Approve", exact: true }).click();
  await expectText(page, "Application status updated.");
  await userApplication.first().getByText("Confirmed", { exact: true }).waitFor();
  await page.getByPlaceholder("Search applicant name or email...").fill(userEmail);
  await page.getByRole("button", { name: "Confirmed", exact: true }).click();
  if ((await page.locator(".application-row").count()) !== 1) throw new Error("Confirmed filter did not show the approved application.");
  await page.getByRole("button", { name: "Pending", exact: true }).click();
  if ((await page.locator(".application-row").count()) !== 0) throw new Error("Pending filter showed an approved application.");
  await page.getByRole("button", { name: "All", exact: true }).click();
  const rejectButton = userApplication.first().getByRole("button", { name: "Reject", exact: true });
  if (!(await rejectButton.count())) {
    await userApplication.first().getByRole("button", { name: /Automation Tester/ }).click();
  }
  await rejectButton.click();
  await expectText(page, "Application status updated.");
  await userApplication.first().getByText("Cancelled", { exact: true }).waitFor();
  await page.getByPlaceholder("Search applicant name or email...").fill("not-a-real-applicant");
  await expectText(page, "No applications match these filters.");
  await page.getByPlaceholder("Search applicant name or email...").fill(userEmail);
  await page.getByRole("button", { name: "Cancelled", exact: true }).click();
  if ((await page.locator(".application-row").count()) !== 1) throw new Error("Cancelled filter did not show the rejected application.");
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.getByPlaceholder("Search applicant name or email...").fill("");

  await page.route("**/api/admin/applications", async (route) => {
    const response = await route.fetch();
    const applications = await response.json();
    const template = applications[0];
    const expandedApplications = Array.from({ length: 16 }, (_, index) => ({
      ...template,
      id: template.id + index + 100000,
      firstName: `Pagination${index + 1}`,
      email: `pagination-${index + 1}@example.com`,
    }));
    await route.fulfill({ response, json: [template, ...expandedApplications] });
  });
  await page.getByRole("button", { name: "Refresh data" }).click();
  await page.getByText("Page 1 of 2", { exact: true }).waitFor();
  const nextPage = page.getByRole("button", { name: "Next" });
  if (await nextPage.isDisabled()) throw new Error("Pagination Next button was disabled with multiple pages.");
  await nextPage.click();
  await page.getByText("Page 2 of 2", { exact: true }).waitFor();
  const previousPage = page.getByRole("button", { name: "Previous" });
  if (await previousPage.isDisabled()) throw new Error("Pagination Previous button was disabled on page two.");
  await previousPage.click();
  await page.getByText("Page 1 of 2", { exact: true }).waitFor();
  await page.unroute("**/api/admin/applications");
  await page.getByRole("button", { name: "Refresh data" }).click();
  await page.getByText("Page 1 of 1", { exact: true }).waitFor();

  const token = await page.evaluate((key) => localStorage.getItem(key), tokenKey);
  const applicationsResponse = await page.request.get(`${apiUrl}/api/admin/applications`, { headers: { Authorization: `Bearer ${token}` } });
  if (!applicationsResponse.ok()) throw new Error("Admin applications API failed.");
  const applications = await applicationsResponse.json();
  const createdApplication = applications.find((application) => application.email === userEmail);
  if (!createdApplication) throw new Error("Submitted application was not found in the admin API.");

  await page.getByRole("tab", { name: "Opportunities" }).click();
  const applicationOpportunityRow = page.locator(".admin-row").filter({ hasText: createdApplication.volunteerName });
  page.once("dialog", (dialog) => {
    dialog.accept();
  });
  await applicationOpportunityRow.getByRole("button", { name: "Delete" }).click();
  await expectText(page, "This opportunity has applications and cannot be deleted. Edit it instead.");
  await page.getByRole("tab", { name: /Applications/ }).click();
  page.once("dialog", (dialog) => {
    dialog.accept();
  });
  await page.getByRole("button", { name: "Delete application" }).first().click();
  await expectText(page, "Application deleted and the opportunity spot was restored.");

  await page.getByRole("tab", { name: "Opportunities" }).click();
  const createdRow = page.locator(".admin-row").filter({ hasText: uniqueName });
  page.once("dialog", (dialog) => {
    dialog.accept();
  });
  await createdRow.getByRole("button", { name: "Delete" }).click();
  await expectText(page, "Opportunity deleted.");

  // ── Volunteer Stories (Testimonials) CRUD ──
  const storiesTab = page.getByRole("tab", { name: /Volunteer Stories/ });
  await storiesTab.click();
  await expectText(page, "Volunteer Stories & Testimonials");

  const storyQuote = `E2E Volunteer Story ${Date.now()}`;
  const storyAuthor = "Maya Automation";
  const storyRole = "Senior Community Lead";

  const storyForm = page.locator(".admin-section form");
  await storyForm.locator("textarea").fill(storyQuote);
  await storyForm.locator("input").nth(0).fill(storyAuthor);
  await storyForm.locator("input").nth(1).fill(storyRole);
  await storyForm.getByRole("button", { name: "Add Story" }).click();
  await expectText(page, "Volunteer story added successfully.");

  const storyRow = page.locator(".admin-row").filter({ hasText: storyQuote });
  await storyRow.waitFor();
  await storyRow.getByRole("button", { name: "Edit" }).click();
  await expectText(page, "Save Changes");
  await page.getByRole("button", { name: "Cancel edit" }).click();
  await expectText(page, "Add Story");

  await storyRow.getByRole("button", { name: "Edit" }).click();
  await storyForm.locator("textarea").fill(`${storyQuote} Updated`);
  await storyForm.getByRole("button", { name: "Save Changes" }).click();
  await expectText(page, "Volunteer story updated successfully.");
  await page.getByText(`${storyQuote} Updated`).waitFor();

  page.once("dialog", (dialog) => dialog.accept());
  const updatedStoryRow = page.locator(".admin-row").filter({ hasText: `${storyQuote} Updated` });
  await updatedStoryRow.getByRole("button", { name: "Delete" }).click();
  await expectText(page, "Volunteer story deleted.");

  // ── Impact & Mission Settings ──
  const settingsTab = page.getByRole("tab", { name: "Impact & Mission" });
  await settingsTab.click();
  await expectText(page, "Impact Statistics & Mission Statement");

  const settingsForm = page.locator(".admin-section form");
  const missionTextarea = settingsForm.locator("textarea");
  const originalMission = await missionTextarea.inputValue();
  if (!originalMission) throw new Error("Site settings mission statement was empty.");

  const stat1Card = page.locator(".admin-stat-card").nth(0);
  const stat1ValueInput = stat1Card.locator("input").nth(0);
  const originalStat1Value = await stat1ValueInput.inputValue();

  await stat1ValueInput.fill("999+");
  await settingsForm.getByRole("button", { name: /Save Mission & Impact/ }).click();
  await expectText(page, "Mission statement and impact stats updated successfully.");

  // Verify on live Homepage
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByText("999+", { exact: true }).waitFor();

  // Restore original value
  await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Impact & Mission" }).click();
  await page.locator(".admin-stat-card").nth(0).locator("input").nth(0).fill(originalStat1Value);
  await page.locator(".admin-section form").getByRole("button", { name: /Save Mission & Impact/ }).click();
  await expectText(page, "Mission statement and impact stats updated successfully.");
}

async function run() {
  await ensureServers();
  const browser = await chromium.launch({ headless: !headed, slowMo });
  const context = await browser.newContext();
  const page = await context.newPage();
  const userEmail = `e2e-comprehensive-${Date.now()}@example.com`;
  const userPassword = "TestPassword123!";
  let userCreated = false;

  try {
    await testHomeAndTheme(page);
    await testAuthAndGuards(page, userEmail, userPassword);
    await testRegistrationAndWizard(page, userEmail, userPassword);
    userCreated = true;
    await testSecurityHardening(page, userEmail, userPassword);
    await testAdmin(page, userEmail, userPassword);
    console.log("PASS: browser workflows, admin authorization, atomic capacity, expired sessions, CORS, Helmet, CRUD, filters, status, and cleanup workflows");
  } finally {
    if (userCreated && !page.isClosed()) {
      try {
        const loginResponse = await page.request.post(`${apiUrl}/api/auth/login`, {
          data: { email: userEmail, password: userPassword },
        });
        if (!loginResponse.ok()) throw new Error(`Cleanup login returned HTTP ${loginResponse.status()}.`);
        const { token } = await loginResponse.json();
        const deleteResponse = await page.request.delete(`${apiUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!deleteResponse.ok()) throw new Error(`Cleanup returned HTTP ${deleteResponse.status()}.`);
        console.log("Cleaned up the comprehensive E2E account and application.");
      } catch (error) {
        console.error(`WARNING: E2E cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (adminFixtureName && !page.isClosed() && adminEmail && adminPassword) {
      try {
        const loginResponse = await page.request.post(`${apiUrl}/api/auth/login`, {
          data: { email: adminEmail, password: adminPassword },
        });
        if (!loginResponse.ok()) throw new Error(`Admin cleanup login returned HTTP ${loginResponse.status()}.`);
        const { token } = await loginResponse.json();
        const opportunitiesResponse = await page.request.get(`${apiUrl}/api/admin/opportunities`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!opportunitiesResponse.ok()) throw new Error(`Admin cleanup list returned HTTP ${opportunitiesResponse.status()}.`);
        const opportunity = (await opportunitiesResponse.json()).find((item) => item.name === adminFixtureName);
        if (opportunity) {
          const deleteResponse = await page.request.delete(`${apiUrl}/api/admin/opportunities/${opportunity.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!deleteResponse.ok()) throw new Error(`Admin opportunity cleanup returned HTTP ${deleteResponse.status()}.`);
          console.log("Cleaned up the comprehensive E2E opportunity fixture.");
        }
      } catch (error) {
        console.error(`WARNING: E2E opportunity cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    await waitBeforeClosing();
    await browser.close();
  }
}

try {
  await run();
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? (error.stack || error.message) : String(error)}`);
  process.exitCode = 1;
} finally {
  for (const child of startedProcesses) child.kill();
}
