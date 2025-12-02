// app/parceiros/financeiro/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
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

// constantes de negócio
const DELIVERY_FEE = 20.0;
const OPERATION_FEE = 3.4;
const LOOK_COMMISSION_RATE = 0.1;

function formatCurrencyBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parsePrice(raw?: number | string): number {
  if (typeof raw === "number") return raw;
  if (!raw) return 0;
  const n = Number(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
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

// escapador para filtro Airtable
function escapeAirtableString(input: string) {
  return input.replace(/'/g, "''");
}

// Reusa lógica do /parceiros/pedidos — retorna null em caso de erro
async function fetchOrdersForStore(store: string): Promise<AirtableRecord[] | null> {
  const API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
  const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
  const TABLE = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || "Orders";

  if (!API_KEY || !BASE_ID || !store) return [];

  const safeStore = escapeAirtableString(store);
  const formula = encodeURIComponent(`{Store Name}='${safeStore}'`);
  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE}?filterByFormula=${formula}&sort[0][field]=Created%20At&sort[0][direction]=desc&pageSize=100`;

  const all: AirtableRecord[] = [];

  try {
    let offset: string | undefined;
    do {
      const pageUrl = offset ? `${url}&offset=${offset}` : url;

      const res = await fetch(pageUrl, {
        headers: { Authorization: `Bearer ${API_KEY}` },
        cache: "no-store",
      });
      if (!res.ok) {
        console.error("[/parceiros/financeiro] airtable error:", await res.text());
        return null;
      }
      const json: { records?: AirtableRecord[]; offset?: string } =
        await res.json();
      all.push(...(json.records ?? []));
      offset = json.offset;
    } while (offset);
  } catch (err) {
    console.error("[/parceiros/financeiro] airtable fetch failed:", err);
    return null;
  }

  return all;
}

type Preset =
  | "last30"
  | "today"
  | "last7"
  | "month"
  | "year"
  | "custom";

export default function PartnerFinancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("");
  const [loggedEmail, setLoggedEmail] = useState<string>("");
  const [orders, setOrders] = useState<AirtableRecord[]>([]);
  const [allOrdersCache, setAllOrdersCache] = useState<AirtableRecord[] | null>(null);

  // filtro de datas
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

  // ordenação simples
  const [sortBy, setSortBy] = useState<"created" | "price">("created");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // autenticação / load storeName
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: sess } = await supabase.auth.getSession();
        const user = sess?.session?.user;
        if (!user?.email) {
          router.replace("/parceiros/login");
          return;
        }
        const email = user.email.toLowerCase();
        setLoggedEmail(email);

        const { data: allowed, error: allowErr } = await supabase.rpc(
          "partner_email_allowed",
          {
            p_email: email,
          }
        );
        if (allowErr) throw allowErr;
        if (!allowed) {
          await supabase.auth.signOut({ scope: "local" });
          router.replace("/parceiros/login");
          return;
        }

        const { data: row, error: sErr } = await supabase
          .from("partner_emails")
          .select("store_name")
          .eq("email", email)
          .eq("active", true)
          .maybeSingle();
        if (sErr) throw sErr;

        setStoreName(row?.store_name || "");
      } catch (err) {
        console.error(err);
        setNotice("Não foi possível carregar seus dados no momento.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // efeito para buscar pedidos (cache curto)
  useEffect(() => {
    if (!storeName) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchOrdersForStore(storeName);
        if (cancelled) return;
        if (data === null) {
          setNotice("Falha ao carregar pedidos. Verifique a conexão.");
          return;
        }
        setAllOrdersCache(data);
        setOrders(data);
        setNotice(null);
      } catch (err) {
        console.error(err);
        setNotice("Erro ao buscar pedidos.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    const t = setInterval(async () => {
      const data = await fetchOrdersForStore(storeName);
      if (!cancelled && data && data.length) {
        setAllOrdersCache(data);
        setOrders(data);
      }
    }, 15_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [storeName]);

  // helpers para calcular range a partir do preset
  const applyPreset = useCallback((p: Preset) => {
    const now = new Date();
    let s = new Date();
    let e = new Date();
    if (p === "today") {
      s = new Date(now);
      e = new Date(now);
    } else if (p === "last7") {
      s = new Date(now);
      s.setDate(now.getDate() - 6); // last 7 days inclusive
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

  // aplica preset inicial (garante consistência)
  useEffect(() => {
    applyPreset("last30");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // filtra orders por date range (inclusive)
  const filteredOrders = useMemo(() => {
    if (!allOrdersCache) return [];
    const s = new Date(startDate + "T00:00:00");
    const e = new Date(endDate + "T23:59:59.999");
    return allOrdersCache.filter((rec) => {
      const createdIso = rec.fields["Created At"] || rec.createdTime;
      const d = new Date(createdIso || rec.createdTime);
      if (Number.isNaN(d.getTime())) return false;
      return d >= s && d <= e;
    });
  }, [allOrdersCache, startDate, endDate]);

  // ordena
  const sortedOrders = useMemo(() => {
    const clone = filteredOrders.slice();
    clone.sort((a, b) => {
      if (sortBy === "created") {
        const da = new Date(a.fields["Created At"] || a.createdTime).getTime();
        const db = new Date(b.fields["Created At"] || b.createdTime).getTime();
        return sortDir === "asc" ? da - db : db - da;
      } else {
        const pa = parsePrice(a.fields["Item Price"]);
        const pb = parsePrice(b.fields["Item Price"]);
        return sortDir === "asc" ? pa - pb : pb - pa;
      }
    });
    return clone;
  }, [filteredOrders, sortBy, sortDir]);

  // métricas e linhas derivadas
  type RowCalc = {
    id: string;
    createdAtIso: string;
    clientName: string;
    orderId: string;
    status: string;
    store: string;
    cpf: string;
    priceGross: number;
    deliveryFee: number;
    operationFee: number;
    valueForBrand: number; // priceGross - fees (clamped >= 0)
    commissionLook: number; // 10% of valueForBrand
    brandNet: number; // valueForBrand - commissionLook
    notes: string;
  };

  const rows: RowCalc[] = useMemo(() => {
    return sortedOrders.map((rec) => {
      const f = rec.fields;
      const priceGross = parsePrice(f["Item Price"]);
      const feesTotal = DELIVERY_FEE + OPERATION_FEE;
      const rawValueForBrand = priceGross - feesTotal;
      const valueForBrand = Math.max(0, Number(rawValueForBrand.toFixed(2)));
      const commissionLook = Number((valueForBrand * LOOK_COMMISSION_RATE).toFixed(2));
      const brandNet = Number((valueForBrand - commissionLook).toFixed(2));

      return {
        id: rec.id,
        createdAtIso: f["Created At"] || rec.createdTime,
        clientName: f["Name"] || "—",
        orderId: f["Order ID"] || "—",
        status: f["Status"] || "—",
        store: f["Store Name"] || "—",
        cpf: f["CPF"] || "—",
        priceGross,
        deliveryFee: DELIVERY_FEE,
        operationFee: OPERATION_FEE,
        valueForBrand,
        commissionLook,
        brandNet,
        notes: f["Notes"]?.toString() || "—",
      };
    });
  }, [sortedOrders]);

  const totals = useMemo(() => {
    const totalGross = rows.reduce((s, r) => s + r.priceGross, 0);
    const totalFees = rows.reduce((s, r) => s + r.deliveryFee + r.operationFee, 0);
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

  // export CSV
  const handleExportCSV = () => {
    const header = [
      "Created At",
      "Order ID",
      "Client",
      "Status",
      "Store",
      "CPF",
      "Price Gross",
      "Delivery Fee",
      "Operation Fee",
      "Value For Brand",
      "Commission Look",
      "Brand Net",
      "Notes",
    ];
    const lines = [header.join(",")];
    for (const r of rows) {
      const fields = [
        `"${formatDateLocal(r.createdAtIso)}"`,
        `"${r.orderId}"`,
        `"${r.clientName}"`,
        `"${r.status}"`,
        `"${r.store}"`,
        `"${r.cpf}"`,
        `"${r.priceGross.toFixed(2).replace(".", ",")}"`,
        `"${r.deliveryFee.toFixed(2).replace(".", ",")}"`,
        `"${r.operationFee.toFixed(2).replace(".", ",")}"`,
        `"${r.valueForBrand.toFixed(2).replace(".", ",")}"`,
        `"${r.commissionLook.toFixed(2).replace(".", ",")}"`,
        `"${r.brandNet.toFixed(2).replace(".", ",")}"`,
        `"${(r.notes || "").replace(/"/g, '""')}"`,
      ];
      lines.push(fields.join(","));
    }
    // totals row
    lines.push(
      [
        `"Totals"`,
        "",
        "",
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
    const filename = `financeiro_${storeName || "store"}_${startDate}_to_${endDate}.csv`;
    a.setAttribute("download", filename);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <main className="min-h-screen" style={{ backgroundColor: SURFACE }} />;
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      {/* header */}
      <header className="w-full border-b border-[#E5E0DA]/80 bg-[#F7F4EF]/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/parceiros")}
              className="h-8 w-8 rounded-full bg-white/70 border border-neutral-200/70 flex items-center justify-center text-neutral-700 hover:text-black hover:bg-white transition"
              aria-label="Voltar para o painel"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                stroke="currentColor"
                fill="none"
              >
                <path
                  d="M15 6l-6 6 6 6"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
              <span className="text-[13px] font-semibold tracking-tight text-white leading-none">
                L
              </span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-black">
                Look
              </span>
              <span className="text-[11px] text-neutral-500">
                Financeiro da loja
              </span>
            </div>
            {storeName ? (
              <span className="ml-2 text-[11px] px-3 py-1 rounded-full bg-white/60 border border-neutral-200/60 text-neutral-700">
                {storeName}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {loggedEmail ? (
              <span className="px-3 py-1 rounded-full bg-white/70 border border-neutral-200 text-[11px] text-neutral-700">
                {loggedEmail}
              </span>
            ) : null}
            <button
              onClick={async () => {
                await supabase.auth.signOut({ scope: "local" });
                router.replace("/parceiros/login");
              }}
              className="h-9 rounded-full px-4 text-xs font-medium text-neutral-700 hover:text-black transition border border-neutral-300/70 bg-white/70"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* conteúdo */}
      <div className="mx-auto max-w-6xl px-8 pt-10 pb-20 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold text-black tracking-tight">
              Financeiro
            </h1>
            <p className="text-sm text-neutral-600 mt-1">
              Visão financeira dos pedidos recebidos pela sua marca.
            </p>
            {notice && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {notice}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExportCSV()}
              className="h-10 px-4 rounded-full bg-white border border-neutral-300 text-sm hover:bg-neutral-50"
            >
              Exportar CSV
            </button>
          </div>
        </div>

        {/* filtros */}
        <div className="rounded-3xl bg-white/60 border border-[rgba(229,224,218,0.8)] p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-[13px] font-medium">Período</div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => applyPreset("today")}
                className={`px-3 h-9 rounded-full border text-sm ${preset === "today" ? "bg-black text-white border-black" : "bg-white border-neutral-300"}`}
              >
                Hoje
              </button>
              <button
                onClick={() => applyPreset("last7")}
                className={`px-3 h-9 rounded-full border text-sm ${preset === "last7" ? "bg-black text-white border-black" : "bg-white border-neutral-300"}`}
              >
                Últimos 7 dias
              </button>
              <button
                onClick={() => applyPreset("last30")}
                className={`px-3 h-9 rounded-full border text-sm ${preset === "last30" ? "bg-black text-white border-black" : "bg-white border-neutral-300"}`}
              >
                Últimos 30 dias
              </button>
              <button
                onClick={() => applyPreset("month")}
                className={`px-3 h-9 rounded-full border text-sm ${preset === "month" ? "bg-black text-white border-black" : "bg-white border-neutral-300"}`}
              >
                Mês corrente
              </button>
              <button
                onClick={() => applyPreset("year")}
                className={`px-3 h-9 rounded-full border text-sm ${preset === "year" ? "bg-black text-white border-black" : "bg-white border-neutral-300"}`}
              >
                Ano
              </button>
              <button
                onClick={() => setPreset("custom")}
                className={`px-3 h-9 rounded-full border text-sm ${preset === "custom" ? "bg-black text-white border-black" : "bg-white border-neutral-300"}`}
              >
                Intervalo custom
              </button>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="text-[12px] text-neutral-600">De</div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPreset("custom");
                }}
                className="h-9 rounded-xl border border-neutral-300 px-3 text-sm"
                max={endDate}
              />
              <div className="text-[12px] text-neutral-600">Até</div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPreset("custom");
                }}
                className="h-9 rounded-xl border border-neutral-300 px-3 text-sm"
                min={startDate}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 justify-between">
            <div className="text-sm text-neutral-500">
              Período selecionado:{" "}
              <b>
                {startDate} — {endDate}
              </b>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-neutral-500">Ordenar por</div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "created" | "price")}
                className="h-9 rounded-xl border border-neutral-300 px-3 text-sm"
              >
                <option value="created">Data</option>
                <option value="price">Preço</option>
              </select>
              <button
                onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                className="h-9 px-3 rounded-full border border-neutral-300 text-sm"
              >
                {sortDir === "asc" ? "asc" : "desc"}
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="rounded-2xl p-4 bg-white border border-neutral-200">
            <div className="text-xs text-neutral-500">Bruto (soma Item Price)</div>
            <div className="text-lg font-semibold mt-1">{formatCurrencyBRL(totals.totalGross)}</div>
          </div>

          <div className="rounded-2xl p-4 bg-white border border-neutral-200">
            <div className="text-xs text-neutral-500">Deduções fixas (entrega + operação)</div>
            <div className="text-lg font-semibold mt-1">{formatCurrencyBRL(totals.totalFees)}</div>
          </div>

          <div className="rounded-2xl p-4 bg-white border border-neutral-200">
            <div className="text-xs text-neutral-500">Faturamento antes da comissão (para marcas)</div>
            <div className="text-lg font-semibold mt-1">{formatCurrencyBRL(totals.totalValueForBrands)}</div>
          </div>

          <div className="rounded-2xl p-4 bg-white border border-neutral-200">
            <div className="text-xs text-neutral-500">Comissão Look (10%)</div>
            <div className="text-lg font-semibold mt-1">{formatCurrencyBRL(totals.totalCommission)}</div>
          </div>

          <div className="rounded-2xl p-4 bg-white border border-neutral-200">
            <div className="text-xs text-neutral-500">Faturamento líquido para marcas</div>
            <div className="text-lg font-semibold mt-1">{formatCurrencyBRL(totals.totalBrandNet)}</div>
            <div className="text-xs text-neutral-500 mt-1">{totals.count} pedido(s)</div>
          </div>
        </div>

        {/* tabela */}
        <div
          className="rounded-3xl bg-white/55 border border-[rgba(229,224,218,0.8)] backdrop-blur-sm shadow-[0_12px_35px_-28px_rgba(0,0,0,0.3)] overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm text-neutral-900">
              <thead className="bg-[#F0ECE6] text-[11px] uppercase tracking-wide text-neutral-500/90">
                <tr>
                  <th className="py-3 pl-5 pr-3 whitespace-nowrap">Criado em</th>
                  <th className="py-3 px-3 whitespace-nowrap">Nº do pedido</th>
                  <th className="py-3 px-3 whitespace-nowrap">Cliente</th>
                  <th className="py-3 px-3 whitespace-nowrap">Status</th>
                  <th className="py-3 px-3 whitespace-nowrap">Loja</th>
                  <th className="py-3 px-3 whitespace-nowrap">CPF</th>
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
                {loading ? (
                  <tr>
                    <td colSpan={13} className="py-10 text-center text-neutral-400 text-sm">
                      Carregando…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-10 text-center text-neutral-400 text-sm">
                      Nenhum pedido encontrado neste período.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid rgba(224, 215, 204, 0.65)" }}>
                      <td className="py-4 pl-5 pr-3 text-sm text-neutral-800 whitespace-nowrap">{formatDateLocal(r.createdAtIso)}</td>
                      <td className="py-4 px-3 text-sm text-neutral-800 whitespace-nowrap">{r.orderId}</td>
                      <td className="py-4 px-3 text-sm text-neutral-900 whitespace-nowrap">{r.clientName}</td>
                      <td className="py-4 px-3 text-sm whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] bg-neutral-100 text-neutral-700 border border-neutral-200">
                          {r.status}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-sm text-neutral-700 whitespace-nowrap">{r.store}</td>
                      <td className="py-4 px-3 text-sm text-neutral-700 whitespace-nowrap">{r.cpf}</td>
                      <td className="py-4 px-3 text-sm text-neutral-900 whitespace-nowrap text-right">{formatCurrencyBRL(r.priceGross)}</td>
                      <td className="py-4 px-3 text-sm text-neutral-900 whitespace-nowrap text-right">{formatCurrencyBRL(r.deliveryFee)}</td>
                      <td className="py-4 px-3 text-sm text-neutral-900 whitespace-nowrap text-right">{formatCurrencyBRL(r.operationFee)}</td>
                      <td className="py-4 px-3 text-sm text-neutral-900 whitespace-nowrap text-right">{formatCurrencyBRL(r.valueForBrand)}</td>
                      <td className="py-4 px-3 text-sm text-neutral-900 whitespace-nowrap text-right">{formatCurrencyBRL(r.commissionLook)}</td>
                      <td className="py-4 px-3 text-sm text-neutral-900 whitespace-nowrap text-right">{formatCurrencyBRL(r.brandNet)}</td>
                      <td className="py-4 pl-3 pr-5 text-sm text-neutral-700 align-top">
                        <div className="min-w-[260px] max-h-[80px] overflow-y-auto leading-relaxed pr-1">
                          {r.notes || "—"}
                        </div>
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
