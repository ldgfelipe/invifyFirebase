"use client";

// ============================================================================
// MODAL FACTURA - Vista imprimible de una compra (pedido).
// Comparte datos fiscales si el usuario tiene billing configurado.
// ============================================================================
import type { Order, UserProfile } from "@/lib/types";
import { formatPrice } from "@/lib/currency";

export default function InvoiceModal({
  order,
  user,
  onClose,
}: {
  order: Order;
  user?: UserProfile | null;
  onClose: () => void;
}) {
  const subtotal = order.amount || 0;
  const iva = Math.round(subtotal * 0.16);
  const total = subtotal + iva;
  const number = `F-${new Date(order.createdAt).getFullYear()}-${order.id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8 max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="font-serif text-2xl text-ink">Invify</p>
            <p className="text-xs text-ink/50">Invitaciones digitales interactivas</p>
            <p className="text-xs text-ink/50">RFC: IVY-000000-000</p>
          </div>
          <button onClick={onClose} className="text-ink/50 hover:text-ink text-xl leading-none print:hidden">
            ×
          </button>
        </div>

        <div className="flex justify-between text-sm mb-6">
          <div className="text-ink/70">
            <p className="font-semibold text-ink">Datos del cliente</p>
            <p>Nombre: {user?.billing?.razonSocial || user?.displayName || "Cliente"}</p>
            {user?.billing?.rfc && <p>RFC: {user.billing.rfc}</p>}
            {user?.billing?.direccion && <p>Dirección: {user.billing.direccion}</p>}
            {user?.billing?.cp && <p>C.P.: {user.billing.cp}</p>}
            <p>Email: {user?.billing?.emailFiscal || user?.email || order.uid}</p>
          </div>
          <div className="text-right text-ink/70">
            <p className="font-semibold text-ink">Factura {number}</p>
            <p>Fecha: {new Date(order.createdAt).toLocaleDateString("es-ES")}</p>
            <p>Pedido: {order.id.slice(0, 16)}…</p>
            <p>Estado: PAGADA</p>
          </div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="text-left text-ink/60 border-b border-ink/10">
              <th className="py-2">Concepto</th>
              <th className="py-2 text-right">Cantidad</th>
              <th className="py-2 text-right">Precio</th>
              <th className="py-2 text-right">Importe</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-ink/5">
              <td className="py-3">Compra de invitación (plan {order.planId})</td>
              <td className="py-3 text-right">1</td>
              <td className="py-3 text-right">{formatPrice(subtotal, "mxn")}</td>
              <td className="py-3 text-right">{formatPrice(subtotal, "mxn")}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between text-ink/70">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal, "mxn")}</span>
            </div>
            <div className="flex justify-between text-ink/70">
              <span>IVA (16%)</span>
              <span>{formatPrice(iva, "mxn")}</span>
            </div>
            <div className="flex justify-between font-semibold text-ink border-t border-ink/10 pt-2">
              <span>Total</span>
              <span>{formatPrice(total, "mxn")}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 print:hidden">
          <button onClick={onClose} className="btn-outline px-4 py-2 text-sm">
            Cerrar
          </button>
          <button onClick={() => window.print()} className="btn-primary px-4 py-2 text-sm">
            Imprimir / PDF
          </button>
        </div>
      </div>
    </div>
  );
}