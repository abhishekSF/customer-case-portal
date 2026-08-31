import { createApp } from "./lib/http-app.js";
import { createCaseService } from "./lib/case-service.js";

const app = createApp(createCaseService());

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return app.fetch(request);
    }
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response("Not found", { status: 404 });
  },
};
