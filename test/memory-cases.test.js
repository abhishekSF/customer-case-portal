import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CaseNotFoundError,
  createMemoryCaseStore,
  SEED_CASE_NUMBER,
} from "../lib/memory-cases.js";

test("seed Case 00001001 is present with status fields", () => {
  const store = createMemoryCaseStore();
  const record = store.getCaseStatus("00001001");
  assert.equal(record.caseNumber, SEED_CASE_NUMBER);
  assert.equal(record.status, "Closed");
  assert.equal(record.lastModified, "2026-08-29T16:40:00.000Z");
  assert.equal(record.owner, "Priya Nair");
  assert.equal(
    record.subject,
    "Performance inadequate for second consecutive week",
  );
  assert.ok(record.description);
});

test("listCases returns more than the demo Case, newest first", () => {
  const store = createMemoryCaseStore();
  const cases = store.listCases();
  assert.ok(cases.length > 1);
  assert.ok(cases.some((row) => row.caseNumber === SEED_CASE_NUMBER));
  const times = cases.map((row) => Date.parse(row.lastModified));
  const sorted = [...times].sort((a, b) => b - a);
  assert.deepEqual(times, sorted);
});

test("getCaseStatus throws CASE_NOT_FOUND on 0 rows", () => {
  const store = createMemoryCaseStore();
  assert.throws(() => store.getCaseStatus("00001999"), (error) => {
    assert.equal(error instanceof CaseNotFoundError, true);
    assert.equal(error.code, "CASE_NOT_FOUND");
    return true;
  });
});

test("createCase returns a new caseNumber and stores Status New, Origin Web", () => {
  const store = createMemoryCaseStore(() => "2026-08-30T22:00:00.000Z");
  const created = store.createCase({
    subject: "Indoor unit leaking after last visit",
    description:
      "The air handler has been dripping into the hall since the tech left yesterday.",
  });
  assert.equal(created.caseNumber, "00001002");
  assert.notEqual(created.caseNumber, "00001001");
  const record = store.getCaseStatus("00001002");
  assert.equal(record.status, "New");
  assert.equal(record.lastModified, "2026-08-30T22:00:00.000Z");
  assert.equal(record.owner, "Web Queue");
  assert.equal(record.subject, "Indoor unit leaking after last visit");
});

test("createCase requires subject and description", () => {
  const store = createMemoryCaseStore();
  assert.throws(() => store.createCase({ subject: "", description: "x" }), {
    code: "SUBJECT_REQUIRED",
  });
  assert.throws(() => store.createCase({ subject: "x", description: "  " }), {
    code: "DESCRIPTION_REQUIRED",
  });
});
