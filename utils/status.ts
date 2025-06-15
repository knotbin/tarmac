import type { Agent, ComAtprotoServerCheckAccountStatus } from "@atproto/api";

function isReadyToContinue(
  step: string,
  newStatus: ComAtprotoServerCheckAccountStatus.OutputSchema,
  oldStatus: ComAtprotoServerCheckAccountStatus.OutputSchema
): {
  ready: boolean;
  reason?: string;
} {
  if (step) {
      switch (step) {
        default:
          return { ready: false, reason: "Invalid step" };
          case "1": {
              if (newStatus) {
                  return { ready: true };
              }
              return { ready: false, reason: "New account status not available" };
          }
          case "2": {
              if (newStatus.repoCommit &&
                  newStatus.indexedRecords === oldStatus.indexedRecords &&
                  newStatus.privateStateValues === oldStatus.privateStateValues &&
                  newStatus.expectedBlobs === newStatus.importedBlobs &&
                  newStatus.importedBlobs === oldStatus.importedBlobs) {
                  return { ready: true };
              }
              const reasons = [];
              if (!newStatus.repoCommit) reasons.push("Repository not imported.");
              if (newStatus.indexedRecords < oldStatus.indexedRecords)
                  reasons.push("Not all records imported.");
              if (newStatus.privateStateValues < oldStatus.privateStateValues)
                  reasons.push("Not all private state values imported.");
              if (newStatus.expectedBlobs !== newStatus.importedBlobs)
                  reasons.push("Expected blobs not fully imported.");
              if (newStatus.importedBlobs < oldStatus.importedBlobs)
                  reasons.push("Not all blobs imported.");
              return { ready: false, reason: reasons.join(", ") };
          }
          case "3": {
              if (newStatus.validDid) {
                  return { ready: true };
              }
              return { ready: false, reason: "DID not valid" };
          }
          case "4": {
              if (newStatus.activated === true && oldStatus.activated === false) {
                  return { ready: true };
              }
              return { ready: false, reason: "Account not activated" };
          }
      }
  } else {
      return { ready: true };
  }
}

export default async function checkStatus(oldAgent: Agent, newAgent: Agent, step: string) {
  const oldStatus = await oldAgent.com.atproto.server.checkAccountStatus();
  const newStatus = await newAgent.com.atproto.server.checkAccountStatus();
  if (!oldStatus.data || !newStatus.data) throw new Error("Could not verify status");

  const readyToContinue = isReadyToContinue(step, newStatus.data, oldStatus.data);

  return {
      activated: newStatus.data.activated,
      validDid: newStatus.data.validDid,
      repoCommit: newStatus.data.repoCommit,
      repoRev: newStatus.data.repoRev,
      repoBlocks: newStatus.data.repoBlocks,
      expectedRecords: oldStatus.data.indexedRecords,
      indexedRecords: newStatus.data.indexedRecords,
      privateStateValues: newStatus.data.privateStateValues,
      expectedBlobs: newStatus.data.expectedBlobs,
      importedBlobs: newStatus.data.importedBlobs,
      ...readyToContinue
  }
}
