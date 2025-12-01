// app/parceiros/pedidos/page.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
    ["CPF"]?: string; // adicionado CPF
  };
};

interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

const SURFACE = "#F7F4EF";

export const dynamic = "force-dynamic";

export default function PartnerOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("");
  const [loggedEmail, setLoggedEmail] = useState<string>("");
  const [orders, setOrders] = useState<AirtableRecord[]>([]);

  // refs de detecção
  const newestOrderIdRef = useRef<string | null>(null);
  const prevStatusesRef = useRef<Record<string, string>>({});

  // áudio
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef<boolean>(false);

  // =============== ÁUDIO ===============
  // devolve SEMPRE um AudioContext e tenta dar resume se estiver suspenso
  const getAudioCtx = useCallback(async (): Promise<AudioContext | null> => {
    try {
      if (!audioCtxRef.current) {
        const AC =
          window.AudioContext || // <-- Use o 'window' global aqui
          (window as WebkitWindow).webkitAudioContext; // <-- Use o cast só aqui
        if (!AC) return null;
        audioCtxRef.current = new AC();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        await ctx.resume().catch(() => {});
      }
      return ctx;
    } catch {
      return null;
    }
  }, []);

  const markAudioUnlocked = () => {
    audioUnlockedRef.current = true;
  };

  const ensureAudioContextUnlocked = useCallback(() => {
    // chamado pelo clique do user
    getAudioCtx().then((ctx) => {
      if (ctx && ctx.state === "running") {
        markAudioUnlocked();
      }
    });
  }, [getAudioCtx]);

  const playBeep = useCallback(async () => {
    // tenta pegar ctx sempre que for tocar
    const ctx = await getAudioCtx();

    // se ainda assim o Safari não liberou, cai no fallback
    if (!ctx || ctx.state !== "running") {
      try {
        const audio = new Audio(
          "data:audio/wav;base64,UklGRhQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQgAAAAA/////w=="
        );
        audio.volume = 1;
        audio.play().catch(() => {});
      } catch {
        /* ignore */
      }
      return;
    }

    try {
      const duration = 2.0;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square"; // mais alto
      osc.frequency.setValueAtTime(920, now);

      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(0.6, now + 0.05);
      gain.gain.linearRampToValueAtTime(0.0, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // fallback final
      try {
        const audio = new Audio(
          "data:audio/wav;base64,UklGRhQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQgAAAAA/////w=="
        );
        audio.volume = 1;
        audio.play().catch(() => {});
      } catch {
        /* ignore */
      }
    }
  }, [getAudioCtx]);

  // desbloquear no 1º gesto
  useEffect(() => {
    const unlock = () => {
      ensureAudioContextUnlocked();
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
  }, [ensureAudioContextUnlocked]);

  // =============== AUTH + LOJA ===============
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

  // =============== AIRTABLE ===============
  // escapador simples para evitar quebra quando storeName tem apóstrofo
  function escapeAirtableString(input: string) {
    return input.replace(/'/g, "''");
  }

  // Retorna null quando ocorrer erro (assim o caller não sobrescreve orders)
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
          console.error("[/parceiros/pedidos] airtable error:", await res.text());
          // em caso de erro, retornamos null para o caller evitar limpar a UI
          return null;
        }
        const json: { records?: AirtableRecord[]; offset?: string } =
          await res.json();
        all.push(...(json.records ?? []));
        offset = json.offset;
      } while (offset);
    } catch (err) {
      console.error("[/parceiros/pedidos] airtable fetch failed:", err);
      return null;
    }

    return all;
  }

  // =============== LOOP 15s ===============
  useEffect(() => {
    if (!storeName) return;

    let cancelled = false;

    const load = async () => {
      const data = await fetchOrdersForStore(storeName);
      if (cancelled) return;

      // se houve erro no fetch, não sobrescreve os pedidos atuais (evita sumir tudo)
      if (data === null) {
        setNotice("Falha ao atualizar pedidos. Verifique a conexão.");
        return;
      }

      // pedido novo
      const newest = data[0];
      if (newest && newestOrderIdRef.current) {
        if (newest.id !== newestOrderIdRef.current) {
          await playBeep();
        }
      }
      if (newest) {
        newestOrderIdRef.current = newest.id;
      }

      // mudança para Pago
      const prevMap = prevStatusesRef.current;
      let shouldBeepForPaid = false;

      for (const rec of data) {
        const prevStatus = prevMap[rec.id] || "";
        const currentStatus = rec.fields["Status"] || "";
        if (currentStatus === "Pago" && prevStatus !== "Pago") {
          shouldBeepForPaid = true;
        }
      }

      if (shouldBeepForPaid) {
        await playBeep();
      }

      // salvar mapa
      const nextMap: Record<string, string> = {};
      for (const rec of data) {
        nextMap[rec.id] = rec.fields["Status"] || "";
      }
      prevStatusesRef.current = nextMap;

      setOrders(data);
      setNotice(null);
    };

    load();
    const t = setInterval(load, 15_000);

    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [storeName, playBeep]);

  // =============== UPDATE AIRTABLE (Pago → Enviado) ===============
  async function updateAirtableStatus(recordId: string, newStatus: "Enviado") {
    const API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
    const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
    const TABLE = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || "Orders";

    if (!API_KEY || !BASE_ID) {
      console.warn("Airtable envs faltando");
      return false;
    }

    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE}/${recordId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            Status: newStatus,
          },
        }),
      }
    );

    if (!res.ok) {
      console.error("Falha ao atualizar status no Airtable:", await res.text());
      return false;
    }
    return true;
  }

  async function handleStatusClick(rec: AirtableRecord) {
    const current = rec.fields["Status"] || "";
    if (current !== "Pago") return;

    const confirmado = window.confirm("O pedido realmente foi enviado?");
    if (!confirmado) return;

    // otimista
    setOrders((prev) =>
      prev.map((o) =>
        o.id === rec.id
          ? {
              ...o,
              fields: {
                ...o.fields,
                Status: "Enviado",
              },
            }
          : o
      )
    );

    const ok = await updateAirtableStatus(rec.id, "Enviado");
    if (!ok) {
      // volta
      setOrders((prev) =>
        prev.map((o) =>
          o.id === rec.id
            ? {
                ...o,
                fields: {
                  ...o.fields,
                  Status: current,
                },
              }
            : o
        )
      );
      setNotice("Não foi possível alterar o status no Airtable.");
    } else {
      setNotice(null);
    }
  }

  // =============== LOGOUT ===============
  async function handleSignOut() {
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/parceiros/login");
  }

  function formatDate(iso?: string) {
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

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      {/* topbar */}
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
                Pedidos da loja
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
              onClick={handleSignOut}
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
            <h1 className="text-[30px] font-semibold text-black tracking-tight">
              Pedidos
            </h1>
            <p className="text-sm text-neutral-600 mt-1">
              Todos os pedidos recebidos pela sua marca via Look.
            </p>
            {notice && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {notice}
              </p>
            )}
          </div>
          <div className="text-[11px] text-neutral-500">
            Atualiza automaticamente a cada 15 s
          </div>
        </div>

        {/* tabela */}
        <div
          className="rounded-3xl bg-white/55 border border-[rgba(229,224,218,0.8)] backdrop-blur-sm shadow-[0_12px_35px_-28px_rgba(0,0,0,0.3)] overflow-hidden"
          style={{ minHeight: "200px" }}
        >
          <div className="overflow-x-auto">
            <table className="min-w-[950px] w-full text-left text-sm text-neutral-900">
              <thead className="bg-[#F0ECE6] text-[11px] uppercase tracking-wide text-neutral-500/90">
                <tr>
                  <th className="py-3 pl-5 pr-3 whitespace-nowrap">Cliente</th>
                  <th className="py-3 px-3 whitespace-nowrap">Nº do pedido</th>
                  <th className="py-3 px-3 whitespace-nowrap">Criado em</th>
                  <th className="py-3 px-3 whitespace-nowrap">Status</th>
                  <th className="py-3 px-3 whitespace-nowrap">Loja</th>
                  <th className="py-3 px-3 whitespace-nowrap">CPF</th> {/* coluna CPF */}
                  <th className="py-3 px-3 whitespace-nowrap text-right">
                    Preço
                  </th>
                  <th className="py-3 pl-3 pr-5 whitespace-nowrap">Itens</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-10 text-center text-neutral-400 text-sm"
                    >
                      Carregando pedidos…
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-10 text-center text-neutral-400 text-sm"
                    >
                      Nenhum pedido encontrado para esta loja.
                    </td>
                  </tr>
                ) : (
                  orders.map((ord) => {
                    const f = ord.fields;
                    const price =
                      typeof f["Item Price"] === "number"
                        ? f["Item Price"]
                        : Number(f["Item Price"] || 0);
                    const status = f["Status"] || "Aguardando Pagamento";
                    const isClickable = status === "Pago";

                    return (
                      <tr
                        key={ord.id}
                        style={{
                          borderBottom: "1px solid rgba(224, 215, 204, 0.65)",
                        }}
                      >
                        <td className="py-4 pl-5 pr-3 text-sm text-neutral-900 whitespace-nowrap">
                          {f["Name"] || "—"}
                        </td>
                        <td className="py-4 px-3 text-sm text-neutral-800 whitespace-nowrap">
                          {f["Order ID"] || "—"}
                        </td>
                        <td className="py-4 px-3 text-sm text-neutral-700 whitespace-nowrap">
                          {formatDate(f["Created At"] || ord.createdTime)}
                        </td>

                        <td className="py-4 px-3 text-sm whitespace-nowrap">
                          {isClickable ? (
                            <button
                              type="button"
                              onClick={() => handleStatusClick(ord)}
                              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100/80 transition cursor-pointer"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Pago
                              <span className="text-[9px] opacity-70 ml-1">
                                marcar enviado
                              </span>
                            </button>
                          ) : status === "Enviado" ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] bg-purple-50 text-purple-700 border border-purple-100">
                              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                              Enviado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] bg-neutral-100 text-neutral-700 border border-neutral-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-neutral-500" />
                              {status}
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-3 text-sm text-neutral-700 whitespace-nowrap">
                          {f["Store Name"] || "—"}
                        </td>

                        <td className="py-4 px-3 text-sm text-neutral-700 whitespace-nowrap">
                          {f["CPF"] || "—"} {/* exibe CPF */}
                        </td>

                        <td className="py-4 px-3 text-sm text-neutral-900 whitespace-nowrap text-right">
                          {price
                            ? `R$ ${price.toFixed(2).replace(".", ",")}`
                            : "—"}
                        </td>
                        <td className="py-4 pl-3 pr-5 text-sm text-neutral-700 align-top">
                          <div className="min-w-[260px] max-h-[80px] overflow-y-auto leading-relaxed pr-1">
                            {f["Notes"] &&
                            f["Notes"]!.toString().trim().length > 0
                              ? f["Notes"]
                              : "—"}
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
