import { supabase } from "@/lib/supabaseClient";
import ProductCard from "@/components/ProductCard";
import type { Product as ProductType } from "@/lib/data/types";

type PageBase = {
  id: number;
  slug: string;
  layout: "text" | "text_products" | "selections" | string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  hero_image_url: string | null;
};

/** produto genérico vindo do supabase (não tipado) */
type AnyProduct = Record<string, unknown> & { id: string | number };

/** alias local pro tipo oficial */
type Product = ProductType;

type JoinProductRow = { products: AnyProduct; sort_order?: number | null };
type SelectionRow = {
  id: number;
  title: string | null;
  sort_order?: number | null;
};
type JoinSelectionProductRow = {
  products: AnyProduct;
  sort_order?: number | null;
};

/** MaybePromise utility (estrito, sem any) */
type MaybePromise<T> = T | Promise<T>;

/* -----------------------------
   Helpers
   ----------------------------- */
function toProduct(raw: AnyProduct): Product {
  const r = raw as Record<string, unknown>;

  const idVal = r.id;
  const id = typeof idVal === "number" ? idVal : String(idVal ?? "");

  const name =
    typeof r.name === "string" ? r.name : String(r.name ?? (r["title"] ?? "") ?? "");

  const store_name = typeof r.store_name === "string" ? r.store_name : null;
  const store_slug = typeof r.store_slug === "string" ? r.store_slug : null;

  const photo_url = (() => {
    const v = r.photo_url;
    if (Array.isArray(v)) return (v.filter((x) => typeof x === "string") as string[]);
    if (typeof v === "string") return v;
    return null;
  })();

  const eta_text = typeof r.eta_text === "string" ? r.eta_text : null;

  const price_tag =
    typeof r.price_tag === "number" ? r.price_tag : Number(r.price_tag ?? 0);

  const category = typeof r.category === "string" ? r.category : null;

  const gender =
    typeof r.gender === "string"
      ? (["male", "female", "unisex"].includes(r.gender)
          ? (r.gender as Product["gender"])
          : null)
      : null;

  // validação segura para sizes
  let sizes: Product["sizes"] = null;
  const rawSizes = r.sizes;
  if (Array.isArray(rawSizes)) {
    const list = rawSizes.filter((s) => typeof s === "string") as string[];
    sizes = list.length ? list : null;
  } else if (typeof rawSizes === "string") {
    sizes = rawSizes;
  } else {
    sizes = null;
  }

  const featured = typeof r.featured === "boolean" ? r.featured : null;
  const store_id = typeof r.store_id === "number" ? r.store_id : null;
  const is_active = typeof r.is_active === "boolean" ? r.is_active : null;

  return {
    id,
    name,
    store_name,
    store_slug,
    photo_url,
    eta_text,
    price_tag,
    category,
    gender,
    sizes,
    featured,
    store_id,
    is_active,
  } as unknown as Product;
}

/* -----------------------------
   Página principal
   ----------------------------- */
export default async function BannerPage(...args: unknown[]) {
  const incoming = (args[0] as {
    params?: MaybePromise<{ slug: string }>;
  }) ?? { params: Promise.resolve({ slug: "" }) };

  const resolvedParams = await (incoming.params ?? Promise.resolve({ slug: "" }));
  const rawSlug = String(resolvedParams?.slug ?? "").trim();
  if (!rawSlug) return <div className="p-6">Página não encontrada</div>;
  const slug = decodeURIComponent(rawSlug);

  // carrega base
  const { data: baseRows, error: baseErr } = await supabase
    .from("app_pages")
    .select("id,slug,layout,title,subtitle,body,hero_image_url")
    .eq("slug", slug)
    .limit(1);

  if (baseErr || !baseRows?.length)
    return <div className="p-6">Página não encontrada</div>;
  const page = baseRows[0] as PageBase;

  // carrega dependências conforme layout
  let products: Product[] = [];
  const selections: Array<{ sel: SelectionRow; items: Product[] }> = [];

  if (page.layout === "text_products") {
    const resp = await supabase
      .from("app_page_products")
      .select(
        "sort_order,products:products(id,name,store_name,store_slug,photo_url,price_tag,sizes,size_stocks,categories,gender)"
      )
      .eq("page_id", page.id)
      .order("sort_order", { ascending: true });

    const rows = (resp.data as JoinProductRow[] | null) ?? [];
    products = rows.map((r) => toProduct(r.products));
  }

  if (page.layout === "selections") {
    const respSels = await supabase
      .from("app_page_selections")
      .select("id,title,sort_order")
      .eq("page_id", page.id)
      .order("sort_order", { ascending: true });

    for (const sel of (respSels.data as SelectionRow[] | null) ?? []) {
      const respJoin = await supabase
        .from("app_page_selection_products")
        .select(
          "sort_order,products:products(id,name,store_name,store_slug,photo_url,price_tag,sizes,size_stocks,categories,gender)"
        )
        .eq("selection_id", sel.id)
        .order("sort_order", { ascending: true });

      const rows = (respJoin.data as JoinSelectionProductRow[] | null) ?? [];
      const items = rows.map((r) => toProduct(r.products));
      selections.push({ sel, items });
    }
  }

  /* -----------------------------
     Render
     ----------------------------- */
  return (
    <main className="max-w-md mx-auto px-5 py-4">
      {/* Header Look simples */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full bg-black text-white grid place-items-center font-semibold">
          L
        </div>
        <div>
          <div className="text-sm font-semibold">Look</div>
          <div className="text-xs text-neutral-500">Ready to wear in minutes</div>
        </div>
      </div>

      {page.hero_image_url && (
        <img
          src={page.hero_image_url}
          alt={page.title ?? "Banner"}
          className="w-full rounded-2xl aspect-[5/4] object-cover mb-3"
        />
      )}

      <div className="space-y-1">
        {page.title && <h1 className="text-xl font-bold">{page.title}</h1>}
        {page.subtitle && (
          <p className="text-sm font-semibold text-neutral-800">{page.subtitle}</p>
        )}
        {page.body && (
          <p className="text-sm leading-relaxed text-neutral-800 whitespace-pre-wrap">
            {page.body}
          </p>
        )}
      </div>

      {page.layout === "text_products" && (
        <div className="grid grid-cols-2 gap-4 mt-4">
          {products.map((p) => (
            <ProductCard key={String(p.id)} p={p} onTap={() => {}} />
          ))}
        </div>
      )}

      {page.layout === "selections" && (
        <div className="mt-5 space-y-5">
          {selections.map(({ sel, items }) => (
            <section key={sel.id}>
              {sel.title && (
                <h2 className="text-base font-semibold mb-2">{sel.title}</h2>
              )}
              <div className="grid grid-cols-2 gap-4">
                {items.map((p) => (
                  <ProductCard key={String(p.id)} p={p} onTap={() => {}} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
