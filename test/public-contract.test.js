import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readPublic(name) {
  return readFile(path.join(root, "public", name), "utf8");
}

test("page seeds Case 00001001 and registerTool uses the required shape", async () => {
  const html = await readPublic("index.html");
  const webmcp = await readPublic("webmcp.js");
  const api = await readPublic("case-api.js");
  const app = await readPublic("app.js");

  assert.match(html, /00001001/);
  assert.match(html, /My Cases/);
  assert.match(html, /Case Number/);
  assert.match(html, /customer Case portal/);
  assert.match(html, /Fraunces/);
  assert.match(html, /Bricolage\+Grotesque/);
  assert.doesNotMatch(html, /Inter|Roboto|system-ui/);
  assert.match(webmcp, /name: "getCaseStatus"/);
  assert.match(webmcp, /00001001/);
  assert.match(webmcp, /name: "createCase"/);
  assert.doesNotMatch(html, /Salesforce/i);
  assert.doesNotMatch(html, /Experience Cloud|Agentforce|SLDS/i);

  assert.match(webmcp, /document\.modelContext\.registerTool/);
  assert.match(webmcp, /name: "getCaseStatus"/);
  assert.match(webmcp, /name: "createCase"/);
  assert.match(webmcp, /inputSchema/);
  assert.match(webmcp, /async execute/);
  assert.match(webmcp, /getCaseStatus\(input\.caseNumber/);
  assert.match(webmcp, /createCase\(/);

  assert.match(api, /fetch\(`\/api\/cases\/\$\{encodeURIComponent\(key\)\}`/);
  assert.match(api, /fetch\("\/api\/cases"/);
  assert.match(app, /listCases/);
  assert.doesNotMatch(webmcp, /name: "listCases"/);
  assert.doesNotMatch(api, /services\/data/);
  assert.doesNotMatch(api, /SF_CLIENT_SECRET/);
  assert.doesNotMatch(app, /SF_CLIENT_SECRET/);
  assert.doesNotMatch(webmcp, /SF_CLIENT_SECRET/);
});

test("server list query is a constant SOQL string", async () => {
  const src = await readFile(path.join(root, "lib", "salesforce-cases.js"), "utf8");
  assert.match(src, /const LIST_SOQL =/);
  assert.match(
    src,
    /FROM Case ORDER BY LastModifiedDate DESC LIMIT 20/,
  );
  assert.match(src, /queryCase\(LIST_SOQL\)/);
});
