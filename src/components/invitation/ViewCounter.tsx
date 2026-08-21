"use client";

// ============================================================================
// VIEW COUNTER - Suma una apertura al montar la invitación.
// Usa localStorage para marcar vistas únicas por invitación.
// ============================================================================
import { useEffect } from "react";

export function ViewCounter({ invitationId }: { invitationId: string }) {
  useEffect(() => {
    const key = `invify_view_${invitationId}`;
    const unique = !localStorage.getItem(key);

    fetch("/api/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId, unique }),
      keepalive: true,
    }).catch(() => {});

    if (unique) localStorage.setItem(key, "1");
  }, [invitationId]);

  return null;
}
