/**
 * Host-side Case backend used only when SF_LOGIN_URL, SF_CLIENT_ID, and
 * SF_CLIENT_SECRET are set on the server. The browser never calls this
 * module and never sees the client secret.
 *
 * Same function names as the in-memory stub: getCaseStatus, createCase.
 * API v64.0. Create sets Origin=Web, Status=New.
 */

import { CaseNotFoundError, statusPayload } from "./memory-cases.js";

const API_VERSION = "v64.0";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function soqlString(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function mapRecord(row) {
  return statusPayload({
    caseNumber: row.CaseNumber,
    status: row.Status,
    lastModified: row.LastModifiedDate,
    owner: row.Owner?.Name ?? "",
    subject: row.Subject ?? "",
    description: row.Description ?? "",
  });
}

export function salesforceEnvPresent() {
  return Boolean(
    process.env.SF_LOGIN_URL &&
      process.env.SF_CLIENT_ID &&
      process.env.SF_CLIENT_SECRET,
  );
}

export function createSalesforceCaseStore() {
  const loginUrl = requiredEnv("SF_LOGIN_URL").replace(/\/$/, "");
  const clientId = requiredEnv("SF_CLIENT_ID");
  const clientSecret = requiredEnv("SF_CLIENT_SECRET");

  let tokenCache = null;

  async function getToken() {
    if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
      return tokenCache;
    }
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    });
    const response = await fetch(`${loginUrl}/services/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) {
      const error = new Error("TOKEN_REQUEST_FAILED");
      error.code = "TOKEN_REQUEST_FAILED";
      error.status = 502;
      throw error;
    }
    const json = await response.json();
    const issued = Number(json.issued_at) || Date.now();
    tokenCache = {
      accessToken: json.access_token,
      instanceUrl: json.instance_url,
      expiresAt: issued + 30 * 60 * 1000,
    };
    return tokenCache;
  }

  async function authedFetch(path, options = {}) {
    const token = await getToken();
    const response = await fetch(`${token.instanceUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        Accept: "application/json",
        ...(options.headers ?? {}),
      },
    });
    return response;
  }

  async function queryCase(soql) {
    const path = `/services/data/${API_VERSION}/query?q=${encodeURIComponent(soql)}`;
    const response = await authedFetch(path);
    if (!response.ok) {
      const error = new Error("QUERY_FAILED");
      error.code = "QUERY_FAILED";
      error.status = 502;
      throw error;
    }
    return response.json();
  }

  return {
    kind: "oauth",
    apiVersion: API_VERSION,

    async getCaseStatus(caseNumber) {
      const key = String(caseNumber ?? "").trim();
      if (!key) {
        throw new CaseNotFoundError(key);
      }
      const soql = [
        "SELECT CaseNumber, Status, LastModifiedDate, Owner.Name, Subject, Description",
        "FROM Case",
        `WHERE CaseNumber = '${soqlString(key)}'`,
        "LIMIT 1",
      ].join(" ");
      const result = await queryCase(soql);
      if (!result.totalSize || !result.records?.[0]) {
        throw new CaseNotFoundError(key);
      }
      return mapRecord(result.records[0]);
    },

    async createCase({ subject, description }) {
      const trimmedSubject = String(subject ?? "").trim();
      const trimmedDescription = String(description ?? "").trim();
      if (!trimmedSubject) {
        const error = new Error("SUBJECT_REQUIRED");
        error.code = "SUBJECT_REQUIRED";
        throw error;
      }
      if (!trimmedDescription) {
        const error = new Error("DESCRIPTION_REQUIRED");
        error.code = "DESCRIPTION_REQUIRED";
        throw error;
      }

      const createResponse = await authedFetch(
        `/services/data/${API_VERSION}/sobjects/Case`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Subject: trimmedSubject,
            Description: trimmedDescription,
            Status: "New",
            Origin: "Web",
          }),
        },
      );
      if (!createResponse.ok) {
        const error = new Error("CREATE_FAILED");
        error.code = "CREATE_FAILED";
        error.status = 502;
        throw error;
      }
      const created = await createResponse.json();
      const soql = [
        "SELECT CaseNumber, Status, LastModifiedDate, Owner.Name, Subject, Description",
        "FROM Case",
        `WHERE Id = '${soqlString(created.id)}'`,
        "LIMIT 1",
      ].join(" ");
      const result = await queryCase(soql);
      const row = result.records?.[0];
      if (!row?.CaseNumber) {
        const error = new Error("CREATE_FAILED");
        error.code = "CREATE_FAILED";
        error.status = 502;
        throw error;
      }
      return { caseNumber: row.CaseNumber };
    },
  };
}
