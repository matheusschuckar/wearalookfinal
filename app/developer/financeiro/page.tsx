// app/developer/financeiro/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type AirtableRecord = {
  id: string;
  createdTime: string;
  fields: {
    ["Name"]?: string;
    ["Order ID"]?: string;
    ["Created At"]?: string;
    ["Status"]?: string;
    ["Store Name"]?: string;
    ["Item Price"]?: number | string;
    ["Notes"]?: string;
    ["CPF"]?: string;
  };
};

const SURFACE = "#F7F4EF";

export const dynamic = "force-dynamic";

const DELIVERY_FEE = 20.0;
const OPERATION_FEE = 3.4;
const LOOK_COMMISSION = 0.1;

function parsePrice(raw?: number | string): number {
  if (typeof raw === "number") return raw;
  if (!raw) return 0;
  const n = Number(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateLocal(iso?: string) {
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

type Preset = "last30" | "today" | "last7" | "month" | "year" | "custom";

export default function DeveloperFinancePage() {
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  // date state
  const [preset, setPreset] = useState<Preset>("last30");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  const [records, setRecords] = useState<AirtableRecord[] | null>(null);

  // guard developer whitelist
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
          setAllowed(false);
          setLoading(false);
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
        setLoading(false);
      }
    })();
  }, []);

  // presets helper
  const applyPreset = useCallback((p: Preset) => {
    const now = new Date();
    let s = new Date();
    let e = new Date();
    if (p === "today") {
      s = new Date(now);
      e = new Date(now);
    } else if (p === "last7") {
      s = new Date(now);
      s.setDate(now.getDate() - 6);
      e = new Date(now);
    } else if (p === "last30") {
      s = new Date(now);
      s.setDate(now.getDate() - 29);
      e = new Date(now);
    } else if (p === "month") {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
      e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (p === "year") {
      s = new Date(now.getFullYear(), 0, 1);
      e = new Date(now.getFullYear(), 11, 31);
    }
    setPreset(p);
    setStartDate(s.toISOString().slice(0, 10));
    setEndDate(e.toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    applyPreset("last30");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Airtable fetch for range (pages through)
  const fetchOrdersRange = useCallback(async (fromISO: string, toISO: string) => {
    const API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
    const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
    const TABLE = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || "Orders";
    if (!API_KEY || !BASE_ID) return null;

    const formula = encodeURIComponent(`AND(IS_AFTER({Created At}, '${fromISO}'), IS_BEFORE({Created At}, '${toISO}'))`);
    let url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE}?filterByFormula=${formula}&pageSize=100`;
    const all: AirtableRecord[] = [];

    try {
      while (true) {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${API_KEY}` },
          cache: "no-store",
        });
        if (!res.ok) {
          console.error("[developer/financeiro] airtable:", await res.text());
          return null;
        }
        const json = await res.json();
        const recs: AirtableRecord[] = json.records || [];
        all.push(...recs);
        if (!json.offset) break;
        url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE}?filterByFormula=${formula}&pageSize=100&offset=${json.offset}`;
      }
    } catch (err) {
      console.error("[developer/financeiro] fetch failed", err);
      return null;
    }

    return all;
  }, []);

  // load when date range changes
  useEffect(() => {
    if (allowed !== true) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Airtable IS_BEFORE is exclusive; use next day for inclusive end
        const fromISO = new Date(startDate + "T00:00:00.000Z").toISOString();
        const toDate = new Date(endDate + "T00:00:00.000Z");
        toDate.setDate(toDate.getDate() + 1);
        const toISO = toDate.toISOString();

        const recs = await fetchOrdersRange(fromISO, toISO);
        if (cancelled) return;
        setRecords(recs);
      } catch (err) {
        console.error(err);
        setRecords(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, allowed, fetchOrdersRange]);

  if (loading) {
    return <main className="min-h-screen" style={{ backgroundColor: SURFACE }} />;
  }

  if (!allowed) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
        <div className="mx-auto max-w-4xl px-8 py-20">
          <h1 className="text-xl font-semibold mb-3">Acesso restrito</h1>
          <p className="text-sm text-neutral-600">Você precisa estar na whitelist de developers para acessar esta página.</p>
        </div>
      </main>
    );
  }

  // exclude statuses: "aguardando pagamento", "cancelado"
  const excluded = useMemo(() => new Set(["aguardando pagamento", "cancelado"]), []);
  const paid = useMemo(() => {
    if (!records) return [];
    return records.filter((r) => {
      const s = String(r.fields["Status"] || "").toLowerCase().trim();
      return !excluded.has(s);
    });
  }, [records, excluded]);

  type Row = {
    id: string;
    createdAt: string;
    orderId: string;
    store: string;
    status: string;
    priceGross: number;
    delivery: number;
    operation: number;
    valueForBrand: number;
    commissionLook: number;
    brandNet: number;
    notes: string;
  };

  const rows: Row[] = useMemo(() => {
    return paid.map((r) => {
      const f = r.fields;
      const price = parsePrice(f["Item Price"]);
      const fees = DELIVERY_FEE + OPERATION_FEE;
      const valueForBrand = Math.max(0, Number((price - fees).toFixed(2)));
      const commissionLook = Number((valueForBrand * LOOK_COMMISSION).toFixed(2));
      const brandNet = Number((valueForBrand - commissionLook).toFixed(2));
      return {
        id: r.id,
        createdAt: f["Created At"] || r.createdTime,
        orderId: f["Order ID"] || "—",
        store: f["Store Name"] || "—",
        status: f["Status"] || "—",
        priceGross: price,
        delivery: DELIVERY_FEE,
        operation: OPERATION_FEE,
        valueForBrand,
        commissionLook,
        brandNet,
        notes: f["Notes"]?.toString() || "—",
      };
    });
  }, [paid]);

  const totals = useMemo(() => {
    const totalGross = rows.reduce((s, r) => s + r.priceGross, 0);
    const totalFees = rows.reduce((s, r) => s + r.delivery + r.operation, 0);
    const totalValueForBrands = rows.reduce((s, r) => s + r.valueForBrand, 0);
    const totalCommission = rows.reduce((s, r) => s + r.commissionLook, 0);
    const totalBrandNet = rows.reduce((s, r) => s + r.brandNet, 0);
    return {
      totalGross,
      totalFees,
      totalValueForBrands,
      totalCommission,
      totalBrandNet,
      count: rows.length,
    };
  }, [rows]);

  const exportCSV = useCallback(() => {
    const header = [
      "Created At",
      "Order ID",
      "Store",
      "Status",
      "Price Gross",
      "Delivery",
      "Operation Fee",
      "Value For Brand",
      "Commission Look",
      "Brand Net",
      "Notes",
    ];
    const lines = [header.join(",")];

    for (const r of rows) {
      const line = [
        `"${formatDateLocal(r.createdAt)}"`,
        `"${r.orderId}"`,
        `"${r.store}"`,
        `"${r.status}"`,
        `"${r.priceGross.toFixed(2).replace(".", ",")}"`,
        `"${r.delivery.toFixed(2).replace(".", ",")}"`,
        `"${r.operation.toFixed(2).replace(".", ",")}"`,
        `"${r.valueForBrand.toFixed(2).replace(".", ",")}"`,
        `"${r.commissionLook.toFixed(2).replace(".", ",")}"`,
        `"${r.brandNet.toFixed(2).replace(".", ",")}"`,
        `"${(r.notes || "").replace(/"/g, '""')}"`,
      ].join(",");
      lines.push(line);
    }

    // totals row
    lines.push(
      [
        `"Totals"`,
        "",
        "",
        "",
        `"${totals.totalGross.toFixed(2).replace(".", ",")}"`,
        `"${totals.totalFees.toFixed(2).replace(".", ",")}"`,
        "",
        `"${totals.totalValueForBrands.toFixed(2).replace(".", ",")}"`,
        `"${totals.totalCommission.toFixed(2).replace(".", ",")}"`,
        `"${totals.totalBrandNet.toFixed(2).replace(".", ",")}"`,
        "",
      ].join(",")
    );

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", `dev_financeiro_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [rows, totals, startDate, endDate]);

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      <header className="w-full border-b border-[#E5E0DA]/80 bg-[#F7F4EF]/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
              <span className="text-[13px] font-semibold tracking-tight text-white leading-none">L</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-black">Look</span>
              <span className="text-[11px] text-neutral-500">Financeiro consolidado</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {userEmail ? (
              <span className="px-3 py-1 rounded-full bg-white/70 border border-neutral-200 text-[11px] text-neutral-700">
                {userEmail}
              </span>
            ) : null}
            <button
              onClick={async () => {
                await supabase.auth.signOut({ scope: "local" });
                router.replace("/");
              }}
              className="h-9 rounded-full px-4 text-xs font-medium text-neutral-700 hover:text-black transition border border-neutral-300/70 bg-white/70"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-8 pt-10 pb-20 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold text-black tracking-tight">Financeiro (Look)</h1>
            <p className="text-sm text-neutral-600 mt-1">
              Visão consolidada do faturamento de todas as marcas. Pedidos com status &quot;aguardando pagamento&quot; e &quot;cancelado&quot; são excluídos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => exportCSV()} className="h-10 px-4 rounded-full bg-white border border-neutral-300 text-sm hover:bg-neutral-50">
              Exportar CSV
            </button>
          </div>
        </div>

        {/* filtros */}
        <div className="rounded-3xl bg-white/60 border border-[rgba(229,224,218,0.8)] p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-[13px] font-medium">Período</div>

            <div className="flex items-center gap-2">
              <button onClick={() => applyPreset("today")} className={`px-3 h-9 rounded-full border text-sm ${preset === "today" ? "bg-black text-white border-black" : "bg-white border-neutral-300"}`}>Hoje</button>
              <button onClick={() => applyPreset("last7")} className={`px-3 h-9 rounded-full border text-sm ${preset === "last7" ? "bg-black text-white border-black" : "bg-white border-neutral-300"}`}>Últimos 7 dias</button>
              <button onClick={() => applyPreset("last30")} className={`px-3 h-9 rounded-full border text-sm ${preset === "last30" ? "bg-black text-white border-black" : "bg-white border-neutral-300"}`}>Últimos 30 dias</button>
              <button onClick={() => applyPreset("month")} className={`px-3 h-9 rounded-full border text-sm ${preset === "month" ? "bg-black text-white border-black" : "bg-white border-neutral-300"}`}>Mês corrente</button>
              <button onClick={() => applyPreset("year")} className={`px-3 h-9 rounded-full border text-sm ${preset === "year" ? "bg-black text-white border-black" : "bg-white border-neutral-300"}`}>Ano</button>
              <button onClick={() => setPreset("custom")} className={`px-3 h-9 rounded-full border text-sm ${preset === "custom" ? "bg-black text-white border-black" : "bg-white border-neutral-300"}`}>Intervalo custom</button>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="text-[12px] text-neutral-600">De</div>
              <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPreset("custom"); }} className="h-9 rounded-xl border border-neutral-300 px-3 text-sm" max={endDate} />
              <div className="text-[12px] text-neutral-600">Até</div>
              <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPreset("custom"); }} className="h-9 rounded-xl border border-neutral-300 px-3 text-sm" min={startDate} />
            </div>
          </div>

          <div className="text-sm text-neutral-500">
            Período: <b>{startDate} — {endDate}</b>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="rounded-2xl p-4 bg-white border border-neutral-200">
            <div className="text-xs text-neutral-500">Bruto (soma Item Price)</div>
            <div className="text-lg font-semibold mt-1">{formatBRL(totals.totalGross)}</div>
          </div>

          <div className="rounded-2xl p-4 bg-white border border-neutral-200">
            <div className="text-xs text-neutral-500">Deduções fixas (entrega + operação)</div>
            <div className="text-lg font-semibold mt-1">{formatBRL(totals.totalFees)}</div>
          </div>

          <div className="rounded-2xl p-4 bg-white border border-neutral-200">
            <div className="text-xs text-neutral-500">Faturamento antes da comissão (para marcas)</div>
            <div className="text-lg font-semibold mt-1">{formatBRL(totals.totalValueForBrands)}</div>
          </div>

          <div className="rounded-2xl p-4 bg-white border border-neutral-200">
            <div className="text-xs text-neutral-500">Receita Look (comissão 10%)</div>
            <div className="text-lg font-semibold mt-1">{formatBRL(totals.totalCommission)}</div>
          </div>

          <div className="rounded-2xl p-4 bg-white border border-neutral-200">
            <div className="text-xs text-neutral-500">Total líquido para marcas</div>
            <div className="text-lg font-semibold mt-1">{formatBRL(totals.totalBrandNet)}</div>
            <div className="text-xs text-neutral-500 mt-1">{totals.count} pedido(s)</div>
          </div>
        </div>

        {/* tabela */}
        <div className="rounded-3xl bg-white/55 border border-[rgba(229,224,218,0.8)] backdrop-blur-sm shadow-[0_12px_35px_-28px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm text-neutral-900">
              <thead className="bg-[#F0ECE6] text-[11px] uppercase tracking-wide text-neutral-500/90">
                <tr>
                  <th className="py-3 pl-5 pr-3 whitespace-nowrap">Criado em</th>
                  <th className="py-3 px-3 whitespace-nowrap">Nº do pedido</th>
                  <th className="py-3 px-3 whitespace-nowrap">Loja</th>
                  <th className="py-3 px-3 whitespace-nowrap">Status</th>
                  <th className="py-3 px-3 whitespace-nowrap text-right">Preço bruto</th>
                  <th className="py-3 px-3 whitespace-nowrap text-right">Entrega</th>
                  <th className="py-3 px-3 whitespace-nowrap text-right">Taxa op.</th>
                  <th className="py-3 px-3 whitespace-nowrap text-right">Valor p/ marca</th>
                  <th className="py-3 px-3 whitespace-nowrap text-right">Comissão Look</th>
                  <th className="py-3 px-3 whitespace-nowrap text-right">Líquido p/ marca</th>
                  <th className="py-3 pl-3 pr-5 whitespace-nowrap">Notas</th>
                </tr>
              </thead>
              <tbody>
                {!rows.length ? (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-neutral-400 text-sm">Nenhum pedido encontrado neste período.</td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid rgba(224, 215, 204, 0.65)" }}>
                      <td className="py-4 pl-5 pr-3 text-sm text-neutral-800 whitespace-nowrap">{formatDateLocal(r.createdAt)}</td>
                      <td className="py-4 px-3 text-sm text-neutral-800 whitespace-nowrap">{r.orderId}</td>
                      <td className="py-4 px-3 text-sm text-neutral-700 whitespace-nowrap">{r.store}</td>
                      <td className="py-4 px-3 text-sm whitespace-nowrap">{r.status}</td>
                      <td className="py-4 px-3 text-sm text-neutral-900 whitespace-nowrap text-right">{formatBRL(r.priceGross)}</td>
                      <td className="py-4 px-3 text-sm text-neutral-900 whitespace-nowrap text-right">{formatBRL(r.delivery)}</td>
                      <td className="py-4 px-3 text-sm text-neutral-900 whitespace-nowrap text-right">{formatBRL(r.operation)}</td>
                      <td className="py-4 px-3 text-sm text-neutral-900 whitespace-nowrap text-right">{formatBRL(r.valueForBrand)}</td>
                      <td className="py-4 px-3 text-sm text-neutral-900 whitespace-nowrap text-right">{formatBRL(r.commissionLook)}</td>
                      <td className="py-4 px-3 text-sm text-neutral-900 whitespace-nowrap text-right">{formatBRL(r.brandNet)}</td>
                      <td className="py-4 pl-3 pr-5 text-sm text-neutral-700 align-top">
                        <div className="min-w-[260px] max-h-[80px] overflow-y-auto leading-relaxed pr-1">{r.notes || "—"}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
