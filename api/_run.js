import { createApp } from "../lib/http-app.js";
import { createCaseService } from "../lib/case-service.js";

const app = createApp(createCaseService());

export async function runApi(req, res) {
  try {
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host || "localhost";
    let pathAndQuery = req.url || "/";
    if (!pathAndQuery.startsWith("/api")) {
      pathAndQuery = `/api${pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`}`;
    }
    const url = `${proto}://${host}${pathAndQuery}`;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
      }
    }
    const method = req.method || "GET";
    const init = { method, headers };
    if (method !== "GET" && method !== "HEAD") {
      if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
        init.body = JSON.stringify(req.body);
        if (!headers.get("content-type")) {
          headers.set("content-type", "application/json");
        }
      } else {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const body = Buffer.concat(chunks);
        if (body.length) {
          init.body = body;
        }
      }
    }
    if (init.body) {
      init.duplex = "half";
    }
    const response = await app.fetch(new Request(url, init));
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: "HANDLER_FAILED" }));
  }
}
