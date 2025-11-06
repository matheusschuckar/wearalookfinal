// app/parceiros/produtos/adicionar/conectar/shopify/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const SURFACE = "#F7F4EF";

type StoreRow = {
  id: number;
  name: string;
};

export const dynamic = "force-dynamic";

export default function PartnerConnectShopifyPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loggedEmail, setLoggedEmail] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeId, setStoreId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // input do user
  const [shopDomain, setShopDomain] = useState("");

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
          { p_email: email }
        );
        if (allowErr) throw allowErr;
        if (!allowed) {
          await supabase.auth.signOut({ scope: "local" });
          router.replace("/parceiros/login");
          return;
        }

        // pega a loja pelo e-mail
        const { data: row, error: sErr } = await supabase
          .from("partner_emails")
          .select("store_name")
          .eq("email", email)
          .eq("active", true)
          .maybeSingle();
        if (sErr) throw sErr;

        const sName = row?.store_name || "";
        setStoreName(sName);

        // tenta achar o ID da loja na tabela stores
        if (sName) {
          const { data: storeRow } = await supabase
            .from("stores")
            .select("id,name")
            .eq("name", sName)
            .maybeSingle<StoreRow>();
          if (storeRow?.id) {
            setStoreId(storeRow.id);
          }
        }

        // se veio ok da integração
        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.get("ok") === "1") {
          setNotice("Shopify conectado com sucesso.");
        }
      } catch (err) {
        console.error(err);
        setNotice("Não foi possível carregar seus dados.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  function normalizeShopDomain(raw: string) {
    let s = raw.trim();
    if (!s) return "";
    // se o user digitar só "minha-loja", completa com o .myshopify.com
    if (!s.includes(".")) {
      s = `${s}.myshopify.com`;
    }
    // se ele digitar https://, tira
    s = s.replace(/^https?:\/\//, "");
    s = s.replace(/\/+$/, "");
    return s;
  }

  function handleConnect() {
    // se você quiser manter o input, usa o valor do input
    const normalized = normalizeShopDomain(shopDomain);
    if (!normalized) {
      setNotice("Informe o domínio da sua loja no Shopify.");
      return;
    }
    if (!storeName) {
      setNotice("Loja da Look não identificada.");
      return;
    }
  
    const params = new URLSearchParams();
    params.set("shop", normalized);
    params.set("store", storeName);
    if (storeId) {
      params.set("store_id", String(storeId));
    }
  
    // redireciona pro backend (pages/api)
    window.location.href = `/api/integrations/shopify/install?${params.toString()}`;
  }  

  async function handleSignOut() {
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/parceiros/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
        <header className="w-full border-b border-[#E5E0DA]/80 bg-[#F7F4EF]/80 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
                <span className="text-[13px] font-semibold text-white leading-none">
                  L
                </span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-black">
                  Look
                </span>
                <span className="text-[11px] text-neutral-500">
                  Conectar Shopify
                </span>
              </div>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-6xl px-8 pt-10 animate-pulse space-y-3">
          <div className="h-6 w-60 bg-neutral-200/40 rounded" />
          <div className="h-4 w-40 bg-neutral-200/20 rounded" />
          <div className="h-36 w-full bg-white/40 rounded-3xl" />
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
              onClick={() => router.push("/parceiros/produtos/adicionar/conectar")}
              className="h-8 w-8 rounded-full bg-white/70 border border-neutral-200/70 flex items-center justify-center text-neutral-700 hover:text-black hover:bg-white transition"
              aria-label="Voltar"
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
              <span className="text-sm font-semibold text-black">Look</span>
              <span className="text-[11px] text-neutral-500">
                Conectar Shopify
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
      <div className="mx-auto max-w-6xl px-8 pt-10 pb-20 space-y-7">
        <div>
          <h1 className="text-[30px] font-semibold text-black tracking-tight mb-1">
            Conectar com Shopify
          </h1>
          <p className="text-sm text-neutral-600 max-w-xl">
            Informe o domínio da sua loja no Shopify para autorizar a Look.
            Depois de autorizar, vamos salvar o token na sua conta para
            sincronizar produtos e estoque.
          </p>
          {notice ? (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {notice}
            </p>
          ) : null}
        </div>

        <div className="rounded-3xl bg-white/60 border border-[#E5E0DA]/80 p-6 max-w-xl space-y-4">
          <label className="block text-sm text-neutral-700 font-medium">
            Domínio da loja
          </label>
          <input
            value={shopDomain}
            onChange={(e) => setShopDomain(e.target.value)}
            placeholder="ex: minha-loja.myshopify.com ou só minha-loja"
            className="h-10 w-full rounded-2xl bg-white border border-transparent focus:border-black/30 px-4 text-sm outline-none"
          />

          <p className="text-[11px] text-neutral-500">
            Vamos redirecionar você para o Shopify para aceitar a conexão.
          </p>

          <div className="pt-2 flex gap-3">
            <button
              onClick={handleConnect}
              className="inline-flex items-center gap-2 rounded-full bg-black text-white px-6 py-2.5 text-sm font-medium hover:opacity-95 active:scale-[0.995]"
            >
              Conectar Shopify
            </button>
            <button
              onClick={() => router.push("/parceiros/produtos/adicionar/conectar")}
              className="text-sm text-neutral-500 hover:text-neutral-800"
            >
              cancelar
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
