// ============================================================================
// dev-local.mjs
// Arranca `next dev` con NEXT_PUBLIC_EMULATOR=true.
//
// Verifica primero que el Firestore emulator esté activo en localhost:8080.
// Los emuladores deben estar corriendo en otra terminal:
//   npm run emulators
//
// Después:
//   npm run dev:local
//
// Para regresar al proyecto real (prod), simplemente:
//   npm run dev   (sin este script)
// ============================================================================
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createConnection } from "node:net";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ---- Env loader (de .env.local) --------------------------------------------
function loadEnvFile(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

// ---- Check emulator is running --------------------------------------------
function checkPort(port, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: "127.0.0.1" }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.setTimeout(timeoutMs);
    socket.on("timeout", () => { socket.destroy(); resolve(false); });
    socket.on("error", () => { socket.destroy(); resolve(false); });
  });
}

// ---- Main -----------------------------------------------------------------
async function main() {
  const up = await checkPort(8080);
  if (!up) {
    console.error("ERROR: No se detectó el emulador de Firestore en localhost:8080\n");
    console.error("Abre otra terminal y ejecuta:\n");
    console.error("  npm run emulators\n");
    console.error("y vuelve a intentar.");
    process.exit(1);
  }

  console.log("✓ Emulador Firestore detectado (localhost:8080)\n");

  const envLocal = loadEnvFile(resolve(ROOT, ".env.local"));
  // NEXT_PUBLIC_EMULATOR hace que el client SDK use los emuladores.
  // Las variables *_EMULATOR_HOST hacen que el Admin SDK (API routes) también
  // apunten a los emuladores en lugar del proyecto real.
  const emulatorEnv = {
    NEXT_PUBLIC_EMULATOR: "true",
    FIRESTORE_EMULATOR_HOST: "localhost:8080",
    FIREBASE_AUTH_EMULATOR_HOST: "localhost:9099",
    FIREBASE_STORAGE_EMULATOR_HOST: "localhost:9199",
    FIREBASE_EMULATOR_HUB: "localhost:4400",
  };
  const mergedEnv = { ...process.env, ...envLocal, ...emulatorEnv };

  const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
  const child = spawn(cmd, ["next", "dev"], {
    cwd: ROOT,
    stdio: "inherit",
    env: mergedEnv,
    shell: process.platform === "win32",
  });

  child.on("close", (code) => process.exit(code ?? 1));
}

main();