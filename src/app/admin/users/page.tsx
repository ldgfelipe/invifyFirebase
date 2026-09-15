"use client";

// ============================================================================
// GESTOR DE USUARIOS (/admin/users)
// Administrar permisos (rol), datos fiscales, y ver compras/facturación.
// ============================================================================
import { Fragment, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/client";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import type { UserProfile, UserBilling, Order, Plan, Invitation } from "@/lib/types";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/currency";
import { isOwnerAdminEmail } from "@/lib/config";
import InvoiceModal from "@/components/admin/InvoiceModal";

const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  paid: { label: "Pagado", cls: "bg-green-100 text-green-700" },
  pending: { label: "Pendiente", cls: "bg-amber-100 text-amber-700" },
  failed: { label: "Fallido", cls: "bg-red-100 text-red-700" },
  canceled: { label: "Cancelado", cls: "bg-ink/10 text-ink/60" },
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [billingUser, setBillingUser] = useState<UserProfile | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [savingUid, setSavingUid] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user]);

  async function loadAll() {
    try {
      const [usersSnap, ordersSnap, plansSnap, invSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "plans")),
        getDocs(collection(db, "invitations")),
      ]);
      setUsers(usersSnap.docs.map((d) => d.data() as UserProfile));
      setOrders(ordersSnap.docs.map((d) => d.data() as Order));
      setPlans(plansSnap.docs.map((d) => d.data() as Plan));
      setInvitations(invSnap.docs.map((d) => d.data() as Invitation));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(u: UserProfile, role: "admin" | "cliente") {
    if (u.role === role) return;
    if (!confirm(`¿Cambiar rol de ${u.email} a "${role}"?`)) return;
    setSavingUid(u.uid);
    try {
      await updateDoc(doc(db, "users", u.uid), { role });
      setUsers((prev) => prev.map((x) => (x.uid === u.uid ? { ...x, role } : x)));
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSavingUid(null);
    }
  }

  async function saveBilling(uid: string, billing: UserProfile["billing"]) {
    setSavingUid(uid);
    try {
      await updateDoc(doc(db, "users", uid), { billing });
      setUsers((prev) => prev.map((x) => (x.uid === uid ? { ...x, billing } : x)));
      setBillingUser(null);
      alert("Datos fiscales guardados.");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSavingUid(null);
    }
  }

  const planMap = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.displayName || "").toLowerCase().includes(q) ||
        (u.billing?.rfc || "").toLowerCase().includes(q) ||
        (u.billing?.razonSocial || "").toLowerCase().includes(q)
    );
  }, [users, search]);

  if (loading) return <div className="text-center py-20 text-ink/60">Cargando usuarios…</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="section-title mb-6">Usuarios</h1>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <input
          className="input max-w-sm"
          placeholder="Buscar por email, nombre, RFC…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-sm text-ink/50">{filtered.length} usuarios</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink/60 border-b border-ink/10">
              <th className="py-3 px-4">Usuario</th>
              <th>Rol</th>
              <th>Datos fiscales</th>
              <th>Compras</th>
              <th>Gasto total</th>
              <th>Registro</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const uOrders = orders.filter((o) => o.uid === u.uid);
              const uInvoices = invitations.filter((i) => i.ownerUid === u.uid);
              const paid = uOrders.filter((o) => o.status === "paid");
              const totalSpent = paid.reduce((s, o) => s + (o.amount || 0), 0);
              const isExpanded = expandedUid === u.uid;
              const isOwner = isOwnerAdminEmail(u.email);
              return (
                <Fragment key={u.uid}>
                  <tr className="border-b border-ink/5 hover:bg-ink/5">
                    <td className="py-3 px-4">
                      <p className="font-medium text-ink">{u.displayName || "Sin nombre"}</p>
                      <a href={`mailto:${u.email}`} className="text-blue-600 hover:underline text-xs">
                        {u.email}
                      </a>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          "text-xs px-2 py-1 rounded-full",
                          u.role === "admin"
                            ? "bg-gold-100 text-gold-700"
                            : "bg-ink/10 text-ink/60"
                        )}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {u.billing?.rfc ? (
                        <span>
                          {u.billing.rfc}
                          {u.billing.razonSocial ? <> · {u.billing.razonSocial}</> : null}
                        </span>
                      ) : (
                        <span className="text-ink/40">Sin datos</span>
                      )}
                    </td>
                    <td className="py-3 px-4">{uOrders.length} ({paid.length} pagadas)</td>
                    <td className="py-3 px-4 font-medium">{formatPrice(totalSpent, "mxn")}</td>
                    <td className="py-3 px-4 text-ink/60">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString("es-ES") : "—"}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setExpandedUid(isExpanded ? null : u.uid)}
                        className="btn-outline text-sm px-3 py-1 mr-1"
                      >
                        {isExpanded ? "Ocultar" : "Compras"}
                      </button>
                      <button
                        onClick={() => setBillingUser(u)}
                        className="btn-outline text-sm px-3 py-1 mr-1"
                      >
                        Facturación
                      </button>
                      {!isOwner && (
                        <button
                          onClick={() => changeRole(u, u.role === "admin" ? "cliente" : "admin")}
                          disabled={savingUid === u.uid}
                          className={cn(
                            "btn-outline text-sm px-3 py-1",
                            u.role === "admin"
                              ? "text-red-600 hover:bg-red-50"
                              : "text-green-600 hover:bg-green-50"
                          )}
                        >
                          {savingUid === u.uid
                            ? "…"
                            : u.role === "admin"
                            ? "Quitar admin"
                            : "Hacer admin"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="py-3 px-4 bg-ink/5">
                        <UserOrders
                          uid={u.uid}
                          uOrders={uOrders}
                          invitations={uInvoices}
                          planMap={planMap}
                          onInvoice={(o) => setInvoiceOrder(o)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {billingUser && (
        <BillingModal
          user={billingUser}
          saving={savingUid === billingUser.uid}
          onClose={() => setBillingUser(null)}
          onSave={(b) => saveBilling(billingUser.uid, b)}
        />
      )}

      {invoiceOrder && (
        <InvoiceModal
          order={invoiceOrder}
          user={invoiceOrder.uid ? users.find((u) => u.uid === invoiceOrder.uid) : null}
          onClose={() => setInvoiceOrder(null)}
        />
      )}
    </div>
  );
}

function UserOrders({
  uid,
  uOrders,
  invitations,
  planMap,
  onInvoice,
}: {
  uid: string;
  uOrders: Order[];
  invitations: Invitation[];
  planMap: Map<string, Plan>;
  onInvoice: (o: Order) => void;
}) {
  const uInviteIds = new Map(invitations.map((i: any) => [i.id, i]));
  if (uOrders.length === 0) {
    return <p className="text-sm text-ink/50 py-2">Este usuario no tiene compras.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-ink/60 border-b border-ink/10">
            <th className="py-2 px-3">Pedido</th>
            <th>Plan</th>
            <th>Invitación</th>
            <th>Monto</th>
            <th>Estado</th>
            <th>Fecha</th>
            <th className="text-right">Factura</th>
          </tr>
        </thead>
        <tbody>
          {uOrders.map((o) => {
            const st = ORDER_STATUS[o.status] || ORDER_STATUS.pending;
            const plan = planMap.get(o.planId);
            const inv = o.invitationId ? uInviteIds.get(o.invitationId) : null;
            return (
              <tr key={o.id} className="border-b border-ink/5">
                <td className="py-2 px-3 font-mono text-ink/70">{o.id.slice(0, 12)}…</td>
                <td className="py-2 px-3">{plan?.name || o.planId}</td>
                <td className="py-2 px-3">{inv ? inv.title : o.invitationId ? o.invitationId.slice(0, 8) + "…" : "—"}</td>
                <td className="py-2 px-3">{formatPrice(o.amount || 0, (o.currency as any) || "mxn")}</td>
                <td className="py-2 px-3">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", st.cls)}>{st.label}</span>
                </td>
                <td className="py-2 px-3 text-ink/60">{new Date(o.createdAt).toLocaleString()}</td>
                <td className="py-2 px-3 text-right">
                  <button
                    onClick={() => onInvoice(o)}
                    className="text-gold-600 hover:underline"
                  >
                    Ver factura
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BillingModal({
  user,
  saving,
  onClose,
  onSave,
}: {
  user: UserProfile;
  saving: boolean;
  onClose: () => void;
  onSave: (billing: UserProfile["billing"]) => void;
}) {
  const [form, setForm] = useState<UserBilling>(user.billing || {});
  const set = (k: keyof UserBilling, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-serif text-xl text-ink mb-1">Datos de facturación</h2>
        <p className="text-sm text-ink/50 mb-4">{user.email}</p>
        <div className="space-y-3">
          <Field label="RFC" value={form.rfc || ""} onChange={(v) => set("rfc", v)} />
          <Field label="Razón social / Nombre" value={form.razonSocial || ""} onChange={(v) => set("razonSocial", v)} />
          <Field label="Email fiscal" value={form.emailFiscal || ""} onChange={(v) => set("emailFiscal", v)} />
          <Field label="Dirección" value={form.direccion || ""} onChange={(v) => set("direccion", v)} />
          <Field label="C.P." value={form.cp || ""} onChange={(v) => set("cp", v)} />
          <Field label="Teléfono" value={form.telefono || ""} onChange={(v) => set("telefono", v)} />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-outline px-4 py-2 text-sm">Cancelar</button>
          <button
            onClick={() => onSave(form)}
            disabled={saving}
            className="btn-primary px-4 py-2 text-sm"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-ink/60">{label}</span>
      <input className="input mt-1" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}