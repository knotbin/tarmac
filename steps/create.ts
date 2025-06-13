import { Agent } from "@atproto/api";

/**
 * Create new account with the desired credentials.
 * Uses the old account's service auth token to create the new account.
 * First step of the migration process
 * @param agent The old account agent object
 * @param service The service URL of the new account
 * @param handle The handle of the new account
 * @param password The password of the new account
 * @param email The email of the new account
 * @param invite The invite code of the new account (optional depending on the PDS)
 * @returns Agent object of the new account
 */
export default async function createMigration(
    agent: Agent,
    service: string,
    handle: string,
    password: string,
    email: string,
    invite: string,
  ) {
    const newAgent = new Agent({ service });
    if (!newAgent) {
        return new Response("Could not create new agent", { status: 400 });
    }
    const session = await agent.com.atproto.server.getSession();

    const accountDid = session.data.did;
    const describeRes = await newAgent.com.atproto.server.describeServer();
    const newServerDid = describeRes.data.did;
    const inviteRequired = describeRes.data.inviteCodeRequired ?? false;

    if (inviteRequired && !invite) {
      return new Response("Missing param invite code", { status: 400 });
    }

    const serviceJwtRes = await agent.com.atproto.server.getServiceAuth({
        aud: newServerDid,
        lxm: "com.atproto.server.createAccount",
    });
    const serviceJwt = serviceJwtRes.data.token;

    await newAgent.com.atproto.server.createAccount(
    {
        handle: handle,
        email: email,
        password: password,
        did: accountDid,
        inviteCode: invite ?? undefined,
    },
    {
        headers: { authorization: `Bearer ${serviceJwt}` },
        encoding: "application/json",
    },
    );

    return newAgent;
  }
