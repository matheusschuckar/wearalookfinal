"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const SURFACE = "#F7F4EF";

export const dynamic = "force-dynamic";

type ModalType = "shopify" | "tiny" | "vtex" | null;

type TinyPreview = {
  store_id: number;
  tiny_fields: string[];
  products_sample: unknown[];
};

export default function PartnerProductConnectPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loggedEmail, setLoggedEmail] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeId, setStoreId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalType>(null);

  // tiny
  const [tinyToken, setTinyToken] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [tinyStep, setTinyStep] = useState<1 | 2>(1);
  const [tinyPreview, setTinyPreview] = useState<TinyPreview | null>(null);
  // ATENÇÃO: não vamos mais mapear sizes aqui
  const [tinyMapping, setTinyMapping] = useState<Record<string, string>>({
    name: "",
    price: "",
    stock: "",
  });

  // vtex
  const [vtexAccount, setVtexAccount] = useState("");
  const [vtexWorkspace, setVtexWorkspace] = useState("");
  const [vtexAppKey, setVtexAppKey] = useState("");
  const [vtexAppToken, setVtexAppToken] = useState("");

  // gera mapeamento automático SÓ para name, price e stock
  function buildAutoTinyMapping(tinyFields: string[]) {
    const find = (...cands: string[]) => {
      const lowers = tinyFields.map((f) => f.toLowerCase());
      for (const c of cands) {
        const idx = lowers.indexOf(c.toLowerCase());
        if (idx !== -1) return tinyFields[idx];
      }
      return "";
    };
  
    return {
      name: find("nome", "descricao", "produto"),
      price: find("preco", "preco_venda", "valor"),
      // aqui ampliamos bem os nomes de estoque
      stock: find(
        "estoque",
        "saldo",
        "quantidade",
        "qtde",
        "saldo_estoque",
        "estoque_atual",
        "estoqueatual",
        "estoque_disponivel",
        "qtd_estoque",
        "qtd"
      ),
    };
  }
  

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

        // descobrir loja
        const { data: row, error: sErr } = await supabase
          .from("partner_emails")
          .select("store_name")
          .eq("email", email)
          .eq("active", true)
          .maybeSingle();
        if (sErr) throw sErr;

        const sName = row?.store_name || "";
        setStoreName(sName);

        if (sName) {
          const { data: storeRow } = await supabase
            .from("stores")
            .select("id, store_name")
            .eq("store_name", sName)
            .maybeSingle();
          if (storeRow?.id) {
            setStoreId(storeRow.id);
          } else {
            console.warn(
              `Store ID não encontrado para o nome: ${sName}. Verifique.`
            );
          }
        }
      } catch (err) {
        console.error(err);
        setNotice("Não foi possível carregar seus dados.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/parceiros/login");
  }

  function openShopify() {
    setNotice(null);
    setModal("shopify");
  }
  function openTiny() {
    setNotice(null);
    setTinyStep(1);
    setTinyPreview(null);
    setModal("tiny");
  }
  function openVtex() {
    setNotice(null);
    setModal("vtex");
  }

  function handleShopifyConnect() {
    window.location.href = "/parceiros/produtos/adicionar/conectar/shopify";
  }

  // etapa 1 tiny: manda token e recebe preview
  async function handleTinyPreview() {
    if (!tinyToken.trim()) {
      setNotice("Informe o token do Tiny.");
      return;
    }

    if (!storeId) {
      setNotice(
        "Sua loja parceira não foi identificada. Verifique seu cadastro."
      );
      return;
    }

    setNotice(null);
    setIsSaving(true);

    const res = await fetch("/api/integrations/tiny/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: tinyToken.trim(),
        store_name: storeName || null,
        store_id: storeId,
      }),
    });

    const data = await res.json();
    setIsSaving(false);

    if (!res.ok || !data?.ok) {
      console.log("tiny preview error:", data);
      setNotice("Não foi possível ler seus produtos do Tiny.");
      return;
    }

    const previewObj: TinyPreview = {
      store_id: data.store_id,
      tiny_fields: data.tiny_fields || [],
      products_sample: data.products_sample || [],
    };

    setTinyPreview(previewObj);

    // preencher automaticamente os selects (SEM SIZES)
    const auto = buildAutoTinyMapping(previewObj.tiny_fields || []);
    setTinyMapping(auto);

    setTinyStep(2);
  }

  // etapa 2 tiny: confirma mapeamento e salva
  async function handleTinyCommit() {
    if (!tinyPreview) return;

    setIsSaving(true);
    const res = await fetch("/api/integrations/tiny/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: tinyToken.trim(),
        store_id: tinyPreview.store_id,
        // IMPORTANTE: não mandamos sizes aqui
        mapping: {
          name: tinyMapping.name || "",
          price: tinyMapping.price || "",
          stock: tinyMapping.stock || "",
          // sizes: ""  // removido de propósito
        },
        products_sample: tinyPreview.products_sample,
      }),
    });

    const data = await res.json();
    setIsSaving(false);

    if (!res.ok || !data?.ok) {
      console.log("tiny commit error:", data);
      setNotice("Tiny: não foi possível salvar a integração.");
      return;
    }

    setModal(null);
    setTinyToken("");
    setTinyPreview(null);
    setTinyStep(1);

    router.push(
      `/parceiros/produtos/adicionar/tiny-import?store_id=${tinyPreview.store_id}`
    );
  }

  async function handleVtexSave() {
    if (!vtexAccount.trim() || !vtexAppKey.trim() || !vtexAppToken.trim()) {
      setNotice("Preencha os dados da VTEX.");
      return;
    }
    setNotice("Conexão com VTEX registrada. Vamos sincronizar seu catálogo.");
    setModal(null);
    setVtexAccount("");
    setVtexWorkspace("");
    setVtexAppKey("");
    setVtexAppToken("");
  }

  if (loading) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
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
                  Conectar plataforma
                </span>
              </div>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-6xl px-8 pt-12 space-y-4 animate-pulse">
          <div className="h-6 w-52 bg-neutral-200/60 rounded-lg" />
          <div className="h-4 w-96 bg-neutral-200/40 rounded-lg" />
          <div className="h-40 w-full bg-white/50 rounded-3xl" />
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
              onClick={() => router.push("/parceiros/produtos/adicionar")}
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
              <span className="text-sm font-semibold tracking-tight text-black">
                Look
              </span>
              <span className="text-[11px] text-neutral-500">
                Conectar plataforma
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
      <div className="mx-auto max-w-6xl px-8 pt-10 pb-20 space-y-6">
        <div>
          <h1 className="text-[30px] font-semibold text-black tracking-tight mb-1">
            Conectar com o seu estoque
          </h1>
          <p className="text-sm text-neutral-600 max-w-2xl">
            Escolha a plataforma que você já usa. Vamos puxar o catálogo e
            manter o estoque sincronizado com a Look.
          </p>
          {notice ? (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {notice}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Shopify */}
          <button
            onClick={openShopify}
            className="rounded-3xl bg-white/70 border border-[#E5E0DA]/70 p-6 text-left hover:bg-white transition shadow-[0_10px_30px_-25px_rgba(0,0,0,0.35)]"
          >
            <div className="h-10 w-10 rounded-2xl bg-black/90 text-white flex items-center justify-center text-sm font-semibold mb-5">
              S
            </div>
            <h2 className="text-[16px] font-semibold text-black mb-2">
              Shopify
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed mb-4">
              Conexão via OAuth. Importa produtos, variantes e estoque em tempo
              quase real.
            </p>
            <span className="text-[11px] text-neutral-500">conectar →</span>
          </button>

          {/* Tiny */}
          <button
            onClick={openTiny}
            className="rounded-3xl bg-white/70 border border-[#E5E0DA]/70 p-6 text-left hover:bg-white transition shadow-[0_10px_30px_-25px_rgba(0,0,0,0.35)]"
          >
            <div className="h-10 w-10 rounded-2xl bg-[#F3DAD0] text-black flex items-center justify-center text-sm font-semibold mb-5">
              T
            </div>
            <h2 className="text-[16px] font-semibold text-black mb-2">
              Tiny ERP
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed mb-4">
              Informe o token gerado no painel do Tiny. Vamos buscar seus
              produtos e sincronizar o estoque.
            </p>
            <span className="text-[11px] text-neutral-500">conectar →</span>
          </button>

          {/* VTEX */}
          <button
            onClick={openVtex}
            className="rounded-3xl bg-white/70 border border-[#E5E0DA]/70 p-6 text-left hover:bg-white transition shadow-[0_10px_30px_-25px_rgba(0,0,0,0.35)]"
          >
            <div className="h-10 w-10 rounded-2xl bg-[#CEDAF3] text-black flex items-center justify-center text-sm font-semibold mb-5">
              V
            </div>
            <h2 className="text-[16px] font-semibold text-black mb-2">VTEX</h2>
            <p className="text-sm text-neutral-600 leading-relaxed mb-4">
              Conecte com a sua conta VTEX e escolha o workspace que deseja
              sincronizar com a Look.
            </p>
            <span className="text-[11px] text-neutral-500">conectar →</span>
          </button>
        </div>
      </div>

      {/* MODAL SHOPIFY */}
      {modal === "shopify" ? (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 border border-neutral-100 shadow-[0_16px_45px_-20px_rgba(0,0,0,0.25)]">
            <h3 className="text-lg font-semibold text-black mb-2">
              Conectar com Shopify
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              Vamos abrir a tela de autorização do Shopify. Depois de aceitar,
              você volta para a Look e começamos a importar seu catálogo.
            </p>
            <div className="flex gap-3 mt-5 justify-end">
              <button
                onClick={() => setModal(null)}
                className="text-sm text-neutral-500 hover:text-neutral-800"
              >
                cancelar
              </button>
              <button
                onClick={handleShopifyConnect}
                className="inline-flex items-center gap-2 rounded-full bg-black text-white px-5 py-2 text-sm font-medium hover:opacity-90"
              >
                Ir para o Shopify
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL TINY */}
      {modal === "tiny" ? (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 border border-neutral-100 shadow-[0_16px_45px_-20px_rgba(0,0,0,0.25)]">
            {tinyStep === 1 ? (
              <>
                <h3 className="text-lg font-semibold text-black mb-2">
                  Conectar com Tiny
                </h3>
                <p className="text-sm text-neutral-600 mb-4">
                  Cole o token gerado no painel do Tiny. Vamos buscar uma
                  amostra dos seus produtos para você mapear os campos.
                </p>
                <label className="text-[11px] text-neutral-500 mb-1 block">
                  Token do Tiny
                </label>
                <input
                  value={tinyToken}
                  onChange={(e) => setTinyToken(e.target.value)}
                  className="w-full h-10 rounded-2xl border border-neutral-200 px-3 text-sm outline-none focus:border-black/60"
                  placeholder="Ex: 0a1b2c3d..."
                />
                <div className="flex gap-3 mt-5 justify-end">
                  <button
                    onClick={() => {
                      setModal(null);
                      setTinyToken("");
                    }}
                    className="text-sm text-neutral-500 hover:text-neutral-800"
                  >
                    cancelar
                  </button>
                  <button
                    onClick={handleTinyPreview}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-full bg-black text-white px-5 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {isSaving ? "Lendo produtos..." : "Continuar"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-black mb-2">
                  Mapear campos do Tiny
                </h3>
                <p className="text-sm text-neutral-600 mb-4">
                  Diga para a Look qual campo do Tiny corresponde a cada
                  informação que precisamos.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['name', 'price', 'stock'].map((field) => (
                    <div key={field}>
                      <label className="text-[11px] text-neutral-500 mb-1 block">
                        {field === "name"
                          ? "Nome do produto"
                          : field === "price"
                          ? "Preço"
                          : "Estoque"}
                      </label>
                      <select
                        value={tinyMapping[field] || ""}
                        onChange={(e) =>
                          setTinyMapping((prev) => ({
                            ...prev,
                            [field]: e.target.value,
                          }))
                        }
                        className="w-full h-10 rounded-2xl border border-neutral-200 px-3 text-sm outline-none focus:border-black/60 bg-white"
                      >
                        <option value="">Selecione um campo do Tiny</option>
                        {tinyPreview?.tiny_fields?.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {tinyPreview?.products_sample?.length ? (
                  <div className="mt-4 bg-neutral-50 rounded-2xl p-3 max-h-48 overflow-auto text-xs text-neutral-600">
                    <p className="mb-2 font-medium text-neutral-700">
                      Amostra dos produtos do Tiny
                    </p>
                    <pre className="text-[10px] whitespace-pre-wrap">
                      {JSON.stringify(
                        tinyPreview.products_sample.slice(0, 3),
                        null,
                        2
                      )}
                    </pre>
                  </div>
                ) : null}

                <div className="flex gap-3 mt-5 justify-end">
                  <button
                    onClick={() => {
                      setTinyStep(1);
                      setTinyPreview(null);
                    }}
                    className="text-sm text-neutral-500 hover:text-neutral-800"
                  >
                    voltar
                  </button>
                  <button
                    onClick={handleTinyCommit}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-full bg-black text-white px-5 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {isSaving ? "Salvando..." : "Salvar conexão"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {/* MODAL VTEX */}
      {modal === "vtex" ? (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 border border-neutral-100 shadow-[0_16px_45px_-20px_rgba(0,0,0,0.25)]">
            <h3 className="text-lg font-semibold text-black mb-2">
              Conectar com VTEX
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              Informe os dados da sua conta VTEX. Vamos usar isso para listar e
              sincronizar seus produtos.
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] text-neutral-500 mb-1 block">
                  Account (ex: sualoja)
                </label>
                <input
                  value={vtexAccount}
                  onChange={(e) => setVtexAccount(e.target.value)}
                  className="w-full h-10 rounded-2xl border border-neutral-200 px-3 text-sm outline-none focus:border-black/60"
                  placeholder="ex: lookfashion"
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-500 mb-1 block">
                  Workspace (opcional, padrão master)
                </label>
                <input
                  value={vtexWorkspace}
                  onChange={(e) => setVtexWorkspace(e.target.value)}
                  className="w-full h-10 rounded-2xl border border-neutral-200 px-3 text-sm outline-none focus:border-black/60"
                  placeholder="master"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-neutral-500 mb-1 block">
                    App Key
                  </label>
                  <input
                    value={vtexAppKey}
                    onChange={(e) => setVtexAppKey(e.target.value)}
                    className="w-full h-10 rounded-2xl border border-neutral-200 px-3 text-sm outline-none focus:border-black/60"
                    placeholder="VTEX APP KEY"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-neutral-500 mb-1 block">
                    App Token
                  </label>
                  <input
                    value={vtexAppToken}
                    onChange={(e) => setVtexAppToken(e.target.value)}
                    className="w-full h-10 rounded-2xl border border-neutral-200 px-3 text-sm outline-none focus:border-black/60"
                    placeholder="VTEX APP TOKEN"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => {
                  setModal(null);
                  setVtexAccount("");
                  setVtexWorkspace("");
                  setVtexAppKey("");
                  setVtexAppToken("");
                }}
                className="text-sm text-neutral-500 hover:text-neutral-800"
              >
                cancelar
              </button>
              <button
                onClick={handleVtexSave}
                className="inline-flex items-center gap-2 rounded-full bg-black text-white px-5 py-2 text-sm font-medium hover:opacity-90"
              >
                Salvar conexão
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
