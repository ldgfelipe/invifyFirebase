// ============================================================================
// emulators.mjs
// Arranca los Firebase Emulators con el JRE portable de Temurin (C:\laragon\tools\java).
// Evita depender de un Java instalado en el sistema.
//
//   npm run emulators
//
// Ejecuta: firebase emulators:start --only auth,firestore,storage
// ============================================================================
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ---- Localizar el JRE portable -------------------------------------------------
const JRE_CANDIDATES = [
  process.env.JAVA_HOME && process.env.JAVA_HOME.trim() ? process.env.JAVA_HOME : null,
  "C:\\laragon\\tools\\java\\jdk-21.0.12.1+1-jre",
  "C:\\laragon\\tools\\java",
];
const javaHome = JRE_CANDIDATES.find((p) => p && existsSync(resolve(p, "bin", "java.exe")));
const jreBin = javaHome ? resolve(javaHome, "bin") : null;

if (!jreBin) {
  console.error("WARNING: No se encontró un Java portable en C:\\laragon\\tools\\java.");
  console.error("El emulador de Firestore requiere Java 11+. Si falla, instálalo y ajusta JAVA_HOME.");
}

// ---- Env para el proceso firebase -------------------------------------------------
// Las API routes (Admin SDK) leen estas variables para apuntar al emulador.
const emulatorEnv = {
  FIRESTORE_EMULATOR_HOST: "localhost:8081",
  FIREBASE_AUTH_EMULATOR_HOST: "localhost:9099",
  FIREBASE_STORAGE_EMULATOR_HOST: "localhost:9199",
  FIREBASE_EMULATOR_HUB: "localhost:4400",
};

const mergedEnv = {
  ...process.env,
  ...emulatorEnv,
  PATH: (jreBin && !process.env.PATH.split(";").some((p) => p.toLowerCase() === jreBin.toLowerCase()))
    ? jreBin + ";" + process.env.PATH
    : process.env.PATH,
  JAVA_HOME: javaHome ?? process.env.JAVA_HOME,
};

console.log(`Java (Temurin): ${javaHome ?? "no encontrado"}`);
console.log(`Emuladores: auth:9099 · firestore:8081 · storage:9199\n`);

const cmd = process.platform === "win32" ? "firebase.cmd" : "firebase";
const child = spawn(cmd, ["emulators:start", "--only", "auth,firestore,storage", "--project", "invify-online"], {
  cwd: ROOT,
  stdio: "inherit",
  env: mergedEnv,
  shell: process.platform === "win32",
});

child.on("close", (code) => process.exit(code ?? 0));