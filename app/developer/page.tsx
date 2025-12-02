'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

type Perf = {
  ordersToday: number;
  viewsToday: number;
  conversion: number;
};

type AirtableRecord = {
  id: string;
  fields: {
    ['Store Name']?: string;
    ['Created At']?: string;
  };
  createdTime: string;
};

// ======= mini chart (igual estética do painel de parceiros) =======
function MonthLine({ data, labels }: { data: number[]; labels: string[] }) {
  const w = 520, h = 200;
  const padLeft = 44, padRight = 20, padTop = 16, padBottom = 32;
  const max = Math.max(...data, 0);
  const min = 0;
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = padLeft + (i * (w - padLeft - padRight)) / (data.length > 1 ? data.length - 1 : 1);
    const y = h - padBottom - ((v - min) / range) * (h - padTop - padBottom);
    return [x, y] as [number, number];
  });

  const d = points.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(' ');

  const yTicks = [0, Math.ceil(max / 2), max].map((v) => ({
    value: v,
    y: h - padBottom - ((v - min) / range) * (h - padTop - padBottom),
  }));

  const labelStep = labels.length > 12 ? Math.ceil(labels.length / 8) : 1;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[200px]">
      {yTicks.map((t, idx) => (
        <g key={idx}>
          <line x1={padLeft} x2={w - padRight} y1={t.y} y2={t.y} stroke="#E7E1D9" strokeWidth={1} strokeDasharray="3 4" />
          <text x={padLeft - 10} y={t.y + 4} textAnchor="end" fontSize="10" fill="#7C6E61">{t.value}</text>
        </g>
      ))}

      <defs>
        <linearGradient id="line" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#111" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#111" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke="url(#line)" strokeWidth={2.2} strokeLinecap="round" />

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
        const x = padLeft + (i * (w - padLeft - padRight)) / (labels.length > 1 ? labels.length - 1 : 1);
        return i % labelStep === 0 ? (
          <text key={lab + i} x={x} y={h - 10} textAnchor="middle" fontSize="10" fill="#7C6E61">
            {lab}
          </text>
        ) : null;
      })}
    </svg>
  );
}

// =================== PÁGINA ===================
function DevHomeInner() {
  const router = useRouter();

  const SURFACE = '#F7F4EF';
  const BORDER = '#E5E0DA';

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [notice] = useState<string | null>(null); // setter removido (não usado)

  // métricas agregadas
  const [perf, setPerf] = useState<Perf>({ ordersToday: 0, viewsToday: 0, conversion: 0 });
  const [monthOrders, setMonthOrders] = useState<number>(0);
  const [monthSeries, setMonthSeries] = useState<number[]>([]);
  const [todaySeries, setTodaySeries] = useState<number[]>(Array(24).fill(0));
  const [chartRange, setChartRange] = useState<'1d' | '7d' | '30d'>('30d');
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);

  // --------- GUARD: whitelist developer_emails ----------
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

        const { data: ok, error } = await supabase.rpc('developer_email_allowed', { p_email: email });
        if (error) {
          const { data: rows } = await supabase
            .from('developer_emails')
            .select('email,active')
            .eq('email', email).eq('active', true).limit(1);
          setAllowed((rows?.length ?? 0) > 0);
        } else {
          setAllowed(!!ok);
        }
      } catch (e) {
        console.error(e);
        setAllowed(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // --------- Métricas agregadas (todas as marcas) ----------
  async function fetchOrdersAllFromAirtable() {
    const API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
    const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
    const TABLE = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || 'Orders';

    if (!API_KEY || !BASE_ID) {
      console.warn('[dev] Airtable envs faltando');
      return {
        monthCount: 0,
        todayCount: 0,
        dayBuckets: [] as number[],
        hourBuckets: Array(24).fill(0) as number[],
      };
    }

    const nowUTC = new Date();
    const startOfMonth = new Date(nowUTC.getFullYear(), nowUTC.getMonth(), 1);
    const endOfMonth = new Date(nowUTC.getFullYear(), nowUTC.getMonth() + 1, 0);
    const monthStartISO = startOfMonth.toISOString();

    const monthEndPlus1 = new Date(endOfMonth);
    monthEndPlus1.setDate(endOfMonth.getDate() + 1);
    const monthEndISO = monthEndPlus1.toISOString();

    // Sem filtro por loja — agrega tudo
    const formula = encodeURIComponent(
      `AND(IS_AFTER({Created At}, '${monthStartISO}'), IS_BEFORE({Created At}, '${monthEndISO}'))`
    );

    let url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE}?filterByFormula=${formula}&pageSize=100`;
    const all: AirtableRecord[] = [];

    try {
      while (true) {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` } });
        if (!res.ok) { console.error('[dev] airtable:', await res.text()); break; }
        const json = await res.json();
        const records: AirtableRecord[] = json.records || [];
        all.push(...records);
        if (!json.offset) break;
        url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE}?filterByFormula=${formula}&pageSize=100&offset=${json.offset}`;
      }
    } catch (err) {
      console.error('[dev] fetch airtable failed:', err);
    }

    const monthCount = all.length;

    const daysInMonth = endOfMonth.getDate();
    const dayBuckets = Array.from({ length: daysInMonth }, () => 0);
    const hourBuckets = Array.from({ length: 24 }, () => 0);

    const todayLocal = new Date();
    const y = todayLocal.getFullYear();
    const m = todayLocal.getMonth();
    const d = todayLocal.getDate();

    let todayCount = 0;

    for (const rec of all) {
      const created = rec.fields['Created At'] || rec.createdTime;
      if (!created) continue;
      const t = new Date(created);
      if (isNaN(t.getTime())) continue;

      const day = t.getDate();
      if (day >= 1 && day <= daysInMonth) dayBuckets[day - 1] += 1;

      if (t.getFullYear() === y && t.getMonth() === m && t.getDate() === d) {
        todayCount += 1;
        const hour = t.getHours();
        hourBuckets[hour] = (hourBuckets[hour] || 0) + 1;
      }
    }

    return { monthCount, todayCount, dayBuckets, hourBuckets };
  }

  async function fetchAllViewsTodayFromSupabase() {
    type ProductViewsRow = {
      view_count_today: number | null;
      view_count: number | null;
    };

    try {
      const { data, error } = await supabase
        .from('products')
        .select('view_count_today, view_count');

      if (error) {
        console.error('[dev] views supabase:', error);
        return 0;
      }

      let total = 0;
      const rows = (data ?? []) as ProductViewsRow[];

      for (const row of rows) {
        const today = typeof row.view_count_today === 'number' ? row.view_count_today : null;
        const fallback = typeof row.view_count === 'number' ? row.view_count : 0;
        total += (today ?? fallback);
      }
      return total;
    } catch (e) {
      console.error(e);
      return 0;
    }
  }

  useEffect(() => {
    if (allowed !== true) return;
    let cancelled = false;

    const load = async () => {
      const [ordersAgg, viewsToday] = await Promise.all([
        fetchOrdersAllFromAirtable(),
        fetchAllViewsTodayFromSupabase(),
      ]);
      if (cancelled) return;

      setMonthOrders(ordersAgg.monthCount);
      setMonthSeries(ordersAgg.dayBuckets);
      setTodaySeries(ordersAgg.hourBuckets);

      const orders = ordersAgg.todayCount;
      const views = viewsToday;
      const conversion = views > 0 ? (orders / views) * 100 : 0;

      setPerf({ ordersToday: orders, viewsToday: views, conversion });
    };

    load();
    const timer = setInterval(load, 60_000);
    refreshTimer.current = timer as unknown as NodeJS.Timeout;
    return () => { cancelled = true; clearInterval(timer); };
  }, [allowed]);

  async function handleSignOut() {
    await supabase.auth.signOut({ scope: 'local' });
    router.replace('/');
  }

  const chartData = useMemo(() => {
    const now = new Date();
    if (chartRange === '1d') {
      return { data: todaySeries, labels: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}h`) };
    }
    const full = monthSeries.length ? monthSeries : [0];
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    if (chartRange === '7d') {
      const day = now.getDate();
      const start = Math.max(1, day - 6);
      const slice = full.slice(start - 1, day);
      const labs = Array.from({ length: slice.length }, (_, i) => `${start + i}`);
      return { data: slice, labels: labs };
    }
    return { data: full, labels: Array.from({ length: daysInMonth }, (_, i) => String(i + 1)) };
  }, [chartRange, monthSeries, todaySeries]);

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
        <header className="w-full border-b border-[#E5E0DA]/80 bg-[#F7F4EF]/80 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-8 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
                <span className="text-[13px] font-semibold tracking-tight text-white leading-none">L</span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold tracking-tight text-black">Look</span>
                <span className="text-[11px] text-neutral-500">Painel do developer</span>
              </div>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-3xl px-8 py-16">
          <h1 className="text-xl font-semibold mb-2">Acesso restrito</h1>
          <p className="text-sm text-neutral-600">Você precisa estar na whitelist de developers.</p>
        </div>
      </main>
    );
  }

  // Card estilizado como no painel de parceiros
  function Card(props: { children: React.ReactNode; className?: string }) {
    return (
      <div
        className={`rounded-3xl p-8 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.18)] transition hover:shadow-[0_10px_40px_-16px_rgba(0,0,0,0.22)] ${props.className ?? ''}`}
        style={{ backgroundColor: 'rgba(255,255,255,0.55)', border: `1px solid ${BORDER}`, backdropFilter: 'blur(6px)' }}
      >
        {props.children}
      </div>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      {/* topbar */}
      <header className="w-full border-b border-[#E5E0DA]/80 bg-[#F7F4EF]/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
              <span className="text-[13px] font-semibold tracking-tight text-white leading-none">L</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-black">Look</span>
              <span className="text-[11px] text-neutral-500">Painel do developer</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {userEmail ? (
              <span className="px-3 py-1 rounded-full bg-white/70 border border-neutral-200 text-[11px] text-neutral-700">
                {userEmail}
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
            Bom trabalho hoje.
          </h1>
          <p className="mt-4 text-[15px] text-neutral-700 max-w-xl leading-relaxed">
            Overview de todas as marcas: pedidos, views e conversão. Abaixo, personalize a Home da Look.
          </p>
          {notice && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p>
          )}
        </div>
      </div>

      {/* respiro */}
      <div className="h-10" />

      {/* grid 2x2 */}
      <div className="mx-auto max-w-6xl px-8 pb-20 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* KPI HOJE */}
        <Card>
          <h2 className="text-[20px] font-semibold text-black">Hoje (todas as marcas)</h2>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-neutral-200/80 bg-white/60 p-4 text-center">
              <div className="text-[12px] text-neutral-500">Pedidos</div>
              <div className="mt-1 text-2xl font-semibold text-black">{perf.ordersToday}</div>
            </div>
            <div className="rounded-2xl border border-neutral-200/80 bg-white/60 p-4 text-center">
              <div className="text-[12px] text-neutral-500">Visualizações</div>
              <div className="mt-1 text-2xl font-semibold text-black">{perf.viewsToday}</div>
            </div>
            <div className="rounded-2xl border border-neutral-200/80 bg-white/60 p-4 text-center">
              <div className="text-[12px] text-neutral-500">Conversão</div>
              <div className="mt-1 text-2xl font-semibold text-black">{perf.conversion.toFixed(1)}%</div>
            </div>
          </div>
        </Card>

        {/* ATALHOS */}
        <Card>
          <h2 className="text-[20px] font-semibold text-black">Ações rápidas</h2>
          <p className="mt-1 text-sm text-neutral-600 leading-relaxed">Atalhos do dia a dia.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              onClick={() => router.push('/developer/pedidos')}
              className="inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white shadow-md hover:opacity-90 active:scale-[0.98] transition"
            >
              Ver pedidos (Airtable)
            </button>
            <button
              onClick={() => router.push('/developer/products')}
              className="inline-flex h-11 items-center justify-center rounded-full border border-neutral-300/70 bg-white/70 px-6 text-sm font-medium text-neutral-900 hover:bg-white"
            >
              Produtos (geral)
            </button>
          </div>
        </Card>

        {/* GRÁFICO DE PEDIDOS */}
        <Card className="md:col-span-2">
          <div className="flex items-center justify-between mb-4 gap-4">
            <div>
              <h2 className="text-[20px] font-semibold text-black">Pedidos no período (todas as marcas)</h2>
              <p className="mt-1 text-sm text-neutral-600">A partir do Airtable.</p>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setRangeMenuOpen((v) => !v)}
                className="h-9 inline-flex items-center gap-2 rounded-full bg-white/80 border border-neutral-200/80 px-4 text-sm leading-none text-neutral-900 shadow-sm hover:bg-white whitespace-nowrap"
              >
                <span className="whitespace-nowrap">
                  {chartRange === '1d' ? 'Hoje' : chartRange === '7d' ? 'Últimos 7 dias' : 'Últimos 30 dias'}
                </span>
                <span className="text-[11px] text-neutral-500 leading-none">▼</span>
              </button>

              {rangeMenuOpen ? (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white/95 border border-neutral-200/80 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.25)] backdrop-blur-sm overflow-hidden z-20">
                  <button
                    onClick={() => { setChartRange('1d'); setRangeMenuOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm ${chartRange === '1d' ? 'bg-black text-white' : 'text-neutral-700 hover:bg-neutral-50'}`}
                  >
                    Hoje
                  </button>
                  <button
                    onClick={() => { setChartRange('7d'); setRangeMenuOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm ${chartRange === '7d' ? 'bg-black text-white' : 'text-neutral-700 hover:bg-neutral-50'}`}
                  >
                    Últimos 7 dias
                  </button>
                  <button
                    onClick={() => { setChartRange('30d'); setRangeMenuOpen(false); }}
                    className={`w-full text-left px-4 py-2 text.sm ${chartRange === '30d' ? 'bg-black text-white' : 'text-neutral-700 hover:bg-neutral-50'}`}
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

          <div className="mt-3 text-xs text-neutral-600">
            Total no mês: <span className="font-semibold text-neutral-900">{monthOrders}</span>
          </div>
        </Card>

        {/* GESTÃO DE ENTREGADORES */}
        <Card>
          <h2 className="text-[20px] font-semibold text-black">Entregadores</h2>
          <p className="mt-1 text-sm text-neutral-600 leading-relaxed">
            Veja quem se cadastrou, aprove ou rejeite motoristas e gerencie suspensões.
          </p>

          <div className="mt-7">
            <button
              onClick={() => router.push('/developer/entregadores')}
              className="inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white shadow-md hover:opacity-90 active:scale-[0.98] transition"
            >
              Gerenciar entregadores
            </button>
          </div>
        </Card>

        {/* NOVO: Financeiro — aparece ao lado do card Entregadores em telas md+ */}
        <Card>
          <h2 className="text-[20px] font-semibold text-black">Financeiro (todas as marcas)</h2>
          <p className="mt-1 text-sm text-neutral-600 leading-relaxed">
            Visão consolidada do faturamento de todas as marcas. Acesse o painel financeiro para ver receitas, comissões e exportar relatórios.
          </p>

          <div className="mt-7">
            <button
              onClick={() => router.push('/developer/financeiro')}
              className="inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white shadow-md hover:opacity-90 active:scale-[0.98] transition"
            >
              Abrir financeiro
            </button>
          </div>
        </Card>

        {/* GERENCIAR BANNERS (apenas CTA) */}
        <Card className="md:col-span-2">
          <h2 className="text-[20px] font-semibold text-black">Gerenciar Home (Banners)</h2>
          <p className="mt-1 text-sm text-neutral-600 leading-relaxed">
            Edite carrossel, editorial tall e selection hero por cidade.
          </p>
          <div className="mt-7">
            <button
              onClick={() => router.push('/developer/banners')}
              className="inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white shadow-md hover:opacity-90 active:scale-[0.98] transition"
            >
              Abrir gerenciador
            </button>
          </div>
        </Card>
      </div>
    </main>
  );
}

export default function DeveloperPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F7F4EF]" />}>
      <DevHomeInner />
    </Suspense>
  );
}
