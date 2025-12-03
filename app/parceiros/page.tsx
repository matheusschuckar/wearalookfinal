"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type Perf = {
  ordersToday: number;
  viewsToday: number;
  conversion: number;
};

type AirtableRecord = {
  id: string;
  fields: {
    ["Store Name"]?: string;
    ["Created At"]?: string;
  };
  createdTime: string;
};

// =================== GRÁFICO ===================
function MonthLine({ data, labels }: { data: number[]; labels: string[] }) {
  const w = 520;
  const h = 200;
  const padLeft = 44;
  const padRight = 20;
  const padTop = 16;
  const padBottom = 32;
  const max = Math.max(...data, 0);
  const min = 0;
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x =
      padLeft +
      (i * (w - padLeft - padRight)) / (data.length > 1 ? data.length - 1 : 1);
    const y = h - padBottom - ((v - min) / range) * (h - padTop - padBottom);
    return [x, y] as [number, number];
  });

  const d = points
    .map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`))
    .join(" ");

  const yTicks = [0, Math.ceil(max / 2), max].map((v) => ({
    value: v,
    y: h - padBottom - ((v - min) / range) * (h - padTop - padBottom),
  }));

  const labelStep = labels.length > 12 ? Math.ceil(labels.length / 8) : 1;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[200px]">
      {yTicks.map((t, idx) => (
        <g key={idx}>
          <line
            x1={padLeft}
            x2={w - padRight}
            y1={t.y}
            y2={t.y}
            stroke="#E7E1D9"
            strokeWidth={1}
            strokeDasharray="3 4"
          />
          <text
            x={padLeft - 10}
            y={t.y + 4}
            textAnchor="end"
            fontSize="10"
            fill="#7C6E61"
          >
            {t.value}
          </text>
        </g>
      ))}

      <defs>
        <linearGradient id="line" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#111" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#111" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path
        d={d}
        fill="none"
        stroke="url(#line)"
        strokeWidth={2.2}
        strokeLinecap="round"
      />

      {points.length ? (
        <circle
          cx={points[points.length - 1][0]}
          cy={points[points.length - 1][1]}
          r={3.5}
          fill="#111"
          stroke="white"
          strokeWidth={1.4}
        />
      ) : null}

      {labels.map((lab, i) => {
        const x =
          padLeft +
          (i * (w - padLeft - padRight)) /
            (labels.length > 1 ? labels.length - 1 : 1);
        return i % labelStep === 0 ? (
          <text
            key={lab + i}
            x={x}
            y={h - 10}
            textAnchor="middle"
            fontSize="10"
            fill="#7C6E61"
          >
            {lab}
          </text>
        ) : null;
      })}
    </svg>
  );
}

// =================== PÁGINA ===================
function PartnerHomeInner() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("");
  const [loggedEmail, setLoggedEmail] = useState<string>("");
  const [perf, setPerf] = useState<Perf>({
    ordersToday: 0,
    viewsToday: 0,
    conversion: 0,
  });

  const [monthOrders, setMonthOrders] = useState<number>(0);
  const [monthSeries, setMonthSeries] = useState<number[]>([]);
  const [todaySeries, setTodaySeries] = useState<number[]>(Array(24).fill(0));

  const [chartRange, setChartRange] = useState<"1d" | "7d" | "30d">("30d");
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);

  const refreshTimer = useRef<NodeJS.Timeout | null>(null);

  const SURFACE = "#F7F4EF";
  const BORDER = "#E5E0DA";

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
        const userEmail = user.email.toLowerCase();
        setLoggedEmail(userEmail);

        const { data: allowed, error: allowErr } = await supabase.rpc(
          "partner_email_allowed",
          {
            p_email: userEmail,
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
          .eq("email", userEmail)
          .eq("active", true)
          .maybeSingle();
        if (sErr) throw sErr;

        const store = row?.store_name || "sua marca";
        setStoreName(store);
      } catch (e) {
        console.error(e);
        setNotice("Não foi possível carregar seus dados no momento.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // VIEWS HOJE
  async function fetchTodayViewsFromSupabase(forStore: string) {
    const { data, error } = await supabase
      .from("products")
      .select("view_count_today, view_count")
      .eq("store_name", forStore);

    if (error) {
      console.error("[parceiros] erro ao buscar views:", error);
      return 0;
    }

    // tipagem explícita esperada dos registros retornados
    let total = 0;
    for (const row of ((data ?? []) as { view_count_today?: number; view_count?: number }[])) {
      const today =
        typeof row.view_count_today === "number" ? row.view_count_today : null;
      const fallback = typeof row.view_count === "number" ? row.view_count : 0;

      total += today !== null ? today : fallback;
    }
    return total;
  } // <--- fechamento adicionado aqui

  // =================== AQUI É ONDE MUDOU ===================
  async function fetchOrdersFromAirtable(forStore: string) {
    const API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
    const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
    const TABLE = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || "Orders";

    if (!API_KEY || !BASE_ID) {
      console.warn("[parceiros] Airtable envs faltando");
      return {
        monthCount: 0,
        todayCount: 0,
        dayBuckets: [] as number[],
        hourBuckets: Array(24).fill(0) as number[],
      };
    }

    // base para o mês em UTC
    const nowUTC = new Date();
    const startOfMonth = new Date(nowUTC.getFullYear(), nowUTC.getMonth(), 1);
    const endOfMonth = new Date(nowUTC.getFullYear(), nowUTC.getMonth() + 1, 0);
    const monthStartISO = startOfMonth.toISOString();

    const monthEndPlus1 = new Date(endOfMonth);
    monthEndPlus1.setDate(endOfMonth.getDate() + 1);
    const monthEndISO = monthEndPlus1.toISOString();

    const formula = encodeURIComponent(
      `AND({Store Name}='${forStore}', IS_AFTER({Created At}, '${monthStartISO}'), IS_BEFORE({Created At}, '${monthEndISO}'))`
    );

    let url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE}?filterByFormula=${formula}&pageSize=100`;
    const all: AirtableRecord[] = [];

    try {
      let offset: string | undefined;
      do {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${API_KEY}` },
        });
        if (!res.ok) {
          console.error("[parceiros] erro airtable:", await res.text());
          break;
        }

        const json: { records?: AirtableRecord[]; offset?: string } = await res.json();
        all.push(...(json.records ?? []));

        offset = json.offset;
        if (offset) {
          url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE}?filterByFormula=${formula}&pageSize=100&offset=${offset}`;
        }
      } while (offset);
    } catch (err) {
      console.error("[parceiros] fetch airtable failed:", err);
    }

    const monthCount = all.length;

    const daysInMonth = endOfMonth.getDate();
    const dayBuckets = Array.from({ length: daysInMonth }, () => 0);
    const hourBuckets = Array.from({ length: 24 }, () => 0);

    // data de HOJE no horário local
    const todayLocal = new Date();
    const tYear = todayLocal.getFullYear();
    const tMonth = todayLocal.getMonth();
    const tDate = todayLocal.getDate();

    let todayCount = 0;

    for (const rec of all) {
      const created = rec.fields["Created At"] || rec.createdTime;
      if (!created) continue;

      // pega direto, sem subtrair offset manual
      const createdLocal = new Date(created);
      if (isNaN(createdLocal.getTime())) continue;

      // bucket por dia (pra 7d/30d)
      const day = createdLocal.getDate();
      if (day >= 1 && day <= daysInMonth) {
        dayBuckets[day - 1] += 1;
      }

      // é hoje?
      const isToday =
        createdLocal.getFullYear() === tYear &&
        createdLocal.getMonth() === tMonth &&
        createdLocal.getDate() === tDate;

      if (isToday) {
        todayCount += 1;
        const hour = createdLocal.getHours(); // 0..23
        hourBuckets[hour] = (hourBuckets[hour] || 0) + 1;
      }
    }

    return {
      monthCount,
      todayCount,
      dayBuckets,
      hourBuckets,
    };
  }
  // =================== FIM DA PARTE QUE MUDOU ===================

  useEffect(() => {
    if (!storeName) return;

    let cancelled = false;

    const load = async () => {
      const [ordersData, viewsToday] = await Promise.all([
        fetchOrdersFromAirtable(storeName),
        fetchTodayViewsFromSupabase(storeName),
      ]);

      if (cancelled) return;

      setMonthOrders(ordersData.monthCount);
      setMonthSeries(ordersData.dayBuckets);
      setTodaySeries(ordersData.hourBuckets);

      const orders = ordersData.todayCount;
      const views = viewsToday;
      const conversion = views > 0 ? (orders / views) * 100 : 0;

      setPerf(() => ({
        ordersToday: orders,
        viewsToday: views,
        conversion,
      }));
    };

    load();

    const timer = setInterval(load, 60_000);
    refreshTimer.current = timer;

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [storeName]);

  async function handleSignOut() {
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/parceiros/login");
  }

  function Card(props: { children: React.ReactNode; className?: string }) {
    return (
      <div
        className={`rounded-3xl p-8 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.18)] transition hover:shadow-[0_10px_40px_-16px_rgba(0,0,0,0.22)] ${
          props.className ?? ""
        }`}
        style={{
          backgroundColor: "rgba(255,255,255,0.55)",
          border: `1px solid ${BORDER}`,
          backdropFilter: "blur(6px)",
        }}
      >
        {props.children}
      </div>
    );
  }

  const chartData = (() => {
    const now = new Date();

    if (chartRange === "1d") {
      const labels = Array.from(
        { length: 24 },
        (_, i) => i.toString().padStart(2, "0") + "h"
      );
      return {
        data: todaySeries,
        labels,
      };
    }

    const full = monthSeries.length ? monthSeries : [0];
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();

    if (chartRange === "7d") {
      const day = now.getDate();
      const start = Math.max(1, day - 6);
      const slice = full.slice(start - 1, day);
      const labs = Array.from(
        { length: slice.length },
        (_, i) => `${start + i}`
      );
      return {
        data: slice,
        labels: labs,
      };
    }

    return {
      data: full,
      labels: Array.from({ length: daysInMonth }, (_, i) => String(i + 1)),
    };
  })();

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

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      {/* topbar */}
      <header className="w-full border-b border-[#E5E0DA]/80 bg-[#F7F4EF]/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
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
                Painel de parceiros
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {loggedEmail ? (
              <span className="px-3 py-1 rounded-full bg-white/70 border border-neutral-200 text-[11px] text-neutral-700">
                {loggedEmail}
              </span>
            ) : null}
            <button
              onClick={handleSignOut}
              className="h-9 rounded-full px-4 text-xs font-medium text-neutral-700 hover:text-black transition border border-neutral-300/70 bg-white/70"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* hero */}
      <div className="mx-auto max-w-6xl px-8 pt-12 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[38px] leading-tight font-medium tracking-tight text-black">
            Bem-vindo(a), <span className="font-semibold">{storeName}</span>
          </h1>
          <p className="mt-4 text-[15px] text-neutral-700 max-w-xl leading-relaxed">
            Acompanhe pedidos, gerencie produtos e veja o desempenho da sua
            marca na Look.
          </p>
          {notice && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {notice}
            </p>
          )}
        </div>
      </div>

      {/* respiro */}
      <div className="h-10" />

      {/* grid 2x2 */}
      <div className="mx-auto max-w-6xl px-8 pb-28 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Pedidos (mês) */}
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[20px] font-semibold text-black">Pedidos</h2>
              <p className="mt-1 text-sm text-neutral-600 leading-relaxed">
                Acompanhe os pedidos da sua marca em tempo real.
              </p>
            </div>
            <span className="rounded-full px-3 py-1 text-xs text-neutral-700 border border-neutral-200/70 bg-white/50">
              Mês: {monthOrders}
            </span>
          </div>
          <div className="mt-7">
            <button
              onClick={() => router.push("/parceiros/pedidos")}
              className="inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white shadow-md hover:opacity-90 active:scale-[0.98] transition"
            >
              Ver pedidos
            </button>
          </div>
        </Card>

        {/* Produtos */}
        <Card>
          <h2 className="text-[20px] font-semibold text-black">Produtos</h2>
          <p className="mt-1 text-sm text-neutral-600 leading-relaxed">
            Cadastre novos itens, atualize estoque e mantenha sua vitrine
            atualizada.
          </p>
          <div className="mt-7 flex gap-3">
            <button
              onClick={() => router.push("/parceiros/produtos")}
              className="inline-flex h-11 min-w-[150px] items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white shadow-md hover:opacity-90 active:scale-[0.98] transition"
            >
              Gerenciar
            </button>
            <button
              onClick={() => router.push("/parceiros/produtos/adicionar")}
              className="inline-flex h-11 min-w-[150px] items-center justify-center rounded-full border border-neutral-300/70 bg-white/70 px-6 text-sm font-medium text-neutral-900 hover:bg-white"
            >
              Adicionar
            </button>
          </div>
        </Card>

        {/* Performance hoje */}
        <Card>
          <h2 className="text-[20px] font-semibold text-black">
            Performance hoje
          </h2>
          <p className="mt-1 text-sm text-neutral-600 leading-relaxed">
            Resumo rápido do desempenho da sua marca.
          </p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-neutral-200/80 bg-white/60 p-4 text-center">
              <div className="text-[12px] text-neutral-500">Pedidos</div>
              <div className="mt-1 text-2xl font-semibold text-black">
                {perf.ordersToday}
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-200/80 bg-white/60 p-4 text-center">
              <div className="text-[12px] text-neutral-500">Visualizações</div>
              <div className="mt-1 text-2xl font-semibold text-black">
                {perf.viewsToday}
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-200/80 bg-white/60 p-4 text-center">
              <div className="text-[12px] text-neutral-500">Conversão</div>
              <div className="mt-1 text-2xl font-semibold text-black">
                {perf.conversion.toFixed(1)}%
              </div>
            </div>
          </div>
        </Card>

        {/* Gráfico */}
        <Card>
          <div className="flex items-center justify-between mb-4 gap-4">
            <div>
              <h2 className="text-[20px] font-semibold text-black">
                Pedidos no período
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                Visualize o ritmo de vendas ao longo dos dias.
              </p>
            </div>

            {/* SELECT LOOK-LIKE */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setRangeMenuOpen((v) => !v)}
                className="h-9 inline-flex items-center gap-2 rounded-full bg-white/80 border border-neutral-200/80 px-4 text-sm leading-none text-neutral-900 shadow-sm hover:bg-white whitespace-nowrap"
              >
                <span className="whitespace-nowrap">
                  {chartRange === "1d"
                    ? "Hoje"
                    : chartRange === "7d"
                    ? "Últimos 7 dias"
                    : "Últimos 30 dias"}
                </span>
                <span className="text-[11px] text-neutral-500 leading-none">
                  ▼
                </span>
              </button>

              {rangeMenuOpen ? (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white/95 border border-neutral-200/80 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.25)] backdrop-blur-sm overflow-hidden z-20">
                  <button
                    onClick={() => {
                      setChartRange("1d");
                      setRangeMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm ${
                      chartRange === "1d"
                        ? "bg-black text-white"
                        : "text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    Hoje
                  </button>
                  <button
                    onClick={() => {
                      setChartRange("7d");
                      setRangeMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm ${
                      chartRange === "7d"
                        ? "bg-black text-white"
                        : "text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    Últimos 7 dias
                  </button>
                  <button
                    onClick={() => {
                      setChartRange("30d");
                      setRangeMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm ${
                      chartRange === "30d"
                        ? "bg-black text-white"
                        : "text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    Últimos 30 dias
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          <div className="rounded-2xl bg-white/50 border border-neutral-100/70 p-3">
            <MonthLine data={chartData.data} labels={chartData.labels} />
          </div>
        </Card>

        {/* ===== NOVOS CARDS (abaixo dos 4 existentes) ===== */}

        {/* Personalize sua loja */}
        <Card>
          <h2 className="text-[20px] font-semibold text-black">
            Personalize sua loja
          </h2>
          <p className="mt-1 text-sm text-neutral-600 leading-relaxed">
            Gerencie banners, categorias e o layout da sua vitrine na Look.
          </p>
          <div className="mt-7">
            <button
              onClick={() => router.push("/parceiros/loja/personalizar")}
              className="inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white shadow-md hover:opacity-90 active:scale-[0.98] transition"
            >
              Personalizar
            </button>
          </div>
        </Card>

        {/* Financeiro */}
        <Card>
          <h2 className="text-[20px] font-semibold text-black">Financeiro</h2>
          <p className="mt-1 text-sm text-neutral-600 leading-relaxed">
            Acompanhe repasses, extratos e status de pagamentos.
          </p>
          <div className="mt-7">
            <button
              onClick={() => router.push("/parceiros/financeiro")}
              className="inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white shadow-md hover:opacity-90 active:scale-[0.98] transition"
            >
              Abrir financeiro
            </button>
          </div>
        </Card>

        {/* Cupons (NOVO) */}
        <Card>
          <h2 className="text-[20px] font-semibold text-black">Cupons</h2>
          <p className="mt-1 text-sm text-neutral-600 leading-relaxed">
            Crie códigos promocionais e gerencie os cupons da sua marca.
            Use criar para gerar cupons que podem ser globals, por marca ou por produto.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => router.push("/parceiros/cupons")}
              className="inline-flex h-11 min-w-[150px] items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white shadow-md hover:opacity-90 active:scale-[0.98] transition"
            >
              Criar cupom
            </button>

            <button
              onClick={() => router.push("/parceiros/cupons/gerenciar")}
              className="inline-flex h-11 min-w-[150px] items-center justify-center rounded-full border border-neutral-300/70 bg-white/70 px-6 text-sm font-medium text-neutral-900 hover:bg-white"
            >
              Gerenciar cupons
            </button>
          </div>

          <div className="mt-4 text-xs text-neutral-500">
            Observação: a página de gerenciamento mostra apenas cupons criados pela sua marca. Cupons criados pela Look não aparecem aqui.
          </div>
        </Card>
        {/* ===== FIM DOS NOVOS CARDS ===== */}
      </div>
    </main>
  );
}

export default function PartnerHomePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F7F4EF]" />}>
      <PartnerHomeInner />
    </Suspense>
  );
}
