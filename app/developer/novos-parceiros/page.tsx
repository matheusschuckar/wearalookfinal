// app/developer/novos-parceiros/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type BrandApplicationRow = {
  id: number;
  brand_name: string | null;
  contact_name: string | null;
  contact_role: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  country: string | null;
  city: string | null;
  website: string | null;
  instagram: string | null;
  product_categories: string[] | null;
  stock_ready: string | null;
  years_active: number | null;
  how_found: string | null;
  consent: boolean | null;
  created_at: string | null;
  review_status?: string | null; // new | approved | rejected | null
};

const SURFACE = "#F7F4EF";
const BORDER = "#E5E0DA";

function formatDateShort(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CSVDownloadButton({ rows }: { rows: BrandApplicationRow[] }) {
  const onClick = () => {
    const header = [
      "id",
      "brand_name",
      "contact_name",
      "contact_email",
      "contact_phone",
      "country",
      "city",
      "instagram",
      "product_categories",
      "stock_ready",
      "years_active",
      "review_status",
      "created_at",
    ];
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.id,
          `"${(r.brand_name || "").replace(/"/g, '""')}"`,
          `"${(r.contact_name || "").replace(/"/g, '""')}"`,
          `"${(r.contact_email || "").replace(/"/g, '""')}"`,
          `"${(r.contact_phone || "").replace(/"/g, '""')}"`,
          `"${(r.country || "").replace(/"/g, '""')}"`,
          `"${(r.city || "").replace(/"/g, '""')}"`,
          `"${(r.instagram || "").replace(/"/g, '""')}"`,
          `"${(r.product_categories ? r.product_categories.join(";") : "").replace(/"/g, '""')}"`,
          `"${r.stock_ready || ""}"`,
          `${r.years_active ?? ""}`,
          `"${r.review_status ?? ""}"`,
          `"${r.created_at || ""}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brand_applications_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="h-9 px-3 rounded-full border border-neutral-300 bg-white/80 text-sm hover:bg-white"
    >
      Exportar CSV
    </button>
  );
}

export default function DeveloperPartnerApplicationsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [notice, setNotice] = useState<string | null>(null);

  const [rows, setRows] = useState<BrandApplicationRow[]>([]);
  const [range, setRange] = useState<"7d" | "30d" | "all">("30d");
  const [query, setQuery] = useState<string>("");
  const refreshRef = useRef<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mutatingIds, setMutatingIds] = useState<Record<number, boolean>>({}); // to disable controls while updating

  // ----- guard: developer whitelist -----
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
          setAllowed(false);
          return;
        }
        const email = user.email.toLowerCase();
        setUserEmail(email);

        const { data: ok, error } = await supabase.rpc("developer_email_allowed", { p_email: email });
        if (error) {
          const { data: rows } = await supabase
            .from("developer_emails")
            .select("email,active")
            .eq("email", email)
            .eq("active", true)
            .limit(1);
          setAllowed((rows?.length ?? 0) > 0);
        } else {
          setAllowed(!!ok);
        }
      } catch (err) {
        console.error(err);
        setAllowed(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // compute start date for filter
  const startIso = useMemo(() => {
    if (range === "all") return null;
    const now = new Date();
    const days = range === "7d" ? 7 : 30;
    const s = new Date(now);
    s.setDate(now.getDate() - (days - 1));
    // set start to 00:00 of that day
    s.setHours(0, 0, 0, 0);
    return s.toISOString();
  }, [range]);

  // fetch rows
  const fetchRows = async () => {
    setRefreshing(true);
    try {
      let queryBuilder = supabase.from("brand_applications").select("*").order("id", { ascending: false }).limit(1000);
      if (startIso) {
        queryBuilder = queryBuilder.gte("created_at", startIso);
      }
      const { data, error } = await queryBuilder;
      if (error) {
        console.error("fetch brand_applications error", error);
        setNotice("Falha ao carregar inscrições.");
        return;
      }
      // ensure we treat null review_status as "new" in UI (but do not mutate DB here)
      const prepared = (data ?? []).map((d: any) => ({
        ...(d as BrandApplicationRow),
        review_status: d.review_status ?? null,
      })) as BrandApplicationRow[];
      setRows(prepared);
      setNotice(null);
    } catch (err) {
      console.error(err);
      setNotice("Erro ao buscar inscrições.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allowed !== true) return;
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, range]);

  // optional auto refresh every 60s while on this page
  useEffect(() => {
    if (allowed !== true) return;
    refreshRef.current = window.setInterval(() => {
      fetchRows().catch(() => {});
    }, 60_000);
    return () => {
      if (refreshRef.current) {
        clearInterval(refreshRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, range]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        (r.brand_name || "").toLowerCase().includes(q) ||
        (r.instagram || "").toLowerCase().includes(q) ||
        (r.contact_name || "").toLowerCase().includes(q) ||
        (r.contact_email || "").toLowerCase().includes(q)
      );
    });
  }, [rows, query]);

  // Update review_status on a row (optimistic)
  async function updateStatus(id: number, newStatus: "new" | "approved" | "rejected") {
    setNotice(null);
    setMutatingIds((m) => ({ ...m, [id]: true }));
    // optimistic UI
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, review_status: newStatus } : r)));
    try {
      const { data, error } = await supabase
        .from("brand_applications")
        .update({ review_status: newStatus })
        .eq("id", id)
        .select()
        .single();
      if (error) {
        console.error("update review_status error", error);
        setNotice("Não foi possível atualizar o status no banco. Verifique se a coluna review_status existe.");
        // rollback: refetch row
        await fetchRows();
        return;
      }
      // success - replace local row with returned data
      setRows((prev) => prev.map((r) => (r.id === id ? ({ ...(r as any), ...(data as any) } as BrandApplicationRow) : r)));
    } catch (err) {
      console.error(err);
      setNotice("Erro ao atualizar status.");
      await fetchRows();
    } finally {
      setMutatingIds((m) => {
        const next = { ...m };
        delete next[id];
        return next;
      });
    }
  }

  // helper renderers
  function StatusBadge({ s }: { s?: string | null }) {
    const status = s ?? "new"; // treat null as new
    if (status === "new") {
      return <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] bg-amber-50 text-amber-800 border border-amber-100">Não visto</span>;
    }
    if (status === "approved") {
      return <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-100">Aprovado</span>;
    }
    if (status === "rejected") {
      return <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] bg-red-50 text-red-800 border border-red-100">Não aprovado</span>;
    }
    return <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] bg-neutral-100 text-neutral-700 border border-neutral-200">{status}</span>;
  }

  if (loading) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
        <div className="mx-auto max-w-6xl px-8 pt-20 animate-pulse">
          <div className="h-8 w-64 rounded-lg bg-neutral-300/30" />
          <div className="mt-3 h-4 w-80 rounded-lg bg-neutral-300/30" />
        </div>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
        <header className="w-full border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-6xl px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
                <span className="text-[13px] font-semibold text-white">L</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-black">Look</span>
                <span className="text-[11px] text-neutral-500">Novos parceiros</span>
              </div>
            </div>
            <div />
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-8 py-16">
          <h1 className="text-xl font-semibold mb-2">Acesso restrito</h1>
          <p className="text-sm text-neutral-600">Você precisa estar na whitelist de developers.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      <header className="w-full border-b" style={{ borderColor: BORDER }}>
        <div className="mx-auto max-w-6xl px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
              <span className="text-[13px] font-semibold text-white">L</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-black">Look</span>
              <span className="text-[11px] text-neutral-500">Novos parceiros</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-[11px] text-neutral-500">Logged as</div>
            <div className="px-3 py-1 rounded-full bg-white/70 border border-neutral-200 text-[11px]">{userEmail}</div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-8 pt-10 pb-20">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[28px] font-semibold text-black">Novas inscrições de parceiros</h1>
            <p className="text-sm text-neutral-600 mt-1">Visualize as aplicações recentes enviadas pelas marcas (padrão: últimos 30 dias).</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-neutral-500">Período</div>
            <div className="inline-flex rounded-full bg-white/80 border border-neutral-200 p-1">
              <button
                onClick={() => setRange("7d")}
                className={`px-3 py-2 text-sm rounded-full ${range === "7d" ? "bg-black text-white" : "text-neutral-700 hover:bg-neutral-50"}`}
              >
                7d
              </button>
              <button
                onClick={() => setRange("30d")}
                className={`px-3 py-2 text-sm rounded-full ${range === "30d" ? "bg-black text-white" : "text-neutral-700 hover:bg-neutral-50"}`}
              >
                30d
              </button>
              <button
                onClick={() => setRange("all")}
                className={`px-3 py-2 text-sm rounded-full ${range === "all" ? "bg-black text-white" : "text-neutral-700 hover:bg-neutral-50"}`}
              >
                All
              </button>
            </div>

            <button
              onClick={() => fetchRows()}
              disabled={refreshing}
              className="h-9 px-3 rounded-full border border-neutral-300 bg-white/80 text-sm hover:bg-white"
            >
              {refreshing ? "Atualizando…" : "Atualizar"}
            </button>

            <CSVDownloadButton rows={filtered} />
          </div>
        </div>

        {notice ? (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-amber-900 text-sm">
            {notice}
          </div>
        ) : null}

        <div className="mb-4 flex items-center gap-3">
          <input
            placeholder="Buscar por marca, Instagram, e-mail ou contato"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full max-w-2xl rounded-xl border px-3 py-2 text-sm"
          />
          <div className="text-xs text-neutral-500">Resultados: {filtered.length}</div>
        </div>

        <div className="rounded-3xl bg-white/55 border border-[rgba(229,224,218,0.8)] backdrop-blur-sm shadow-[0_12px_35px_-28px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm text-neutral-900">
              <thead className="bg-[#F0ECE6] text-[11px] uppercase tracking-wide text-neutral-500/90">
                <tr>
                  <th className="py-3 pl-5 pr-3 whitespace-nowrap">Protocolo</th>
                  <th className="py-3 px-3 whitespace-nowrap">Marca</th>
                  <th className="py-3 px-3 whitespace-nowrap">Contato</th>
                  <th className="py-3 px-3 whitespace-nowrap">E-mail</th>
                  <th className="py-3 px-3 whitespace-nowrap">Telefone</th>
                  <th className="py-3 px-3 whitespace-nowrap">País</th>
                  <th className="py-3 px-3 whitespace-nowrap">Cidade / Estado</th>
                  <th className="py-3 px-3 whitespace-nowrap">Categorias</th>
                  <th className="py-3 px-3 whitespace-nowrap">Estoque</th>
                  <th className="py-3 px-3 whitespace-nowrap">Anos</th>
                  <th className="py-3 px-3 whitespace-nowrap">Status</th>
                  <th className="py-3 pl-3 pr-5 whitespace-nowrap">Criado em</th>
                  <th className="py-3 pl-3 pr-5 whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-10 text-center text-neutral-400 text-sm">
                      Nenhuma inscrição encontrada para o período selecionado.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const proto = `BLK-${String(r.id).padStart(6, "0")}`;
                    const isMutating = !!mutatingIds[r.id];
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid rgba(224,215,204,0.65)" }}>
                        <td className="py-4 pl-5 pr-3 text-sm text-neutral-700 whitespace-nowrap">{proto}</td>
                        <td className="py-4 px-3 text-sm text-neutral-900">{r.brand_name || "—"}</td>
                        <td className="py-4 px-3 text-sm text-neutral-700">{r.contact_name || "—"}</td>
                        <td className="py-4 px-3 text-sm text-neutral-700">{r.contact_email || "—"}</td>
                        <td className="py-4 px-3 text-sm text-neutral-700">{r.contact_phone || "—"}</td>
                        <td className="py-4 px-3 text-sm text-neutral-700 whitespace-nowrap">{r.country || "—"}</td>
                        <td className="py-4 px-3 text-sm text-neutral-700">{r.city || "—"}</td>
                        <td className="py-4 px-3 text-sm text-neutral-700">{(r.product_categories || []).slice(0, 3).join(", ") || "—"}</td>
                        <td className="py-4 px-3 text-sm text-neutral-700">{r.stock_ready || "—"}</td>
                        <td className="py-4 px-3 text-sm text-neutral-700">{r.years_active ?? "—"}</td>
                        <td className="py-4 px-3 text-sm text-neutral-700">
                          <StatusBadge s={r.review_status} />
                        </td>
                        <td className="py-4 pl-3 pr-5 text-sm text-neutral-700 whitespace-nowrap">{formatDateShort(r.created_at)}</td>

                        <td className="py-4 pl-3 pr-5 text-sm text-neutral-700 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/developer/novos-parceiros/${r.id}`)}
                              className="inline-flex h-9 items-center justify-center rounded-full border border-neutral-300 bg-white/80 px-3 text-sm hover:bg-white"
                            >
                              Abrir
                            </button>

                            <button
                              onClick={() => updateStatus(r.id, "approved")}
                              disabled={isMutating}
                              className="inline-flex h-9 items-center justify-center rounded-full bg-emerald-600 px-3 text-sm text-white hover:opacity-90"
                            >
                              Aprovar
                            </button>

                            <button
                              onClick={() => updateStatus(r.id, "rejected")}
                              disabled={isMutating}
                              className="inline-flex h-9 items-center justify-center rounded-full bg-red-600 px-3 text-sm text-white hover:opacity-90"
                            >
                              Reprovar
                            </button>

                            <button
                              onClick={() => updateStatus(r.id, "new")}
                              disabled={isMutating}
                              className="inline-flex h-9 items-center justify-center rounded-full border border-neutral-300 bg-white/80 px-3 text-sm hover:bg-white"
                              title="Marcar como não visto"
                            >
                              Marcar não visto
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
