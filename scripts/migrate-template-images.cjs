/**
 * Migracion de imagenes: descarga las fotos de las plantillas y las deja en
 * Firebase Storage, para que el sitio deje de depender de bancos de imagenes.
 *
 * CONTEXTO
 * Las 31 plantillas se sembraron con URLs de loremflickr.com, que hoy responde
 * 401 "Bot check / Javascript is needed" ante cualquier peticion sin navegador.
 * No es hotlink ni una cabecera que se pueda maquillar: es un challenge de
 * JavaScript, asi que un script no puede leerlas. Por eso el catalogo paso a
 * pintar un SVG generado en local (/api/thumb) y las plantillas quedaron sin
 * foto real.
 *
 * QUE HACE
 * 1. Inventaria todas las referencias a imagenes de /templates y /demoTemplates.
 * 2. Las clasifica y decide de donde sacar el bytes:
 *      - loremflickr /cache/resized/{pool}_{photoId}_{secret}_{size}_...
 *        El nombre cacheado lleva el id y el secret de Flickr, asi que la foto
 *        se reconstruye en live.staticflickr.com y se descarga de ahi. Es la
 *        foto ORIGINAL que el catalogo pretendia mostrar.
 *      - loremflickr /{w}/{h}/{pool}?lock=N  -> endpoint ALEATORIO. Cada visita
 *        devolvia una foto distinta, asi que no hay nada que recuperar. Se
 *        sustituye por una foto tematica nueva del feed publico de Flickr.
 *      - loremflickr .../defaultImage.* -> placeholder gris del propio
 *        loremflickr, no es una foto. Tambien se sustituye.
 *      - images.unsplash.com / picsum.photos -> se descargan tal cual.
 * 3. Sube cada imagen a Storage como WebP en /templates o /demoTemplates.
 * 4. Reescribe en Firestore los campos que apuntan a la foto nueva y guarda la
 *    URL anterior en legacyImageUrls para poder revertir.
 *
 * IDEMPOTENCIA
 * Cada bytes van a /templates/{id}/{hash}.webp, con hash = sha1 de los bytes.
 * Un archivo que ya existe con el mismo hash se reutiliza y no se vuelve a
 * subir, asi que repetir el script no crea duplicados ni cobra cuota dos veces.
 * Como la URL de Storage lleva el token en el nombre, el hash tambien es la
 * prueba de que el archivo no se sustituyo por otro.
 *
 * USO
 *   node scripts/migrate-template-images.cjs            # dry-run: solo reporte
 *   node scripts/migrate-template-images.cjs --apply    # escribe de verdad
 *   node scripts/migrate-template-images.cjs --verify    # comprueba que las
 *                                                          # URLs de Storage
 *                                                          # responden 200
 *                                                          # y son imagenes
 *   node scripts/migrate-template-images.cjs --restore-legacy
 *                                                          # vuelve a guardar
 *                                                          # en legacyImageUrls
 *                                                          # las URLs originales
 *                                                          # de imagenes-originales.json
 *
 * El dry-run NO sube nada a Storage ni escribe en Firestore, pero si genera el
 * backup, porque solo leer no puede romper nada y asi ya se puede revisar.
 */
process.env.FIREBASE_DATABASE_URL ||= "https://invify-online-default-rtdb.firebaseio.com";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const APPLY = process.argv.includes("--apply");
const VERIFY = process.argv.includes("--verify");
const RESTORE_LEGACY = process.argv.includes("--restore-legacy");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const BACKUP_PATH = path.join(__dirname, "..", "scripts", "backup-imagenes-plantillas.json");
const ORIGINALES_PATH = path.join(__dirname, "imagenes-originales.json");

/**
 * Colecciones que se revisan.
 *
 * "site" entra por el hero: guardaba una foto de picsum.photos, y como el
 * codigo trata ese host como muerto, resolveHeroBackground la descartaba y la
 * portada se quedaba sin fondo sin avisar. Las invitaciones NO entran: sus
 * builderConfig son copiaseditables del cliente y solo contienen URLs de unsplash
 * que hoy responden bien; migrarlas seria tocar documentosenEditable por el
 * cliente sin que se lo haya pedido.
 */
const COLECCIONES = ["templates", "demoTemplates", "site"];

/**
 * Ancho maximo por coleccion. El hero es una imagen de fondo a pantalla
 * completa, asi que necesita mas resolucion que una miniatura de tarjeta.
 */
const ANCHO_MAX_COLECCION = { site: 2000 };

/**
 * URL de Storage en su forma definitiva: la publica con token de descarga.
 * Solo estas se consideran "ya migradas". Una firma V4 antigua (con
 * GoogleAccessId) NO cuenta, porque su caducidad es una dependencia que el
 * script viene a quitar y por eso hay que volver a pasarla por aqui.
 */
const ES_URL_DEFINITIVA =
  /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/[^?]+\?alt=media&token=[0-9a-f]{8,}$/;

/** Ancho maximo de la version "preview" (fondo del header). */
const PREVIEW_MAX = 1600;
/** Ancho maximo de la version "thumb" (miniatura del catalogo). */
const THUMB_MAX = 1000;
/** Por debajo de este tamano el archivo se considera corrupto. */
const MIN_BYTES = 5000;

/** Sufijos de tamano de Flickr, de mayor a menor resolucion. */
const FLICKR_SIZES = ["h", "k", "b", "c", "z", "o"];

/**
 * Campos cuyo nombre delata una imagen sin ambiguedad. Un valor en uno de
 * estos SI es una imagen.
 */
const IMAGE_KEY_STRONG =
  /^(imageUrl|imageURL|thumbnailUrl|previewUrl|previewImage|backgroundImage|backgroundImageUrl|metaImage|ogImage|coverUrl|coverImage|photoUrl|avatarUrl|profileImage|srcUrl|imageUrlList)$/i;

/**
 * Campos GENERICOS que a veces son imagen y a veces un enlace. El giftTable
 * guarda la mesa de regalos en `url`, igual que el carrusel guarda la foto, asi
 * que aqui no basta el nombre:exige extension de imagen o un host de imagenes.
 */
const IMAGE_KEY_WEAK = /^(url|src|image|photo|picture|thumb)$/i;

/** Claves que son de otro tipo aunque su nombre parezca de imagen. */
const NOT_IMAGE =
  /^(mapUrl|videoUrl|audioUrl|embedUrl|redirectUrl|targetUrl|buyUrl|shareUrl|registerUrl|rsvpUrl|siteUrl|webUrl|linkUrl)$/i;

function loadEnv() {
  const out = {};
  for (const f of [".env.local", ".env"]) {
    const p = path.join(__dirname, "..", f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return out;
}

// ============================================================================
// Deteccion de imagenes
// ============================================================================

function esUrl(valor) {
  return typeof valor === "string" && /^https?:\/\//.test(valor.trim());
}

/**
 * ¿Este valor es una imagen? Tres criterios, en orden de fiabilidad:
 *   1. la extension de archivo es de imagen (si la hay, manda).
 *   2. la clave es inequivocamente de imagen (imageUrl, thumbnailUrl, ...).
 *   3. la clave es generica (url, src) o unknown: solo cuenta si el host es un
 *      banco de imagenes conocido, porque un `url` en un giftTable es un enlace.
 * Se descartan audio/video y las claves que son enlaces de accion.
 */
function esImagen(clave, valor) {
  if (!esUrl(valor)) return false;
  const v = valor.trim();
  if (NOT_IMAGE.test(clave)) return false;
  if (/\.(mp3|m4a|aac|wav|ogg|mp4|webm|mov|pdf|zip)(\?|$)/i.test(v)) return false;

  let host = "";
  try {
    host = new URL(v).host.toLowerCase();
  } catch {
    return false;
  }
  if (/(^|\.)(soundhelix|amazon|myshopify|facebook|instagram|twitter|youtube|youtu\.be|google|maps|mapbox|spotify)\./.test(host))
    return false;

  if (/\.(jpe?g|png|webp|gif|avif|svg|ico)(\?|$)/i.test(v)) return true;
  if (IMAGE_KEY_STRONG.test(clave)) return true;
  if (IMAGE_KEY_WEAK.test(clave)) {
    return /(^|\.)(picsum\.photos|images\.unsplash\.com|loremflickr\.com|placekitten\.com|source\.unsplash\.com)$/.test(
      host
    );
  }
  return false;
}

/**
 * Una ruta del inventario trae los indices de array como `[0]`, no como `.0`:
 * "builderConfig.modules[0].images[1].url". Hay que tokenizarla aparte porque
 * partirlas por "." deja "modules[0]" como una clave suelta que no existe, y la
 * reescritura se creia correcta mientras solo tocaba los campos de primer nivel.
 */
function tokenizarRuta(ruta) {
  const tokens = [];
  const re = /([^.[\]]+)|\[(\d+)\]/g;
  let m;
  while ((m = re.exec(ruta))) tokens.push(m[1] !== undefined ? m[1] : Number(m[2]));
  return tokens;
}

/**
 * Reemplaza el string de la ruta indicada. Devuelve el numero de hojas
 * modificadas: 1 si cambio, 0 si ya valia lo mismo, null si la ruta no existe.
 */
function mapLeaf(obj, ruta, fn) {
  const tokens = tokenizarRuta(ruta);
  if (tokens.length === 0) return null;
  const ultima = tokens[tokens.length - 1];

  let actual = obj;
  for (let i = 0; i < tokens.length - 1; i++) {
    if (actual == null || typeof actual !== "object") return null;
    const t = tokens[i];
    if (!Object.prototype.hasOwnProperty.call(actual, t)) return null;
    actual = actual[t];
  }
  if (actual == null || typeof actual !== "object") return null;
  if (!Object.prototype.hasOwnProperty.call(actual, ultima)) return null;

  const original = actual[ultima];
  const siguiente = fn(original, ultima);
  if (siguiente === original) return 0;
  actual[ultima] = siguiente;
  return 1;
}

/**
 * ¿Existe la hoja que apunta a esta ruta? A diferencia de mapLeaf, no escribe
 * nada, que es lo que hace falta para respaldar el valor original: al escribir
 * el MISMO string que ya esta en el documento, mapLeaf lo detecta como "sin
 * cambios" y devuelve 0, y el respaldo se queda vacio sin avisar.
 */
function leafExists(obj, ruta) {
  const tokens = tokenizarRuta(ruta);
  if (tokens.length === 0) return false;
  let actual = obj;
  for (const t of tokens) {
    if (actual == null || typeof actual !== "object") return false;
    if (!Object.prototype.hasOwnProperty.call(actual, t)) return false;
    actual = actual[t];
  }
  return actual !== undefined;
}

// ============================================================================
// Clasificacion y origen de los bytes
// ============================================================================

/**
 * URL de loremflickr con foto identificable en el nombre.
 * El "pool" de loremflickr es el server id de live.staticflickr.com, asi que
 * {pool}/{photoId}_{secret}_{size}.jpg es una URL directa a la foto original.
 */
function desdeLorFlickr(url) {
  const m = url.match(
    /loremflickr\.com\/cache\/resized\/(\d+)_(\d+)_([a-f0-9]+)_([a-z]+)_\d+_\d+_nofilter\.jpg/i
  );
  if (!m) return null;
  const [, pool, photoId, secret, size] = m;
  return { pool, photoId, secret, size, base: `https://live.staticflickr.com/${pool}/${photoId}_${secret}` };
}

/** Etiqueta tematica de una URL aleatoria de loremflickr: /800/600/wedding?lock=3 */
function poolDeLorFlickr(url) {
  const m =
    url.match(/loremflickr\.com\/\d+\/\d+\/([^/?]+)/i) ||
    url.match(/loremflickr\.com\/g\/[^/]+\/([^/]+)\//i);
  return (m?.[1] || "").toLowerCase();
}

/** Tags de Flickr por categoria, para las URLs aleatorias que no se pueden recuperar. */
const TAGS_POR_CATEGORIA = {
  boda: "wedding",
  bautizo: "baptism",
  cumpleanos: "birthdayparty",
  babyshower: "baby",
  corporativo: "business",
};
const TAGS_POR_POOL = {
  wedding: "wedding",
  baptism: "baptism",
  baptismo: "baptism",
  baby: "baby",
  birthday: "birthdayparty",
  birthdayparty: "birthdayparty",
  corporate: "business",
  business: "business",
};

/** Tags de reemplazo para una URL aleatoria, segun su pool o la categoria de la plantilla. */
function tagsDeReemplazo(url, categoria) {
  const porPool = TAGS_POR_POOL[poolDeLorFlickr(url)];
  if (porPool) return porPool;
  return TAGS_POR_CATEGORIA[categoria] || "party";
}

async function descargar(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < MIN_BYTES) throw new Error(`archivo demasiado pequeno (${buf.length} B)`);
  return buf;
}

/** Bytes de una foto que loremflickr tiene cacheada y que reconstruimos en Flickr. */
async function bytesDeFotoCacheada(info, anchoObjetivo) {
  // Se empieza por el tamano original de la URL y se degrada si ese ya no
  // existe en Flickr (los sufijos pequenos se borran antes que los grandes).
  const orden = [info.size, ...FLICKR_SIZES.filter((s) => s !== info.size)];
  let ultimoError = "sin intentos";
  for (const size of orden) {
    try {
      const buf = await descargar(`${info.base}_${size}.jpg`);
      return { buf, origen: `flickr:${info.pool}/${info.photoId}_${info.secret}_${size}`, ancho: anchoObjetivo };
    } catch (e) {
      ultimoError = e.message;
    }
  }
  throw new Error(ultimoError);
}

/** Bytes de una foto tematica del feed publico de Flickr (no pide API key). */
async function bytesDeFeedFlickr(tags, anchoObjetivo, indice) {
  const feed = `https://www.flickr.com/services/feeds/photos_public.gne?tags=${encodeURIComponent(
    tags
  )}&format=json&nojsoncallback=1`;
  const res = await fetch(feed, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`feed HTTP ${res.status}`);
  const json = JSON.parse(await res.text());
  const items = json.items || [];
  if (!items.length) throw new Error("feed vacio");

  // Se recorren varios candidatos porque algunos apuntan a fotos ya borradas.
  for (let salto = 0; salto < Math.min(items.length, 6); salto++) {
    const item = items[(indice + salto) % items.length];
    const m = item?.media?.m;
    if (!m) continue;
    // El feed entrega el tamano _m (240 px); con el id y el secret del nombre
    // se puede pedir _b (1024) o _h (1600) cambiando solo el sufijo.
    const grande = m.replace(/_m(\.\w+)$/, "_b$1");
    const ancora = grande.replace(/_b(\.\w+)$/, "_h$1");
    for (const cand of [grande, ancora, m]) {
      try {
        const buf = await descargar(cand);
        const titulo = (item.title || "sin titulo").slice(0, 60);
        return {
          buf,
          origen: `feed:${tags}#${(indice + salto) % items.length}`,
          titulo,
          ancho: anchoObjetivo,
        };
      } catch {
        /* siguiente candidato */
      }
    }
  }
  throw new Error("ningun candidato del feed respondio");
}

/**
 * Decide de donde sacar los bytes de una URL de plantilla.
 * "ancho" es el ancho maximo que necesita el destino (thumb del catalogo o
 * preview de fondo), y decide si hace falta reducir.
 */
async function obtenerBytes(url, ctx) {
  const lf = desdeLorFlickr(url);
  if (lf) return bytesDeFotoCacheada(lf, ctx.ancho);

  if (url.includes("loremflickr")) {
    // /{w}/{h}/{pool}?lock=N o defaultImage: no hay foto que recuperar.
    const tags = tagsDeReemplazo(url, ctx.categoria);
    return bytesDeFeedFlickr(tags, ctx.ancho, ctx.indice);
  }

  // unsplash / picsum: se descargan tal cual.
  const buf = await descargar(url);
  return { buf, origen: url, ancho: ctx.ancho };
}

// ============================================================================
// Conversion a WebP
// ============================================================================
//
// Convertir sin dependencias externas no es posible en Node puro: no hay WebP ni
// JPG en la libreria estandar. Por eso el upload real necesita `sharp`
// (npm i -D sharp). Si no esta, el script degrada a subir el JPEG original,
// que es valido y sigue resolviendo el problema de fondo: la foto deja de estar
// en un banco de imagenes y pasa a servirse desde tu propio dominio.
//
//   --no-sharp  fuerza JPEG original, sin intentar cargar sharp
//
const SIN_SHARP = process.argv.includes("--no-sharp");
let sharp = null;
if (!SIN_SHARP) {
  try {
    sharp = require("sharp");
  } catch {
    sharp = null;
  }
}

/**
 * Reduce y convierte a WebP. Sin sharp devuelve el buffer original y el JPEG.
 * El ancho se recalcula con la metadata cuando se puede leer; si no, se asume
 * que la URL ya venia en el tamano pedido (asi se pide a los *_b de 1024).
 */
async function preparar(buf, anchoMax) {
  if (!sharp) return { buf, contentType: "image/jpeg", ext: "jpg" };
  try {
    const meta = await sharp(buf).metadata();
    const anchoActual = meta.width || anchoMax;
    let pipeline = sharp(buf).rotate(); // respeta la orientacion EXIF
    if (anchoActual > anchoMax) {
      pipeline = pipeline.resize({ width: anchoMax, withoutEnlargement: true });
    }
    const out = await pipeline.webp({ quality: 82 }).toBuffer();
    return { buf: out, contentType: "image/webp", ext: "webp" };
  } catch {
    return { buf, contentType: "image/jpeg", ext: "jpg" };
  }
}

// ============================================================================
// Reemplazo en Firestore
// ============================================================================

/**
 * URL publica de un objeto de Storage, con token de descarga.
 *
 * No se usa getSignedUrl() a proposito. Las firmas V4 de GCS caducan (el SDK
 * Admin no impone el limite de 7 dias de las claves HMAC, pero depender de eso
 * deja la URL con una fecha dentro del dato), y ademas son distintas de las que
 * escribe uploadAdminImage() al subir desde /admin. El token es el mismo
 * mecanismo que usa getDownloadURL() del SDK web: se guarda en los metadatos
 * del objeto y el endpoint /v0/b/... lo valida. Asi estas URLs no caducan nunca
 * y conviven con las que ya produce el panel de administracion.
 */
function urlPublicaDeStorage(bucket, ruta, token) {
  return (
    "https://firebasestorage.googleapis.com/v0/b/" +
    bucket.name +
    "/o/" +
    encodeURIComponent(ruta) +
    "?alt=media&token=" +
    token
  );
}

/**
 * Sube el archivo (o lo reutiliza si ya esta con los mismos bytes) y devuelve
 * su URL publica. Como el nombre del archivo es el hash de los bytes, que ya
 * exista significa que es el mismo contenido: se le asegura el token y listo.
 */
async function guardarEnStorage(bucket, ruta, buf, contentType, metadatos) {
  const remoto = bucket.file(ruta);
  const [existe] = await remoto.exists();

  if (!existe) {
    await remoto.save(buf, {
      contentType,
      resumable: false,
      metadata: { cacheControl: "public, max-age=31536000, immutable", metadata: metadatos },
    });
  }

  const [meta] = await remoto.getMetadata();
  let token = meta?.metadata?.firebaseStorageDownloadTokens;
  if (!token) {
    token = crypto.randomUUID().replace(/-/g, "");
    await remoto.setMetadata({
      metadata: { ...(meta?.metadata || {}), firebaseStorageDownloadTokens: token },
    });
  }
  return urlPublicaDeStorage(bucket, ruta, token);
}

function esFotoGrande(url) {
  return /_(1200|1600|1920|2048)_\d+_nofilter\.jpg/i.test(url) || /\/(1200|1600|1920)\//.test(url);
}

/**
 * Autocomprobacion de la reescritura por rutas.
 *
 * mapLeaf devuelve null cuando la ruta no existe, y un null suma 0 al contador
 * de cambios: una ruta mal tokenizada hacia que el script anunciara exito sin
 * haber escrito nada. Aqui se verifica con la forma real de los datos
 * (objetos anidados + arrays) que cada nivel, incluido el indice, se alcanza.
 */
function autocomprobarMapLeaf() {
  const datos = {
    thumbnailUrl: "a",
    builderConfig: {
      theme: { backgroundImage: "b" },
      modules: [
        { id: "m0", imageUrl: "c", style: { backgroundImage: "d" }, images: [{ url: "e" }, { url: "f" }] },
        { id: "m1", items: [{ imageUrl: "g" }] },
      ],
    },
  };
  const casos = [
    ["thumbnailUrl", "a"],
    ["builderConfig.theme.backgroundImage", "b"],
    ["builderConfig.modules[0].imageUrl", "c"],
    ["builderConfig.modules[0].style.backgroundImage", "d"],
    ["builderConfig.modules[0].images[1].url", "f"],
    ["builderConfig.modules[1].items[0].imageUrl", "g"],
  ];
  for (const [ruta, antes] of casos) {
    const copia = JSON.parse(JSON.stringify(datos));
    const n = mapLeaf(copia, ruta, () => "NUEVA");
    if (n !== 1) {
      throw new Error(`autocomprobacion fallo: mapLeaf("${ruta}") devolvio ${n}, se esperaba 1`);
    }
    const valor = copia;
    const tokens = tokenizarRuta(ruta);
    let v = valor;
    for (const t of tokens) v = v?.[t];
    if (v !== "NUEVA") {
      throw new Error(`autocomprobacion fallo: "${ruta}" no quedo reescrito (queda ${JSON.stringify(v)})`);
    }
    void antes;
  }
  // Una ruta que no existe debe decir que no, en vez de inventarse un cambio.
  const copia = JSON.parse(JSON.stringify(datos));
  if (mapLeaf(copia, "builderConfig.modules[5].imageUrl", () => "X") !== null) {
    throw new Error("autocomprobacion fallo: una ruta inexistente devolvio un cambio");
  }
}

// ============================================================================
// Programa principal
// ============================================================================

autocomprobarMapLeaf();

/**
 * Vuelca en legacyImageUrls las URLs originales de imagenes-originales.json,
 * fundiendo con lo que ya haya en el documento.
 *
 * Es un camino aparte del de la migracion porque las URLs de nivel superior se
 * llegaron a procesar antes de que el respaldo quedara bien, y el archivo de
 * backup se regenero con las URLs ya cambiadas. Todo lo que hay aqui se valida
 * contra Flickr ANTES de escribir: un id o un secret mal transcrito daria 404,
 * y un respaldo con una URL inventada es peor que no tener respaldo.
 */
async function restaurarLegacy(db) {
  // Se resuelve aqui y no en el programa principal: esta funcion se declara
  // antes de esa IIFE, asi que no ve sus destructuraciones.
  const { FieldValue } = require("firebase-admin/firestore");
  if (!fs.existsSync(ORIGINALES_PATH)) {
    console.error(`No existe ${ORIGINALES_PATH}`);
    process.exit(1);
  }
  const datos = JSON.parse(fs.readFileSync(ORIGINALES_PATH, "utf8"));

  // 1) Validar cada URL antes de tocar Firestore.
  const plan = [];
  const invalidas = [];
  for (const [col, docs] of Object.entries(datos)) {
    if (col.startsWith("_")) continue;
    for (const [id, campos] of Object.entries(docs)) {
      for (const [ruta, url] of Object.entries(campos)) {
        const clave = ruta.split(".").pop();
        if (!esImagen(clave, url)) {
          invalidas.push({ col, id, ruta, url, motivo: "no parece una imagen" });
          continue;
        }
        const lf = desdeLorFlickr(url);
        if (lf) {
          // El id+secret tienen que existir de verdad: asi se detecta cualquier
          // error de transcripcion en el JSON.
          let ok = false;
          for (const size of [lf.size, ...FLICKR_SIZES.filter((s) => s !== lf.size)]) {
            try {
              await descargar(`${lf.base}_${size}.jpg`);
              ok = true;
              break;
            } catch {
              /* siguiente tamaño */
            }
          }
          if (!ok) invalidas.push({ col, id, ruta, url, motivo: "la foto no existe en Flickr" });
        } else if (url.includes("loremflickr.com")) {
          // Endpoint aleatorio de loremflickr ({w}/{h}/{pool}?lock=N): no hay
          // foto fija que validar, y loremflickr responde 401 a todo, asi que
          // solo se comprueba la forma de la URL.
          if (!/loremflickr\.com\/(cache\/resized\/)?[\w./?=-]+\.(jpe?g|png|webp)(\?|$)/i.test(url) &&
              !/loremflickr\.com\/\d+\/\d+\/[^/?]+(\?lock=\d+)?$/i.test(url)) {
            invalidas.push({ col, id, ruta, url, motivo: "no parece una URL de loremflickr" });
          }
        } else {
          try {
            await descargar(url);
          } catch (e) {
            invalidas.push({ col, id, ruta, url, motivo: e.message });
          }
        }
        plan.push({ col, id, ruta, url });
      }
    }
  }

  console.log(`Entradas en imagenes-originales.json: ${plan.length}`);
  if (invalidas.length) {
    console.log(`\nINVALIDAS (${invalidas.length}) — no se escribe nada:`);
    for (const i of invalidas) console.log(`  ${i.col}/${i.id} ${i.ruta}\n    ${i.url}\n    ${i.motivo}`);
    process.exit(1);
  }
  console.log("Todas las URLs validan contra su origen.");

  // 2) Fusionar en legacyImageUrls, descartando lo que no sirve como respaldo.
  //
  // Se limpian dos cosas que corrida anteriores dejaron:
  //   - rutas con un indice colgando ("thumbnailUrl[0]"), que son el sintoma
  //     de haber inventariado un campo que era array;
  //   - valores que ya apuntan a Storage, que no son el estado original sino
  //     una migracion previa.
  const batch = db.batch();
  let docsTocados = 0;
  let rutasLimpias = 0;
  for (const [col, docs] of Object.entries(datos)) {
    if (col.startsWith("_")) continue;
    for (const [id, campos] of Object.entries(docs)) {
      const ref = db.collection(col).doc(id);
      const snap = await ref.get();
      if (!snap.exists) {
        console.log(`  aviso: ${col}/${id} no existe`);
        continue;
      }
      const previo = snap.data().legacyImageUrls || {};
      const limpio = {};
      const aBorrar = [];
      for (const [k, v] of Object.entries(previo)) {
        const rutaValida = /[^[\]]/.test(k) && !/\[\d+\]$/.test(k);
        const valorOriginal =
          typeof v === "string" &&
          !ES_URL_DEFINITIVA.test(v) &&
          !/GoogleAccessId=/.test(v);
        if (rutaValida && valorOriginal) limpio[k] = v;
        else aBorrar.push(k);
      }
      // update() y no set({merge:true}): merge fusiona mapas y encima no admite
      // mezclar un mapa con borrados de sus propias subcampos, asi que las
      // claves viejas se resistian. update() sustituye el campo entero, que es
      // justo lo que aqui se quiere porque legacyImageUrls es solo nuestro.
      batch.update(ref, { legacyImageUrls: { ...limpio, ...campos } });
      docsTocados++;
      rutasLimpias += aBorrar.length;
    }
  }
  await batch.commit();
  console.log(`\nEntradas no validas retiradas de legacyImageUrls: ${rutasLimpias}`);
  console.log(`legacyImageUrls actualizado en ${docsTocados} documentos.`);
  console.log(
    "Los documentos ya migrados siguen apuntando a Storage; esto solo deja la vuelta atras."
  );
}

(async () => {
  const E = loadEnv();
  const projectId =
    E.FIREBASE_ADMIN_PROJECT_ID || E.FIREBASE_PROJECT_ID || E.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = E.FIREBASE_ADMIN_CLIENT_EMAIL || E.FIREBASE_CLIENT_EMAIL;
  const privateKey = (E.FIREBASE_ADMIN_PRIVATE_KEY || E.FIREBASE_PRIVATE_KEY || "").replace(
    /\\n/g,
    "\n"
  );
  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      "Faltan FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY"
    );
    process.exit(1);
  }

  const { cert, initializeApp } = require("firebase-admin/app");
  const { getFirestore, FieldValue } = require("firebase-admin/firestore");
  const { getStorage } = require("firebase-admin/storage");

  const app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: E.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
  const db = getFirestore(app);
  const storage = getStorage(app);
  const bucket = storage.bucket();

  console.log(`Proyecto:  ${projectId}`);
  console.log(`Bucket:    ${bucket.name}`);

  if (RESTORE_LEGACY) {
    await restaurarLegacy(db);
    await app.delete();
    return;
  }

  console.log(`Modo:      ${APPLY ? "APPLY (escribe de verdad)" : "DRY-RUN (no escribe nada)"}`);
  console.log(`WebP:      ${sharp ? "si (sharp)" : "no (sube JPEG original; instala sharp para convertir)"}\n`);

  // ---- 1) Inventario -------------------------------------------------------
  const inventario = [];
  for (const col of COLECCIONES) {
    const snap = await db.collection(col).get();
    snap.docs.forEach((doc) => {
      const data = doc.data();
      const refs = [];
      const recorrer = (valor, ruta) => {
        // legacyImageUrls es el respaldo de URLs ORIGINALES: son justo lo que
        // este script viene a sustituir. Si se inventariara aqui, una segunda
        // corrida las volveria a migrar y el respaldo se perderia.
        if (ruta === "legacyImageUrls") return;

        // Una URL sola dentro de un array no es una lista de imagenes: es el
        // campo equivocado. Seinventaria como hoja y se reescribe como string,
        // que es lo que espera la aplicacion (resolveTemplateThumb hace
        // .trim() sobre el valor y reventaria con un array).
        if (Array.isArray(valor) && valor.length === 1 && typeof valor[0] === "string" && /^https?:\/\//.test(valor[0])) {
          refs.push({ ruta, valor: valor[0], envuelto: true });
          return;
        }

        if (Array.isArray(valor)) {
          valor.forEach((v, i) => recorrer(v, `${ruta}[${i}]`));
          return;
        }
        if (valor && typeof valor === "object") {
          Object.entries(valor).forEach(([k, v]) => recorrer(v, ruta ? `${ruta}.${k}` : k));
          return;
        }
        const clave = ruta.split(".").pop();
        if (esImagen(clave, valor)) refs.push({ ruta, valor });
      };
      recorrer(data, "");
      if (refs.length) {
        inventario.push({ col, doc: doc.id, categoria: data.category || "", refs });
      }
    });
  }

  const totalRefs = inventario.reduce((a, t) => a + t.refs.length, 0);
  const totalDocs = inventario.length;
  console.log(`Documentos con imagenes: ${totalDocs} | referencias: ${totalRefs}`);

  const porHost = {};
  for (const t of inventario) {
    for (const r of t.refs) {
      try {
        const h = new URL(r.valor).host;
        porHost[h] = (porHost[h] || 0) + 1;
      } catch {}
    }
  }
  console.log(`Por host: ${JSON.stringify(porHost)}\n`);

  // ---- 1b) --verify: comprobar que lo ya migrado sigue sirviendo -----------
  if (VERIFY) {
    const enStorage = new Set();
    for (const t of inventario) for (const r of t.refs) {
      if (/firebasestorage\.googleapis\.com|storage\.googleapis\.com/.test(r.valor))
        enStorage.add(r.valor);
    }
    console.log(`=== VERIFY: ${enStorage.size} URLs unicas en Storage ===`);
    const malas = [];
    let i = 0;
    for (const url of enStorage) {
      i++;
      try {
        const res = await fetch(url, { headers: { "User-Agent": UA } });
        const tipo = res.headers.get("content-type") || "";
        const buf = res.ok ? Buffer.from(await res.arrayBuffer()) : Buffer.alloc(0);
        if (!res.ok || !tipo.startsWith("image/") || buf.length < MIN_BYTES) {
          malas.push({ url, status: res.status, tipo, bytes: buf.length });
        }
      } catch (e) {
        malas.push({ url, status: 0, tipo: e.message, bytes: 0 });
      }
      if (i % 20 === 0) process.stdout.write(`  ${i}/${enStorage.size}\n`);
    }
    console.log(` respondieron bien: ${enStorage.size - malas.length}/${enStorage.size}`);
    if (malas.length) {
      console.log(" ROTOS:");
      for (const m of malas) console.log(`   ${m.status} ${m.tipo} ${m.bytes}B ${m.url.slice(0, 110)}`);
    } else {
      console.log(" Todas las imagenes responden 200 con content-type de imagen.");
    }
    const fueraDeStorage = [];
    for (const t of inventario) for (const r of t.refs) {
      if (!/firebasestorage|storage\.googleapis/.test(r.valor)) fueraDeStorage.push(r.valor);
    }
    console.log(`\nReferencias que siguen fuera de Storage: ${fueraDeStorage.length}`);
    [...new Set(fueraDeStorage)].forEach((u) => console.log(`   ${u}`));
    await app.delete();
    return;
  }

  // ---- 2) Backup (solo lectura, se escribe siempre) ------------------------
  // Se guarda el documento entero antes de tocarlo: revertir es volver a
  // escribir este JSON con `restore`.
  //
  // Solo se escribe la PRIMERA vez. Un backup que se regenera en cada corrida
  // deja de ser un respaldo: tras migrar, la segunda corrida guardaria ya las
  // URLs nuevas y el archivo original se perderia. Si ya existe, seAvisa y se
  // deja intacto.
  if (fs.existsSync(BACKUP_PATH)) {
    console.log(
      `Backup: ya existe ${path.relative(process.cwd(), BACKUP_PATH)}, se conserva (no se sobrescribe).`
    );
  } else {
    const backup = {};
    for (const col of COLECCIONES) {
      const snap = await db.collection(col).get();
      backup[col] = {};
      snap.docs.forEach((d) => {
        backup[col][d.id] = d.data();
      });
    }
    fs.writeFileSync(BACKUP_PATH, JSON.stringify(backup, null, 2), "utf8");
    console.log(
      `Backup: ${path.relative(process.cwd(), BACKUP_PATH)} (${totalDocs} documentos con imagenes)`
    );
  }
  console.log("");

  // ---- 3) Procesar cada referencia ----------------------------------------
  const cambios = [];
  const stats = { migradas: 0, fallidas: 0, yaOk: 0, normalizadas: 0 };

  for (const plantilla of inventario) {
    for (const ref of plantilla.refs) {
      const original = ref.valor;

      // Si ya tiene la URL publica con token, no hay nada que hacer... salvo que
      // el campo sea un array de un elemento: entonces hay que aplanarlo a
      // string aunque la URL no cambie, porque la aplicacion no lo espera.
      if (ES_URL_DEFINITIVA.test(original)) {
        if (!ref.envuelto) {
          stats.yaOk++;
          continue;
        }
        cambios.push({
          col: plantilla.col,
          doc: plantilla.doc,
          ruta: ref.ruta,
          de: original,
          a: original,
          destino: "(sin cambios)",
          bytes: 0,
          origen: "normalizado",
          titulo: "",
          tipo: "normalizada",
        });
        stats.normalizadas++;
        continue;
      }

      const esPreview = esFotoGrande(original) || /previewUrl/i.test(ref.ruta);
      const anchoMax = Math.max(
        ANCHO_MAX_COLECCION[plantilla.col] || 0,
        esPreview ? PREVIEW_MAX : THUMB_MAX
      );
      const ctx = {
        categoria: plantilla.categoria,
        ancho: anchoMax,
        // Indice del feed derivado del documento y la ruta, no un contador: si
        // el script se repite, cada referencia elige la misma foto y no se
        // generan archivos nuevos que luego nadie referencia.
        indice:
          parseInt(
            crypto.createHash("sha1").update(`${plantilla.doc}|${ref.ruta}`).digest("hex").slice(0, 8),
            16
          ) % 20,
      };

      try {
        const { buf, origen, titulo } = await obtenerBytes(original, ctx);

        const { buf: final, contentType, ext } = await preparar(buf, anchoMax);
        const hash = crypto.createHash("sha1").update(final).digest("hex").slice(0, 12);
        const destino = `${plantilla.col}/${plantilla.doc}/${hash}.${ext}`;

        let urlStorage = null;
        if (APPLY) {
          urlStorage = await guardarEnStorage(bucket, destino, final, contentType, {
            source: original.slice(0, 300),
            via: origen,
            title: titulo || "",
          });
        }

        cambios.push({
          col: plantilla.col,
          doc: plantilla.doc,
          ruta: ref.ruta,
          de: original,
          a: APPLY ? urlStorage : `https://storage/${destino}`,
          destino,
          bytes: final.length,
          origen,
          titulo: titulo || "",
          tipo: origen.startsWith("feed") ? "reemplazo" : "recuperada",
        });
        stats.migradas++;
      } catch (e) {
        cambios.push({
          col: plantilla.col,
          doc: plantilla.doc,
          ruta: ref.ruta,
          de: original,
          error: e.message,
          tipo: "fallida",
        });
        stats.fallidas++;
      }
    }
  }

  // ---- 4) Reporte ----------------------------------------------------------
  // porTipo cuenta los cambios; stats cuenta lo que se decided hacer. Las
  // normalizadas se leen de stats porque el resumen de abajo es para comparar
  // contra el numero de referencias del inventario.
  const porTipo = cambios.reduce((a, c) => ((a[c.tipo] = (a[c.tipo] || 0) + 1), a), {});
  console.log("=== RESUMEN ===");
  console.log(`  recuperadas de Flickr : ${porTipo.recuperada || 0}`);
  console.log(`  reemplazadas por feed : ${porTipo.reemplazo || 0}`);
  console.log(`  normalizadas (array)  : ${stats.normalizadas}`);
  console.log(`  fallidas              : ${porTipo.fallida || 0}`);
  console.log(`  ya en Storage         : ${stats.yaOk}`);
  const peso = cambios.filter((c) => c.bytes).reduce((a, c) => a + c.bytes, 0);
  console.log(`  peso total a subir    : ${(peso / 1048576).toFixed(1)} MB\n`);

  if (porTipo.fallida) {
    console.log("--- FALLIDAS ---");
    cambios
      .filter((c) => c.tipo === "fallida")
      .forEach((c) => console.log(`  ${c.col}/${c.doc} ${c.ruta}\n    ${c.de}\n    error: ${c.error}`));
    console.log("");
  }

  if (porTipo.reemplazo) {
    console.log("--- SUSTITUIDAS (no eran fotos concretas, eran URLs aleatorias) ---");
    cambios
      .filter((c) => c.tipo === "reemplazo")
      .forEach((c) => console.log(`  ${c.col}/${c.doc} ${c.ruta} <- ${c.origen}`));
    console.log("");
  }

  // ---- 5) Escritura en Firestore -----------------------------------------
  if (!APPLY) {
    fs.writeFileSync(
      path.join(__dirname, "migrate-template-images.plan.json"),
      JSON.stringify({ generado: new Date().toISOString(), cambios }, null, 2),
      "utf8"
    );
    console.log("DRY-RUN: no se subio nada a Storage ni se escribio en Firestore.");
    console.log("Plan detallado en scripts/migrate-template-images.plan.json");
    console.log("Revisalo y ejecuta:  node scripts/migrate-template-images.cjs --apply");
    await app.delete();
    return;
  }

  const batch = db.batch();
  let enBatch = 0;

  const guardarOriginales = (data, col, idDoc) => {
    const legacy = {};
    for (const c of cambios) {
      if (c.col !== col || c.doc !== idDoc || c.error) continue;
      // Una URL que ya esta en Storage NO es un valor original: es la
      // migracion de una corrida anterior. Guardarla como respaldo mezcla dos
      // estados y hace que el campo no sirva para volver atras.
      if (ES_URL_DEFINITIVA.test(c.de) || /GoogleAccessId=/.test(c.de)) continue;
      // leafExists y no mapLeaf: el documento AUN contiene c.de, asi que
      // escribirlo de nuevo se veria como "sin cambios" y no se guardaria nada.
      if (leafExists(data, c.ruta)) legacy[c.ruta] = c.de;
    }
    if (Object.keys(legacy).length) {
      // Se fusiona con lo que ya hubiera: merge:true REEMPLAZA el campo entero,
      // asi que un simple { legacyImageUrls: legacy } borraria los respaldos de
      // corridas anteriores (por ejemplo los de imagenes-originales.json).
      const previo = data.legacyImageUrls || {};
      batch.set(
        db.collection(col).doc(idDoc),
        { legacyImageUrls: { ...previo, ...legacy } },
        { merge: true }
      );
      enBatch++;
    }
  };

  // Primero el volcado de las URLs originales, en un paso aparte del replace:
  // asi un documento nunca queda con el campo nuevo y sin respaldo del viejo.
  for (const col of COLECCIONES) {
    const snap = await db.collection(col).get();
    for (const d of snap.docs) {
      const data = JSON.parse(JSON.stringify(d.data()));
      guardarOriginales(data, col, d.id);
    }
  }
  if (enBatch) {
    await batch.commit();
    console.log(`Guardadas las URLs originales en legacyImageUrls (${enBatch} documentos).`);
  }

  // Ahora el replace.
  const batch2 = db.batch();
  let n2 = 0;
  for (const col of COLECCIONES) {
    const snap = await db.collection(col).get();
    for (const d of snap.docs) {
      const data = JSON.parse(JSON.stringify(d.data()));
      let tocados = 0;
      for (const c of cambios) {
        if (c.col !== col || c.doc !== d.id || c.error) continue;
        tocados += mapLeaf(data, c.ruta, () => c.a) || 0;
      }
      if (tocados) {
        batch2.set(db.collection(col).doc(d.id), data);
        n2++;
      }
    }
  }
  if (n2) {
    await batch2.commit();
    console.log(`Reescritos ${n2} documentos en Firestore.`);
  }

  // Comprobacion posterior: ningun campo de imagen debe haber quedado como array.
  // mapLeaf devuelve null en una ruta que no existe y eso suma 0 al contador, de
  // modo que un fallo de reescritura pasaria inadvertido si no se mira el dato.
  const arraysRestantes = [];
  for (const col of COLECCIONES) {
    const snap = await db.collection(col).get();
    for (const d of snap.docs) {
      const recorrer = (valor, ruta) => {
        if (ruta === "legacyImageUrls") return;
        if (Array.isArray(valor)) {
          if (valor.length === 1 && typeof valor[0] === "string" && /^https?:\/\//.test(valor[0])) {
            arraysRestantes.push(`${col}/${d.id} ${ruta}`);
          }
          valor.forEach((v, i) => recorrer(v, `${ruta}[${i}]`));
          return;
        }
        if (valor && typeof valor === "object") {
          Object.entries(valor).forEach(([k, v]) => recorrer(v, ruta ? `${ruta}.${k}` : k));
        }
      };
      recorrer(d.data(), "");
    }
  }
  if (arraysRestantes.length) {
    console.log(`\nATENCION: ${arraysRestantes.length} campos de imagen siguen siendo arrays:`);
    for (const a of arraysRestantes.slice(0, 10)) console.log(`  ${a}`);
    process.exitCode = 1;
  } else {
    console.log("Comprobacion: ningun campo de imagen quedo como array.");
  }

  fs.writeFileSync(
    path.join(__dirname, "migrate-template-images.applied.json"),
    JSON.stringify({ aplicado: new Date().toISOString(), cambios }, null, 2),
    "utf8"
  );

  console.log(`\nLISTO. Cambios aplicados: ${stats.migradas} | fallidas: ${stats.fallidas}`);
  console.log(`Reversion: legacyImageUrls_ en cada documento, o restaurar desde ${path.basename(BACKUP_PATH)}`);
  await app.delete();
})().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});