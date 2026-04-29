import { google } from "googleapis";

// --------------------------------------------------------------------------
// Service Google Docs — Creation et gestion de documents
// --------------------------------------------------------------------------
// Utilise un Service Account + API Drive pour creer des Google Docs.
// L'API Drive est utilisee pour la creation (plus fiable que l'API Docs
// avec un service account) puis l'API Docs pour inserer du contenu.
// --------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let authClient: any = null;

function getAuth() {
  if (authClient) return authClient;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!email || !key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL ou GOOGLE_SERVICE_ACCOUNT_KEY manquant");
  }

  // Railway peut stocker la cle avec des \n litteraux
  if (key.includes("\\n")) {
    key = key.replace(/\\n/g, "\n");
  }

  authClient = new google.auth.JWT({
    email,
    key,
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/documents",
    ],
  });

  return authClient;
}

/**
 * Cree un Google Doc via l'API Drive (plus fiable avec service account).
 */
export async function createGoogleDoc(params: {
  title: string;
  shareWithEmail?: string;
  folderId?: string;
  templateContent?: string;
}): Promise<{ docId: string; url: string }> {
  const auth = getAuth();

  // Autoriser le client d'abord
  await auth.authorize();

  const drive = google.drive({ version: "v3", auth });

  // 1. Creer le document via Drive API (MIME type Google Doc)
  const file = await drive.files.create({
    requestBody: {
      name: params.title,
      mimeType: "application/vnd.google-apps.document",
      parents: [params.folderId ?? process.env.GOOGLE_DRIVE_FOLDER_ID ?? ""].filter(Boolean),
    },
    fields: "id, webViewLink",
  });

  const docId = file.data.id!;
  const url = file.data.webViewLink ?? `https://docs.google.com/document/d/${docId}/edit`;

  // 2. Partager avec l'utilisateur
  if (params.shareWithEmail) {
    try {
      await drive.permissions.create({
        fileId: docId,
        requestBody: {
          type: "user",
          role: "writer",
          emailAddress: params.shareWithEmail,
        },
        sendNotificationEmail: false,
      });
    } catch (e) {
      console.warn("Could not share with user:", e);
    }
  }

  // 3. Rendre accessible via lien (anyone with link can edit)
  try {
    await drive.permissions.create({
      fileId: docId,
      requestBody: {
        type: "anyone",
        role: "writer",
      },
    });
  } catch (e) {
    console.warn("Could not set public access:", e);
  }

  // 4. Inserer le contenu template via Docs API
  if (params.templateContent) {
    try {
      const docs = google.docs({ version: "v1", auth });
      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: {
          requests: [{
            insertText: {
              location: { index: 1 },
              text: params.templateContent,
            },
          }],
        },
      });
    } catch (e) {
      console.warn("Could not insert template:", e);
    }
  }

  return { docId, url };
}

/**
 * Cree un dossier Google Drive pour un projet.
 */
export async function createProjectFolder(projetTitre: string): Promise<string> {
  const auth = getAuth();
  await auth.authorize();
  const drive = google.drive({ version: "v3", auth });

  const folder = await drive.files.create({
    requestBody: {
      name: projetTitre,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  await drive.permissions.create({
    fileId: folder.data.id!,
    requestBody: { type: "anyone", role: "writer" },
  });

  return folder.data.id!;
}

export function isGoogleDocsConfigured(): boolean {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
}
