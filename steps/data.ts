import type { Agent, ComAtprotoSyncGetBlob } from "npm:@atproto/api";

/**
 * Handle blob upload to new PDS
 * For one individual blob
 * @param newAgent - The new agent
 * @param blobRes - The blob response
 * @param cid - The CID of the blob
 */
async function handleBlobUpload(
  newAgent: Agent,
  blobRes: ComAtprotoSyncGetBlob.Response,
  cid: string,
  maxSize: number = 95 * 1024 * 1024,
) {
  try {
    const contentLength = parseInt(blobRes.headers["content-length"] || "0", 10);
    const contentType = blobRes.headers["content-type"];
    
    if (contentLength > maxSize) {
      throw new Error(`Blob ${cid} exceeds maximum size limit (${contentLength} bytes)`);
    }

    await newAgent.com.atproto.repo.uploadBlob(blobRes.data, {
      encoding: contentType,
    });
  } catch (error) {
    console.error(`Failed to upload blob ${cid}:`, error);
    throw error;
  }
}

/**
 * Handle data migration
 * For all blobs, records, and preferences in the old PDS
 * @param oldAgent - The old agent
 * @param newAgent - The new agent
 */
export async function migrateData(
    oldAgent: Agent,
    newAgent: Agent
) {
    const session = await oldAgent.com.atproto.server.getSession();
    const accountDid = session.data.did;

    const repoRes = await oldAgent.com.atproto.sync.getRepo({
        did: accountDid,
    });

    await newAgent.com.atproto.repo.importRepo(repoRes.data, {
        encoding: "application/vnd.ipld.car",
    });

    // Migrate blobs with enhanced error handling
    let blobCursor: string | undefined = undefined;
    const migratedBlobs: string[] = [];
    const failedBlobs: Array<{ cid: string; error: string }> = [];

    do {
      try {
        const listedBlobs = await oldAgent.com.atproto.sync.listBlobs({
            did: accountDid,
            cursor: blobCursor,
        });

        for (const cid of listedBlobs.data.cids) {
          try {
            const blobRes = await oldAgent.com.atproto.sync.getBlob({
                did: accountDid,
                cid,
            });

            await handleBlobUpload(newAgent, blobRes, cid);
            migratedBlobs.push(cid);
            console.log(`Successfully migrated blob: ${cid}`);
          } catch (error) {
            console.error(`Failed to migrate blob ${cid}:`, error);
            failedBlobs.push({
              cid,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        blobCursor = listedBlobs.data.cursor;
      } catch (error) {
        console.error("Error during blob migration batch:", error);
        // If we hit a critical error during blob listing, break the loop
        if (error instanceof Error && 
           (error.message.includes("Unauthorized") || 
            error.message.includes("Invalid token"))) {
          throw error;
        }
        break;
      }
    } while (blobCursor);

    const prefs = await oldAgent.app.bsky.actor.getPreferences();

    await newAgent.app.bsky.actor.putPreferences(prefs.data);
}