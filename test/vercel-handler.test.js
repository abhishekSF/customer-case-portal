import { test } from "node:test";
import assert from "node:assert/strict";
import { runApi } from "../api/_run.js";

function mock(method, url) {
  const req = { method, url, headers: { host: "example.test" } };
  let statusCode = 0;
  const headers = {};
  let body = Buffer.alloc(0);
  const res = {
    set statusCode(value) {
      statusCode = value;
    },
    get statusCode() {
      return statusCode;
    },
    setHeader(key, value) {
      headers[key] = value;
    },
    end(buf) {
      body = Buffer.isBuffer(buf) ? buf : Buffer.from(buf ?? "");
    },
  };
  return {
    req,
    res,
    result() {
      return { statusCode, headers, json: JSON.parse(body.toString("utf8") || "{}") };
    },
  };
}

test("Vercel health handler returns the memory stub", async () => {
  const http = mock("GET", "/api/health");
  await runApi(http.req, http.res);
  const out = http.result();
  assert.equal(out.statusCode, 200);
  assert.equal(out.json.ok, true);
  assert.equal(out.json.store, "memory");
});

test("Vercel getCaseStatus handler returns Closed Case 00001001", async () => {
  const http = mock("GET", "/api/cases/00001001");
  await runApi(http.req, http.res);
  const out = http.result();
  assert.equal(out.statusCode, 200);
  assert.equal(out.json.caseNumber, "00001001");
  assert.equal(out.json.status, "Closed");
  assert.equal(
    out.json.subject,
    "Performance inadequate for second consecutive week",
  );
});
