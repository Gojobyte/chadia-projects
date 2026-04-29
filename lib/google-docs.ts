import { google } from "googleapis";

// --------------------------------------------------------------------------
// Service Google Docs — Creation et gestion de documents
// --------------------------------------------------------------------------
// Utilise un Service Account pour creer des Google Docs
// et les partager avec les membres de l'equipe.
//
// Variables d'environnement requises :
// - GOOGLE_SERVICE_ACCOUNT_EMAIL : email du service account
// - GOOGLE_SERVICE_ACCOUNT_KEY : cle privee (format PEM)
// - GOOGLE_DRIVE_FOLDER_ID : ID du dossier Drive parent (optionnel)
// --------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let authClient: any = null;

function getAuth() {
  if (authClient) return authClient;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error("Google Service Account non configure (GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_KEY)");
  }

  authClient = new google.auth.JWT({
    email,
    key,
    scopes: [
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/drive",
    ],
  });

  return authClient;
}

/**
 * Cree un nouveau Google Doc et le partage avec un email.
 * Retourne l'URL du document.
 */
export async function createGoogleDoc(params: {
  title: string;
  shareWithEmail?: string;
  folderId?: string;
  templateContent?: string;
}): Promise<{ docId: string; url: string }> {
  const auth = getAuth();
  const docs = google.docs({ version: "v1", auth });
  const drive = google.drive({ version: "v3", auth });

  // 1. Creer le document
  const doc = await docs.documents.create({
    requestBody: { title: params.title },
  });

  const docId = doc.data.documentId!;

  // 2. Deplacer dans le dossier si specifie
  const folderId = params.folderId ?? process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (folderId) {
    const file = await drive.files.get({ fileId: docId, fields: "parents" });
    const previousParents = file.data.parents?.join(",") ?? "";
    await drive.files.update({
      fileId: docId,
      addParents: folderId,
      removeParents: previousParents,
      fields: "id, parents",
    });
  }

  // 3. Partager avec l'utilisateur
  if (params.shareWithEmail) {
    await drive.permissions.create({
      fileId: docId,
      requestBody: {
        type: "user",
        role: "writer",
        emailAddress: params.shareWithEmail,
      },
      sendNotificationEmail: false,
    });
  }

  // 4. Rendre accessible a toute l'organisation (lien partage)
  await drive.permissions.create({
    fileId: docId,
    requestBody: {
      type: "anyone",
      role: "writer",
    },
  });

  // 5. Inserer le contenu template si fourni
  if (params.templateContent) {
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: params.templateContent,
            },
          },
        ],
      },
    });
  }

  return {
    docId,
    url: `https://docs.google.com/document/d/${docId}/edit`,
  };
}

/**
 * Cree un dossier Google Drive pour un projet.
 */
export async function createProjectFolder(projetTitre: string): Promise<string> {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  const folder = await drive.files.create({
    requestBody: {
      name: projetTitre,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentFolderId ? [parentFolderId] : undefined,
    },
    fields: "id",
  });

  // Partager le dossier
  await drive.permissions.create({
    fileId: folder.data.id!,
    requestBody: { type: "anyone", role: "writer" },
  });

  return folder.data.id!;
}

/**
 * Verifie si Google Docs est configure.
 */
export function isGoogleDocsConfigured(): boolean {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
}
