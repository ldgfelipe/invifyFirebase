// ============================================================================
// FIREBASE ADMIN (lado del servidor / API routes)
// Usa credenciales de cuenta de servicio. En Cloud Run/Functions usa la
// cuenta por defecto si no se definen las variables.
// ============================================================================
import {
  initializeApp,
  getApps,
  cert,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

function buildCredential() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  // En entornos gestionados (Cloud Run/Functions) sin credenciales explícitas,
  // el SDK usa la cuenta de servicio del entorno automáticamente.
  if (projectId && clientEmail && privateKey) {
    return cert({ projectId, clientEmail, privateKey });
  }
  return undefined; // application default credentials
}

let adminApp: App;
if (getApps().length === 0) {
  const credential = buildCredential();
  const options: any = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  };
  // Solo pasamos credential cuando hay credenciales explícitas; si no, el SDK
  // usa Application Default Credentials (cuenta de servicio del entorno).
  if (credential) options.credential = credential;
  adminApp = initializeApp(options);
} else {
  adminApp = getApps()[0];
}

export const adminDb: Firestore = getFirestore(adminApp);
export const adminAuth: Auth = getAuth(adminApp);
export const adminStorage = getStorage(adminApp);
export default adminApp;
