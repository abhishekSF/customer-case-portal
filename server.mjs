import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createApp } from "./lib/http-app.js";
import { createCaseService } from "./lib/case-service.js";

const PORT = Number(process.env.PORT) || 43147;
const HOST = process.env.HOST || "127.0.0.1";

const app = createApp(createCaseService());

app.get("/", serveStatic({ path: "./public/index.html" }));
app.use("/*", serveStatic({ root: "./public" }));

serve({ fetch: app.fetch, port: PORT, hostname: HOST }, (info) => {
  console.log(`customer Case portal http://${info.address}:${info.port}`);
});
