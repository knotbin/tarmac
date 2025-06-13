import type { Agent } from "@atproto/api";

export default async function finalizeMigration(
  oldAgent: Agent,
  newAgent: Agent,
) {
  await newAgent.com.atproto.server.activateAccount();
  await oldAgent.com.atproto.server.deactivateAccount({});
}
