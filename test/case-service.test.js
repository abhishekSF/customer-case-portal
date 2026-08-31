import { test } from "node:test";
import assert from "node:assert/strict";
import { createCaseService } from "../lib/case-service.js";
import { salesforceEnvPresent } from "../lib/salesforce-cases.js";

test("without host env, /api/cases uses the in-memory stub", () => {
  assert.equal(salesforceEnvPresent(), false);
  assert.equal(createCaseService().kind, "memory");
});
