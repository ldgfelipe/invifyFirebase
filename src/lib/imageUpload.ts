// ============================================================================
// IMAGE UPLOAD - Convierte a .webp y sube a Firebase Storage (/users/{uid}/...)
// ============================================================================
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase/client";

/**
 * Convierte un File (jpg/png/etc) a webp via canvas.
 * Si el archivo ya es webp y es <1MB, lo devuelve tal cual.
 * Calidad 0.82 para equilibrio peso/calidad.
 */
export async function fileToWebpBlob(file: File, quality = 0.82): Promise<Blob> {
  if (file.type === "image/webp" && file.size < 1_200_000) {
    return file;
  }
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear canvas");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve as any, "image/webp", quality)
  );
  if (!blob) throw new Error("Conversión a webp falló");
  return blob;
}

/**
 * Sube un blob webp a Storage y retorna la URL de descarga.
 * Ruta: users/{uid}/invitations/{invitationId || 'uploads'}/{uuid}.webp
 * Respeta reglas: request.resource.contentType matches 'image/.*' y <5MB
 */
export async function uploadWebpToStorage(
  blob: Blob,
  uid: string,
  invitationId?: string
): Promise<string> {
  const uuid = crypto.randomUUID();
  const path = `users/${uid}/${invitationId ? `invitations/${invitationId}` : "uploads"}/${uuid}.webp`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: "image/webp" });
  const url = await getDownloadURL(storageRef);
  return url;
}

/**
 * Flujo completo: File -> webp Blob -> upload -> URL
 */
export async function uploadFileAsWebp(
  file: File,
  uid: string,
  invitationId?: string
): Promise<string> {
  const blob = await fileToWebpBlob(file);
  // Si el blob sigue >4.5MB, recomprime con menor calidad
  let finalBlob = blob;
  if (blob.size > 4.5 * 1024 * 1024) {
    finalBlob = await fileToWebpBlob(file, 0.65);
  }
  return uploadWebpToStorage(finalBlob, uid, invitationId);
}
