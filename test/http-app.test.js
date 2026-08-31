import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../lib/http-app.js";
import { createMemoryCaseStore } from "../lib/memory-cases.js";

function app() {
  return createApp(createMemoryCaseStore(() => "2026-08-30T22:10:00.000Z"));
}

test("GET /api/cases/00001001 returns the seed Case", async () => {
  const response = await app().request("/api/cases/00001001");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.caseNumber, "00001001");
  assert.equal(body.status, "Closed");
  assert.equal(body.lastModified, "2026-08-29T16:40:00.000Z");
  assert.equal(body.owner, "Priya Nair");
  assert.equal(
    body.subject,
    "Performance inadequate for second consecutive week",
  );
});

test("GET /api/cases returns recent Cases including 00001001", async () => {
  const response = await app().request("/api/cases");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(Array.isArray(body.cases));
  assert.ok(body.cases.length > 1);
  const seed = body.cases.find((row) => row.caseNumber === "00001001");
  assert.ok(seed);
  assert.equal(seed.status, "Closed");
  assert.equal(seed.owner, "Priya Nair");
  assert.equal(
    seed.subject,
    "Performance inadequate for second consecutive week",
  );
  const times = body.cases.map((row) => Date.parse(row.lastModified));
  const sorted = [...times].sort((a, b) => b - a);
  assert.deepEqual(times, sorted);
});

test("GET unknown Case returns CASE_NOT_FOUND", async () => {
  const response = await app().request("/api/cases/00001999");
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal(body.error, "CASE_NOT_FOUND");
});

test("POST /api/cases creates a Case and GET returns it", async () => {
  const api = app();
  const created = await api.request("/api/cases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject: "Indoor unit leaking after last visit",
      description:
        "The coil drain is overflowing onto the hallway floor after yesterday's visit.",
    }),
  });
  assert.equal(created.status, 201);
  const payload = await created.json();
  assert.equal(payload.caseNumber, "00001002");
  assert.notEqual(payload.caseNumber, "00001001");

  const lookup = await api.request("/api/cases/00001002");
  assert.equal(lookup.status, 200);
  const record = await lookup.json();
  assert.equal(record.status, "New");
  assert.equal(record.owner, "Web Queue");
});
