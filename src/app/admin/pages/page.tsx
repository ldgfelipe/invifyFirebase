"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/client";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  deleteDoc,
  setDoc,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import type { Page, BuilderConfig } from "@/lib/types";
import { cn } from "@/lib/cn";
import { defaultBuilderConfig } from "@/lib/catalog";

export default function AdminPagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadPages();
  }, [user]);

  async function loadPages() {
    try {
      const q = query(collection(db, "pages"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setPages(snap.docs.map((d) => d.data() as Page));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function createPage() {
    setCreating(true);
    try {
      // Encuentra un slug único
      let slug = "/nueva-pagina";
      let counter = 1;
      const existingSlugs = new Set(pages.map((p) => p.slug));
      while (existingSlugs.has(slug)) {
        slug = `/nueva-pagina-${counter}`;
        counter++;
      }

      const newPage: Page = {
        id: doc(collection(db, "pages")).id,
        slug,
        title: "Nueva página",
        metaDescription: "",
        builderConfig: defaultBuilderConfig(),
        status: "draft",
        isHome: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await setDoc(doc(db, "pages", newPage.id), newPage);
      setPages([newPage, ...pages]);
      router.push(`/admin/pages/${newPage.id}`);
    } catch (err) {
      console.error(err);
      alert("Error creando página");
    } finally {
      setCreating(false);
    }
  }

  async function deletePage(page: Page) {
    if (!confirm(`Eliminar "${page.title}" (${page.slug})?`)) return;
    if (page.isHome) {
      alert("No se puede eliminar la página de inicio");
      return;
    }
    try {
      await deleteDoc(doc(db, "pages", page.id));
      setPages(pages.filter((p) => p.id !== page.id));
    } catch (err) {
      console.error(err);
      alert("Error eliminando página");
    }
  }

  async function duplicatePage(page: Page) {
    try {
      let slug = `${page.slug}-copia`;
      let counter = 1;
      const existingSlugs = new Set(pages.map((p) => p.slug));
      while (existingSlugs.has(slug)) {
        slug = `${page.slug}-copia-${counter}`;
        counter++;
      }

      const newPage: Page = {
        ...page,
        id: doc(collection(db, "pages")).id,
        slug,
        title: `${page.title} (copia)`,
        isHome: false,
        status: "draft",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await setDoc(doc(db, "pages", newPage.id), newPage);
      setPages([newPage, ...pages]);
    } catch (err) {
      console.error(err);
      alert("Error duplicando página");
    }
  }

  async function toggleHome(page: Page) {
    if (page.isHome) return;
    try {
      const batch = writeBatch(db);
      // Quita home de la actual
      const currentHome = pages.find((p) => p.isHome);
      if (currentHome) {
        batch.update(doc(db, "pages", currentHome.id), { isHome: false, slug: "/inicio", updatedAt: Date.now() });
      }
      // Pon home a esta
      batch.update(doc(db, "pages", page.id), { isHome: true, slug: "/", updatedAt: Date.now() });
      await batch.commit();
      loadPages();
    } catch (err) {
      console.error(err);
      alert("Error cambiando página de inicio");
    }
  }

  if (loading) return <div className="text-center py-20 text-ink/60">Cargando…</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="section-title">Páginas del sitio</h1>
        <button onClick={createPage} disabled={creating} className="btn-primary">
          {creating ? "Creando…" : "+ Crear página"}
        </button>
      </div>

      {pages.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-ink/60 mb-4">No hay páginas aún. Crea la primera.</p>
          <button onClick={createPage} className="btn-primary" disabled={creating}>
            {creating ? "Creando…" : "+ Crear página"}
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink/60 border-b border-ink/10">
              <th className="py-3 px-4">Página</th>
              <th className="py-3 px-4">Slug</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4">Inicio</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id} className="border-b border-ink/5 hover:bg-ink/5">
                <td className="py-3 px-4">
                  <p className="font-medium text-ink">{page.title}</p>
                  <p className="text-xs text-ink/50">{page.id.slice(0, 8)}…</p>
                </td>
                <td className="py-3 px-4 font-mono text-sm text-ink/70">{page.slug}</td>
                <td className="py-3 px-4">
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    page.status === "published"
                      ? "bg-green-100 text-green-700"
                      : "bg-ink/10 text-ink/60"
                  )}>
                    {page.status === "published" ? "Publicada" : "Borrador"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {page.isHome ? (
                    <span className="text-gold-500 font-medium">🏠 Inicio</span>
                  ) : (
                    <button
                      onClick={() => toggleHome(page)}
                      className="btn-outline text-xs px-3 py-1"
                    >
                      Poner como inicio
                    </button>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/pages/${page.id}`} className="btn-outline text-sm px-3 py-2">
                      Editar
                    </Link>
                    <button
                      onClick={() => duplicatePage(page)}
                      className="btn-outline text-sm px-3 py-2"
                    >
                      Duplicar
                    </button>
                    {!page.isHome && (
                      <button
                        onClick={() => deletePage(page)}
                        className="btn-outline text-sm px-3 py-2 text-red-600 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}