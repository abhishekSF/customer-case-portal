import { createApp } from "../../lib/http-app.js";
import { createCaseService } from "../../lib/case-service.js";

const app = createApp(createCaseService());

export default async function handler(request) {
  return app.fetch(request);
}

export const config = {
  path: ["/api/health", "/api/cases", "/api/cases/:caseNumber"],
};
