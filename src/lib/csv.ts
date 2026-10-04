// ============================================================================
// CSV - Exportar tablas a CSV desde el navegador.
//
// Los datos de invitados y las respuestas del quiz son lo que el cliente se
// lleva a una hoja de calculo para cuadrar las personas. Imprimir a PDF sirve
// para verlos, no para trabajarlos.
//
// Se antepone el BOM UTF-8 porque Excel en Windows abre un CSV sin el en
// latin-1 y rompe los acentos y la enye, que es justo el caso de uso de esta
// app: nombres como "Ana Maria Jose" o "Bautizo de Jose Maria".
// ============================================================================

/** Rango de marcas diacriticas combinantes, para quitar acentos al nombre. */
const DIACRITICOS = /[\u0300-\u036f]/g;

/**
 * Escapa una celda y la entrecomilla. Excel usa la coma como separador, asi que
 * un nombre como "Ana, Maria" partia la fila en dos columnas.
 */
function celda(valor: unknown): string {
  const s = valor === null || valor === undefined ? "" : String(valor);
  return `"${s.replace(/"/g, '""')}"`;
}

/** Descarga una tabla como archivo CSV. No hace nada si la tabla esta vacia. */
export function descargarCSV(nombreArchivo: string, filas: unknown[][]): void {
  if (filas.length === 0) return;
  const cuerpo = filas.map((f) => f.map(celda).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + cuerpo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo.endsWith(".csv") ? nombreArchivo : `${nombreArchivo}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Sin revocar, algunos navegadores cancelan la descarga al instante.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Nombre de archivo seguro a partir del titulo de la invitacion: sin acentos ni
 * espacios, porque hay sistemas y navegadores que los recortan.
 */
export function nombreArchivoSeguro(base: string): string {
  const limpio = base
    .normalize("NFD")
    .replace(DIACRITICOS, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${limpio || "invitacion"}-${new Date().toISOString().slice(0, 10)}`;
}