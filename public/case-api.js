/**
 * Same-origin Case client. The page and WebMCP tools both use these
 * functions. They never call a remote Case API from the browser.
 */

async function readBody(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export async function listCases(options = {}) {
  const response = await fetch("/api/cases", {
    signal: options.signal,
    headers: { Accept: "application/json" },
  });
  const body = await readBody(response);
  if (!response.ok) {
    const error = new Error(body.error || "LIST_FAILED");
    error.code = body.error || "LIST_FAILED";
    throw error;
  }
  const rows = Array.isArray(body.cases) ? body.cases : [];
  return rows.map((row) => ({
    caseNumber: row.caseNumber,
    status: row.status,
    lastModified: row.lastModified,
    owner: row.owner,
    subject: row.subject ?? "",
    description: row.description ?? "",
  }));
}

export async function getCaseStatus(caseNumber, options = {}) {
  const key = String(caseNumber ?? "").trim();
  const response = await fetch(`/api/cases/${encodeURIComponent(key)}`, {
    signal: options.signal,
    headers: { Accept: "application/json" },
  });
  const body = await readBody(response);
  if (response.status === 404 || body.error === "CASE_NOT_FOUND") {
    const error = new Error("CASE_NOT_FOUND");
    error.code = "CASE_NOT_FOUND";
    error.caseNumber = key;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(body.error || "LOOKUP_FAILED");
    error.code = body.error || "LOOKUP_FAILED";
    throw error;
  }
  return {
    caseNumber: body.caseNumber,
    status: body.status,
    lastModified: body.lastModified,
    owner: body.owner,
    subject: body.subject ?? "",
    description: body.description ?? "",
  };
}

export async function createCase({ subject, description }, options = {}) {
  const response = await fetch("/api/cases", {
    method: "POST",
    signal: options.signal,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ subject, description }),
  });
  const body = await readBody(response);
  if (!response.ok) {
    const error = new Error(body.error || "CREATE_FAILED");
    error.code = body.error || "CREATE_FAILED";
    throw error;
  }
  return { caseNumber: body.caseNumber };
}
