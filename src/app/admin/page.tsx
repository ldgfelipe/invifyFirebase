// ============================================================================
// ADMIN DASHBOARD - Metricas y resumen general
// Server Component para carga inicial de datos (SEO, performance)
// ============================================================================
import { adminDb } from "@/lib/firebase/admin";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import Link from "next/link";
import { formatPrice } from "@/lib/currency";

export default async function AdminDashboard() {
  const [
    invitationsSnap,
    usersSnap,
    ordersSnap,
    templatesSnap,
  ] = await Promise.all([
    getDocs(collection(adminDb, "invitations")),
    getDocs(collection(adminDb, "users")),
    getDocs(query(
      collection(adminDb, "orders"),
      where("status", "==", "paid"),
      orderBy("createdAt", "desc"),
      limit(10)
    )),
    getDocs(query(
      collection(adminDb, "templates"),
      where("active", "==", true),
      orderBy("createdAt", "desc")
    )),
  ]);

  const invitations = invitationsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const paidOrders = ordersSnap.docs.map(d => d.data());
  const templates = templatesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const totalInvitations = invitations.length;
  const freeCount = invitations.filter((i) => i.tier === "free").length;
  const premiumCount = invitations.filter((i) => i.tier === "premium").length;
  const conversionRate = totalInvitations > 0
    ? ((premiumCount / totalInvitations) * 100).toFixed(1)
    : "0.0";

  const totalUsers = users.length;
  const adminUsers = users.filter((u) => u.role === "admin").length;
  const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const activeTemplates = templates.length;

  const recentInvitations = invitations
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  const recentOrders = paidOrders.slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="section-title mb-8">Dashboard Invify</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Invitaciones totales"
          value={invitations.length}
          color="blue"
          icon="[email]"
        />
        <KpiCard
          label="Gratuitas (Free)"
          value={freeCount}
          color="amber"
          icon="[free]"
        />
        <KpiCard
          label="Premium"
          value={premiumCount}
          color="green"
          icon="[star]"
        />
        <KpiCard
          label="Conversion"
          value={conversionRate + "%"}
          color="gold"
          icon="[chart]"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Usuarios totales"
          value={users.length}
          color="blue"
          icon="[users]"
        />
        <KpiCard
          label="Admins"
          value={adminUsers}
          color="purple"
          icon="[shield]"
        />
        <KpiCard
          label="Ingresos totales"
          value={formatPrice(totalRevenue, "mxn")}
          color="gold"
          icon="[money]"
        />
        <KpiCard
          label="Plantillas activas"
          value={activeTemplates}
          color="green"
          icon="[art]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent invitations */}
        <section className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-ink">Ultimas invitaciones</h2>
            <Link href="/admin/pages" className="text-sm text-gold-500 hover:underline">
              Ver todas ->
            </Link>
          </div>
          <div className="space-y-3">
            {recentInvitations.length === 0 ? (
              <p className="text-ink/50 text-center py-8">Sin invitaciones aun</p>
            ) : (
              <div className="space-y-2">
                {recentInvitations.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/admin/pages/${inv.id}`}
                    className="flex items-center justify-between p-3 bg-ink/5 rounded-lg hover:bg-ink/10 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink truncate">{inv.title}</p>
                      <p className="text-xs text-ink/50">
                        {inv.tier === "premium" ? "[star] Premium" : "[free] Free"} . {new Date(inv.createdAt).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        inv.tier === "premium"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {inv.tier === "premium" ? "Premium" : "Free"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Recent paid orders */}
        <section className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-ink">Ultimas ventas</h2>
            <Link href="/admin/sales" className="text-sm text-gold-500 hover:underline">
              Ver CRM ->
            </Link>
          </div>
          <div className="space-y-2">
            {recentOrders.length === 0 ? (
              <p className="text-ink/50 text-center py-8">Sin ventas aun</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-ink/5 rounded-lg"
                  >
                    <div>
                      <p className="font-mono text-xs text-ink/70">
                        {order.id.slice(0, 12)}…
                      </p>
                      <p className="text-xs text-ink/50">
                        Plan: {order.planId} . {formatPrice(order.amount || 0, "mxn")}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                      Pagado
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Active templates */}
      <section className="card p-6 lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl text-ink">Plantillas activas</h2>
          <Link href="/admin/templates" className="text-sm text-gold-500 hover:underline">
            Gestionar ->
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {templates.slice(0, 8).map((tpl) => (
            <Link
              key={tpl.id}
              href={`/admin/templates/${tpl.id}`}
              className="card p-3 hover:shadow-md transition"
            >
              <img
                src={tpl.thumbnailUrl}
                alt={tpl.name}
                className="w-full h-24 object-cover rounded-lg mb-2"
              />
              <p className="font-medium text-sm text-ink truncate">{tpl.name}</p>
              <p className="text-xs text-ink/50 capitalize">{tpl.category}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  color = "blue",
  icon = "",
} = {}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    gold: "bg-amber-50 text-amber-700 border-amber-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <div className={`card p-5 border ${colors[color] || colors.blue}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <p className="text-2xl font-serif font-bold">{value}</p>
      </div>
      <p className="text-xs text-ink/60">{label}</p>
    </div>
  );
}