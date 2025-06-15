import type { Agent } from "@atproto/api";

export default async function getNextStep(oldAgent: Agent, newAgent?: Agent) {
  let nextStep = null;

  if (!newAgent) return Response.json({ nextStep: 1, completed: false });

  const oldStatus = await oldAgent.com.atproto.server.checkAccountStatus();
  const newStatus = await newAgent.com.atproto.server.checkAccountStatus();
  if (!oldStatus.data || !newStatus.data) return new Response("Could not verify status", { status: 500 });

  // Check conditions in sequence to determine the next step
  if (!newStatus.data) {
      nextStep = 1;
  } else if (!(newStatus.data.repoCommit &&
             newStatus.data.indexedRecords === oldStatus.data.indexedRecords &&
             newStatus.data.privateStateValues === oldStatus.data.privateStateValues &&
             newStatus.data.expectedBlobs === newStatus.data.importedBlobs &&
             newStatus.data.importedBlobs === oldStatus.data.importedBlobs)) {
      nextStep = 2;
  } else if (!newStatus.data.validDid) {
      nextStep = 3;
  } else if (!(newStatus.data.activated === true && oldStatus.data.activated === false)) {
      nextStep = 4;
  }

  return {
      nextStep,
      completed: nextStep === null,
      currentStatus: {
          activated: newStatus.data.activated,
          validDid: newStatus.data.validDid,
          repoCommit: newStatus.data.repoCommit,
          indexedRecords: newStatus.data.indexedRecords,
          privateStateValues: newStatus.data.privateStateValues,
          importedBlobs: newStatus.data.importedBlobs
      }
  };
}
