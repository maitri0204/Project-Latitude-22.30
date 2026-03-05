import axios from "axios";
import fs from "fs";

// ─── Env vars read lazily inside functions (dotenv loads after module init) ──

const cfg = () => ({
  tenantId:    process.env.ONEDRIVE_TENANT_ID!,
  clientId:    process.env.ONEDRIVE_CLIENT_ID!,
  clientSecret: process.env.ONEDRIVE_CLIENT_SECRET!,
  user:        process.env.ONEDRIVE_USER_EMAIL!,
  folder:      process.env.ONEDRIVE_FOLDER || "LMS/Videos",
});

// ─── Token cache (tokens are valid for 1 hour) ───────────────────────────────

let tokenCache: { token: string; expiresAt: number } | null = null;

export const getGraphToken = async (): Promise<string> => {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }

  const { tenantId, clientId, clientSecret } = cfg();
  const response = await axios.post(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  tokenCache = {
    token: response.data.access_token,
    expiresAt: Date.now() + response.data.expires_in * 1000,
  };

  return tokenCache.token;
};

// ─── Upload a local file to OneDrive via resumable upload session ─────────────
// Returns the OneDrive item ID.

export const uploadToOneDrive = async (
  localPath: string,
  fileName: string
): Promise<string> => {
  const token = await getGraphToken();
  const { user, folder } = cfg();
  const stat = fs.statSync(localPath);
  const fileSize = stat.size;

  // ── Create an upload session ──────────────────────────────────────────────
  let uploadUrl: string;
  try {
    const sessionResponse = await axios.post(
      `https://graph.microsoft.com/v1.0/users/${user}/drive/root:/${folder}/${fileName}:/createUploadSession`,
      { item: { "@microsoft.graph.conflictBehavior": "rename", name: fileName } },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
    uploadUrl = sessionResponse.data.uploadUrl;
  } catch (err: any) {
    const detail = JSON.stringify(err.response?.data ?? err.message);
    throw new Error(`Upload session creation failed (${err.response?.status ?? "network"}): ${detail}`);
  }

  // Upload in 5 MB chunks (must be a multiple of 320 KB — 5 MB = 16 × 320 KB ✓)
  const chunkSize = 5 * 1024 * 1024;
  let offset = 0;
  let itemId = "";

  const fd = fs.openSync(localPath, "r");
  try {
    while (offset < fileSize) {
      const end = Math.min(offset + chunkSize - 1, fileSize - 1);
      const chunkLength = end - offset + 1;

      const chunk = Buffer.alloc(chunkLength);
      fs.readSync(fd, chunk, 0, chunkLength, offset);

      const chunkResponse = await axios.put(uploadUrl, chunk, {
        headers: {
          "Content-Range": `bytes ${offset}-${end}/${fileSize}`,
          "Content-Length": String(chunkLength),
          "Content-Type": "application/octet-stream",
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        validateStatus: (s) => s >= 200 && s < 300,
      }).catch((err: any) => {
        const detail = JSON.stringify(err.response?.data ?? err.message);
        throw new Error(`Chunk upload failed at bytes ${offset}-${end} (${err.response?.status ?? "network"}): ${detail}`);
      });

      if (chunkResponse.data?.id) {
        itemId = chunkResponse.data.id;
      }

      offset = end + 1;
    }
  } finally {
    fs.closeSync(fd);
  }

  if (!itemId) {
    throw new Error("OneDrive upload completed but returned no item ID — upload may have failed silently.");
  }

  return itemId;
};

// ─── Get a fresh pre-authenticated download URL for a given OneDrive item ────

export interface OneDriveItemInfo {
  downloadUrl: string;
  size: number;
  mimeType: string;
}

export const getOneDriveItemInfo = async (
  itemId: string
): Promise<OneDriveItemInfo> => {
  const token = await getGraphToken();
  const { user } = cfg();

  const response = await axios.get(
    `https://graph.microsoft.com/v1.0/users/${user}/drive/items/${itemId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      params: { select: "@microsoft.graph.downloadUrl,size,file" },
    }
  );

  return {
    downloadUrl: response.data["@microsoft.graph.downloadUrl"],
    size: response.data.size,
    mimeType: response.data.file?.mimeType || "video/mp4",
  };
};
