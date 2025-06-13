import { Secp256k1Keypair } from "npm:@atproto/crypto";
import * as ui8 from "npm:uint8arrays";
import type { Agent } from "@atproto/api";

/**
 * Handle identity migration sign
 * Should be called after user receives the migration token via email
 * URL params must contain the token
 * @param oldAgent - The old agent used for migration
 * @param newAgent - The new agent used for migration
 * @param token - The migration token received via email
 */
export default async function signIdentityMigration(
  oldAgent: Agent,
  newAgent: Agent,
  token: string,
) {
  // Generate recovery key
  const recoveryKey = await Secp256k1Keypair.create({ exportable: true });
  const privateKeyBytes = await recoveryKey.export();
  const privateKey = ui8.toString(privateKeyBytes, "hex");
  const recoveryKeyDid = recoveryKey.did();
  console.log("Generated recovery key and DID:", {
    hasPrivateKey: !!privateKey,
    recoveryDid: recoveryKeyDid,
  });

  // Get recommended credentials
  let credentials;
  try {
    const getDidCredentials = await newAgent.com.atproto.identity
      .getRecommendedDidCredentials();

    const rotationKeys = getDidCredentials.data.rotationKeys ?? [];
    if (!rotationKeys) {
      throw new Error("No rotation key provided");
    }

    // Prepare credentials with recovery key
    credentials = {
      ...getDidCredentials.data,
      rotationKeys: [recoveryKeyDid, ...rotationKeys],
    };
  } catch (error) {
    console.error("Error getting recommended credentials:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  // Sign and submit the operation
  const plcOp = await oldAgent.com.atproto.identity.signPlcOperation({
    token: token,
    ...credentials,
  });

  await newAgent.com.atproto.identity.submitPlcOperation({
    operation: plcOp.data.operation,
  });

  return {
    recoveryKeyDid,
    privateKey,
    recoveryKey,
  };
}
