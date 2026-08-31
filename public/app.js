import { createCase, getCaseStatus, listCases } from "./case-api.js";
import { registerCaseTools } from "./webmcp.js";

const SEED = "00001001";

const fields = {
  caseNumber: document.getElementById("field-caseNumber"),
  status: document.getElementById("field-status"),
  lastModified: document.getElementById("field-lastModified"),
  owner: document.getElementById("field-owner"),
  subject: document.getElementById("field-subject"),
  description: document.getElementById("field-description"),
};

const ticket = document.getElementById("ticket");
const caseFields = document.getElementById("case-fields");
const caseState = document.getElementById("case-state");
const caseList = document.getElementById("case-list");
const listEmpty = document.getElementById("list-empty");
const statusLine = document.getElementById("webmcp-status");
const form = document.getElementById("new-case-form");
const lookupForm = document.getElementById("lookup-form");
const formMessage = document.getElementById("form-message");
const lookupMessage = document.getElementById("lookup-message");

const sessionCases = new Map();
let selectedNumber = null;

function formatLastModified(iso) {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusKey(status) {
  return String(status || "")
    .trim()
    .toLowerCase();
}

function makeChip(status) {
  const chip = document.createElement("span");
  chip.className = "chip";
  chip.dataset.status = statusKey(status);
  chip.textContent = status || "";
  return chip;
}

function remember(record) {
  sessionCases.set(record.caseNumber, record);
}

function listedCases() {
  return [...sessionCases.values()].sort((a, b) => {
    const tb = Date.parse(b.lastModified) || 0;
    const ta = Date.parse(a.lastModified) || 0;
    return tb - ta;
  });
}

function renderList() {
  caseList.replaceChildren();
  const records = listedCases();
  listEmpty.hidden = records.length > 0;
  listEmpty.textContent = records.length > 0 ? "" : "No Cases.";
  for (const record of records) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.caseNumber = record.caseNumber;
    if (record.caseNumber === selectedNumber) {
      button.setAttribute("aria-current", "true");
    }
    const title = document.createElement("span");
    title.className = "case-number";
    title.textContent = record.caseNumber;
    const status = makeChip(record.status);
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = record.subject || "No subject";
    const when = document.createElement("span");
    when.className = "when";
    when.textContent = formatLastModified(record.lastModified);
    button.append(title, status, when, meta);
    button.addEventListener("click", () => showCase(record));
    item.append(button);
    caseList.append(item);
  }
  const selected = caseList.querySelector('button[aria-current="true"]');
  selected?.scrollIntoView({ block: "nearest" });
}

function flashTicket() {
  ticket.classList.remove("is-in");
  ticket.classList.add("is-prep");
  requestAnimationFrame(() => {
    ticket.classList.remove("is-prep");
    ticket.classList.add("is-in");
  });
}

function showCase(record, via) {
  remember(record);
  selectedNumber = record.caseNumber;
  caseState.hidden = true;
  caseFields.hidden = false;
  fields.caseNumber.textContent = record.caseNumber;
  fields.status.replaceChildren(makeChip(record.status));
  fields.lastModified.textContent = formatLastModified(record.lastModified);
  fields.owner.textContent = record.owner;
  fields.subject.textContent = record.subject || "—";
  fields.description.textContent = record.description || "—";
  flashTicket();
  renderList();
  if (via) {
    caseState.hidden = false;
    caseState.textContent =
      via === "createCase"
        ? `New Case ${record.caseNumber} is on this page.`
        : `Showing Case ${record.caseNumber}.`;
  }
}

function showError(message) {
  caseFields.hidden = true;
  caseState.hidden = false;
  caseState.textContent = message;
}

function setMessage(el, text, kind) {
  el.textContent = text;
  if (kind) {
    el.dataset.kind = kind;
  } else {
    delete el.dataset.kind;
  }
}

async function refreshList(signal) {
  const cases = await listCases({ signal });
  for (const record of cases) {
    remember(record);
  }
  renderList();
  return cases;
}

async function loadPage() {
  try {
    const cases = await refreshList();
    const preferred =
      sessionCases.get(SEED) ?? cases[0] ?? [...sessionCases.values()][0];
    if (preferred) {
      showCase(preferred);
    } else {
      listEmpty.hidden = false;
      listEmpty.textContent = "No Cases.";
      showError("No Cases.");
    }
  } catch {
    listEmpty.hidden = false;
    listEmpty.textContent = "Could not load Cases.";
    showError("Could not load Cases.");
  }
}

lookupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const caseNumber = document.getElementById("input-caseNumber").value;
  const submit = lookupForm.querySelector("button[type='submit']");
  submit.disabled = true;
  setMessage(lookupMessage, "Looking up…");
  try {
    const record = await getCaseStatus(caseNumber);
    remember(record);
    showCase(record, "getCaseStatus");
    setMessage(lookupMessage, `Showing Case ${record.caseNumber}.`, "ok");
  } catch (error) {
    setMessage(
      lookupMessage,
      error.code === "CASE_NOT_FOUND"
        ? `Case ${String(caseNumber).trim()} was not found.`
        : error.message || "Could not look up the Case.",
      "error",
    );
  } finally {
    submit.disabled = false;
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const subject = document.getElementById("input-subject").value;
  const description = document.getElementById("input-description").value;
  const submit = form.querySelector("button[type='submit']");
  submit.disabled = true;
  setMessage(formMessage, "Filing Case…");
  try {
    const created = await createCase({ subject, description });
    try {
      await refreshList();
    } catch {
      // Keep the filed Case on the page even if the list refresh fails.
    }
    const record = await getCaseStatus(created.caseNumber);
    showCase(record, "createCase");
    form.reset();
    setMessage(formMessage, `Filed Case ${created.caseNumber}.`, "ok");
  } catch (error) {
    setMessage(formMessage, error.message || "Could not file the Case.", "error");
  } finally {
    submit.disabled = false;
  }
});

registerCaseTools(async (record, via) => {
  remember(record);
  if (via === "createCase") {
    try {
      await refreshList();
    } catch {
      // The new Case is already remembered.
    }
  }
  showCase(record, via);
})
  .then((result) => {
    if (result.ok) {
      statusLine.dataset.state = "ready";
      statusLine.textContent = `getCaseStatus + createCase · ${result.source}`;
    } else {
      statusLine.dataset.state = "missing";
      statusLine.textContent = result.reason;
    }
  })
  .catch((error) => {
    statusLine.dataset.state = "error";
    statusLine.textContent = `Could not register tools: ${error.message}`;
  });

loadPage();
