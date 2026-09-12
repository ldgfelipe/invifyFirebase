"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/client";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import type { Invitation, BuilderConfig, InvitationModule } from "@/lib/types";
import { EditorSidebar } from "@/components/editor/EditorSidebar";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { EditorPanel } from "@/components/editor/EditorPanel";
import { cn } from "@/lib/cn";

export default function InvitationEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [config, setConfig] = useState<BuilderConfig | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "invitations", id));
        if (!snap.exists()) {
          router.push("/dashboard");
          return;
        }
        const data = snap.data() as Invitation;
        setInvitation(data);
        setConfig(data.builderConfig);
      } catch (err) {
        console.error(err);
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, id, router]);

  const selectModule = useCallback((moduleId: string | null) => {
    setSelectedModuleId(moduleId);
  }, []);

  const updateModule = useCallback((moduleId: string, updates: Partial<InvitationModule>) => {
    if (!config) return;
    const newModules = config.modules.map((m) =>
      m.id === moduleId ? { ...m, ...updates } as InvitationModule : m
    );
    const newConfig = { ...config, modules: newModules };
    setConfig(newConfig);
  }, [config]);

  const addModule = useCallback((type: InvitationModule["type"]) => {
    if (!config) return;
    const newModule = createDefaultModule(type);
    const newConfig = { ...config, modules: [...config.modules, newModule as InvitationModule] };
    setConfig(newConfig);
    setSelectedModuleId(newModule.id);
  }, [config]);

  const removeModule = useCallback((moduleId: string) => {
    if (!config) return;
    const newConfig = { ...config, modules: config.modules.filter((m) => m.id !== moduleId) };
    setConfig(newConfig);
    setSelectedModuleId(null);
  }, [config]);

  const reorderModules = useCallback((fromIndex: number, toIndex: number) => {
    if (!config) return;
    const newModules = Array.from(config.modules);
    const [removed] = newModules.splice(fromIndex, 1);
    newModules.splice(toIndex, 0, removed);
    setConfig({ ...config, modules: newModules });
  }, [config]);

  const updateTheme = useCallback((theme: Partial<BuilderConfig["theme"]>) => {
    if (!config) return;
    setConfig({ ...config, theme: { ...config.theme, ...theme } });
  }, [config]);

  async function save() {
    if (!invitation || !config || !id) return;
    setSaving(true);
    setError(null);
    try {
      await updateDoc(doc(db, "invitations", id), {
        builderConfig: config,
        themeColor: config.theme.primaryColor,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center">Cargando editor…</div>;
  if (!invitation || !config) return <div className="flex h-screen items-center justify-center">Invitación no encontrada</div>;

  const selectedModule = config.modules.find((m) => m.id === selectedModuleId) ?? null;

  return (
    <div className="h-screen flex bg-ink/5">
      {/* Sidebar - lista de módulos */}
      <aside className="w-64 bg-white border-r border-ink/10 flex flex-col">
        <div className="p-4 border-b border-ink/10">
          <h1 className="font-serif text-xl text-ink">Editor</h1>
          <p className="text-xs text-ink/50 mt-1">{invitation.title}</p>
        </div>
        <EditorSidebar
          modules={config.modules}
          selectedId={selectedModuleId}
          onSelect={selectModule}
          onAdd={addModule}
          onRemove={removeModule}
          onReorder={reorderModules}
        />
        <div className="p-4 border-t border-ink/10">
          <button
            onClick={save}
            disabled={saving}
            className={cn("btn-primary w-full", saved && "bg-green-500")}
          >
            {saving ? "Guardando…" : saved ? "¡Guardado!" : "Guardar cambios"}
          </button>
          {error && <p className="text-red-600 text-sm mt-2 text-center">{error}</p>}
        </div>
      </aside>

      {/* Canvas - preview en vivo */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-ink/10 bg-white flex items-center justify-between">
          <h2 className="font-serif text-lg text-ink">Vista previa</h2>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input type="checkbox" checked={true} disabled /> Móvil
            </label>
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input type="checkbox" checked={true} disabled /> Escritorio
            </label>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-ink/5">
          <EditorCanvas config={config} selectedId={selectedModuleId} />
        </div>
      </main>

      {/* Panel lateral - editor del módulo seleccionado */}
      <aside className="w-80 bg-white border-l border-ink/10 flex flex-col">
        <div className="p-4 border-b border-ink/10">
          <h3 className="font-serif text-lg text-ink">
            {selectedModule ? `Editar: ${getModuleLabel(selectedModule.type)}` : "Selecciona un módulo"}
          </h3>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {selectedModule ? (
            <EditorPanel
              module={selectedModule}
              config={config}
              onUpdate={(updates) => updateModule(selectedModule.id, updates)}
              onRemove={() => removeModule(selectedModule.id)}
              theme={config.theme}
              onThemeChange={updateTheme}
            />
          ) : (
            <div className="text-center text-ink/50 py-20">
              <p>Haz clic en un módulo a la izquierda para editarlo</p>
              <p className="text-sm mt-2">O añade uno nuevo con el botón <span className="font-medium">+</span></p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function createDefaultModule(type: InvitationModule["type"]): InvitationModule {
  const base = { id: crypto.randomUUID(), type, visible: true };
  switch (type) {
    case "header":
      return { ...base, title: "Título", subtitle: "Subtítulo", names: "Nombres" } as any;
    case "preloader":
      return { ...base, imageUrl: "", text: "Cargando…" } as any;
    case "countdown":
      return { ...base, targetDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0], label: "Falta para el evento" } as any;
    case "audio":
      return { ...base, src: "", autoplay: false } as any;
    case "carousel":
      return { ...base, images: [] } as any;
    case "location":
      return { ...base, venue: "Lugar", address: "Dirección", lat: 0, lng: 0 } as any;
    case "dresscode":
      return { ...base, code: "Elegante", description: "" } as any;
    case "itinerary":
      return { ...base, items: [] } as any;
    case "giftTable":
      return { ...base, items: [] } as any;
    case "quiz":
      return { ...base, title: "Quiz", questions: [] } as any;
    case "rsvp":
      return { ...base, title: "Confirmar asistencia", collectEmail: true } as any;
    default:
      return base as any;
  }
}

function getModuleLabel(type: string): string {
  const labels: Record<string, string> = {
    preloader: "Precargador",
    header: "Cabecera",
    countdown: "Cuenta regresiva",
    audio: "Audio",
    carousel: "Carrusel",
    location: "Ubicación",
    dresscode: "Dresscode",
    itinerary: "Itinerario",
    giftTable: "Mesa de regalos",
    quiz: "Quiz",
    rsvp: "RSVP",
  };
  return labels[type] ?? type;
}