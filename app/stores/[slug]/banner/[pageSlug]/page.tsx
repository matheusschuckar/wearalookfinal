"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

declare global {
  interface Window {
    LookBag?: {
      addMany?: (ids: number[]) => void;
    };
  }
}


const SURFACE = "#F7F4EF";
const CARD_BORDER = "rgba(0,0,0,0.08)";

type Store = {
  id: number;
  store_name: string;
  slug: string | null;
};

type PageRow = {
  id: number;
  store_id: number;
  page_slug: string;
  page_type: "collection" | "looks";
  hero_image_url: string | null;
  title: string | null;
  bio: string | null;
  is_published: boolean | null;
};

type LookSection = {
  id: number;
  page_id: number;
  title: string | null;
  sort_order: number | null;
};

type Product = {
  id: number;
  name: string;
  price_tag: number;
  photo_url: string | string[] | null;
  eta_text_runtime?: string | null;
  eta_text?: string | null;
  is_active?: boolean | null;
};

// ---------- util UI ----------
function firstImage(photo: Product["photo_url"]) {
  if (!photo) return "";
  if (typeof photo === "string") return photo;
  if (Array.isArray(photo)) return photo[0] || "";
  return "";
}
function brl(v: number) {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  } catch {
    return `R$ ${v}`;
  }
}
function eta(p: Product) {
  const rt = (p.eta_text_runtime || "").trim();
  if (rt) return rt;
  const st = (p.eta_text || "").trim();
  return st || "até 1 hora";
}

// safe message extractor
function getErrorMessage(e: unknown) {
  try {
    const maybeMessage = (e as { message?: unknown })?.message;
    return String(maybeMessage ?? e ?? "").toLowerCase();
  } catch {
    return String(e ?? "");
  }
}


// ---------- auth & fetch helpers (novo) ----------
function looksLikeAuthError(err: unknown) {
  const msg = getErrorMessage(err);
  const status = (err as { status?: unknown })?.status;
  return status === 401 || /401|jwt|expired|pgrst303/.test(msg);
}

async function ensureFreshSession() {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data?.session) return;
    const exp = data.session.expires_at ?? 0;
    const now = Math.floor(Date.now() / 1000);
    if (exp - now < 60) {
      await supabase.auth.refreshSession();
    }
  } catch {
    // ignora
  }
}
async function retry401<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (e: unknown) {
    if (looksLikeAuthError(e)) {
      await ensureFreshSession();
      return await work();
    }
    throw e;
  }
}

async function fetchProductsByIds(ids: number[]) {
  const list = Array.from(new Set((ids || []).filter((n) => Number.isFinite(n)))) as number[];
  if (list.length === 0) return [] as Product[];

  const reorder = (rows: Product[]) => {
    const map = new Map<number, Product>(rows.map((r) => [r.id, r]));
    return list.map((id) => map.get(id)).filter(Boolean) as Product[];
  };

  const isMissingRelation = (e: unknown) => {
    const msg = getErrorMessage(e);
    // mensagens típicas do PostgREST quando a view não está no cache ou não existe
    return (
      msg.includes("schema cache") ||
      msg.includes("could not find the table") ||
      (msg.includes("relation") && msg.includes("does not exist"))
    );
  };

  // 1) tenta a view com ETA runtime
  try {
    const { data, error } = await supabase
      .from("products_with_runtime_eta")
      .select("id,name,price_tag,photo_url,eta_text_runtime,eta_text,is_active")
      .in("id", list);
    if (error) throw error;
    const rows = (data ?? []) as Product[];
    if (rows.length) return reorder(rows);
  } catch (e: unknown) {
    if (!isMissingRelation(e)) throw e;
  }

  // 2) tenta a view com ETA por loja
  try {
    const { data, error } = await supabase
      .from("products_with_store_eta")
      .select("id,name,price_tag,photo_url,eta_text_runtime,eta_text,is_active")
      .in("id", list);
    if (error) throw error;
    const rows = (data ?? []) as Product[];
    if (rows.length) return reorder(rows);
  } catch (e: unknown) {
    if (!isMissingRelation(e)) throw e;
  }

  // 3) fallback para a tabela base
  const { data } = await supabase
    .from("products")
    .select("id,name,price_tag,photo_url,eta_text,eta_text_runtime,is_active")
    .in("id", list);
  const rows = (data ?? []) as Product[];
  return reorder(rows);
}

// ---------- resolução de loja ----------
function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
function extractTrailingId(s: string): number | null {
  const m = s.match(/-(\d+)$/);
  return m ? Number(m[1]) : null;
}
function baseSlug(s: string) {
  return s.replace(/-\d+$/, "");
}

export const dynamic = "force-dynamic";

export default function StoreBannerPage() {
  const router = useRouter();
  const params = useParams() as { slug?: string | string[]; pageSlug?: string | string[] };
  const search = useSearchParams();

  const slugParam = Array.isArray(params?.slug) ? String(params!.slug[0] ?? "") : String(params?.slug ?? "");
  const pageSlugParam = Array.isArray(params?.pageSlug)
    ? String(params!.pageSlug[0] ?? "")
    : String(params?.pageSlug ?? "");

  const slug = decodeURIComponent(slugParam).trim();
  const pageSlug = decodeURIComponent(pageSlugParam).trim();

  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  const [page, setPage] = useState<PageRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  // coleção
  const [collectionProducts, setCollectionProducts] = useState<Product[]>([]);
  // looks
  const [sections, setSections] = useState<LookSection[]>([]);
  const [sectionProducts, setSectionProducts] = useState<Record<number, Product[]>>({});

  useEffect(() => {
    if (!slug || !pageSlug) return;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        await ensureFreshSession();

        // ---------- resolve loja ----------
        let sData: Store | null = null;

        // 0) "sid"
        const sidParam = search?.get("sid");
        const sid = sidParam && /^\d+$/.test(sidParam) ? Number(sidParam) : null;
        if (sid) {
          const data = await retry401(async () => {
            const { data, error } = await supabase
              .from("stores")
              .select("id, store_name, slug")
              .eq("id", sid)
              .maybeSingle<Store>();
            if (error) throw error;
            return data;
          });
          if (data) sData = data as Store;
        }

        // 1) id no final do slug
        if (!sData) {
          const idFromSlug = extractTrailingId(slug);
          if (idFromSlug) {
            const data = await retry401(async () => {
              const { data, error } = await supabase
                .from("stores")
                .select("id, store_name, slug")
                .eq("id", idFromSlug)
                .maybeSingle<Store>();
              if (error) throw error;
              return data;
            });
            if (data) sData = data as Store;
          }
        }

        // 2) slug base exato
        if (!sData) {
          const base = baseSlug(slug);
          const data = await retry401(async () => {
            const { data, error } = await supabase
              .from("stores")
              .select("id, store_name, slug")
              .eq("slug", base)
              .maybeSingle<Store>();
            if (error) throw error;
            return data;
          });
          if (data) sData = data as Store;
        }

        // 3) aproximação por nome
        if (!sData) {
          const base = baseSlug(slug);
          const like = `%${base.replace(/-/g, "%")}%`;
          const data = await retry401(async () => {
            const { data, error } = await supabase
              .from("stores")
              .select("id, store_name, slug")
              .ilike("store_name", like)
              .limit(20);
            if (error) throw error;
            return data;
          });
          const rows = (data ?? []) as Store[];
          if (rows.length) {
            sData = rows.find((r) => slugify(r.store_name) === base) ?? rows[0];
          }
        }

        if (!sData) {
          setError("Loja não encontrada");
          setLoading(false);
          return;
        }
        setStore(sData);

        // ---------- página ----------
        const pData = await retry401(async () => {
          const { data, error } = await supabase
            .from("store_banner_pages")
            .select("id, store_id, page_slug, page_type, hero_image_url, title, bio, is_published")
            .eq("store_id", sData!.id)
            .eq("page_slug", pageSlug)
            .eq("is_published", true)
            .maybeSingle<PageRow>();
          if (error) throw error;
          return data as PageRow | null;
        });
        if (!pData) {
          setError("Página não encontrada");
          setLoading(false);
          return;
        }
        setPage(pData);

        if (pData.page_type === "collection") {
          // relacionamentos
          const rel = await retry401(async () => {
            const { data, error } = await supabase
              .from("store_banner_page_products")
              .select("product_id, sort_order")
              .eq("page_id", pData.id)
              .order("sort_order", { ascending: true });
            if (error) throw error;
            return data as Array<{ product_id: number; sort_order: number | null }>;
          });

          const ids = (rel || []).map((r) => r.product_id).filter((n) => typeof n === "number");
          if (ids.length === 0) {
            setCollectionProducts([]);
          } else {
            const prods = await fetchProductsByIds(ids);
            // já estão reordenados por ids; mas preserva sort_order explícito se existir
            if ((rel || []).some((r) => r.sort_order != null)) {
              const orderMap = new Map<number, number>(
                (rel || []).map((r, idx) => [r.product_id, r.sort_order ?? idx])
              );
              const sorted = prods.slice().sort((a, b) => {
                const ia = orderMap.get(a.id) ?? 0;
                const ib = orderMap.get(b.id) ?? 0;
                return ia - ib;
              });
              setCollectionProducts(sorted);
            } else {
              setCollectionProducts(prods);
            }
          }
        } else {
          // looks
          const secs = await retry401(async () => {
            const { data, error } = await supabase
              .from("store_banner_look_sections")
              .select("id, page_id, title, sort_order")
              .eq("page_id", pData.id)
              .order("sort_order", { ascending: true });
            if (error) throw error;
            return (data ?? []) as LookSection[];
          });
          setSections(secs);

          const lookIds = (secs || []).map((s) => s.id);
          if (lookIds.length === 0) {
            setSectionProducts({});
          } else {
            const items = await retry401(async () => {
              const { data, error } = await supabase
                .from("store_banner_look_items")
                .select("look_id, product_id, sort_order")
                .in("look_id", lookIds);
              if (error) throw error;
              return (data ?? []) as Array<{ look_id: number; product_id: number; sort_order: number | null }>;
            });

            const allProdIds = Array.from(new Set((items || []).map((it) => it.product_id)));
            const prods = await fetchProductsByIds(allProdIds);
            const byId = new Map<number, Product>(prods.map((p) => [p.id, p]));
            const grouped: Record<number, Product[]> = {};

            (items || []).forEach((it) => {
              const arr = grouped[it.look_id] || (grouped[it.look_id] = []);
              const prod = byId.get(it.product_id);
              if (prod) arr.push(prod);
            });

            // ordena por sort_order dentro de cada look
            const orderKey = (lookId: number, pid: number) =>
              (items || []).find((it) => it.look_id === lookId && it.product_id === pid)?.sort_order ?? 0;

            Object.keys(grouped).forEach((lid) => {
              const n = Number(lid);
              grouped[n] = grouped[n].slice().sort((a, b) => (orderKey(n, a.id) as number) - (orderKey(n, b.id) as number));
            });

            setSectionProducts(grouped);
          }
        }

        setLoading(false);
      } catch (e: unknown) {
        console.error(e);
        setError(getErrorMessage(e) || "Falha ao carregar");
        setLoading(false);
      }
    })();
  }, [slug, pageSlug, search]);

  const title = useMemo(() => page?.title || store?.store_name || "Coleção", [page, store]);

  // IDs de todos os produtos (apenas para "looks")
  const allLookProductIds = useMemo(() => {
    if (!sections.length) return [] as number[];
    const ids: number[] = [];
    sections.forEach((sec) => {
      (sectionProducts[sec.id] || []).forEach((p) => {
        if (p?.id) ids.push(p.id);
      });
    });
    return Array.from(new Set(ids));
  }, [sections, sectionProducts]);

  const handleAddAll = () => {
    if (!allLookProductIds.length) return;
    try {
      // 1) integração opcional com um carrinho global
      if (typeof window !== "undefined" && window.LookBag?.addMany) {
        window.LookBag.addMany(allLookProductIds);
      }

      // 2) evento customizado
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("look:addToBag", { detail: { productIds: allLookProductIds } }));
      }
      // 3) fallback leve
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("bag:pendingAdd", JSON.stringify(allLookProductIds));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      <header className="sticky top-0 z-10 border-b border-neutral-200/70 bg-[#F7F4EF]/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl h-14 px-4 md:px-8 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-sm px-3 py-1 rounded-full border border-neutral-300/70 bg-white/70 hover:bg-white"
          >
            Voltar
          </button>
          <div className="text-sm text-neutral-700">{store?.store_name}</div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 md:px-8 pb-24">
        <div className="pt-6">
          {page?.hero_image_url ? (
            <div className="rounded-2xl overflow-hidden border" style={{ borderColor: CARD_BORDER }}>
              <div className="relative w-full" style={{ paddingTop: `${(9 / 16) * 100}%` }}>
                <img
                  src={page.hero_image_url}
                  alt={page.title ?? ""}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            </div>
          ) : null}

          {(page?.title || page?.bio) && (
            <div className="mt-4">
              {page?.title && (
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-black text-center">
                  {title}
                </h1>
              )}
              {page?.bio && (
                <p className="mt-3 text-[15px] leading-relaxed text-neutral-800 whitespace-pre-line text-center md:text-left">
                  {page.bio}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-8">
          {loading && <div className="animate-pulse text-neutral-500">Carregando…</div>}
          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {!loading && !error && page?.page_type === "collection" && <GridProducts products={collectionProducts} />}

          {!loading && !error && page?.page_type === "looks" && (
            <div className="space-y-10">
              {allLookProductIds.length > 0 && (
                <div className="flex justify-center">
                  <button
                    onClick={handleAddAll}
                    className="w-full md:w-auto px-6 h-11 rounded-full bg-black text-white text-sm font-semibold hover:opacity-90"
                  >
                    Adicionar tudo à sacola
                  </button>
                </div>
              )}

              {sections.map((sec) => {
                const prods = sectionProducts[sec.id] || [];
                return (
                  <section key={sec.id}>
                    {sec.title ? <h2 className="text-xl font-semibold tracking-tight text-black">{sec.title}</h2> : null}
                    <div className="mt-4">
                      <GridProducts products={prods} />
                    </div>
                  </section>
                );
              })}
              {sections.length === 0 && <div className="text-neutral-600">Nenhuma seleção criada ainda.</div>}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function GridProducts({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
      {products.map((p) => (
        <article key={p.id} className="rounded-2xl overflow-hidden bg-white border" style={{ borderColor: CARD_BORDER }}>
          <div className="relative w-full" style={{ paddingTop: `${(5 / 4) * 100}%` }}>
            <img src={firstImage(p.photo_url) || "/placeholder.svg"} alt={p.name} className="absolute inset-0 h-full w-full object-cover" />
          </div>

          <div className="p-3 md:p-4">
            <h3 className="text-[13px] md:text-[14px] font-medium text-neutral-900 line-clamp-2">{p.name}</h3>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[13px] md:text-[14px] font-semibold text-neutral-900">{brl(p.price_tag)}</span>
              <span className="text-[11px] md:text-[12px] text-neutral-600">{eta(p)}</span>
            </div>
          </div>
        </article>
      ))}
      {products.length === 0 && <div className="col-span-full text-neutral-600">Nenhum produto selecionado.</div>}
    </div>
  );
}
