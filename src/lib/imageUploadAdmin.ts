// ============================================================================
// IMAGE UPLOAD (admin) - Sube la foto de una plantilla o de una publicación.
//
// A diferencia de uploadFileAsWebp (que va a /users/{uid}), aquí el destino es
// /templates/ o /pages/, rutas que las reglas de Storage reservan a admin. Las
// URLs resultantes son públicas y estables, así sirven como thumbnailUrl,
// previewUrl y metaImage sin depender de postimages.org.
// ============================================================================
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase/client";
import { fileToWebpBlob } from "./imageUpload";

/** Carpeta de destino según el tipo de recurso. */
export type UploadTarget = "templates" | "pages";

/**
 * Sube una imagen a Storage y devuelve la URL pública.
 * Convierte a webp y, si aun pesa demasiado, recomprime a menor calidad para
 * respetar el limite de 5 MB de las reglas.
 */
export async function uploadAdminImage(
  file: File,
  target: UploadTarget,
  id: string,
  maxDimension = 1600
): Promise<string> {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "-");
  let blob: Blob = await fileToWebpBlob(file);

  if (blob.size > 4.5 * 1024 * 1024) {
    blob = await fileToWebpBlob(file, 0.65);
  }

  // Recorta el lado mayor para no subir fotos de 4000 px al catálogo.
  const bitmap = await createImageBitmap(blob);
  if (Math.max(bitmap.width, bitmap.height) > maxDimension) {
    const scale = maxDimension / Math.max(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const resized = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve as any, "image/webp", 0.85)
    );
    if (!resized) throw new Error("No se pudo redimensionar la imagen");
    blob = resized;
  } else {
    bitmap.close();
  }

  const path = `${target}/${safeId}/${crypto.randomUUID()}.webp`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: "image/webp" });
  return getDownloadURL(storageRef);
}