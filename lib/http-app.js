import { Hono } from "hono";
import { CaseNotFoundError } from "./memory-cases.js";

function jsonError(c, status, code, extra = {}) {
  return c.json({ error: code, ...extra }, status);
}

async function readJson(c) {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

/**
 * Same-origin Case API used by the page and by the two WebMCP tools.
 *
 * GET  /api/cases              → list recent Cases { cases: [...] }
 * GET  /api/cases/:caseNumber  → getCaseStatus
 * POST /api/cases              → createCase { subject, description }
 *
 * The list is not a WebMCP tool. Tools stay getCaseStatus and createCase.
 */
export function createApp(service) {
  const app = new Hono();

  app.get("/api/health", (c) =>
    c.json({
      ok: true,
      store: service.kind,
    }),
  );

  app.get("/api/cases", async (c) => {
    try {
      const cases = await service.listCases();
      return c.json({ cases });
    } catch (error) {
      console.error("listCases failed", error.code ?? error.message);
      return jsonError(c, error.status ?? 500, error.code ?? "LIST_FAILED");
    }
  });

  app.get("/api/cases/:caseNumber", async (c) => {
    try {
      const record = await service.getCaseStatus(c.req.param("caseNumber"));
      return c.json(record);
    } catch (error) {
      if (error instanceof CaseNotFoundError || error.code === "CASE_NOT_FOUND") {
        return jsonError(c, 404, "CASE_NOT_FOUND", {
          caseNumber: error.caseNumber ?? c.req.param("caseNumber"),
        });
      }
      console.error("getCaseStatus failed", error.code ?? error.message);
      return jsonError(c, error.status ?? 500, error.code ?? "LOOKUP_FAILED");
    }
  });

  app.post("/api/cases", async (c) => {
    const body = await readJson(c);
    try {
      const created = await service.createCase({
        subject: body.subject,
        description: body.description,
      });
      return c.json(created, 201);
    } catch (error) {
      if (error.code === "SUBJECT_REQUIRED" || error.code === "DESCRIPTION_REQUIRED") {
        return jsonError(c, 400, error.code);
      }
      console.error("createCase failed", error.code ?? error.message);
      return jsonError(c, error.status ?? 500, error.code ?? "CREATE_FAILED");
    }
  });

  return app;
}
