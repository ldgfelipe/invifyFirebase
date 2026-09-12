"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/client";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import type { Order, Invitation, UserProfile, Template, Plan } from "@/lib/types";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/currency";

export default function AdminSalesPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"orders" | "invitations" | "users">("orders");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user]);

  async function loadAll() {
    try {
      // Orders
      const ordersQ = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const ordersSnap = await getDocs(ordersQ);
      setOrders(ordersSnap.docs.map((d) => d.data() as Order));

      // Invitations
      const invQ = query(collection(db, "invitations"), orderBy("createdAt", "desc"));
      const invSnap = await getDocs(invQ);
      setInvitations(invSnap.docs.map((d) => d.data() as Invitation));

      // Users
      const usersQ = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const usersSnap = await getDocs(usersQ);
      setUsers(usersSnap.docs.map((d) => d.data() as UserProfile));

      // Templates (for names)
      const tplQ = query(collection(db, "templates"));
      const tplSnap = await getDocs(tplQ);
      setTemplates(tplSnap.docs.map((d) => d.data() as Template));

      // Plans
      const plansQ = query(collection(db, "plans"));
      const plansSnap = await getDocs(plansQ);
      setPlans(plansSnap.docs.map((d) => d.data() as Plan));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteOrder(orderId: string) {
    if (!confirm("¿Eliminar este pedido permanentemente?")) return;
    setDeleting(orderId);
    try {
      await deleteDoc(doc(db, "orders", orderId));
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      alert("Pedido eliminado.");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setDeleting(null);
    }
  }

  // Maps for quick lookups
  const userMap = new Map(users.map((u) => [u.uid, u]));
  const templateMap = new Map(templates.map((t) => [t.id, t]));
  const planMap = new Map(plans.map((p) => [p.id, p]));

  // Stats
  const totalSales = orders.filter((o) => o.status === "paid").length;
  const totalRevenue = orders
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + (o.amount || 0), 0);
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const failedCount = orders.filter((o) => o.status === "failed").length;

  // Pending orders with enriched data
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const enrichedPending = pendingOrders.map((o) => {
    const u = userMap.get(o.uid);
    const tpl = o.templateId ? templateMap.get(o.templateId) : null;
    const pl = planMap.get(o.planId);
    return {
      ...o,
      userEmail: u?.email || "—",
      userName: u?.displayName || "—",
      templateName: tpl?.name || o.templateId || "—",
      planName: pl?.name || o.planId,
      currency: o.currency || "mxn",
    };
  });

  // Export CSV
  function exportPendingCSV() {
    const headers = [
      "Order ID",
      "Fecha",
      "Email",
      "Nombre",
      "Plan",
      "Plantilla",
      "Monto",
      "UID Usuario",
      "Template ID",
      "Moneda",
    ];
    const rows = enrichedPending.map((o) => [
      o.id,
      new Date(o.createdAt).toISOString(),
      o.userEmail,
      o.userName,
      o.planName,
      o.templateName,
      formatPrice(o.amount || 0, o.currency as "mxn" | "usd" | "eur"),
      o.uid,
      o.templateId || "",
      o.currency,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedidos-pendientes-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="text-center py-20 text-ink/60">Cargando CRM…</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-ink/10">
        {[
          { id: "orders" as const, label: "📦 Pedidos", count: orders.length },
          { id: "invitations" as const, label: "📨 Invitaciones", count: invitations.length },
          { id: "users" as const, label: "👥 Usuarios", count: users.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              activeTab === tab.id
                ? "bg-white text-gold-500 border-b-2 border-gold-500"
                : "text-ink/50 hover:text-ink/70"
            }`}
          >
            {tab.label} <span className="ml-2 bg-ink/10 text-ink/60 text-xs px-2 py-0.5 rounded-full">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Ventas completadas" value={totalSales} color="green" />
        <StatCard label="Ingresos totales" value={formatPrice(totalRevenue, "mxn")} color="gold" />
        <StatCard label="Pendientes" value={pendingCount} color="amber" />
        <StatCard label="Fallidos" value={failedCount} color="red" />
      </div>

      {activeTab === "orders" && (
        <OrderTable
          orders={orders}
          enrichedPending={enrichedPending}
          deleting={deleting}
          onDelete={deleteOrder}
          onExportCSV={exportPendingCSV}
          userMap={userMap}
          templateMap={templateMap}
          planMap={planMap}
        />
      )}

      {activeTab === "invitations" && (
        <InvitationTable invitations={invitations} users={users} planMap={planMap} />
      )}

      {activeTab === "users" && (
        <UserTable users={users} orders={orders} invitations={invitations} />
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  const colors = {
    green: "bg-green-50 text-green-700 border-green-200",
    gold: "bg-amber-50 text-amber-700 border-amber-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <div className={`card p-5 border ${colors[color as keyof typeof colors] || "bg-ink/5"}`}>
      <p className="text-2xl font-serif font-bold">{value}</p>
      <p className="text-xs text-ink/60 mt-1">{label}</p>
    </div>
  );
}

function OrderTable({
  orders,
  enrichedPending,
  deleting,
  onDelete,
  onExportCSV,
  userMap,
  templateMap,
  planMap,
}: {
  orders: Order[];
  enrichedPending: (Order & { userEmail: string; userName: string; templateName: string; planName: string })[];
  deleting: string | null;
  onDelete: (id: string) => void;
  onExportCSV: () => void;
  userMap: Map<string, UserProfile>;
  templateMap: Map<string, Template>;
  planMap: Map<string, Plan>;
}) {
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const paidOrders = orders.filter((o) => o.status === "paid");
  const failedOrders = orders.filter((o) => o.status === "failed");

  return (
    <div className="space-y-6">
      {/* Pendientes - con emails para marketing */}
      {pendingOrders.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-amber-800">⏳ Pendientes de pago ({pendingOrders.length})</h3>
            <button onClick={onExportCSV} className="btn-outline text-sm px-4 py-2">
              📥 Exportar CSV (Marketing)
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink/60 border-b border-ink/10">
                  <th className="py-3 px-4">Order ID</th>
                  <th>Email</th>
                  <th>Nombre</th>
                  <th>Plan</th>
                  <th>Plantilla</th>
                  <th>Monto</th>
                  <th>Creado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {enrichedPending.map((o) => (
                  <tr key={o.id} className="border-b border-ink/5 hover:bg-ink/5">
                    <td className="py-3 px-4 font-mono text-xs text-ink/70">{o.id.slice(0, 12)}…</td>
                    <td className="py-3 px-4">
                      <a href={`mailto:${o.userEmail}`} className="text-blue-600 hover:underline text-sm">{o.userEmail}</a>
                    </td>
                    <td className="py-3 px-4 text-sm">{o.userName}</td>
                    <td className="py-3 px-4 text-sm">{o.planName}</td>
                    <td className="py-3 px-4 text-sm">{o.templateName}</td>
                    <td className="py-3 px-4">{formatPrice(o.amount || 0, o.currency as "mxn" | "usd" | "eur")}</td>
                    <td className="py-3 px-4 text-ink/60">{new Date(o.createdAt).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onDelete(o.id)}
                        disabled={deleting === o.id}
                        className="btn-outline text-sm px-3 py-1 text-red-600 hover:bg-red-50"
                      >
                        {deleting === o.id ? "Eliminando…" : "Eliminar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-amber-700 mt-3">
            💡 Usa el botón <strong>Exportar CSV</strong> para obtener lista de emails y hacer campañas de recuperación (recordatorio de pago, descuento, etc.)
          </p>
        </section>
      )}

      {/* Pagados */}
      <section>
        <h3 className="font-semibold text-green-800 mb-3">✅ Completados ({paidOrders.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink/60 border-b border-ink/10">
                <th className="py-3 px-4">Order ID</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Plantilla</th>
                <th>Invitación</th>
                <th>Monto</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {paidOrders.map((o) => {
                const u = userMap.get(o.uid);
                const tpl = o.templateId ? templateMap.get(o.templateId) : null;
                const pl = planMap.get(o.planId);
                return (
                  <tr key={o.id} className="border-b border-ink/5 hover:bg-ink/5">
                    <td className="py-3 px-4 font-mono text-xs text-ink/70">{o.id.slice(0, 12)}…</td>
                    <td className="py-3 px-4"><a href={`mailto:${u?.email || ""}`} className="text-blue-600 hover:underline text-sm">{u?.email || "—"}</a></td>
                    <td className="py-3 px-4">{pl?.name || o.planId}</td>
                    <td className="py-3 px-4">{tpl?.name || o.templateId || "—"}</td>
                    <td className="py-3 px-4">{o.invitationId ? o.invitationId.slice(0, 8) + "…" : "—"}</td>
                    <td className="py-3 px-4">{formatPrice(o.amount || 0, o.currency as "mxn" | "usd" | "eur")}</td>
                    <td className="py-3 px-4 text-ink/60">{new Date(o.createdAt).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Fallidos */}
      {failedOrders.length > 0 && (
        <section className="mt-6">
          <h3 className="font-semibold text-red-800 mb-3">❌ Fallidos ({failedOrders.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink/60 border-b border-ink/10">
                  <th className="py-3 px-4">Order ID</th>
                  <th>Email</th>
                  <th>Plan</th>
                  <th>Motivo</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {failedOrders.map((o) => {
                  const u = userMap.get(o.uid);
                  return (
                    <tr key={o.id} className="border-b border-ink/5 hover:bg-ink/5">
                      <td className="py-3 px-4 font-mono text-xs text-ink/70">{o.id.slice(0, 12)}…</td>
                      <td className="py-3 px-4"><a href={`mailto:${u?.email || ""}`} className="text-blue-600 hover:underline text-sm">{u?.email || "—"}</a></td>
                      <td className="py-3 px-4">{o.planId}</td>
                      <td className="py-3 px-4 text-red-600">Pago fallido / expirado</td>
                      <td className="py-3 px-4 text-ink/60">{new Date(o.createdAt).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function InvitationTable({ invitations, users, planMap }: { invitations: Invitation[]; users: UserProfile[]; planMap: Map<string, Plan> }) {
  const userMap = new Map(users.map((u) => [u.uid, u]));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ink/60 border-b border-ink/10">
            <th className="py-3 px-4">Invitación</th>
            <th>Título</th>
            <th>Slug</th>
            <th>Dueño (Email)</th>
            <th>Plan</th>
            <th>Estado</th>
            <th>Vistas</th>
            <th>Creada</th>
          </tr>
        </thead>
        <tbody>
          {invitations.map((inv) => {
            const owner = userMap.get(inv.ownerUid);
            const pl = inv.planId ? planMap.get(inv.planId) : undefined;
            return (
              <tr key={inv.id} className="border-b border-ink/5 hover:bg-ink/5">
                <td className="py-3 px-4 font-mono text-xs text-ink/70">{inv.id.slice(0, 12)}…</td>
                <td className="py-3 px-4 font-medium">{inv.title}</td>
                <td className="py-3 px-4 font-mono text-sm">{inv.slug}</td>
                <td className="py-3 px-4">
                  {owner ? (
                    <a href={`mailto:${owner.email}`} className="text-blue-600 hover:underline text-sm">{owner.email}</a>
                  ) : (
                    <span className="text-ink/50">{inv.ownerUid.slice(0, 8)}…</span>
                  )}
                </td>
                <td className="py-3 px-4">{pl?.name || inv.planId || "—"}</td>
                <td className="py-3 px-4">
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    inv.status === "published"
                      ? "bg-green-100 text-green-700"
                      : "bg-ink/10 text-ink/60"
                  )}>
                    {inv.status === "published" ? "Publicada" : "Borrador"}
                  </span>
                </td>
                <td className="py-3 px-4">{inv.stats?.views ?? 0}</td>
                <td className="py-3 px-4 text-ink/60">{new Date(inv.createdAt).toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UserTable({ users, orders, invitations }: { users: UserProfile[]; orders: Order[]; invitations: Invitation[] }) {
  const userOrders = new Map<string, Order[]>();
  orders.forEach((o) => {
    if (!userOrders.has(o.uid)) userOrders.set(o.uid, []);
    userOrders.get(o.uid)!.push(o);
  });

  const userInvitations = new Map<string, Invitation[]>();
  invitations.forEach((inv) => {
    if (!userInvitations.has(inv.ownerUid)) userInvitations.set(inv.ownerUid, []);
    userInvitations.get(inv.ownerUid)!.push(inv);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ink/60 border-b border-ink/10">
            <th className="py-3 px-4">Usuario</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Pedidos</th>
            <th>Pagados</th>
            <th>Invitaciones</th>
            <th>Gasto total</th>
            <th>Registro</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const uOrders = userOrders.get(u.uid) || [];
            const paidOrders = uOrders.filter((o) => o.status === "paid");
            const uInvites = userInvitations.get(u.uid) || [];
            const totalSpent = paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
            return (
              <tr key={u.uid} className="border-b border-ink/5 hover:bg-ink/5">
                <td className="py-3 px-4 font-medium">{u.displayName || "Sin nombre"}</td>
                <td className="py-3 px-4"><a href={`mailto:${u.email}`} className="text-blue-600 hover:underline">{u.email}</a></td>
                <td className="py-3 px-4">
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    u.role === "admin" ? "bg-gold-100 text-gold-700" : "bg-ink/10 text-ink/60"
                  )}>
                    {u.role}
                  </span>
                </td>
                <td className="py-3 px-4">{uOrders.length}</td>
                <td className="py-3 px-4 text-green-600 font-medium">{paidOrders.length}</td>
                <td className="py-3 px-4">{uInvites.length}</td>
                <td className="py-3 px-4 font-medium">${(totalSpent / 100).toFixed(2)}</td>
                <td className="py-3 px-4 text-ink/60">{new Date(u.createdAt).toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}