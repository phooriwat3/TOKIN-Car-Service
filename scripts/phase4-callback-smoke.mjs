import { readFile } from "node:fs/promises";

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (process.env.PHASE4_CONFIRM_STAGING !== "yes")
  fail("Set PHASE4_CONFIRM_STAGING=yes to acknowledge state-changing staging tests.");

const secret = process.env.PHASE4_CALLBACK_SECRET;
const expectedHost = process.env.PHASE4_STAGING_HOST;
const configPath = process.env.PHASE4_SCENARIOS_FILE;
if (!secret || !expectedHost || !configPath)
  fail("PHASE4_CALLBACK_SECRET, PHASE4_STAGING_HOST, and PHASE4_SCENARIOS_FILE are required.");

const config = JSON.parse(await readFile(configPath, "utf8"));
const callbackUrl = new URL(config.callbackUrl);
if (callbackUrl.protocol !== "https:" || callbackUrl.hostname !== expectedHost)
  fail("The callback URL must use HTTPS and exactly match PHASE4_STAGING_HOST.");
if (!Array.isArray(config.cases) || config.cases.length < 10)
  fail("The Phase 4 staging pack must contain at least ten scenarios.");

let failed = 0;
for (const scenario of config.cases) {
  const started = Date.now();
  try {
    const response = await fetch(callbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tokin-callback-secret": secret,
      },
      body: JSON.stringify(scenario.body),
      signal: AbortSignal.timeout(15_000),
    });
    const responseBody = await response.json().catch(() => ({}));
    const expectedStatuses = Array.isArray(scenario.expectedHttpStatus)
      ? scenario.expectedHttpStatus
      : [scenario.expectedHttpStatus];
    const statusMatches = expectedStatuses.includes(response.status);
    const bodyMatches = Object.entries(scenario.expectedBody ?? {})
      .every(([key, value]) => responseBody[key] === value);
    const passed = statusMatches && bodyMatches;
    if (!passed) failed += 1;
    console.log(JSON.stringify({
      scenario: scenario.name,
      passed,
      httpStatus: response.status,
      expectedHttpStatus: expectedStatuses,
      elapsedMs: Date.now() - started,
      response: {
        ok: responseBody.ok,
        status: responseBody.status,
        alreadyProcessed: responseBody.alreadyProcessed,
        error: responseBody.error,
      },
    }));
  } catch (cause) {
    failed += 1;
    console.log(JSON.stringify({
      scenario: scenario.name,
      passed: false,
      elapsedMs: Date.now() - started,
      error: cause instanceof Error ? cause.message : "Request failed.",
    }));
  }
}

if (failed) fail(`${failed} Phase 4 staging scenario(s) failed.`);
console.log(`All ${config.cases.length} Phase 4 staging scenarios passed.`);
