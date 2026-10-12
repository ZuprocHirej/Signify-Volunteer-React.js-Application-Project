process.env.E2E_HEADED = "true";
process.env.E2E_SLOW_MO = "700";
process.env.E2E_KEEP_OPEN = "true";

await import("./e2e-comprehensive.mjs");
