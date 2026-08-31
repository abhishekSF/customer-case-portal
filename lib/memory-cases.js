/**
 * In-memory Case store.
 *
 * Tool / handler names match the later host swap: getCaseStatus, createCase.
 * Field names match the REST contract (not the remote object names).
 */

const SEED_CASE_NUMBER = "00001001";

const SEED_CASE = Object.freeze({
  caseNumber: SEED_CASE_NUMBER,
  status: "Closed",
  lastModified: "2026-08-29T16:40:00.000Z",
  owner: "Priya Nair",
  subject: "Performance inadequate for second consecutive week",
  description:
    "Service levels stayed below the agreed baseline for a second consecutive week. The customer reviewed last Friday’s numbers and asked that this Case be closed.",
  origin: "Phone",
});

function padCaseNumber(n) {
  return String(n).padStart(8, "0");
}

function cloneCase(record) {
  return {
    caseNumber: record.caseNumber,
    status: record.status,
    lastModified: record.lastModified,
    owner: record.owner,
    subject: record.subject,
    description: record.description,
    origin: record.origin,
  };
}

export function statusPayload(record) {
  return {
    caseNumber: record.caseNumber,
    status: record.status,
    lastModified: record.lastModified,
    owner: record.owner,
    subject: record.subject,
    description: record.description,
  };
}

export class CaseNotFoundError extends Error {
  constructor(caseNumber) {
    super("CASE_NOT_FOUND");
    this.name = "CaseNotFoundError";
    this.code = "CASE_NOT_FOUND";
    this.caseNumber = caseNumber;
  }
}

export function createMemoryCaseStore(now = () => new Date().toISOString()) {
  const cases = new Map();
  cases.set(SEED_CASE_NUMBER, cloneCase(SEED_CASE));
  let nextSerial = 1002;

  return {
    kind: "memory",

    getCaseStatus(caseNumber) {
      const key = String(caseNumber ?? "").trim();
      const record = cases.get(key);
      if (!record) {
        throw new CaseNotFoundError(key);
      }
      return statusPayload(record);
    },

    createCase({ subject, description }) {
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

      const caseNumber = padCaseNumber(nextSerial);
      nextSerial += 1;
      const record = {
        caseNumber,
        status: "New",
        lastModified: now(),
        owner: "Web Queue",
        subject: trimmedSubject,
        description: trimmedDescription,
        origin: "Web",
      };
      cases.set(caseNumber, record);
      return { caseNumber };
    },
  };
}

export { SEED_CASE, SEED_CASE_NUMBER };
