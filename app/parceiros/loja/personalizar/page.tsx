// app/parceiros/loja/personalizar/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// ========= Tipos de layout =========
type BannerBlock = {
  type: "banner";
  image: string | null;
  href?: string;
  href_path?: string;
};
type LayoutBlock =
  | { type: "hero" }
  | { type: "bio" }
  | { type: "category_menu" }
  | { type: "grid"; rows?: number }
  | BannerBlock;

type StoreLayout = { blocks?: LayoutBlock[] };

function isBannerBlock(b: LayoutBlock): b is BannerBlock {
  return b.type === "banner";
}

// ========= Tipos =========
type StoreRow = {
  id: number;
  store_name: string;
  slug: string | null;
  hero_image_url: string | null;
  bio: string | null;
  layout: StoreLayout | null;
};

type ProductLite = {
  id: number;
  name: string;
  photo_url: string | string[] | null;
  price_tag: number | null;
};

type PageType = "collection" | "looks";

type BannerPageBase = {
  enabled: boolean;
  pageType: PageType;
  heroFile?: File | null;
  heroUrl?: string | null;
  title: string;
  bio?: string;
  slug?: string;
};

type BannerPageCollection = BannerPageBase & {
  pageType: "collection";
  productIds: number[];
};

type LookSection = {
  title: string;
  productIds: number[];
};

type BannerPageLooks = BannerPageBase & {
  pageType: "looks";
  looks: LookSection[]; // máx 5
};

function isCollectionPage(
  p: BannerPageCollection | BannerPageLooks
): p is BannerPageCollection {
  return p.pageType === "collection";
}
function isLooksPage(
  p: BannerPageCollection | BannerPageLooks
): p is BannerPageLooks {
  return p.pageType === "looks";
}

// ========= Constantes de UI =========
const SURFACE = "#F7F4EF";
const BORDER = "#E5E0DA";

const DIM = {
  hero: "1920×1080 (16:9)",
  inline: "1080×1350 (4:5)",
};

const LAYOUTS = [
  {
    key: "EDITORIAL_INTERCALADO",
    title: "Editorial intercalado",
    subtitle:
      "Banner de destaque • 2 linhas de produtos • Banner secundário • Demais produtos",
    needs: 2,
    hint: `Banners inline ${DIM.inline}`,
    order: ["hero", "bio", "menu", "banner1", "grid2", "banner2", "gridRest"],
  },
  {
    key: "VITRINE_COM_PAUSAS",
    title: "Vitrine com pausas",
    subtitle:
      "2 linhas de produtos • Banner • 2 linhas de produtos • Banner • Demais produtos",
    needs: 2,
    hint: `Banners inline ${DIM.inline}`,
    order: [
      "hero",
      "bio",
      "menu",
      "grid2",
      "banner1",
      "grid2b",
      "banner2",
      "gridRest",
    ],
  },
  {
    key: "EDITORIAL_SIMPLES",
    title: "Editorial simples",
    subtitle: "Banner de destaque • Todos os produtos",
    needs: 1,
    hint: `Banner inline ${DIM.inline}`,
    order: ["hero", "bio", "menu", "banner1", "gridRest"],
  },
  {
    key: "VITRINE_COM_PAUSA_UNICA",
    title: "Vitrine com pausa única",
    subtitle: "2 linhas de produtos • Banner • Demais produtos",
    needs: 1,
    hint: `Banners inline ${DIM.inline}`,
    order: ["hero", "bio", "menu", "grid2", "banner1", "gridRest"],
  },
] as const;

type LayoutKey = (typeof LAYOUTS)[number]["key"];

// ========= Utils =========
function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function slugify(s: string) {
  const a = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return a
    .toLowerCase()
    .replace(/&/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function firstImageUrl(photo: string | string[] | null | undefined): string {
  if (!photo) return "";
  if (Array.isArray(photo)) return photo[0] ?? "";
  return photo;
}

// Upload com caminho compatível com RLS (users/<uid>/...)
async function uploadToStoreImages(
  file: File,
  storeSlug: string,
  prefix: string
): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) throw new Error("não autenticado");

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const key = `users/${uid}/${storeSlug}/${prefix}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("store_images")
    .upload(key, file, {
      cacheControl: "3600",
      upsert: false, // evita UPDATE bloqueado por RLS
      contentType: file.type || "image/jpeg",
    });

  if (error) throw error;

  const { data } = supabase.storage.from("store_images").getPublicUrl(key);
  return data.publicUrl;
}

// ========= Componentes atômicos =========
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] font-medium text-neutral-700 mb-1.5">
      {children}
    </div>
  );
}

function Card(props: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={classNames(
        "rounded-3xl p-6 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.18)]",
        "bg-white/60 border",
        props.className
      )}
      style={{ borderColor: BORDER, backdropFilter: "blur(6px)" }}
    >
      {props.children}
    </div>
  );
}

// Modal simples para seleção de produtos
function ProductPickerModal({
  open,
  onClose,
  storeName,
  selected,
  onChange,
  title = "Selecione as peças",
  maxSelect,
}: {
  open: boolean;
  onClose: () => void;
  storeName: string;
  selected: number[];
  onChange: (ids: number[]) => void;
  title?: string;
  maxSelect?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ProductLite[]>([]);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const from = page * 60;
        const to = from + 59;
        let query = supabase
          .from("products")
          .select("id,name,photo_url,price_tag")
          .eq("store_name", storeName)
          .order("id", { ascending: false })
          .range(from, to);

        if (q.trim()) {
          query = query.ilike("name", `%${q.trim()}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (cancel) return;
        setRows((data as ProductLite[]) || []);
      } catch (err) {
        console.error(err);
        if (!cancel) setRows([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [open, page, q, storeName]);

  const toggle = (id: number) => {
    const exists = selected.includes(id);
    const next = exists ? selected.filter((x) => x !== id) : [...selected, id];
    if (typeof maxSelect === "number" && next.length > maxSelect) return;
    onChange(next);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      {/* OBS: transformei o conteúdo em flex-col, limitei a altura relativa à viewport
          e permiti overflow auto apenas na área de conteúdo (grid), mantendo header/footer visíveis */}
      <div className="w-full max-w-5xl rounded-3xl bg-white border border-neutral-200 shadow-2xl flex flex-col overflow-hidden"
           style={{ maxHeight: "calc(100vh - 32px)" }}>
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between flex-shrink-0">
          <div className="font-semibold">{title}</div>
          <button
            onClick={onClose}
            className="text-sm px-3 py-1 rounded-full border border-neutral-300 hover:bg-neutral-50"
          >
            Fechar
          </button>
        </div>

        <div className="p-4 flex items-center gap-3 flex-shrink-0">
          <input
            placeholder="Buscar por nome…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-10 px-3 rounded-xl border border-neutral-300 w-full"
          />
          <div className="text-xs text-neutral-500 whitespace-nowrap">
            Selecionados {selected.length}
            {maxSelect ? ` / ${maxSelect}` : ""}
          </div>
        </div>

        {/* área central rolável */}
        <div className="p-4 overflow-auto">
          {loading ? (
            <div className="text-sm text-neutral-600">Carregando…</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {rows.map((r) => {
                const url = firstImageUrl(r.photo_url);
                const active = selected.includes(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => toggle(r.id)}
                    className={classNames(
                      "group text-left rounded-xl border overflow-hidden",
                      active
                        ? "border-black ring-2 ring-black/20"
                        : "border-neutral-200 hover:border-neutral-300"
                    )}
                  >
                    <div className="aspect-[4/5] bg-neutral-100">
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt={r.name}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="p-2">
                      <div className="text-[12px] line-clamp-2">{r.name}</div>
                      <div className="mt-1 text-[11px] text-neutral-500">
                        #{r.id}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="text-sm px-3 py-1 rounded-full border border-neutral-300 hover:bg-neutral-50"
            >
              ◀
            </button>
            <div className="text-sm">Página {page + 1}</div>
            <button
              onClick={() => setPage((p) => p + 1)}
              className="text-sm px-3 py-1 rounded-full border border-neutral-300 hover:bg-neutral-50"
            >
              ▶
            </button>
          </div>
          <button
            onClick={onClose}
            className="h-10 px-6 rounded-full bg-black text-white text-sm"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}

// ========= Hydrate: carrega páginas de banner já salvas =========
async function hydrateExistingBannerPages(
  storeId: number,
  setPage1: React.Dispatch<
    React.SetStateAction<BannerPageCollection | BannerPageLooks>
  >,
  setPage2: React.Dispatch<
    React.SetStateAction<BannerPageCollection | BannerPageLooks>
  >
) {
  type PgRow = {
    id: number;
    page_type: PageType;
    page_slug: string;
    hero_image_url: string | null;
    title: string | null;
    bio: string | null;
    is_published: boolean | null;
  };

  const loadOne = async (bannerIndex: 1 | 2) => {
    const { data: pg, error } = await supabase
      .from("store_banner_pages")
      .select("id,page_type,page_slug,hero_image_url,title,bio,is_published")
      .eq("store_id", storeId)
      .eq("banner_index", bannerIndex)
      .maybeSingle<PgRow>();
    if (error || !pg) return null;

    const base: BannerPageBase = {
      enabled: !!pg.is_published,
      pageType: pg.page_type,
      heroFile: null,
      heroUrl: pg.hero_image_url ?? null,
      title: pg.title ?? "",
      bio: pg.bio ?? "",
      slug: pg.page_slug ?? "",
    };

    if (pg.page_type === "collection") {
      const { data: rel } = await supabase
        .from("store_banner_page_products")
        .select("product_id,sort_order")
        .eq("page_id", pg.id)
        .order("sort_order", { ascending: true });

      const rows =
        (rel as Array<{ product_id: number; sort_order: number | null }>) ??
        [];
      const productIds = rows
        .slice()
        .sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        )
        .map((r) => r.product_id);

      const col: BannerPageCollection = {
        ...(base as BannerPageBase),
        pageType: "collection",
        productIds,
      };
      return col;
    } else {
      const { data: looks } = await supabase
        .from("store_banner_page_looks")
        .select("id,title,sort_order")
        .eq("page_id", pg.id)
        .order("sort_order", { ascending: true });

      const lookRows =
        (looks as Array<{
          id: number;
          title: string | null;
          sort_order: number | null;
        }>) ?? [];

      const lookIds = lookRows.map((l) => l.id);

      let items:
        | Array<{ look_id: number; product_id: number; sort_order: number | null }>
        | [] = [];
      if (lookIds.length) {
        const { data: lp } = await supabase
          .from("store_banner_look_products")
          .select("look_id,product_id,sort_order")
          .in("look_id", lookIds);
        items =
          (lp as Array<{
            look_id: number;
            product_id: number;
            sort_order: number | null;
          }>) ?? [];
      }

      const sections: LookSection[] = lookRows.map((lk) => {
        const prods = items
          .filter((it) => it.look_id === lk.id)
          .slice()
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((it) => it.product_id);
        return {
          title: (lk.title ?? "").toString(),
          productIds: prods,
        };
      });

      const lk: BannerPageLooks = {
        ...(base as BannerPageBase),
        pageType: "looks",
        looks: sections,
      };
      return lk;
    }
  };

  const [p1, p2] = await Promise.all([loadOne(1), loadOne(2)]);
  if (p1) setPage1(p1);
  if (p2) setPage2(p2);
}

// Helpers para converter entre variantes mantendo campos base
function toCollection(
  p: BannerPageCollection | BannerPageLooks
): BannerPageCollection {
  return {
    enabled: p.enabled,
    pageType: "collection",
    heroFile: p.heroFile ?? null,
    heroUrl: p.heroUrl ?? null,
    title: p.title,
    bio: p.bio,
    slug: p.slug,
    productIds: isCollectionPage(p) ? p.productIds : [],
  };
}
function toLooks(p: BannerPageCollection | BannerPageLooks): BannerPageLooks {
  return {
    enabled: p.enabled,
    pageType: "looks",
    heroFile: p.heroFile ?? null,
    heroUrl: p.heroUrl ?? null,
    title: p.title,
    bio: p.bio,
    slug: p.slug,
    looks: isLooksPage(p) && p.looks.length ? p.looks : [{ title: "", productIds: [] }],
  };
}

// ========= Página principal =========
export default function PersonalizarLojaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [store, setStore] = useState<StoreRow | null>(null);
  const [storeName, setStoreName] = useState<string>("");
  const [storeSlug, setStoreSlug] = useState<string>("");

  // Campos básicos
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [bio, setBio] = useState<string>("");

  // Layout
  const [layoutKey, setLayoutKey] = useState<LayoutKey>(
    "EDITORIAL_INTERCALADO"
  );
  const [layoutBanner1File, setLayoutBanner1File] = useState<File | null>(null);
  const [layoutBanner1Url, setLayoutBanner1Url] = useState<string | null>(null);
  const [layoutBanner2File, setLayoutBanner2File] = useState<File | null>(null);
  const [layoutBanner2Url, setLayoutBanner2Url] = useState<string | null>(null);

  // Páginas de banner
  const [page1, setPage1] = useState<BannerPageCollection | BannerPageLooks>({
    enabled: false,
    pageType: "collection",
    heroFile: null,
    heroUrl: null,
    title: "",
    bio: "",
    slug: "",
    productIds: [],
  } as BannerPageCollection);

  const [page2, setPage2] = useState<BannerPageCollection | BannerPageLooks>({
    enabled: false,
    pageType: "collection",
    heroFile: null,
    heroUrl: null,
    title: "",
    bio: "",
    slug: "",
    productIds: [],
  } as BannerPageCollection);

  // Modais
  const [pickerOpen, setPickerOpen] = useState<null | {
    which: "p1" | "p2" | `look-${number}`;
  }>(null);

  // Carrega store do parceiro logado
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

        // resolve store
        const { data: pe, error: peErr } = await supabase
          .from("partner_emails")
          .select("store_name")
          .eq("email", email)
          .eq("active", true)
          .maybeSingle<{ store_name: string }>();
        if (peErr) throw peErr;

        const sname = pe?.store_name || "";
        setStoreName(sname);

        const { data: srow, error: sErr } = await supabase
          .from("stores")
          .select("id,store_name,slug,hero_image_url,bio,layout")
          .eq("store_name", sname)
          .maybeSingle<StoreRow>();
        if (sErr) throw sErr;
        if (!srow) throw new Error("Loja não encontrada.");

        setStore(srow);
        setStoreSlug(srow.slug || slugify(srow.store_name));
        setHeroUrl(srow.hero_image_url || null);
        setBio(srow.bio || "");

        // tenta inferir banners existentes do layout, se houver
        const blocks: LayoutBlock[] = srow.layout?.blocks ?? [];
        const bImgs = blocks.filter(isBannerBlock).map((b) => b.image);
        if (bImgs[0]) setLayoutBanner1Url(bImgs[0]);
        if (bImgs[1]) setLayoutBanner2Url(bImgs[1]);

        // tenta detectar layout
        const keyGuess: LayoutKey | null = (() => {
          const txt = JSON.stringify(blocks);
          if (
            txt.includes(`"grid","rows":2`) &&
            txt.indexOf(`"banner"`) > txt.indexOf(`"grid","rows":2`) &&
            (txt.match(/"grid","rows":2/g)?.length ?? 0) === 2 &&
            (txt.match(/"banner"/g)?.length || 0) >= 2
          ) {
            return "VITRINE_COM_PAUSAS";
          }
          if (
            txt.startsWith(`[{"type":"hero"`) &&
            (txt.match(/"banner"/g)?.length || 0) >= 2
          ) {
            return "EDITORIAL_INTERCALADO";
          }
          if ((txt.match(/"banner"/g)?.length || 0) === 1 && txt.includes(`"grid"`)) {
            if (txt.indexOf(`"banner"`) < txt.indexOf(`"grid"`)) {
              return "EDITORIAL_SIMPLES";
            } else {
              return "VITRINE_COM_PAUSA_UNICA";
            }
          }
          return null;
        })();
        if (keyGuess) setLayoutKey(keyGuess);
        await hydrateExistingBannerPages(srow.id, setPage1, setPage2);
      } catch (e: unknown) {
        console.error(e);
        const msg = e instanceof Error ? e.message : String(e);
        setNotice(msg || "Não foi possível carregar.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // Helpers banner pages getters/setters
  const updatePage = (
    idx: 1 | 2,
    next: Partial<BannerPageCollection | BannerPageLooks>
  ) => {
    if (idx === 1) {
      setPage1((p) => ({ ...p, ...next } as BannerPageCollection | BannerPageLooks));
    } else {
      setPage2((p) => ({ ...p, ...next } as BannerPageCollection | BannerPageLooks));
    }
  };

  const currentLayoutMeta = useMemo(
    () => LAYOUTS.find((l) => l.key === layoutKey)!,
    [layoutKey]
  );

  // ========= Build JSON de layout =========
  function buildLayoutJSON(
    key: LayoutKey,
    b1Url: string | null,
    b2Url: string | null,
    storeSlug: string,
    p1?: { published: boolean; slug?: string | null } | null,
    p2?: { published: boolean; slug?: string | null } | null
  ) {
    const blocks: LayoutBlock[] = [];
    const bannerBlock = (idx: 1 | 2) => {
      const image = idx === 1 ? b1Url : b2Url;
      const page = idx === 1 ? p1 : p2;
      const blk: BannerBlock = { type: "banner", image };
      if (image && page?.published && page?.slug) {
        // iOS espera o slug puro para filtrar em store_banner_pages.page_slug
        blk.href = page.slug ?? undefined;
        // opcional: mantenha também o caminho completo se o web quiser usar
        blk.href_path = `/loja/${storeSlug}/p/${page.slug}`;
      }
      return blk;
    };

    for (const token of LAYOUTS.find((l) => l.key === key)!.order) {
      if (token === "hero") blocks.push({ type: "hero" });
      if (token === "bio") blocks.push({ type: "bio" });
      if (token === "menu") blocks.push({ type: "category_menu" });
      if (token === "grid2") blocks.push({ type: "grid", rows: 2 });
      if (token === "grid2b") blocks.push({ type: "grid", rows: 2 });
      if (token === "gridRest") blocks.push({ type: "grid" });
      if (token === "banner1" && b1Url) blocks.push(bannerBlock(1));
      if (token === "banner2" && b2Url) blocks.push(bannerBlock(2));
    }
    return { blocks };
  }

  // ========= Salvamento =========
  const handleSave = async () => {
    if (!store) return;
    try {
      setSaving(true);
      setNotice(null);

      // 1) Uploads
      let nextHeroUrl = heroUrl;
      if (heroFile) {
        nextHeroUrl = await uploadToStoreImages(heroFile, storeSlug, "hero");
        setHeroUrl(nextHeroUrl);
      }

      let nextB1 = layoutBanner1Url;
      let nextB2 = layoutBanner2Url;
      if (currentLayoutMeta.needs >= 1 && layoutBanner1File) {
        nextB1 = await uploadToStoreImages(
          layoutBanner1File,
          storeSlug,
          "inline-banner-1"
        );
        setLayoutBanner1Url(nextB1);
      }
      if (currentLayoutMeta.needs >= 2 && layoutBanner2File) {
        nextB2 = await uploadToStoreImages(
          layoutBanner2File,
          storeSlug,
          "inline-banner-2"
        );
        setLayoutBanner2Url(nextB2);
      }

      // 2) Páginas de banner (cria/atualiza)
      const upsertBannerPage = async (
        bannerIndex: 1 | 2,
        data: BannerPageCollection | BannerPageLooks
      ) => {
        if (!data.enabled) {
          await supabase
            .from("store_banner_pages")
            .update({ is_published: false })
            .eq("store_id", store.id)
            .eq("banner_index", bannerIndex);
          return { published: false, slug: null as string | null };
        }

        // hero da página
        let pageHeroUrl = data.heroUrl || null;
        if (data.heroFile) {
          pageHeroUrl = await uploadToStoreImages(
            data.heroFile,
            storeSlug,
            `banner${bannerIndex}-page-hero`
          );
        }

        const cleanTitle = (data.title || "").trim();
        const pageSlug = (
          data.slug ||
          slugify(cleanTitle) ||
          `b${bannerIndex}`
        ).slice(0, 80);

        const { data: pRow, error: pErr } = await supabase
          .from("store_banner_pages")
          .upsert(
            {
              store_id: store.id,
              store_name: store.store_name,
              banner_index: bannerIndex,
              page_type: data.pageType,
              page_slug: pageSlug,
              hero_image_url: pageHeroUrl,
              title: cleanTitle || `Banner ${bannerIndex}`,
              bio: data.bio || null,
              is_published: true,
            },
            { onConflict: "store_id,banner_index" }
          )
          .select()
          .single<{ id: number }>();
        if (pErr) throw pErr;

        if (data.pageType === "collection") {
          const prodIds = (data as BannerPageCollection).productIds || [];
          await supabase
            .from("store_banner_page_products")
            .delete()
            .eq("page_id", pRow.id);
          if (prodIds.length) {
            const rows = prodIds.map((pid, i) => ({
              page_id: pRow.id,
              product_id: pid,
              sort_order: i,
            }));
            const { error } = await supabase
              .from("store_banner_page_products")
              .insert(rows);
            if (error) throw error;
          }
        } else {
          const looks = (data as BannerPageLooks).looks || [];
          const { data: oldLooks } = await supabase
            .from("store_banner_page_looks")
            .select("id")
            .eq("page_id", pRow.id);
          if ((oldLooks as Array<{ id: number }> | null)?.length) {
            const ids = (oldLooks as Array<{ id: number }>).map((l) => l.id);
            await supabase
              .from("store_banner_look_products")
              .delete()
              .in("look_id", ids);
            await supabase
              .from("store_banner_page_looks")
              .delete()
              .eq("page_id", pRow.id);
          }
          for (let i = 0; i < looks.length && i < 5; i++) {
            const lk = looks[i];
            const { data: insLook, error: lErr } = await supabase
              .from("store_banner_page_looks")
              .insert({
                page_id: pRow.id,
                title: lk.title?.trim() || `Look ${i + 1}`,
                sort_order: i,
              })
              .select()
              .single<{ id: number }>();
            if (lErr) throw lErr;

            const prods = lk.productIds || [];
            if (prods.length) {
              const rows = prods.map((pid, j) => ({
                look_id: insLook.id,
                product_id: pid,
                sort_order: j,
              }));
              const { error } = await supabase
                .from("store_banner_look_products")
                .insert(rows);
              if (error) throw error;
            }
          }
        }

        return { published: true, slug: pageSlug as string | null };
      };

      const p1Meta = await upsertBannerPage(1, page1);
      const p2Meta = await upsertBannerPage(2, page2);

      // 3) JSON layout com hrefs
      const nextLayout = buildLayoutJSON(
        layoutKey,
        nextB1 || null,
        nextB2 || null,
        storeSlug,
        p1Meta,
        p2Meta
      );

      // 4) Atualiza stores
      const { error: upErr } = await supabase
        .from("stores")
        .update({
          hero_image_url: nextHeroUrl,
          bio: bio || null,
          layout: nextLayout,
        })
        .eq("id", store.id);
      if (upErr) throw upErr;

      setNotice("Personalização salva com sucesso.");
    } catch (e: unknown) {
      console.error(e);
      const msg =
        e instanceof Error ? e.message : String(e);
      setNotice(msg || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  // ========= UI =========
  if (loading) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: SURFACE }} />
    );
  }

  if (!store) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
        <div className="mx-auto max-w-5xl px-6 pt-10 text-sm">
          Não foi possível carregar a loja.
        </div>
      </main>
    );
  }

  const needs2 = currentLayoutMeta.needs === 2;

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      <header className="w-full border-b border-[#E5E0DA]/80 bg-[#F7F4EF]/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/parceiros")}
              className="inline-flex items-center gap-2 text-sm px-3 py-1 rounded-full border border-neutral-300 bg-white/70 hover:bg-white"
            >
              <span aria-hidden>←</span>
              <span>Painel</span>
            </button>
            <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
              <span className="text-[13px] font-semibold tracking-tight text-white leading-none">
                L
              </span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-black">
                Personalize sua loja
              </span>
              <span className="text-[11px] text-neutral-500">{storeName}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className={classNames(
                "h-10 px-6 rounded-full text-sm font-medium text-white",
                saving ? "bg-neutral-600" : "bg-black hover:opacity-90"
              )}
            >
              {saving ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-8 py-10 space-y-8">
        {notice && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 text-sm">
            {notice}
          </div>
        )}

        {/* 1) Informações da marca */}
        <Card>
          <div className="text-lg font-semibold mb-4">
            Identidade da vitrine
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <FieldLabel>
                Banner hero da loja{" "}
                <span className="text-neutral-500">
                  (recomendado {DIM.hero})
                </span>
              </FieldLabel>
              {heroUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroUrl}
                  alt="hero"
                  className="w-full rounded-xl border border-neutral-200 mb-2"
                  style={{ aspectRatio: "16/9", objectFit: "cover" }}
                />
              ) : (
                <div
                  className="w-full rounded-xl border border-dashed border-neutral-300 mb-2 bg-neutral-50"
                  style={{ aspectRatio: "16/9" }}
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setHeroFile(e.target.files?.[0] || null)}
                className="block text-sm"
              />
              <div className="text-[11px] text-neutral-500 mt-1">
                Ao salvar, a imagem será enviada para o bucket{" "}
                <b>store_images</b> e o link será gravado em{" "}
                <code>stores.hero_image_url</code>.
              </div>
            </div>

            <div>
              <FieldLabel>Bio da loja</FieldLabel>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full h-40 rounded-xl border border-neutral-300 p-3 text-sm"
                placeholder="Conte em poucas linhas sobre a marca, DNA, materiais, coleções…"
              />
            </div>
          </div>
        </Card>

        {/* 2) Layout */}
        <Card>
          <div className="text-lg font-semibold mb-4">Layout da vitrine</div>

          <div className="grid md:grid-cols-2 gap-4">
            {LAYOUTS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setLayoutKey(opt.key)}
                className={classNames(
                  "text-left rounded-2xl border p-4 transition",
                  layoutKey === opt.key
                    ? "border-black ring-2 ring-black/10 bg-white"
                    : "border-neutral-300 hover:border-neutral-400 bg-white/70"
                )}
              >
                <div className="text-[15px] font-semibold">{opt.title}</div>
                <div className="text-[12px] text-neutral-600 mt-1">
                  {opt.subtitle}
                </div>
                <div className="text-[11px] text-neutral-500 mt-2">
                  {opt.hint}
                </div>
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div>
              <FieldLabel>
                {needs2 ? "Banner 1 do layout" : "Banner do layout"}{" "}
                <span className="text-neutral-500">
                  (recomendado {DIM.inline})
                </span>
              </FieldLabel>
              {layoutBanner1Url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={layoutBanner1Url}
                  alt="banner1"
                  className="w-full rounded-xl border border-neutral-200 mb-2"
                  style={{ aspectRatio: "4/5", objectFit: "cover" }}
                />
              ) : (
                <div
                  className="w-full rounded-xl border border-dashed border-neutral-300 mb-2 bg-neutral-50"
                  style={{ aspectRatio: "4/5" }}
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setLayoutBanner1File(e.target.files?.[0] || null)
                }
                className="block text-sm"
              />
            </div>

            {needs2 && (
              <div>
                <FieldLabel>
                  Banner 2 do layout{" "}
                  <span className="text-neutral-500">
                    (recomendado {DIM.inline})
                  </span>
                </FieldLabel>
                {layoutBanner2Url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={layoutBanner2Url}
                    alt="banner2"
                    className="w-full rounded-xl border border-neutral-200 mb-2"
                    style={{ aspectRatio: "4/5", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    className="w-full rounded-xl border border-dashed border-neutral-300 mb-2 bg-neutral-50"
                    style={{ aspectRatio: "4/5" }}
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setLayoutBanner2File(e.target.files?.[0] || null)
                  }
                  className="block text-sm"
                />
              </div>
            )}
          </div>
        </Card>

        {/* 3) Páginas de Banner */}
        <Card>
          <div className="text-lg font-semibold mb-4">
            Páginas vinculadas aos banners
          </div>

          {/* Banner 1 */}
          <div className="rounded-2xl border border-neutral-200 p-4 mb-6 bg-white/60">
            <div className="flex items-center justify-between">
              <div className="font-medium">Banner 1 → Página</div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={page1.enabled}
                  onChange={(e) => updatePage(1, { enabled: e.target.checked })}
                />
                Ativar página
              </label>
            </div>

            {page1.enabled && (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setPage1((p) => toCollection(p))}
                    className={classNames(
                      "px-4 h-9 rounded-full border text-sm",
                      page1.pageType === "collection"
                        ? "bg-black text-white border-black"
                        : "bg-white border-neutral-300"
                    )}
                  >
                    Coleção selecionada (curadoria)
                  </button>
                  <button
                    onClick={() => setPage1((p) => toLooks(p))}
                    className={classNames(
                      "px-4 h-9 rounded-full border text-sm",
                      page1.pageType === "looks"
                        ? "bg-black text-white border-black"
                        : "bg-white border-neutral-300"
                    )}
                  >
                    Looks por ocasião
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>
                      Banner inicial da página{" "}
                      <span className="text-neutral-500">
                        (recomendado {DIM.hero})
                      </span>
                    </FieldLabel>
                    {page1.heroUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={page1.heroUrl}
                        alt="page1 hero"
                        className="w-full rounded-xl border border-neutral-200 mb-2"
                        style={{ aspectRatio: "16/9", objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        className="w-full rounded-xl border border-dashed border-neutral-300 mb-2 bg-neutral-50"
                        style={{ aspectRatio: "16/9" }}
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        updatePage(1, { heroFile: e.target.files?.[0] || null })
                      }
                      className="block text-sm"
                    />
                  </div>
                  <div>
                    <FieldLabel>Título</FieldLabel>
                    <input
                      className="w-full rounded-xl border border-neutral-300 h-10 px-3 text-sm"
                      value={page1.title}
                      onChange={(e) =>
                        updatePage(1, {
                          title: e.target.value,
                          slug: slugify(e.target.value),
                        })
                      }
                      placeholder="Ex.: S/S 26"
                    />
                    <div className="text-[11px] text-neutral-500 mt-1">
                      URL: /loja/{storeSlug}/p/
                      {slugify(page1.title || "") || "sua-pagina"}
                    </div>

                    <div className="mt-3">
                      <FieldLabel>Bio (opcional)</FieldLabel>
                      <textarea
                        className="w-full rounded-xl border border-neutral-300 p-3 text-sm"
                        value={page1.bio || ""}
                        onChange={(e) => updatePage(1, { bio: e.target.value })}
                        placeholder="Conte um pouco sobre a coleção/curadoria…"
                      />
                    </div>
                  </div>
                </div>

                {page1.pageType === "collection" ? (
                  <div className="mt-2">
                    <FieldLabel>Peças selecionadas</FieldLabel>
                    <button
                      onClick={() => setPickerOpen({ which: "p1" })}
                      className="h-10 px-4 rounded-full border border-neutral-300 hover:bg-neutral-50 text-sm"
                    >
                      Selecionar peças
                    </button>
                    <div className="text-[11px] text-neutral-500 mt-2">
                      Você selecionou{" "}
                      {(isCollectionPage(page1) ? page1.productIds : []).length ||
                        0}{" "}
                      peça(s).
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-neutral-700">
                      Looks (até 5)
                    </div>
                    {(isLooksPage(page1) ? page1.looks : []).map((lk, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-neutral-200 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">
                            Ocasião #{idx + 1}
                          </div>
                          <button
                            onClick={() => {
                              if (!isLooksPage(page1)) return;
                              const next = page1.looks.filter((_, j) => j !== idx);
                              updatePage(1, { looks: next });
                            }}
                            className="text-xs px-2 py-1 rounded-full border border-neutral-300 hover:bg-neutral-50"
                          >
                            Remover
                          </button>
                        </div>
                        <div className="mt-2 grid md:grid-cols-2 gap-3">
                          <div>
                            <FieldLabel>Subtítulo da ocasião</FieldLabel>
                            <input
                              className="w-full rounded-xl border border-neutral-300 h-10 px-3 text-sm"
                              value={lk.title}
                              onChange={(e) => {
                                if (!isLooksPage(page1)) return;
                                const next = [...page1.looks];
                                next[idx] = {
                                  ...next[idx],
                                  title: e.target.value,
                                };
                                updatePage(1, { looks: next });
                              }}
                              placeholder="Ex.: Lollapalooza #1"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              onClick={() =>
                                setPickerOpen({ which: `look-${idx}` })
                              }
                              className="h-10 px-4 rounded-full border border-neutral-300 hover:bg-neutral-50 text-sm"
                            >
                              Selecionar peças do look
                            </button>
                          </div>
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-2">
                          {(lk.productIds || []).length} peça(s) nesse look.
                        </div>
                      </div>
                    ))}

                    {isLooksPage(page1) && page1.looks.length < 5 && (
                      <button
                        onClick={() => {
                          if (!isLooksPage(page1)) return;
                          updatePage(1, {
                            looks: [...page1.looks, { title: "", productIds: [] }],
                          });
                        }}
                        className="h-10 px-4 rounded-full border border-neutral-300 hover:bg-neutral-50 text-sm"
                      >
                        Adicionar look
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Banner 2 */}
          <div className="rounded-2xl border border-neutral-200 p-4 bg-white/60">
            <div className="flex items-center justify-between">
              <div className="font-medium">Banner 2 → Página</div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={page2.enabled}
                  onChange={(e) =>
                    setPage2((p) => ({ ...p, enabled: e.target.checked }))
                  }
                />
                Ativar página
              </label>
            </div>

            {page2.enabled && (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setPage2((p) => toCollection(p))}
                    className={classNames(
                      "px-4 h-9 rounded-full border text-sm",
                      page2.pageType === "collection"
                        ? "bg-black text-white border-black"
                        : "bg-white border-neutral-300"
                    )}
                  >
                    Coleção selecionada (curadoria)
                  </button>
                  <button
                    onClick={() => setPage2((p) => toLooks(p))}
                    className={classNames(
                      "px-4 h-9 rounded-full border text-sm",
                      page2.pageType === "looks"
                        ? "bg-black text-white border-black"
                        : "bg-white border-neutral-300"
                    )}
                  >
                    Looks por ocasião
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>
                      Banner inicial da página{" "}
                      <span className="text-neutral-500">
                        (recomendado {DIM.hero})
                      </span>
                    </FieldLabel>
                    {page2.heroUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={page2.heroUrl}
                        alt="page2 hero"
                        className="w-full rounded-xl border border-neutral-200 mb-2"
                        style={{ aspectRatio: "16/9", objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        className="w-full rounded-xl border border-dashed border-neutral-300 mb-2 bg-neutral-50"
                        style={{ aspectRatio: "16/9" }}
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setPage2((p) => ({
                          ...p,
                          heroFile: e.target.files?.[0] || null,
                        }))
                      }
                      className="block text-sm"
                    />
                  </div>
                  <div>
                    <FieldLabel>Título</FieldLabel>
                    <input
                      className="w-full rounded-xl border border-neutral-300 h-10 px-3 text-sm"
                      value={page2.title}
                      onChange={(e) =>
                        setPage2((p) => ({
                          ...p,
                          title: e.target.value,
                          slug: slugify(e.target.value),
                        }))
                      }
                      placeholder="Ex.: Cápsula Festa"
                    />
                    <div className="text-[11px] text-neutral-500 mt-1">
                      URL: /loja/{storeSlug}/p/
                      {slugify(page2.title || "") || "sua-pagina"}
                    </div>

                    <div className="mt-3">
                      <FieldLabel>Bio (opcional)</FieldLabel>
                      <textarea
                        className="w-full rounded-xl border border-neutral-300 p-3 text-sm"
                        value={page2.bio || ""}
                        onChange={(e) =>
                          setPage2((p) => ({ ...p, bio: e.target.value }))
                        }
                        placeholder="Conte um pouco sobre a coleção/curadoria…"
                      />
                    </div>
                  </div>
                </div>

                {page2.pageType === "collection" ? (
                  <div className="mt-2">
                    <FieldLabel>Peças selecionadas</FieldLabel>
                    <button
                      onClick={() => setPickerOpen({ which: "p2" })}
                      className="h-10 px-4 rounded-full border border-neutral-300 hover:bg-neutral-50 text-sm"
                    >
                      Selecionar peças
                    </button>
                    <div className="text-[11px] text-neutral-500 mt-2">
                      {(isCollectionPage(page2) ? page2.productIds : []).length ||
                        0}{" "}
                      peça(s) selecionadas.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-neutral-700">
                      Looks (até 5)
                    </div>
                    {(isLooksPage(page2) ? page2.looks : []).map(
                      (lk, idx: number) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-neutral-200 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">
                              Ocasião #{idx + 1}
                            </div>
                            <button
                              onClick={() => {
                                if (!isLooksPage(page2)) return;
                                const next = page2.looks.filter(
                                  (_: LookSection, j: number) => j !== idx
                                );
                                setPage2((p) => ({ ...p, looks: next }));
                              }}
                              className="text-xs px-2 py-1 rounded-full border border-neutral-300 hover:bg-neutral-50"
                            >
                              Remover
                            </button>
                          </div>
                          <div className="mt-2 grid md:grid-cols-2 gap-3">
                            <div>
                              <FieldLabel>Subtítulo da ocasião</FieldLabel>
                              <input
                                className="w-full rounded-xl border border-neutral-300 h-10 px-3 text-sm"
                                value={lk.title}
                                onChange={(e) => {
                                  if (!isLooksPage(page2)) return;
                                  const next = [...page2.looks];
                                  next[idx] = {
                                    ...next[idx],
                                    title: e.target.value,
                                  };
                                  setPage2((p) => ({ ...p, looks: next }));
                                }}
                                placeholder="Ex.: Red carpet"
                              />
                            </div>
                            <div className="flex items-end">
                              <button
                                onClick={() =>
                                  setPickerOpen({ which: `look-${100 + idx}` })
                                }
                                className="h-10 px-4 rounded-full border border-neutral-300 hover:bg-neutral-50 text-sm"
                              >
                                Selecionar peças do look
                              </button>
                            </div>
                          </div>
                          <div className="text-[11px] text-neutral-500 mt-2">
                            {(lk.productIds || []).length} peça(s) nesse look.
                          </div>
                        </div>
                      )
                    )}

                    {isLooksPage(page2) && page2.looks.length < 5 && (
                      <button
                        onClick={() => {
                          if (!isLooksPage(page2)) return;
                          setPage2((p) => ({
                            ...p,
                            looks: [...page2.looks, { title: "", productIds: [] }],
                          }));
                        }}
                        className="h-10 px-4 rounded-full border border-neutral-300 hover:bg-neutral-50 text-sm"
                      >
                        Adicionar look
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
        <div className="flex items-center justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={classNames(
              "h-10 px-6 rounded-full text-sm font-medium text-white",
              saving ? "bg-neutral-600" : "bg-black hover:opacity-90"
            )}
          >
            {saving ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </div>

      {/* Picker modal único */}
      <ProductPickerModal
        open={!!pickerOpen}
        onClose={() => setPickerOpen(null)}
        storeName={storeName}
        selected={(() => {
          if (!pickerOpen) return [];
          if (pickerOpen.which === "p1") {
            return isCollectionPage(page1) ? page1.productIds : [];
          }
          if (pickerOpen.which === "p2") {
            return isCollectionPage(page2) ? page2.productIds : [];
          }
          if (pickerOpen.which.startsWith("look-")) {
            // look-0..4 => page1 ; look-100..104 => page2
            if (
              pickerOpen.which === "look-0" ||
              pickerOpen.which === "look-1" ||
              pickerOpen.which === "look-2" ||
              pickerOpen.which === "look-3" ||
              pickerOpen.which === "look-4"
            ) {
              const idx = Number(pickerOpen.which.split("-")[1]);
              const looks = isLooksPage(page1) ? page1.looks : [];
              return looks[idx]?.productIds || [];
            } else {
              const idx = Number(pickerOpen.which.split("-")[1]) - 100;
              const looks = isLooksPage(page2) ? page2.looks : [];
              return looks[idx]?.productIds || [];
            }
          }
          return [];
        })()}
        onChange={(ids) => {
          if (!pickerOpen) return;
          if (pickerOpen.which === "p1") {
            setPage1((p) =>
              isCollectionPage(p) ? { ...p, productIds: ids } : p
            );
          } else if (pickerOpen.which === "p2") {
            setPage2((p) =>
              isCollectionPage(p) ? { ...p, productIds: ids } : p
            );
          } else if (pickerOpen.which.startsWith("look-")) {
            if (
              pickerOpen.which === "look-0" ||
              pickerOpen.which === "look-1" ||
              pickerOpen.which === "look-2" ||
              pickerOpen.which === "look-3" ||
              pickerOpen.which === "look-4"
            ) {
              const idx = Number(pickerOpen.which.split("-")[1]);
              setPage1((p) => {
                if (!isLooksPage(p)) return p;
                const next = [...p.looks];
                next[idx] = {
                  ...(next[idx] || { title: "", productIds: [] }),
                  productIds: ids,
                };
                return { ...p, looks: next };
              });
            } else {
              const idx = Number(pickerOpen.which.split("-")[1]) - 100;
              setPage2((p) => {
                if (!isLooksPage(p)) return p;
                const next = [...p.looks];
                next[idx] = {
                  ...(next[idx] || { title: "", productIds: [] }),
                  productIds: ids,
                };
                return { ...p, looks: next };
              });
            }
          }
        }}
      />
    </main>
  );
}
