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

const EXTRA_SEEDS = Object.freeze([
  {
    caseNumber: "00001000",
    status: "New",
    lastModified: "2026-08-30T14:12:00.000Z",
    owner: "Web Queue",
    subject: "Indoor unit leaking after last visit",
    description:
      "The coil drain is overflowing onto the hallway floor after yesterday’s visit.",
    origin: "Web",
  },
  {
    caseNumber: "00000998",
    status: "Working",
    lastModified: "2026-08-28T11:05:00.000Z",
    owner: "Jordan Hale",
    subject: "Outdoor condenser icing overnight",
    description:
      "The backyard condenser iced over twice this week. Cooling drops off by morning.",
    origin: "Phone",
  },
  {
    caseNumber: "00000996",
    status: "Closed",
    lastModified: "2026-08-27T09:22:00.000Z",
    owner: "Priya Nair",
    subject: "Annual filter change completed",
    description:
      "Technician replaced the media filter and confirmed airflow. Customer asked to close.",
    origin: "Web",
  },
  {
    caseNumber: "00000994",
    status: "Escalated",
    lastModified: "2026-08-26T18:40:00.000Z",
    owner: "Maya Chen",
    subject: "No cooling on second floor after install",
    description:
      "Upstairs rooms never reached setpoint after the new air handler went in last Friday.",
    origin: "Phone",
  },
]);

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
  for (const seed of EXTRA_SEEDS) {
    cases.set(seed.caseNumber, cloneCase(seed));
  }
  let nextSerial = 1002;

  return {
    kind: "memory",

    listCases() {
      return [...cases.values()]
        .sort((a, b) => Date.parse(b.lastModified) - Date.parse(a.lastModified))
        .slice(0, 20)
        .map(statusPayload);
    },

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
