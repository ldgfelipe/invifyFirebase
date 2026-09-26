// ============================================================================
// AIAssistant
// Ícono flotante inferior-derecho en el editor de invitaciones que abre un
// chat con la IA. La IA modifica el builderConfig que el cliente está
// editando en tiempo real, aplicando los cambios a la vista previa.
//
// El tooltip "¿Necesitas ayuda de la IA? Estoy para servirte" aparece cuando
// el chat está cerrado y se puede descartar (se guarda en localStorage).
//
// Materiales: el panel muestra los fondos por tema, estilos de imagen y el
// banco de imágenes locales para que el usuario elija y la IA los aplique.
// ============================================================================
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n/provider";
import { useAuth } from "@/context/AuthContext";
import { uploadFileAsWebp } from "@/lib/imageUpload";
import { ATMOSPHERE_OPTIONS, IMAGE_STYLE_OPTIONS } from "@/lib/ai/options";
import type { BuilderConfig } from "@/lib/types";

const DISMISS_KEY = "invify_ai_assistant_dismissed";
const MAX_ATTEMPTS = 20;
const BASE = "";

export function AIAssistant({
  config,
  setConfig,
  invitationId,
}: {
  config: BuilderConfig;
  setConfig: (c: BuilderConfig) => void;
  invitationId: string;
}) {
  const { locale } = useLanguage();
  const { user } = useAuth();
  const isEn = locale === "en";

  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([
    {
      role: "assistant",
      text: isEn
        ? "Hi! I'm your design assistant. Tell me what you want to change in this invitation and I'll update it right away."
        : "¡Hola! Soy tu asistente de diseño. Dime qué quieres cambiar en esta invitación y la actualizo al momento.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function dismissTooltip() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    setSending(true);
    const msg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", text: msg }]);

    try {
      const token = await user!.getIdToken();
      const res = await fetch("/api/ai/edit-template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          invitationId,
          builderConfig: config,
          message: msg,
          language: locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Error de la conexión");
      }
      if (data.warning) {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: data.warning },
        ]);
      } else if (data.builderConfig) {
        setConfig(data.builderConfig as BuilderConfig);
        const preview = JSON.stringify(data.builderConfig);
        const summary =
          preview.length > 260 ? preview.slice(0, 260) + "…" : preview;
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: `Listo. He actualizado la invitación. ${summary}`,
          },
        ]);
      }
    } catch (e: any) {
      setError(e.message);
      setMessages((m) => [
        ...m,
        { role: "assistant", text: `Error: ${e.message}. Intenta de nuevo.` },
      ]);
    } finally {
      setSending(false);
    }
  }

  function insertMaterial(text: string) {
    setInput((prev) => prev + text);
    setMaterialOpen(false);
  }

  async function handleUpload() {
    if (!user) return;
    const el = document.createElement("input");
    el.type = "file";
    el.accept = "image/*";
    el.onchange = async () => {
      const file = el.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      setUploadingImg(true);
      try {
        const url = await uploadFileAsWebp(file, user.uid, invitationId);
        setInput((prev) => prev + ` [img](${url})`);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setUploadingImg(false);
      }
    };
    el.click();
  }

  // --- Render ---
  return (
    <>
      {/* Tooltip (solo cuando está cerrado y no descartado) */}
      {!open && !dismissed && (
        <div className="fixed bottom-20 right-6 z-40 transition-opacity duration-300 opacity-100">
          <div className="bg-ink text-white text-sm rounded-xl px-4 py-3 shadow-lg max-w-xs leading-relaxed">
            {isEn
              ? "Need AI help? I'm here to help you"
              : "¿Necesitas ayuda de la IA? Estoy para servirte"}
            <button
              onClick={dismissTooltip}
              className="ml-2 text-white/60 hover:text-white underline text-xs"
              title="Descartar"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Botón flotante */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-gold-500 text-white shadow-lg hover:bg-gold-600 transition flex items-center justify-center text-2xl"
        title={isEn ? "AI Assistant" : "Asistente IA"}
        aria-label="Abrir asistente de IA"
      >
        ✨
      </button>

      {/* Panel de chat */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20">
          <div
            className="bg-white rounded-t-2xl shadow-2xl flex flex-col"
            style={{ width: "100%", maxWidth: 480, height: "80vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-ink/10">
              <div>
                <h3 className="font-serif text-lg text-ink">
                  {isEn ? "AI Assistant" : "Asistente IA"}
                </h3>
                <p className="text-xs text-ink/50">
                  Edita la invitación con lenguaje natural
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-ink/40 hover:text-ink rounded"
              >
                ✕
              </button>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "assistant" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                      m.role === "assistant"
                        ? "bg-ink/5 text-ink"
                        : "bg-gold-500 text-white"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="text-xs text-ink/40 text-center">Pensando…</div>
              )}
              {error && (
                <div className="text-xs text-red-500 text-center">{error}</div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Materiales */}
            <div className="border-t border-ink/10">
              <button
                type="button"
                onClick={() => setMaterialOpen((o) => !o)}
                className="w-full text-xs text-ink/60 px-4 py-2 hover:bg-ink/5 flex items-center justify-between"
              >
                <span>📦 Materiales (fondos, estilos, imágenes)</span>
                <span>{materialOpen ? "▲" : "▼"}</span>
              </button>
              {materialOpen && (
                <div className="px-4 pb-3 space-y-3 max-h-48 overflow-auto border-t border-ink/5 pt-2">
                  <div>
                    <p className="text-[11px] text-ink/50 mb-1">Fondos por tema</p>
                    <div className="flex flex-wrap gap-1">
                      {ATMOSPHERE_OPTIONS.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() =>
                            insertMaterial(
                              `cambia el fondo global al tema ${a.id} (fondo ${a.palette.background}, texto ${a.palette.textColor})`
                            )
                          }
                          className="text-[11px] px-2 py-0.5 rounded border border-ink/10 hover:bg-ink/5"
                          title={`Fondo ${a.palette.background}`}
                        >
                          <span
                            className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
                            style={{ background: a.palette.background }}
                          />
                          {a.id}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-ink/50 mb-1">Estilos de imagen</p>
                    <div className="flex flex-wrap gap-1">
                      {IMAGE_STYLE_OPTIONS.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() =>
                            insertMaterial(`cambia el estilo de imágenes a ${s.id}`)
                          }
                          className="text-[11px] px-2 py-0.5 rounded border border-ink/10 hover:bg-ink/5"
                        >
                          {s.id}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-ink/50 mb-1">
                      Imágenes locales (/api/thumb/lock/N)
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() =>
                            insertMaterial(`pon la imagen /api/thumb/lock/${n}`)
                          }
                          className="text-[10px] px-1.5 py-0.5 rounded border border-ink/10 hover:bg-ink/5"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-ink/10 flex gap-2">
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploadingImg || !user}
                className="shrink-0 px-2 py-2 text-ink/50 hover:text-ink text-sm disabled:opacity-40"
                title={isEn ? "Attach image" : "Adjuntar imagen"}
              >
                {uploadingImg ? "…" : "🖼️"}
              </button>
              <input
                className="input flex-1 text-sm"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={
                  isEn
                    ? "Tell me what to change…"
                    : "Dime qué cambiar…"
                }
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="shrink-0 px-3 py-2 bg-gold-500 text-white text-sm font-medium rounded-lg hover:bg-gold-600 disabled:opacity-50"
              >
                {sending ? "…" : "➤"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
