"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/client";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { cn } from "@/lib/cn";

export default function ProfilePage() {
  const { user, profile, updateUserProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? "");
      setPhone(profile.phone ?? "");
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatarUrl ?? "");
    }
  }, [profile]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const updates: Partial<UserProfile> = {
        displayName,
        phone,
        bio,
      };
      if (avatarFile) {
        // TODO: subir a Firebase Storage y obtener URL
        // Por ahora solo guardamos en estado local
      }
      await updateDoc(doc(db, "users", user.uid), updates);
      // Actualiza contexto local
      updateUserProfile({ ...profile!, ...updates });
      setMsg("Perfil actualizado correctamente");
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("La imagen no debe superar 2MB");
      return;
    }
    setAvatarFile(file);
    setAvatarUrl(URL.createObjectURL(file));
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="section-title">Mi perfil</h1>
      </div>

      <div className="card p-8 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative w-24 h-24 flex-shrink-0">
            <div className="w-full h-full rounded-full bg-champagne overflow-hidden border-4 border-white shadow">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-3xl font-serif text-ink/50">
                    {displayName?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U"}
                  </span>
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-gold-500 text-white p-2 rounded-full cursor-pointer hover:bg-gold-600 transition">
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="sr-only" />
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </label>
          </div>
          <div>
            <p className="font-serif text-xl text-ink">{displayName || "Sin nombre"}</p>
            <p className="text-sm text-ink/60">{user.email}</p>
            <p className="text-xs text-ink/50 mt-1">
              {profile?.role === "admin" ? "👑 Administrador" : "👤 Cliente"}
            </p>
          </div>
        </div>

        <div className="border-t border-ink/10 pt-6 space-y-5">
          <h2 className="font-serif text-lg text-ink">Información personal</h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-ink/70 block mb-1">Nombre completo</label>
              <input
                type="text"
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>

            <div>
              <label className="text-sm text-ink/70 block mb-1">Teléfono (opcional)</label>
              <input
                type="tel"
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+34 600 000 000"
              />
            </div>

            <div>
              <label className="text-sm text-ink/70 block mb-1">Bio / Descripción (opcional)</label>
              <textarea
                className="input min-h-[100px]"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Cuéntanos algo sobre ti..."
              />
            </div>
          </div>

          <div className="border-t border-ink/10 pt-6">
            <h2 className="font-serif text-lg text-ink mb-4">Cuenta</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-ink/60">Email:</span> <span className="text-ink ml-2">{user.email}</span></p>
              <p><span className="text-ink/60">UID:</span> <span className="text-ink ml-2 font-mono">{user.uid}</span></p>
              <p><span className="text-ink/60">Registrado:</span> <span className="text-ink ml-2">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("es-ES") : "—"}
              </span></p>
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {msg && <p className="text-green-600 text-sm">{msg}</p>}

          <div className="flex gap-3 pt-4 border-t border-ink/10">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
            <button
              onClick={() => {
                if (confirm("¿Cerrar sesión?")) {
                  // signOut() is from useAuth
                }
              }}
              className="btn-outline"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}