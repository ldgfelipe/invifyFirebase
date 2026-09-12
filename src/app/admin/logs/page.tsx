"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/cn";

type LogEntry = {
  id: string;
  action: string;
  timestamp: number;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, any>;
  severity: "info" | "warning" | "error";
  description: string;
  ip?: string;
  userAgent?: string;
};

type Filters = {
  action: string;
  severity: string;
  targetType: string;
  userId: string;
  from: string;
  to: string;
};

export default function AdminLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [filters, setFilters] = useState<Filters>({
    action: "",
    severity: "",
    targetType: "",
    userId: "",
    from: "",
    to: "",
  });
  const [filterOpen, setFilterOpen] = useState(false);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
      });
      if (filters.action) params.set("action", filters.action);
      if (filters.severity) params.set("severity", filters.severity);
      if (filters.targetType) params.set("targetType", filters.targetType);
      if (filters.userId) params.set("userId", filters.userId);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);

      const res = await fetch(`/api/logs?${params.toString()}`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action))).sort();
  const uniqueTargetTypes = Array.from(new Set(logs.map((l) => l.targetType).filter(Boolean))).sort();
  const uniqueUsers = Array.from(new Set(logs.map((l) => l.userId).filter(Boolean))).sort();

  function formatDate(ts: number) {
    return new Date(ts).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function severityBadge(sev: string) {
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${
        sev === "error" ? "bg-red-100 text-red-700" :
        sev === "warning" ? "bg-amber-100 text-amber-700" :
        "bg-green-100 text-green-700"
      }`}>
        {sev}
      </span>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title">Logs de Auditoría</h1>
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          className="btn-outline text-sm"
        >
          {filterOpen ? "Ocultar filtros" : "Mostrar filtros"}
        </button>
      </div>

      {/* Filtros */}
      {filterOpen && (
        <div className="card p-4 mb-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-ink/70 block mb-1">Acción</label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="input"
              >
                <option value="">Todas</option>
                {uniqueActions.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-ink/70 block mb-1">Severidad</label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                className="input"
              >
                <option value="">Todas</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-ink/70 block mb-1">Tipo recurso</label>
              <select
                value={filters.targetType}
                onChange={(e) => setFilters({ ...filters, targetType: e.target.value })}
                className="input"
              >
                <option value="">Todos</option>
                {uniqueTargetTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-ink/70 block mb-1">Usuario</label>
              <select
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                className="input"
              >
                <option value="">Todos</option>
                {uniqueUsers.filter((u): u is string => Boolean(u)).map((u) => (
                  <option key={u} value={u}>{u.slice(0, 8)}…</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-ink/70 block mb-1">Desde</label>
              <input
                type="datetime-local"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="text-sm text-ink/70 block mb-1">Hasta</label>
              <input
                type="datetime-local"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                className="input"
              />
            </div>
            <div className="md:col-span-2">
              <button
                onClick={() => setFilters({ action: "", severity: "", targetType: "", userId: "", from: "", to: "" })}
                className="btn-outline self-end"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de logs */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-ink/60">Cargando logs…</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink/60 border-b border-ink/10 bg-ink/5">
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Acción</th>
                    <th className="py-3 px-4">Severidad</th>
                    <th className="py-3 px-4">Descripción</th>
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-4">Recurso</th>
                    <th className="py-3 px-4">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-ink/5 hover:bg-ink/5">
                      <td className="py-3 px-4 text-ink/60 font-mono text-xs">{formatDate(log.timestamp)}</td>
                      <td className="py-3 px-4 font-mono text-xs text-ink/70">{log.action}</td>
                      <td className="py-3 px-4">{severityBadge(log.severity)}</td>
                      <td className="py-3 px-4 text-ink/70 max-w-xs truncate">{log.description}</td>
                      <td className="py-3 px-4 text-ink/50 text-xs">
                        {log.userEmail || log.userId?.slice(0, 8) + "…" || "—"}
                        {log.userRole && <span className="ml-1 text-[10px] text-ink/40">({log.userRole})</span>}
                      </td>
                      <td className="py-3 px-4 text-ink/50 text-xs">
                        {log.targetType || "—"} {log.targetId ? <span className="font-mono">({log.targetId.slice(0, 10)}…)</span> : null}
                      </td>
                      <td className="py-3 px-4 text-ink/40 text-xs font-mono">{log.ip || "—"}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-ink/50">No hay logs que coincidan</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="p-4 border-t border-ink/10 flex items-center justify-between">
              <p className="text-sm text-ink/60">
                Página {page} · {logs.length} registros
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="btn-outline text-sm"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={logs.length < pageSize || loading}
                  className="btn-outline text-sm"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}