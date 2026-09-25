// ============================================================================
// AI - Catálogo de proveedores.
// La mayoría de servicios de IA exponen una API compatible con OpenAI
// (POST {baseUrl}/chat/completions + Authorization: Bearer). Cubrirlos con un
// solo adaptador da soporte a decenas de proveedores y a sus miles de modelos
// sin código extra por proveedor.
//
// Gemini es la excepción: usa `models/{modelo}:generateContent`, autentica con
// la cabecera `x-goog-api-key` y env��l `contents[]` en vez de `messages[]`.
// Por eso tiene su propio adaptador en client.ts (wire: "gemini").
//
// Añadir un proveedor nuevo: una entrada aquí. No hace falta tocar el cliente.
// ============================================================================
import type { AiProvider } from "@/lib/types";

/** Formato de conversación que habla el proveedor. */
export type WireFormat = "openai" | "gemini";

export interface ProviderPreset {
  id: AiProvider;
  label: string;
  /** Host o etiqueta de grupo en el selector. */
  group: string;
  wire: WireFormat;
  baseUrl: string;
  defaultModel: string;
  /** Sugerencias para el datalist del campo modelo. */
  models: string[];
  /** Si exige credencial. Los servidores locales (Ollama, LM Studio) no. */
  requiresKey: boolean;
  /** Pista sobre el formato o el uso de la clave. */
  keyHint?: string;
  note?: string;
  /**
   * Permite listar el catálogo real con GET {baseUrl}/models.
   * Los endpoints locales y proxies a menudo no lo implementan.
   */
  canListModels: boolean;
}

const P = (p: ProviderPreset) => p;

export const PROVIDERS: ProviderPreset[] = [
  // ------------------------------ OpenAI-compatible ------------------------------
  P({
    id: "openai",
    label: "OpenAI",
    group: "OpenAI-compatible",
    wire: "openai",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1", "o4-mini"],
    requiresKey: true,
    canListModels: true,
  }),
  P({
    id: "openrouter",
    label: "OpenRouter (un solo Hub, 300+ modelos)",
    group: "Agregadores",
    wire: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "google/gemini-2.0-flash-001",
    models: [
      "google/gemini-2.0-flash-001",
      "anthropic/claude-3.5-sonnet",
      "openai/gpt-4o-mini",
      "meta-llama/llama-3.3-70b-instruct",
      "deepseek/deepseek-chat",
      "qwen/qwen-2.5-72b-instruct",
    ],
    requiresKey: true,
    note: "Permite acceso a casi cualquier modelo del mercado con una sola clave.",
    canListModels: true,
  }),
  P({
    id: "groq",
    label: "Groq (muy rápido, capa gratuita)",
    group: "Agregadores",
    wire: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "openai/gpt-oss-120b",
      "qwen/qwen3-32b",
      "moonshotai/kimi-k2-instruct",
    ],
    requiresKey: true,
    canListModels: true,
  }),
  P({
    id: "xai",
    label: "xAI · Grok",
    group: "Agregadores",
    wire: "openai",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-2-latest",
    models: ["grok-2-latest", "grok-beta", "grok-2-vision-latest"],
    requiresKey: true,
    canListModels: true,
  }),
  P({
    id: "deepseek",
    label: "DeepSeek",
    group: "Agregadores",
    wire: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
    requiresKey: true,
    canListModels: true,
  }),
  P({
    id: "mistral",
    label: "Mistral AI",
    group: "Agregadores",
    wire: "openai",
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-small-latest",
    models: ["mistral-small-latest", "mistral-large-latest", "open-mistral-nemo"],
    requiresKey: true,
    canListModels: true,
  }),
  P({
    id: "together",
    label: "Together AI",
    group: "Agregadores",
    wire: "openai",
    baseUrl: "https://api.together.xyz/v1",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    models: [
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      "mistralai/Mixtral-8x7B-Instruct-v0.1",
      "Qwen/Qwen2.5-72B-Instruct-Turbo",
    ],
    requiresKey: true,
    canListModels: true,
  }),
  P({
    id: "siliconflow",
    label: "SiliconFlow",
    group: "Agregadores",
    wire: "openai",
    baseUrl: "https://api.siliconflow.cn/v1",
    defaultModel: "Qwen/Qwen2.5-72B-Instruct",
    models: ["Qwen/Qwen2.5-72B-Instruct", "deepseek-ai/DeepSeek-V3", "meta-llama/Llama-3.3-70B-Instruct"],
    requiresKey: true,
    canListModels: true,
  }),
  P({
    id: "fireworks",
    label: "Fireworks AI",
    group: "Agregadores",
    wire: "openai",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    defaultModel: "accounts/fireworks/models/llama-v3p3-70b-instruct",
    models: [
      "accounts/fireworks/models/llama-v3p3-70b-instruct",
      "accounts/fireworks/models/qwen2p5-72b-instruct",
    ],
    requiresKey: true,
    canListModels: true,
  }),
  P({
    id: "cerebras",
    label: "Cerebras",
    group: "Agregadores",
    wire: "openai",
    baseUrl: "https://api.cerebras.ai/v1",
    defaultModel: "llama-3.3-70b",
    models: ["llama-3.3-70b", "llama3.1-8b", "qwen-3-32b"],
    requiresKey: true,
    canListModels: true,
  }),
  P({
    id: "perplexity",
    label: "Perplexity",
    group: "Agregadores",
    wire: "openai",
    baseUrl: "https://api.perplexity.ai",
    defaultModel: "sonar",
    models: ["sonar", "sonar-pro", "sonar-reasoning"],
    requiresKey: true,
    note: "Orientado a búsqueda; su salida no es ideal para JSON estricto.",
    canListModels: false,
  }),
  P({
    id: "nvidia",
    label: "NVIDIA NIM",
    group: "Agregadores",
    wire: "openai",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    defaultModel: "meta/llama-3.3-70b-instruct",
    models: ["meta/llama-3.3-70b-instruct", "nvidia/llama-3.1-nemotron-70b-instruct"],
    requiresKey: true,
    canListModels: true,
  }),
  P({
    id: "novita",
    label: "Novita AI",
    group: "Agregadores",
    wire: "openai",
    baseUrl: "https://api.novita.ai/v1",
    defaultModel: "meta-llama/llama-3.3-70b-instruct",
    models: ["meta-llama/llama-3.3-70b-instruct"],
    requiresKey: true,
    canListModels: true,
  }),
  P({
    id: "hyperbolic",
    label: "Hyperbolic",
    group: "Agregadores",
    wire: "openai",
    baseUrl: "https://api.hyperbolic.xyz/v1",
    defaultModel: "meta-llama/llama-3.3-70b-instruct",
    models: ["meta-llama/llama-3.3-70b-instruct"],
    requiresKey: true,
    canListModels: true,
  }),
  P({
    id: "cloudflare",
    label: "Cloudflare Workers AI",
    group: "Agregadores",
    wire: "openai",
    baseUrl: "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1",
    defaultModel: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    models: [
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      "@cf/meta/llama-3.1-8b-instruct",
      "@cf/qwen/qwen2.5-7b-instruct",
    ],
    requiresKey: true,
    note: "Sustituye {account_id} por el ID de tu cuenta (Dashboard → Workers & Pages → account ID). Autentica con un API Token de cuenta, no con una API key de OpenAI.",
    canListModels: false,
  }),

  // --------------------------------- Locales ---------------------------------
  P({
    id: "ollama",
    label: "Ollama (local)",
    group: "Locales / self-hosted",
    wire: "openai",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.2",
    models: ["llama3.2", "llama3.1", "qwen2.5", "mistral", "phi3"],
    requiresKey: false,
    canListModels: true,
  }),
  P({
    id: "lmstudio",
    label: "LM Studio (local)",
    group: "Locales / self-hosted",
    wire: "openai",
    baseUrl: "http://localhost:1234/v1",
    defaultModel: "local-model",
    models: [],
    requiresKey: false,
    canListModels: true,
  }),
  P({
    id: "llamacpp",
    label: "llama.cpp server (local)",
    group: "Locales / self-hosted",
    wire: "openai",
    baseUrl: "http://localhost:8080/v1",
    defaultModel: "local-model",
    models: [],
    requiresKey: false,
    canListModels: false,
  }),

  // --------------------------------- Nativos ---------------------------------
  P({
    id: "gemini",
    label: "Google Gemini",
    group: "Formato nativo",
    wire: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-2.0-flash",
    models: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash"],
    requiresKey: true,
    keyHint: "x-goog-api-key",
    note: "Usa su propio formato (generateContent), no el de OpenAI.",
    canListModels: true,
  }),

  // --------------------------------- Custom ---------------------------------
  P({
    id: "custom",
    label: "Personalizado (proxy / self-hosted)",
    group: "Formato nativo",
    wire: "openai",
    baseUrl: "",
    defaultModel: "",
    models: [],
    requiresKey: true,
    note: "Cualquier endpoint compatible con OpenAI. Escribe la Base URL completa, incluido el /v1.",
    canListModels: true,
  }),
];

const BY_ID = new Map(PROVIDERS.map((p) => [p.id, p]));

export const DEFAULT_PROVIDER_ID: AiProvider = "openai";

/** Resuelve un id a su preset; ante un id desconocido cae en "custom". */
export function resolveProvider(id: unknown): ProviderPreset {
  if (typeof id === "string" && BY_ID.has(id as AiProvider)) {
    return BY_ID.get(id as AiProvider)!;
  }
  return BY_ID.get("custom")!;
}

export const isKnownProvider = (id: unknown): id is AiProvider =>
  typeof id === "string" && BY_ID.has(id as AiProvider);

/** Base URL "vacía de forma utilizable": sin placeholders sin resolver. */
export const isUsableBaseUrl = (url: string): boolean =>
  Boolean(url) && !url.includes("{") && /^https?:\/\//i.test(url);

export const providerGroupLabels: Record<string, string> = {
  "OpenAI-compatible": "OpenAI",
  Agregadores: "Agregadores y hosted",
  "Locales / self-hosted": "Locales / self-hosted",
  "Formato nativo": "Otros",
};
