// ============================================================================
// FIREBASE ADMIN (lado del servidor / API routes)
// Usa credenciales de cuenta de servicio en este orden:
//   1) Archivo service-account.json en la raíz del proyecto (desarrollo).
//   2) Variables FIREBASE_ADMIN_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY (.env).
//   3) En entornos gestionados (Cloud Run/Functions), credenciales por defecto.
// ============================================================================
import * as fs from "fs";
import * as path from "path";
import {
  initializeApp,
  getApps,
  cert,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

function loadServiceAccount(): {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
} | null {
  // 1) service-account.json en la raíz (desarrollo local).
  try {
    const candidates = [
      path.join(process.cwd(), "service-account.json"),
      path.join(process.cwd(), ".secrets", "service-account.json"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const raw = JSON.parse(fs.readFileSync(p, "utf8"));
        return {
          projectId: raw.project_id,
          clientEmail: raw.client_email,
          privateKey: raw.private_key,
        };
      }
    }
  } catch {
    // Si el JSON es inválido seguimos con las siguientes fuentes.
  }

  // 2) Variables de entorno FIREBASE_ADMIN_*.
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  return null;
}

function buildCredential() {
  const sa = loadServiceAccount();
  if (sa) {
    return cert({
      projectId: sa.projectId!,
      clientEmail: sa.clientEmail!,
      privateKey: sa.privateKey!,
    });
  }
  // 3) En entornos gestionados sin credenciales explícitas, el SDK usa la
  // cuenta de servicio del entorno automáticamente.
  return undefined; // application default credentials
}

let adminApp: App;
if (getApps().length === 0) {
  const credential = buildCredential();
  const options: any = {
    projectId:
      process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  };
  if (credential) options.credential = credential;
  adminApp = initializeApp(options);
} else {
  adminApp = getApps()[0];
}

export const adminDb: Firestore = getFirestore(adminApp);
export const adminAuth: Auth = getAuth(adminApp);
export const adminStorage = getStorage(adminApp);
export default adminApp;