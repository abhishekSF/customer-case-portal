import { createCase, getCaseStatus } from "./case-api.js";
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

const caseFields = document.getElementById("case-fields");
const caseState = document.getElementById("case-state");
const caseList = document.getElementById("case-list");
const statusLine = document.getElementById("webmcp-status");
const form = document.getElementById("new-case-form");
const formMessage = document.getElementById("form-message");

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

function remember(record) {
  sessionCases.set(record.caseNumber, record);
}

function renderList() {
  caseList.replaceChildren();
  const numbers = [...sessionCases.keys()].sort();
  for (const number of numbers) {
    const record = sessionCases.get(number);
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.caseNumber = number;
    if (number === selectedNumber) {
      button.setAttribute("aria-current", "true");
    }
    const title = document.createElement("span");
    title.textContent = record.caseNumber;
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = `${record.status} · ${record.subject || "No subject"}`;
    button.append(title, meta);
    button.addEventListener("click", () => showCase(record));
    item.append(button);
    caseList.append(item);
  }
}

function showCase(record, via) {
  remember(record);
  selectedNumber = record.caseNumber;
  caseState.hidden = true;
  caseFields.hidden = false;
  fields.caseNumber.textContent = record.caseNumber;
  fields.status.textContent = record.status;
  fields.lastModified.textContent = formatLastModified(record.lastModified);
  fields.owner.textContent = record.owner;
  fields.subject.textContent = record.subject || "—";
  fields.description.textContent = record.description || "—";
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

function setFormMessage(text, kind) {
  formMessage.textContent = text;
  if (kind) {
    formMessage.dataset.kind = kind;
  } else {
    delete formMessage.dataset.kind;
  }
}

async function loadSeed() {
  try {
    const record = await getCaseStatus(SEED);
    showCase(record);
  } catch (error) {
    showError(
      error.code === "CASE_NOT_FOUND"
        ? "Case 00001001 was not found."
        : "Could not load Case 00001001.",
    );
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const subject = document.getElementById("input-subject").value;
  const description = document.getElementById("input-description").value;
  const submit = form.querySelector("button[type='submit']");
  submit.disabled = true;
  setFormMessage("Filing Case…");
  try {
    const created = await createCase({ subject, description });
    const record = await getCaseStatus(created.caseNumber);
    showCase(record, "createCase");
    form.reset();
    setFormMessage(`Filed Case ${created.caseNumber}.`, "ok");
  } catch (error) {
    setFormMessage(error.message || "Could not file the Case.", "error");
  } finally {
    submit.disabled = false;
  }
});

registerCaseTools(showCase)
  .then((result) => {
    if (result.ok) {
      statusLine.dataset.state = "ready";
      statusLine.textContent = `Tools registered with ${result.source}: ${result.tools.join(", ")}.`;
    } else {
      statusLine.dataset.state = "missing";
      statusLine.textContent = result.reason;
    }
  })
  .catch((error) => {
    statusLine.dataset.state = "error";
    statusLine.textContent = `Could not register tools: ${error.message}`;
  });

loadSeed();
