"use client";

import { InvitationRenderer } from "@/components/invitation/InvitationRenderer";
import type { BuilderConfig } from "@/lib/types";

interface EditorCanvasProps {
  config: BuilderConfig;
  selectedId: string | null;
}

export function EditorCanvas({ config, selectedId }: EditorCanvasProps) {
  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-xl overflow-hidden">
      <div className="h-12 bg-gradient-to-r from-gold-100 to-champagne border-b border-ink/10 flex items-center justify-center px-4">
        <span className="text-xs text-ink/50 uppercase tracking-widest">Vista previa en vivo</span>
      </div>
      <div className="min-h-[500px] p-4">
        <InvitationRenderer config={config} invitationId="editor-preview" demo />
      </div>
    </div>
  );
}