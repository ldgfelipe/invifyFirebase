// ============================================================================
// FIREBASE (servidor, SDK WEB) - Para lecturas/escrituras públicas en SSR/API
// usando la MISMA config web (apiKey). No requiere cuenta de servicio.
// Las reglas de Firestore ya permiten estas operaciones (plantillas activas,
// invitaciones publicadas, planes y RSVP/Quiz anónimos).
// Si NEXT_PUBLIC_EMULATOR=true (dev local), se apunta al emulador Firestore
// en localhost:8080 en vez del proyecto real. Nunca afecta producción.
// El Admin SDK queda reservado para el webhook de Stripe (privilegios elevados).
// ============================================================================
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// App con nombre "server" para no chocar con la app del cliente.
const app: FirebaseApp =
  getApps().find((a) => a.name === "server") ??
  initializeApp(firebaseConfig, "server");

export const serverDb: Firestore = getFirestore(app);

if (process.env.NEXT_PUBLIC_EMULATOR === "true") {
  connectFirestoreEmulator(serverDb, "localhost", 8081);
}
