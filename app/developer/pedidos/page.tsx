// app/developer/pedidos/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type OrderStatus =
  | "Aguardando Pagamento"
  | "Pago"
  | "Enviado"
  | "Entregue"
  | "Cancelado";

type AirtableRecord = {
  id: string;
  createdTime: string;
  fields: {
    ["Name"]?: string;
    ["Order ID"]?: string;
    ["Created At"]?: string;
    ["Status"]?: OrderStatus | string;
    ["Store Name"]?: string;
    ["Item Price"]?: number | string;
    ["Notes"]?: string;
  };
};

const SURFACE = "#F7F4EF";
export const dynamic = "force-dynamic";

const STATUS_OPTIONS: OrderStatus[] = [
  "Aguardando Pagamento",
  "Pago",
  "Enviado",
  "Entregue",
  "Cancelado",
];

export default function DevOrdersPage() {
  const router = useRouter();

  // ---------- Acesso / whitelist ----------
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const email = user?.email?.toLowerCase() ?? "";
        if (!email) { setAllowed(false); return; }
        setUserEmail(email);
        const { data: ok, error } = await supabase.rpc("developer_email_allowed", { p_email: email });
        if (error) {
          const { data: rows } = await supabase
            .from("developer_emails")
            .select("email,active")
            .eq("email", email).eq("active", true).limit(1);
          if (mounted) setAllowed((rows?.length ?? 0) > 0);
        } else {
          if (mounted) setAllowed(!!ok);
        }
      } catch {
        if (mounted) setAllowed(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ---------- Estado UI ----------
  const [orders, setOrders] = useState<AirtableRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [refreshMs, setRefreshMs] = useState<number>(15000);
  const [updating, setUpdating] = useState<boolean>(false);

  // áudio / detecção
  const audioCtxRef = useRef<AudioContext | null>(null);
  const newestOrderIdRef = useRef<string | null>(null);
  const prevStatusesRef = useRef<Record<string, string>>({});

  // controle de fetch
  const currentAbortRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef<boolean>(false);

  // ---------- Áudio ----------
  const getAudioCtx = useCallback(async (): Promise<AudioContext | null> => {
    try {
      if (!audioCtxRef.current) {
        const win = window as unknown as { webkitAudioContext?: new () => AudioContext };
        const Ctor = (window.AudioContext ?? win.webkitAudioContext) as
          | (new () => AudioContext)
          | undefined;
        if (Ctor) audioCtxRef.current = new Ctor();
      }
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === "suspended") { await ctx.resume().catch(() => {}); }
      return ctx ?? null;
    } catch {
      return null;
    }
  }, []);

  const playBeep = useCallback(async () => {
    const ctx = await getAudioCtx();
    if (!ctx || ctx.state !== "running") {
      try {
        const a = new Audio("data:audio/wav;base64,UklGRhQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQgAAAAA/////w==");
        a.volume = 1; a.play().catch(() => {});
      } catch {}
      return;
    }
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(960, now);
      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(0.6, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 1.2);
    } catch {}
  }, [getAudioCtx]);

  useEffect(() => {
    const unlock = () => {
      getAudioCtx().catch(() => {});
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("keydown", unlock);
    };
    document.addEventListener("click", unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });
    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, [getAudioCtx]);

  // ---------- Fetch Airtable (todos) ----------
  const fetchAllOrders = useCallback(async (signal?: AbortSignal): Promise<AirtableRecord[]> => {
    const API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
    const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
    const TABLE = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || "Orders";
    if (!API_KEY || !BASE_ID) return [];

    let url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE}?sort[0][field]=Created%20At&sort[0][direction]=desc&pageSize=100`;
    const all: AirtableRecord[] = [];
    while (true) {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` }, cache: "no-store", signal });
      if (!res.ok) break;
      const json = await res.json();
      all.push(...(json.records || []));
      if (!json.offset) break;
      url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE}?sort[0][field]=Created%20At&sort[0][direction]=desc&pageSize=100&offset=${json.offset}`;
    }
    return all;
  }, []);

  // ---------- Loader ----------
  const loadNow = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setUpdating(true);
    setLoading(prev => prev && orders.length === 0);

    if (currentAbortRef.current) currentAbortRef.current.abort();
    const abort = new AbortController();
    currentAbortRef.current = abort;

    try {
      const data = await fetchAllOrders(abort.signal);

      // beep: novo pedido / virou "Pago"
      let shouldBeep = false;
      const newest = data[0];
      if (newest && newestOrderIdRef.current && newest.id !== newestOrderIdRef.current) {
        shouldBeep = true;
      }
      if (newest) newestOrderIdRef.current = newest.id;

      const prevMap = prevStatusesRef.current || {};
      for (const rec of data) {
        const prev = prevMap[rec.id] || "";
        const curr = (rec.fields["Status"] || "") as string;
        if (curr === "Pago" && prev !== "Pago") { shouldBeep = true; break; }
      }
      const nextMap: Record<string, string> = {};
      for (const rec of data) { nextMap[rec.id] = (rec.fields["Status"] || "") as string; }
      prevStatusesRef.current = nextMap;

      if (shouldBeep) await playBeep();

      setOrders(data);
      setNotice(null);
      setLastRefreshedAt(new Date());
    } catch (e: unknown) {
      const isAbort =
        e instanceof DOMException ? e.name === "AbortError" : false;
      if (!isAbort) setNotice("Não foi possível carregar os pedidos agora.");
    } finally {
      if (currentAbortRef.current === abort) currentAbortRef.current = null;
      isFetchingRef.current = false;
      setUpdating(false);
      setLoading(false);
    }
  }, [fetchAllOrders, orders.length, playBeep]);

  useEffect(() => {
    if (allowed !== true) return;
    loadNow();
  }, [allowed, loadNow]);

  useEffect(() => {
    if (allowed !== true) return;
    let t: ReturnType<typeof setInterval> | null = null;
    if (refreshMs > 0) t = setInterval(() => { loadNow(); }, refreshMs);
    return () => { if (t) clearInterval(t); };
  }, [allowed, refreshMs, loadNow]);

  // ---------- Updates ----------
  async function updateAirtableStatus(recordId: string, newStatus: OrderStatus) {
    const API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
    const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
    const TABLE = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || "Orders";
    if (!API_KEY || !BASE_ID) { setNotice("Airtable não configurado."); return false; }

    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE}/${recordId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: { Status: newStatus }, typecast: true }),
    });
    if (!res.ok) { setNotice("Falha ao atualizar status no Airtable."); return false; }
    return true;
  }

  async function syncSupabaseStatus(orderId: string | undefined, airtableId: string, newStatus: OrderStatus) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("airtable_id", airtableId)
        .select("id");
      if (error) throw error;

      if ((data?.length ?? 0) === 0 && orderId) {
        const { data: d2, error: e2 } = await supabase
          .from("orders")
          .update({ status: newStatus })
          .eq("order_id", orderId)
          .select("id");
        if (e2) throw e2;
        if ((d2?.length ?? 0) === 0) {
          console.warn("[dev/pedidos] Supabase: nenhuma linha para atualizar (ok).");
        }
      }
    } catch (e) {
      console.warn("[dev/pedidos] Falha ao sincronizar status no Supabase (ignorado):", e);
      setNotice("Status atualizado. Sincronização Supabase opcional falhou (ok).");
    }
  }

  async function handleChangeStatus(rec: AirtableRecord, next: OrderStatus) {
    const current = (rec.fields["Status"] as OrderStatus) || "Aguardando Pagamento";
    if (next === current) return;

    // otimista
    setOrders(prev =>
      prev.map(o => (o.id === rec.id ? { ...o, fields: { ...o.fields, Status: next } } : o))
    );

    const ok = await updateAirtableStatus(rec.id, next);
    if (!ok) {
      // reverte se Airtable falhar
      setOrders(prev =>
        prev.map(o => (o.id === rec.id ? { ...o, fields: { ...o.fields, Status: current } } : o))
      );
      return;
    }

    await syncSupabaseStatus(rec.fields["Order ID"], rec.id, next);
    setNotice(null);
  }

  function formatDate(iso?: string) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  if (allowed === null) {
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
          <div className="mx-auto max-w-6xl px-8 h-14 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center"><span className="text-[13px] font-semibold tracking-tight text-white leading-none">L</span></div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-black">Look</span>
              <span className="text-[11px] text-neutral-500">Pedidos (developer)</span>
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

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      {/* topbar */}
      <header className="w-full border-b border-[#E5E0DA]/80 bg-[#F7F4EF]/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/developer")}
              className="h-8 w-8 rounded-full bg-white/70 border border-neutral-200/70 flex items-center justify-center text-neutral-700 hover:text-black hover:bg-white transition"
              aria-label="Voltar para o painel"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none">
                <path d="M15 6l-6 6 6 6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
              <span className="text-[13px] font-semibold tracking-tight text-white leading-none">L</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-black">Look</span>
              <span className="text-[11px] text-neutral-500">Pedidos (todas as marcas)</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-[12px] text-neutral-700">
              <span className="opacity-70">Auto refresh</span>
              <select
                value={refreshMs}
                onChange={async (e: React.ChangeEvent<HTMLSelectElement>) => { await getAudioCtx(); setRefreshMs(Number(e.target.value)); }}
                className="h-8 rounded-full border border-neutral-300/70 bg-white/80 px-2 text-[12px] text-neutral-900"
              >
                <option value={5000}>5 s</option>
                <option value={15000}>15 s</option>
                <option value={30000}>30 s</option>
                <option value={60000}>60 s</option>
              </select>
            </div>

            <button
              onClick={async () => { await getAudioCtx(); loadNow(); }}
              disabled={updating}
              className="h-9 rounded-full px-4 text-xs font-medium text-neutral-700 hover:text-black transition border border-neutral-300/70 bg-white/70 disabled:opacity-60"
            >
              {updating ? "Atualizando…" : "Atualizar agora"}
            </button>

            {userEmail ? (
              <span className="hidden sm:inline px-3 py-1 rounded-full bg-white/70 border border-neutral-200 text-[11px] text-neutral-700">
                {userEmail}
              </span>
            ) : null}

            <button
              onClick={async () => { await supabase.auth.signOut({ scope: "local" }); router.replace("/"); }}
              className="h-9 rounded-full px-4 text-xs font-medium text-neutral-700 hover:text-black transition border border-neutral-300/70 bg-white/70"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* conteúdo */}
      <div className="mx-auto max-w-6xl px-8 pt-10 pb-20">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[30px] font-semibold text-black tracking-tight">Pedidos</h1>
            <p className="text-sm text-neutral-600 mt-1">Todos os pedidos recebidos via Look.</p>
            {notice && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p>}
          </div>
          <div className="text-[11px] text-neutral-500">
            {lastRefreshedAt ? `Atualizado: ${lastRefreshedAt.toLocaleTimeString("pt-BR")}` : "—"}
          </div>
        </div>

        <div
          className="rounded-3xl bg-white/55 border border-[rgba(229,224,218,0.8)] backdrop-blur-sm shadow-[0_12px_35px_-28px_rgba(0,0,0,0.3)]"
          style={{ minHeight: "200px", overflow: "visible" }} // << importante: dropdown não é cortado
        >
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full text-left text-sm text-neutral-900">
              <thead className="bg-[#F0ECE6] text-[11px] uppercase tracking-wide text-neutral-500/90">
                <tr>
                  <th className="py-3 pl-5 pr-3 whitespace-nowrap">Cliente</th>
                  <th className="py-3 px-3 whitespace-nowrap">Nº do pedido</th>
                  <th className="py-3 px-3 whitespace-nowrap">Criado em</th>
                  <th className="py-3 px-3 whitespace-nowrap">Status</th>
                  <th className="py-3 px-3 whitespace-nowrap">Loja</th>
                  <th className="py-3 px-3 whitespace-nowrap text-right">Preço</th>
                  <th className="py-3 pl-3 pr-5 whitespace-nowrap">Itens</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="py-10 text-center text-neutral-400 text-sm">Carregando pedidos…</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-neutral-400 text-sm">Nenhum pedido encontrado.</td></tr>
                ) : (
                  orders.map((ord) => {
                    const f = ord.fields;
                    const price = typeof f["Item Price"] === "number" ? f["Item Price"] : Number(f["Item Price"] || 0);
                    const status = (f["Status"] as OrderStatus) || "Aguardando Pagamento";

                    return (
                      <tr key={ord.id} style={{ borderBottom: "1px solid rgba(224, 215, 204, 0.65)" }}>
                        <td className="py-4 pl-5 pr-3 text-sm text-neutral-900 whitespace-nowrap">{f["Name"] || "—"}</td>
                        <td className="py-4 px-3 text-sm text-neutral-800 whitespace-nowrap">{f["Order ID"] || "—"}</td>
                        <td className="py-4 px-3 text-sm text-neutral-700 whitespace-nowrap">{formatDate(f["Created At"] || ord.createdTime)}</td>

                        <td className="py-4 px-3 text-sm whitespace-nowrap">
                          <StatusDropdown
                            current={status}
                            options={STATUS_OPTIONS}
                            onChange={(next) => handleChangeStatus(ord, next)}
                          />
                        </td>

                        <td className="py-4 px-3 text-sm text-neutral-700 whitespace-nowrap">{f["Store Name"] || "—"}</td>
                        <td className="py-4 px-3 text-sm text-neutral-900 whitespace-nowrap text-right">
                          {Number.isFinite(price) ? `R$ ${(price as number).toFixed(2).replace(".", ",")}` : "—"}
                        </td>
                        <td className="py-4 pl-3 pr-5 text-sm text-neutral-700 align-top">
                          <div className="min-w-[260px] max-h-[80px] overflow-y-auto leading-relaxed pr-1">
                            {f["Notes"] && f["Notes"]!.toString().trim().length > 0 ? f["Notes"] : "—"}
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

/** Pílula de status + menu flutuante (estética Look) */
function StatusDropdown({
  current,
  options,
  onChange,
}: {
  current: OrderStatus;
  options: OrderStatus[];
  onChange: (next: OrderStatus) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  const colors = (() => {
    switch (current) {
      case "Aguardando Pagamento": return { bg: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-500", border: "border-amber-100" };
      case "Pago": return { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", border: "border-emerald-100" };
      case "Enviado": return { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500", border: "border-purple-100" };
      case "Entregue": return { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", border: "border-blue-100" };
      case "Cancelado": return { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", border: "border-rose-100" };
      default: return { bg: "bg-neutral-100", text: "text-neutral-700", dot: "bg-neutral-500", border: "border-neutral-200" };
    }
  })();

  // opções válidas: nunca oferece "Aguardando Pagamento" e nunca repete o status atual
  const menuOptions = options.filter(
    (opt) => opt !== current && opt !== "Aguardando Pagamento"
  );

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={["inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] border transition", colors.bg, colors.text, colors.border].join(" ")}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
        {current}
        <span className="text-[9px] opacity-70 ml-1">▼</span>
      </button>

      {open ? (
        <div className="absolute z-50 mt-2 w-56 right-0 rounded-2xl bg-white/95 border border-neutral-200/80 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.25)] backdrop-blur-sm overflow-hidden">
          {menuOptions.length === 0 ? (
            <div className="px-4 py-2 text-sm text-neutral-500">Sem outras opções</div>
          ) : (
            menuOptions.map((opt) => (
              <button
                key={opt}
                onClick={async () => { setOpen(false); await onChange(opt as OrderStatus); }}
                className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
              >
                {opt}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
