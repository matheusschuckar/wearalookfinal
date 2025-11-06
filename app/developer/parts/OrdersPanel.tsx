"use client";

import { useEffect, useMemo, useState } from "react";
import type React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

type AnyRow = Record<string, unknown>;

const CANDIDATE_TABLES = [
  "orders_admin_view",
  "orders_enriched",
  "orders",
  "orders_view",
  "airtable_orders_view",
] as const;

export default function OrdersPanel({
  supabase,
}: {
  supabase: SupabaseClient;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [tableUsed, setTableUsed] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // tenta cada tabela até uma responder
        let found: string | null = null;
        let data: AnyRow[] = [];

        for (const t of CANDIDATE_TABLES) {
          const { data: d, error: e } = await supabase
            .from(t)
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100);

          if (!e) {
            found = t;
            data = (d ?? []) as AnyRow[];
            break;
          }
        }

        if (!found) {
          setError(
            "Não encontrei uma tabela de pedidos com acesso via RLS. Crie uma view com RLS liberada para developers, por exemplo orders_admin_view, e inclua colunas como id, status, created_at, total_amount, user_email, city, items_count."
          );
          setRows([]);
          setTableUsed(null);
          return;
        }

        if (!mounted) return;
        setTableUsed(found);
        setRows(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    // simples auto refresh
    const timer = setInterval(load, 30000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [supabase]);

  const columns = useMemo(() => {
    const first = rows[0];
    if (!first) return [] as string[];
    // coloca colunas mais úteis no início
    const preferred = [
      "id",
      "status",
      "created_at",
      "total_amount",
      "user_email",
      "city",
      "items_count",
    ];
    const all = Object.keys(first);
    const head = preferred.filter((c) => all.includes(c));
    const tail = all.filter((c) => !head.includes(c));
    return [...head, ...tail];
  }, [rows]);

  if (loading)
    return (
      <ListShell title="Pedidos" right={tableUsed && <Tag>{tableUsed}</Tag>}>
        <p>Carregando…</p>
      </ListShell>
    );
  if (error)
    return (
      <ListShell title="Pedidos">
        <p className="text-sm text-red-600">{error}</p>
      </ListShell>
    );

  return (
    <ListShell title="Pedidos" right={tableUsed && <Tag>{tableUsed}</Tag>}>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum pedido encontrado.</p>
      ) : (
        <div className="overflow-auto border border-gray-200 rounded-lg">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c}
                    className="text-left px-3 py-2 font-medium text-gray-700"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="odd:bg-white even:bg-gray-50">
                  {columns.map((c) => (
                    <td key={c} className="px-3 py-2 align-top">
                      <Cell value={r[c]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ListShell>
  );
}

function Cell({ value }: { value: unknown }) {
  if (value == null) return <span className="text-gray-400">—</span>;
  if (typeof value === "string") {
    // datas
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const d = new Date(value);
      return <span>{d.toLocaleString()}</span>;
    }
    return <span className="whitespace-pre-wrap break-words">{value}</span>;
  }
  if (typeof value === "number")
    return <span>{value.toLocaleString("pt-BR")}</span>;
  if (Array.isArray(value))
    return <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>;
  if (typeof value === "object")
    return <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>;
  return <span>{String(value)}</span>;
}

function ListShell({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-1 rounded-md text-xs bg-gray-100 border border-gray-200">
      {children}
    </span>
  );
}
