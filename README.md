# customer Case portal

One screen for Harbor Comfort customers. Keep it open. ChatGPT’s in-app browser (or Chrome 149+ with `chrome://flags/#enable-webmcp-testing`) can read Case **00001001** and file a new Case with the same two tools the page uses.

**Live URL:** https://customer-case-portal.vercel.app

Public GitHub copy (Devpost / Vercel Hobby): https://github.com/abhishekSF/customer-case-portal

Origin remains the source of truth. GitHub is the public copy, not a replacement.

The durable host is Salesforce-backed: same-origin `/api/cases` on the server uses OAuth `client_credentials`. The browser never holds the client secret and never calls Salesforce REST.

## Run locally

```bash
npm install
npm start
```

Open http://127.0.0.1:43147

```bash
npm test
```

On load the page GETs `/api/cases/00001001` and shows Case Number, Status, Last Modified, Owner, Subject, and Description.

Local `npm start` uses an in-memory Case stub when those host credentials are absent. That local stub is not the live host.

## WebMCP tools

Two tools, registered with the browser API:

```js
document.modelContext.registerTool({ name, description, inputSchema, execute })
```

If a preview browser still exposes `navigator.modelContext` instead, registration uses that. There is no fake `registerTool`.

| Tool | Input | Output | Page |
| --- | --- | --- | --- |
| `getCaseStatus` | `caseNumber` | `caseNumber`, `status`, `lastModified` (ISO-8601), `owner` | Case panel updates to match |
| `createCase` | `subject`, `description` | `caseNumber` | New Case appears on the page |

Both tools call same-origin `/api/cases/...` from the page. They do not call a third-party REST API from the browser.

Try in ChatGPT’s browser: open the live URL, ask it to read Case 00001001, then file a Case about a leaking indoor unit after the last visit.

## Same-origin API

On the live URL, `GET /api/cases/:caseNumber` and `POST /api/cases` run on the server against Salesforce. Case `00001001` is a real Salesforce Case. Unknown numbers return `404 { "error": "CASE_NOT_FOUND" }`. `POST /api/cases` with `{ "subject", "description" }` returns a **new** `{ "caseNumber" }` (never reused `00001001`). Stored Status is `New`, Origin is `Web`.

`npm start` serves the page and `/api/cases` together (default `http://127.0.0.1:43147`). Without host credentials that local process uses the in-memory stub, including seed Case `00001001` (Closed, subject “Performance inadequate for second consecutive week”).

## License

MIT. See `LICENSE`.
