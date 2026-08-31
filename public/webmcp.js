/**
 * WebMCP tool registration for the customer Case portal.
 *
 * Devpost / current spec pattern:
 *   document.modelContext.registerTool({ name, description, inputSchema, execute })
 *
 * Chrome 149+ (flag #enable-webmcp-testing) and ChatGPT's in-app browser
 * expose this on the page. navigator.modelContext is a deprecated alias
 * (removed in Chromium 150); we still feature-detect it so older preview
 * builds can register the same two tools.
 *
 * This file calls the real browser API. It does not polyfill registerTool.
 *
 * Spec: https://webmachinelearning.github.io/webmcp/
 * Chrome: https://developer.chrome.com/docs/ai/webmcp/imperative-api
 * OpenAI: https://learn.chatgpt.com/docs/webmcp
 */

import { createCase, getCaseStatus } from "./case-api.js";

export function getModelContext() {
  if (
    typeof document !== "undefined" &&
    document.modelContext &&
    typeof document.modelContext.registerTool === "function"
  ) {
    return { api: document.modelContext, source: "document.modelContext" };
  }
  if (
    typeof navigator !== "undefined" &&
    navigator.modelContext &&
    typeof navigator.modelContext.registerTool === "function"
  ) {
    return { api: navigator.modelContext, source: "navigator.modelContext" };
  }
  return null;
}

function statusResult(record) {
  return {
    caseNumber: record.caseNumber,
    status: record.status,
    lastModified: record.lastModified,
    owner: record.owner,
  };
}

export function toolDefinitions(onCaseShown) {
  return [
    {
      name: "getCaseStatus",
      title: "Get Case Status",
      description:
        "Look up a Case by Case Number on this customer Case portal. Use 00001001 for the Case already on this page. Returns Status, Last Modified (ISO-8601), and Owner, and updates the Case on this page to match.",
      inputSchema: {
        type: "object",
        properties: {
          caseNumber: {
            type: "string",
            description:
              "Case Number to look up, for example 00001001. Use the value shown on this page.",
          },
        },
        required: ["caseNumber"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      async execute(input, options = {}) {
        const record = await getCaseStatus(input.caseNumber, {
          signal: options.signal,
        });
        onCaseShown(record, "getCaseStatus");
        return statusResult(record);
      },
    },
    {
      name: "createCase",
      title: "Create Case",
      description:
        "File a new Case from this page. Provide a Subject and Description. Do not reuse Case Number 00001001; a new Case Number is assigned. The new Case appears on this screen. Status is New. Example: AC unit still leaking after a visit.",
      inputSchema: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description:
              "Short Subject, for example 'Indoor unit leaking after last visit'.",
          },
          description: {
            type: "string",
            description:
              "What happened, including location, timing after a service visit, and what the customer needs.",
          },
        },
        required: ["subject", "description"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      async execute(input, options = {}) {
        const created = await createCase(
          { subject: input.subject, description: input.description },
          { signal: options.signal },
        );
        const record = await getCaseStatus(created.caseNumber, {
          signal: options.signal,
        });
        onCaseShown(record, "createCase");
        return { caseNumber: created.caseNumber };
      },
    },
  ];
}

/**
 * Register the two Case tools with the browser's WebMCP surface.
 * Returns { ok, source, tools } or { ok: false, reason }.
 */
export async function registerCaseTools(onCaseShown) {
  const modelContext = getModelContext();
  if (!modelContext) {
    return {
      ok: false,
      reason:
        "This browser does not expose WebMCP. Open this URL in ChatGPT’s in-app browser, or Chrome 149+ with chrome://flags/#enable-webmcp-testing.",
    };
  }

  const tools = toolDefinitions(onCaseShown);
  const registered = [];

  for (const tool of tools) {
    await modelContext.api.registerTool({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
      execute: tool.execute,
    });
    registered.push(tool.name);
  }

  return { ok: true, source: modelContext.source, tools: registered };
}
