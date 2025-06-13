import type { Agent } from "@atproto/api";

/**
 * Handle identity migration request
 * Sends a PLC operation signature request to the old account's email
 * Should be called after all data is migrated to the new account
 * @param oldAgent - The agent of the old account, authenticated
 * @throws Error if fails to make the PLC operation signature request
 */
export default async function requestIdentityMigration(oldAgent: Agent) {
  try {
    await oldAgent.com.atproto.identity.requestPlcOperationSignature();
  } catch (error) {
    console.error("Error requesting PLC operation signature:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      status: 400,
    });
    throw error;
  }
}
