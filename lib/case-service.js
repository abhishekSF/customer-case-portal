import { createMemoryCaseStore } from "./memory-cases.js";
import {
  createSalesforceCaseStore,
  salesforceEnvPresent,
} from "./salesforce-cases.js";

/**
 * Pick the Case backend from host env. The page and registerTool stay the same.
 * Without SF_* env vars this is the in-memory stub.
 */
export function createCaseService() {
  if (salesforceEnvPresent()) {
    return createSalesforceCaseStore();
  }
  return createMemoryCaseStore();
}
