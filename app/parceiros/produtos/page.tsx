// app/parceiros/produtos/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const SURFACE = "#F7F4EF";

type Product = {
  id: string | number;
  slug?: string | null;
  name: string | null;
  price_tag?: string | null;
  photo_url?: string[] | string | null;
  sizes?: string[] | string | null;
  category?: string | null;
  gender?: string | null;
  categories?: string[] | string | null;
  store_name?: string | null;
};

export const dynamic = "force-dynamic";

export default function PartnerProductsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("");
  const [loggedEmail, setLoggedEmail] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);

  // 1) auth + store
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

        const { data: row, error: sErr } = await supabase
          .from("partner_emails")
          .select("store_name")
          .eq("email", email)
          .eq("active", true)
          .maybeSingle();
        if (sErr) throw sErr;

        const sName = row?.store_name || "";
        setStoreName(sName);
      } catch (err) {
        console.error(err);
        setNotice("Não foi possível carregar seus dados no momento.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // 2) buscar produtos da loja
  useEffect(() => {
    if (!storeName) return;

    let cancelled = false;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select(
            "id, slug, name, price_tag, photo_url, sizes, category, gender, categories, store_name"
          )
          .eq("store_name", storeName)
          .order("name", { ascending: true });
        if (error) throw error;
        if (!cancelled) {
          setProducts(data || []);
          setNotice(null);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setNotice("Não foi possível carregar os produtos.");
        }
      }
    };

    load();
    const t = setInterval(load, 60_000);

    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [storeName]);

  function normalizeArray(v: string[] | string | null | undefined): string[] {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    return v
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  function primaryPhoto(p: Product): string | null {
    if (!p.photo_url) return null;
    if (Array.isArray(p.photo_url)) return p.photo_url[0] || null;
    return p.photo_url;
  }

  function handleSignOut() {
    supabase.auth.signOut({ scope: "local" });
    router.replace("/parceiros/login");
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
                Produtos da loja
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold text-black tracking-tight">
              Produtos
            </h1>
            <p className="text-sm text-neutral-600 mt-1">
              Todos os produtos cadastrados da sua marca na Look.
            </p>
            {notice && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {notice}
              </p>
            )}
          </div>
          <div className="text-[11px] text-neutral-500">
            Atualiza a cada 1 min
          </div>
        </div>

        {/* lista */}
        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="rounded-3xl bg-white/60 border border-[#E5E0DA]/80 p-6 animate-pulse">
              <div className="h-6 w-52 bg-neutral-200/60 rounded mb-3" />
              <div className="h-4 w-32 bg-neutral-200/40 rounded" />
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-3xl bg-white/60 border border-[#E5E0DA]/80 p-10 text-center text-neutral-500">
              Nenhum produto encontrado para esta loja.
            </div>
          ) : (
            products.map((prod) => {
              const photo = primaryPhoto(prod);
              const sizes = normalizeArray(prod.sizes);
              const cats = normalizeArray(prod.categories);
              const price = prod.price_tag || "—";
              const href = prod.slug
                ? `/parceiros/produtos/${prod.slug}`
                : `/parceiros/produtos/${prod.id}`;

              return (
                <button
                  key={prod.id}
                  onClick={() => router.push(href)}
                  className="w-full rounded-2xl bg-white/65 border border-[#E5E0DA]/90 flex items-center gap-4 px-4 py-3 hover:bg-white/100 transition text-left shadow-[0_10px_30px_-23px_rgba(0,0,0,0.35)]"
                >
                  {/* foto */}
                  <div className="h-16 w-16 rounded-2xl bg-[#F1EAE2] border border-[#E4DBCF] overflow-hidden flex items-center justify-center shrink-0">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo}
                        alt={prod.name || "Produto"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-neutral-400 text-center px-1 leading-tight">
                        sem foto
                      </span>
                    )}
                  </div>

                  {/* bloco centro */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-2 items-center">
                      <h2 className="text-[14px] font-semibold text-black leading-tight truncate max-w-[360px]">
                        {prod.name || "Produto sem nome"}
                      </h2>
                      {prod.category ? (
                        <span className="px-2 py-[2px] rounded-full bg-[#F4EFE9] border border-[#E7DED3] text-[10px] text-neutral-700 uppercase tracking-wide">
                          {prod.category}
                        </span>
                      ) : null}
                      {prod.gender ? (
                        <span className="px-2 py-[2px] rounded-full bg-[#F4EFE9] border border-[#E7DED3] text-[10px] text-neutral-700 uppercase tracking-wide">
                          {prod.gender}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-[13px] text-neutral-700">
                      {price}
                    </div>
                    {sizes.length ? (
                      <div className="mt-2 flex flex-wrap gap-1 items-center">
                        <span className="text-[10px] text-neutral-400 mr-1">
                          Tamanhos:
                        </span>
                        {sizes.map((sz) => (
                          <span
                            key={sz}
                            className="px-2 py-[2px] rounded-full bg-white/90 border border-[#E7DED3] text-[10px] text-neutral-700"
                          >
                            {sz}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* bloco direita */}
                  <div className="flex flex-col gap-1 items-end justify-center min-w-[150px]">
                    {cats.length ? (
                      <div className="flex flex-wrap gap-1 justify-end max-w-[160px]">
                        {cats.slice(0, 3).map((c) => (
                          <span
                            key={c}
                            className="px-2 py-[2px] rounded-full bg-[#F9F5F1] border border-[#E7DED3] text-[10px] text-neutral-700"
                          >
                            {c}
                          </span>
                        ))}
                        {cats.length > 3 ? (
                          <span className="text-[10px] text-neutral-400">
                            +{cats.length - 3}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-[10px] text-neutral-400">
                        sem categorias
                      </span>
                    )}
                    <span className="text-[10px] text-neutral-400">
                      tocar para editar →
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
