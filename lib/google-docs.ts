import { google } from "googleapis";

// --------------------------------------------------------------------------
// Service Google Docs — Utilise le token OAuth de l'utilisateur
// --------------------------------------------------------------------------
// Au lieu d'un service account (qui n'a pas de quota Drive),
// on utilise le token de l'utilisateur connecte via Google OAuth.
// Les documents sont crees dans LE DRIVE DE L'UTILISATEUR.
// --------------------------------------------------------------------------

/**
 * Cree un Google Doc dans le Drive de l'utilisateur.
 */
export async function createGoogleDoc(params: {
  accessToken: string;
  title: string;
  templateContent?: string;
}): Promise<{ docId: string; url: string }> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: params.accessToken });

  const drive = google.drive({ version: "v3", auth });

  // 1. Creer le document via Drive API
  const file = await drive.files.create({
    requestBody: {
      name: params.title,
      mimeType: "application/vnd.google-apps.document",
    },
    fields: "id, webViewLink",
  });

  const docId = file.data.id!;
  const url = file.data.webViewLink ?? `https://docs.google.com/document/d/${docId}/edit`;

  // 2. Inserer le contenu template
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
 * Exporte le contenu d'un Google Doc en texte brut.
 */
export async function exportGoogleDoc(params: {
  accessToken: string;
  docId: string;
}): Promise<string> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: params.accessToken });

  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.export({
    fileId: params.docId,
    mimeType: "text/html",
  });

  return res.data as string;
}
