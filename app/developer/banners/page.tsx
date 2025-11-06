// app/developer/banners/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type Slot = "carousel" | "editorial_tall" | "selection_hero";

type BannerRow = {
  id: number;
  city: string;
  slot: Slot | string;
  sort_order: number | null;
  image_url: string | null;
  href: string | null;
  title: string | null;
  subtitle_text: string | null;
  subtitle_lines: string[] | null;
  alt: string | null;
  is_active: boolean | null;
  page_slug?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type PageLayout = "text" | "text_products" | "text_looksets";

type BannerPageRow = {
  id: number;
  slug: string;
  layout: PageLayout;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  hero_image_url: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type LookSection = { title: string; productIds: number[] };

type PageLocal = {
  id?: number | null;
  bannerId: number;
  enabled: boolean;
  slug: string;
  layout: PageLayout;
  title: string;
  subtitle: string;
  body: string;
  hero_url: string | null;
  hero_file?: File | null;

  // Novos campos para curadoria
  productIds?: number[]; // para text_products
  looks?: LookSection[]; // para text_looksets
};

type ProductLite = {
  id: number;
  name: string;
  photo_url: string | string[] | null;
  price_tag: number | null;
  store_name?: string | null;
};

const SURFACE = "#F7F4EF";
const BORDER = "#E5E0DA";

const SLOTS: Slot[] = ["carousel", "editorial_tall", "selection_hero"];

const LAYOUTS: { key: PageLayout; title: string; hint: string }[] = [
  { key: "text", title: "Texto", hint: "Página editorial simples com texto" },
  {
    key: "text_products",
    title: "Texto + Produtos",
    hint: "Texto com grade de peças selecionadas",
  },
  {
    key: "text_looksets",
    title: "Seleções",
    hint: "Grupos de produtos por ocasião",
  },
];

function slugify(input: string) {
  return (input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "e")
    .replace(/[^a-z0-9\- ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/\-+/g, "-")
    .slice(0, 80);
}

function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}
function asStr(v: string | null | undefined) {
  return v ?? "";
}
function asArr(v: string[] | null | undefined) {
  return Array.isArray(v) ? v : [];
}
function firstImageUrl(photo: string | string[] | null | undefined): string {
  if (!photo) return "";
  if (Array.isArray(photo)) return photo[0] ?? "";
  return photo;
}

function Card(props: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "rounded-3xl p-8 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.18)] transition",
        "hover:shadow-[0_10px_40px_-16px_rgba(0,0,0,0.22)]",
        props.className
      )}
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

function PillButton({
  children,
  onClick,
  active = false,
  tone = "neutral",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  tone?: "neutral" | "primary" | "danger";
  disabled?: boolean;
}) {
  const tones: Record<string, string> = {
    neutral: active
      ? "bg-black text-white"
      : "border border-neutral-300/70 bg-white/70 text-neutral-900 hover:bg-white",
    primary: "bg-black text-white",
    danger: "bg-rose-600 text-white hover:opacity-90",
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-medium transition",
        tones[tone],
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  labelOn = "Ativo",
  labelOff = "Inativo",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  labelOn?: string;
  labelOff?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cx(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] border transition",
        checked
          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
          : "bg-neutral-100 text-neutral-700 border-neutral-200"
      )}
    >
      <span
        className={cx(
          "h-1.5 w-1.5 rounded-full",
          checked ? "bg-emerald-500" : "bg-neutral-500"
        )}
      />
      {checked ? labelOn : labelOff}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  textarea = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-neutral-600">{label}</span>
      {textarea ? (
        <textarea
          rows={3}
          className={cx(
            "mt-1 w-full rounded-xl border border-neutral-300/70 bg-white/70 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400",
            disabled && "opacity-60 cursor-not-allowed"
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      ) : (
        <input
          type={type}
          className={cx(
            "mt-1 w-full rounded-full border border-neutral-300/70 bg-white/70 px-4 h-10 text-sm text-neutral-900 outline-none focus:border-neutral-400",
            disabled && "opacity-60 cursor-not-allowed"
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      )}
    </label>
  );
}

/** Modal simples para selecionar produtos em qualquer loja */
function ProductPickerModal({
  open,
  onClose,
  selected,
  onChange,
  title = "Selecione as peças",
}: {
  open: boolean;
  onClose: () => void;
  selected: number[];
  onChange: (ids: number[]) => void;
  title?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ProductLite[]>([]);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [storeFilter, setStoreFilter] = useState("");

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
          .select("id,name,photo_url,price_tag,store_name")
          .order("id", { ascending: false })
          .range(from, to);

        if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
        if (storeFilter.trim())
          query = query.ilike("store_name", `%${storeFilter.trim()}%`);

        const { data, error } = await query;
        if (error) throw error;
        if (!cancel) setRows((data as ProductLite[]) || []);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        if (!cancel) setRows([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [open, page, q, storeFilter]);

  const toggle = (id: number) => {
    const exists = selected.includes(id);
    const next = exists ? selected.filter((x) => x !== id) : [...selected, id];
    onChange(next);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-6xl max-h-[90vh] rounded-3xl bg-white border border-neutral-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header fixo */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="font-semibold">{title}</div>
          <button
            onClick={onClose}
            className="text-sm px-3 py-1 rounded-full border border-neutral-300 hover:bg-neutral-50"
          >
            Fechar
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              placeholder="Buscar por nome…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-10 px-3 rounded-xl border border-neutral-300 w-full"
            />
            <input
              placeholder="Filtrar por loja…"
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-neutral-300 w-full"
            />
            <div className="text-xs text-neutral-500 whitespace-nowrap flex items-center justify-end">
              Selecionados {selected.length}
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="text-sm text-neutral-600">Carregando…</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {rows.map((r) => {
                  const url = firstImageUrl(r.photo_url);
                  const active = selected.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      onClick={() => toggle(r.id)}
                      className={cx(
                        "group text-left rounded-xl border overflow-hidden",
                        active
                          ? "border-black ring-2 ring-black/20"
                          : "border-neutral-200 hover:border-neutral-300"
                      )}
                      title={r.store_name || ""}
                    >
                      <div className="aspect-[4/5] bg-neutral-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {url ? (
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
                          {r.store_name ? ` • ${r.store_name}` : ""}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer fixo */}
        <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between">
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

export default function DevBannersPage() {
  const router = useRouter();

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const email = user?.email?.toLowerCase() ?? "";
        if (!email) {
          setAllowed(false);
          return;
        }
        setUserEmail(email);
        const { data: ok, error } = await supabase.rpc(
          "developer_email_allowed",
          { p_email: email }
        );
        if (error) {
          const { data: rows } = await supabase
            .from("developer_emails")
            .select("email,active")
            .eq("email", email)
            .eq("active", true)
            .limit(1);
          if (mounted) setAllowed((rows?.length ?? 0) > 0);
        } else {
          if (mounted) setAllowed(!!ok);
        }
      } catch {
        if (mounted) setAllowed(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const [cities, setCities] = useState<string[]>([]);
  const [city, setCity] = useState<string>("São Paulo");
  const [rows, setRows] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [pages, setPages] = useState<Record<number, PageLocal>>({});
  const [hasPageSlugColumn, setHasPageSlugColumn] = useState<boolean>(false);
  const [hasBannerPagesTable, setHasBannerPagesTable] =
    useState<boolean>(false);

  // Modal de produtos
  const [pickerOpen, setPickerOpen] = useState<null | {
    bannerId: number;
    kind: "collection" | "look";
    lookIndex?: number;
  }>(null);

  const cityBtnRef = useRef<HTMLButtonElement | null>(null);

  const loadCities = useCallback(async () => {
    const { data, error } = await supabase
      .from("home_banners")
      .select("city")
      .order("city", { ascending: true });
    if (error) {
      setNotice("Não foi possível carregar as cidades.");
      return;
    }
    const uniq = Array.from(
      new Set(
        ((data ?? []) as Array<{ city: string | null }>)
          .map((r) => r.city)
          .filter((c): c is string => !!c)
      )
    );
    setCities(uniq.length ? uniq : ["São Paulo"]);
    if (!city && uniq[0]) setCity(uniq[0]);
  }, [city]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!cityBtnRef.current) return;
      if (!cityBtnRef.current.parentElement?.contains(e.target as Node))
        setDropdownOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    if (allowed) loadCities();
  }, [allowed, loadCities]);

  async function selectBannersForCity(forCity: string) {
    const selWith =
      "id,city,slot,sort_order,image_url,href,title,subtitle_text,subtitle_lines,alt,is_active,page_slug,updated_at,created_at";
  
    // helper de retorno do Supabase (estrito, sem any)
type SupabaseResp<T> = { data: T[] | null; error: unknown | null };

// 1) tenta com page_slug
const respWith = (await supabase
  .from("home_banners")
  .select(selWith)
  .eq("city", forCity)
  .order("slot", { ascending: true })
  .order("sort_order", { ascending: true })) as SupabaseResp<BannerRow>;

if (!respWith.error) {
  setHasPageSlugColumn(true);
  return { banners: (respWith.data ?? []) as BannerRow[] };
}

// 2) fallback sem page_slug
const selNo =
  "id,city,slot,sort_order,image_url,href,title,subtitle_text,subtitle_lines,alt,is_active,updated_at,created_at";

const respNo = (await supabase
  .from("home_banners")
  .select(selNo)
  .eq("city", forCity)
  .order("slot", { ascending: true })
  .order("sort_order", { ascending: true })) as SupabaseResp<BannerRow>;

setHasPageSlugColumn(false);
if (respNo.error) throw respNo.error;
return { banners: (respNo.data ?? []) as BannerRow[] };
  }
  

  const loadRows = useCallback(
    async (forCity: string) => {
      setLoading(true);
      setNotice(null);
      try {
        const { banners } = await selectBannersForCity(forCity);
        setRows(banners);
        setLoading(false);

        let tableOk = false;
        try {
          const probe = await supabase
            .from("banner_pages")
            .select("slug")
            .limit(1);
          if (!probe.error) tableOk = true;
        } catch {}
        setHasBannerPagesTable(tableOk);

        if (!tableOk || !hasPageSlugColumn) {
          setPages({});
          return;
        }

        const { data: pageRowsRaw, error: pgErr } = await supabase
          .from("banner_pages")
          .select(
            "id,slug,layout,title,subtitle,body,hero_image_url,is_active"
          );
        if (pgErr) {
          setPages({});
          return;
        }

        const pageRows = (pageRowsRaw ?? []) as BannerPageRow[];

        // Hydrate relações
        const byId: Record<number, BannerPageRow> = {};
        for (const r of pageRows) byId[r.id] = r;

        // Mapa slug -> row.id
        const slugByBanner: Record<number, string> = {};
        for (const b of banners)
          if (b.page_slug) slugByBanner[b.id] = b.page_slug;

        // Colete ids que interessam
        const pageIdsNeeded: number[] = [];
        for (const b of banners) {
          const slug = asStr(b.page_slug);
          if (!slug) continue;
          const pr = pageRows.find((p) => p.slug === slug);
          if (pr) pageIdsNeeded.push(pr.id);
        }

        // Tipos auxiliares de relações
        type PageProductRow = {
          page_id: number;
          product_id: number;
          sort_order: number | null;
        };
        type LookRow = {
          id: number;
          page_id: number;
          title: string | null;
          sort_order: number | null;
        };
        type LookProductRow = {
          look_id: number;
          product_id: number;
          sort_order: number | null;
        };

        // Carrega products e looks
   // Carrega products e looks
const relProducts: Record<number, number[]> = {};
const relLooks: Record<number, LookSection[]> = {};


        if (pageIdsNeeded.length) {
          const { data: relP } = await supabase
            .from("banner_page_products")
            .select("page_id,product_id,sort_order")
            .in("page_id", pageIdsNeeded)
            .order("sort_order", { ascending: true });

          for (const r of (relP ?? []) as PageProductRow[]) {
            const pid = r.page_id;
            if (!relProducts[pid]) relProducts[pid] = [];
            relProducts[pid].push(r.product_id);
          }

          const { data: looks } = await supabase
            .from("banner_page_looks")
            .select("id,page_id,title,sort_order")
            .in("page_id", pageIdsNeeded)
            .order("sort_order", { ascending: true });

          const lookRows = (looks ?? []) as LookRow[];
          const lookIds = lookRows.map((l) => l.id);

          let lookItems: LookProductRow[] = [];
          if (lookIds.length) {
            const { data: li } = await supabase
              .from("banner_look_products")
              .select("look_id,product_id,sort_order")
              .in("look_id", lookIds);
            lookItems = (li ?? []) as LookProductRow[];
          }

          for (const l of lookRows) {
            const pid = l.page_id;
            if (!relLooks[pid]) relLooks[pid] = [];
            const items = lookItems
              .filter((it) => it.look_id === l.id)
              .slice()
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .map((it) => it.product_id);
            relLooks[pid].push({
              title: l.title || "",
              productIds: items,
            });
          }
        }

        // Constrói estado local pages
        const map: Record<number, PageLocal> = {};
        for (const b of banners) {
          const slug = asStr(b.page_slug);
          if (!slug) continue;
          const pr = pageRows.find((p) => p.slug === slug);
          if (!pr) {
            map[b.id] = {
              id: null,
              bannerId: b.id,
              enabled: true,
              slug,
              layout: "text",
              title: asStr(b.title),
              subtitle: "",
              body: "",
              hero_url: null,
              hero_file: null,
              productIds: [],
              looks: [],
            };
            continue;
          }
          const pid = pr.id;
          map[b.id] = {
            id: pid,
            bannerId: b.id,
            enabled: !!pr.is_active,
            slug: pr.slug,
            layout: (pr.layout as PageLayout) || "text",
            title: asStr(pr.title),
            subtitle: asStr(pr.subtitle),
            body: asStr(pr.body),
            hero_url: pr.hero_image_url,
            hero_file: null,
            productIds: relProducts[pid] || [],
            looks: relLooks[pid] || [],
          };
        }
        setPages(map);
      } catch (e: unknown) {
        // eslint-disable-next-line no-console
        console.error(e);
        setNotice("Não foi possível carregar os banners.");
        setRows([]);
        setPages({});
        setLoading(false);
      }
    },
    [hasPageSlugColumn]
  );

  useEffect(() => {
    if (allowed && city) loadRows(city);
  }, [allowed, city, loadRows]);

  const grouped = useMemo(() => {
    const by: Record<string, BannerRow[]> = {
      carousel: [],
      editorial_tall: [],
      selection_hero: [],
    };
    for (const r of rows) {
      if (!by[r.slot]) by[r.slot] = [];
      by[r.slot].push(r);
    }
    return by;
  }, [rows]);

  function nextSort(arr: BannerRow[]) {
    const nums = arr.map((x) => x.sort_order ?? 0);
    return nums.length ? Math.max(...nums) + 1 : 0;
  }

  async function addBanner(slot: Slot) {
    const payload: Partial<BannerRow> = {
      city,
      slot,
      sort_order: slot === "carousel" ? nextSort(grouped.carousel) : 0,
      image_url: "",
      href: "",
      title: "",
      subtitle_text: "",
      subtitle_lines: [],
      alt: "",
      is_active: true,
    };
    const { data, error } = await supabase
      .from("home_banners")
      .insert(payload)
      .select()
      .single();
    if (error) {
      setNotice(error.message);
      return;
    }
    setRows((prev) => [...prev, data as BannerRow]);
  }

  async function uploadPageHero(
    file: File,
    slug: string
  ): Promise<string | null> {
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const key = `pages/${slug}/hero-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("home_banners")
        .upload(key, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "image/jpeg",
        });
      if (error) throw error;
      const { data } = supabase.storage.from("home_banners").getPublicUrl(key);
      return data.publicUrl || null;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      setNotice("Falha ao enviar a imagem da página.");
      return null;
    }
  }

  function patchRow<K extends keyof BannerRow>(
    target: BannerRow,
    key: K,
    val: BannerRow[K]
  ) {
    setRows((prev) =>
      prev.map((x) => (x.id === target.id ? { ...x, [key]: val } : x))
    );
  }

  function patchPage<K extends keyof PageLocal>(
    bannerId: number,
    key: K,
    val: PageLocal[K]
  ) {
    setPages((prev) => {
      const curr = prev[bannerId];
      const base: PageLocal = curr ?? {
        id: null,
        bannerId,
        enabled: false,
        slug: "",
        layout: "text",
        title: "",
        subtitle: "",
        body: "",
        hero_url: null,
        hero_file: null,
        productIds: [],
        looks: [],
      };
      return { ...prev, [bannerId]: { ...base, [key]: val } };
    });
  }

  function moveRow(r: BannerRow, dir: -1 | 1) {
    const list = [...rows].filter(
      (x) => x.slot === r.slot && x.city === r.city
    );
    const sorted = list.sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
    const idx = sorted.findIndex((x) => x.id === r.id);
    const next = idx + dir;
    if (next < 0 || next >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[next];
    setRows((prev) =>
      prev.map((x) =>
        x.id === a.id
          ? { ...x, sort_order: b.sort_order }
          : x.id === b.id
          ? { ...x, sort_order: a.sort_order }
          : x
      )
    );
    supabase
      .from("home_banners")
      .update({ sort_order: b.sort_order })
      .eq("id", a.id);
    supabase
      .from("home_banners")
      .update({ sort_order: a.sort_order })
      .eq("id", b.id);
  }

  async function deleteRow(id: number) {
    const ok = confirm("Remover banner?");
    if (!ok) return;
    try {
      const pg = pages[id];
      if (pg?.slug && hasBannerPagesTable) {
        await supabase
          .from("banner_pages")
          .update({ is_active: false })
          .eq("slug", pg.slug);
      }
      if (hasPageSlugColumn) {
        await supabase
          .from("home_banners")
          .update({ page_slug: null })
          .eq("id", id);
      }
    } catch {}
    const { error } = await supabase.from("home_banners").delete().eq("id", id);
    if (error) {
      setNotice(error.message || "Falha ao remover.");
      return;
    }
    setRows((prev) => prev.filter((x) => x.id !== id));
    setPages((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
  }

  async function saveRow(row: BannerRow) {
    setSavingIds((s) => new Set(s).add(row.id));
    setNotice(null);

    try {
      const page = pages[row.id];

      if (page?.enabled && (!hasBannerPagesTable || !hasPageSlugColumn)) {
        setNotice(
          "Para ativar páginas, crie a coluna home_banners.page_slug e a tabela banner_pages. A UI já está pronta."
        );
        return;
      }

      if (page?.enabled) {
        const cleanSlug = slugify(
          page.slug || page.title || `banner-${row.id}`
        );

        const { data: existing, error: exErr } = await supabase
          .from("banner_pages")
          .select("id,slug")
          .eq("slug", cleanSlug)
          .maybeSingle();
        if (
          exErr &&
          (exErr as { code?: string }).code &&
          (exErr as { code?: string }).code !== "PGRST116"
        )
          throw exErr;

        let nextHero = page.hero_url || null;
        if (page.hero_file) {
          const url = await uploadPageHero(page.hero_file, cleanSlug);
          if (url) nextHero = url;
        }

        const prevSlug = asStr(row.page_slug);
        let currentPageId: number | null = null;
        if (prevSlug) {
          const { data: prevPg } = await supabase
            .from("banner_pages")
            .select("id")
            .eq("slug", prevSlug)
            .maybeSingle();
          currentPageId = (prevPg as { id: number } | null)?.id ?? null;
        }

        // Upsert principal
        let pageId: number | null = null;
        if (
          existing &&
          (existing as { id?: number }).id &&
          (!currentPageId || currentPageId === (existing as { id: number }).id)
        ) {
          const { error: upPgErr } = await supabase
            .from("banner_pages")
            .update({
              slug: cleanSlug,
              layout: page.layout,
              title: page.title || null,
              subtitle: page.subtitle || null,
              body: page.body || null,
              hero_image_url: nextHero,
              is_active: true,
            })
            .eq("id", (existing as { id: number }).id);
          if (upPgErr) throw upPgErr;
          pageId = (existing as { id: number }).id;
          patchPage(row.id, "id", (existing as { id: number }).id);
        } else if (currentPageId) {
          if (
            existing &&
            (existing as { id: number }).id &&
            (existing as { id: number }).id !== currentPageId
          )
            throw new Error("Já existe uma página com esse slug.");
          const { error: updErr } = await supabase
            .from("banner_pages")
            .update({
              slug: cleanSlug,
              layout: page.layout,
              title: page.title || null,
              subtitle: page.subtitle || null,
              body: page.body || null,
              hero_image_url: nextHero,
              is_active: true,
            })
            .eq("id", currentPageId);
          if (updErr) throw updErr;
          pageId = currentPageId;
          patchPage(row.id, "id", currentPageId);
        } else {
          const { data: created, error: insErr } = await supabase
            .from("banner_pages")
            .insert({
              slug: cleanSlug,
              layout: page.layout,
              title: page.title || null,
              subtitle: page.subtitle || null,
              body: page.body || null,
              hero_image_url: nextHero,
              is_active: true,
            })
            .select("id")
            .single();
          if (insErr) throw insErr;
          pageId = (created as { id: number } | null)?.id ?? null;
          patchPage(row.id, "id", pageId);
        }

        // Relações de produtos e looks
        if (pageId) {
          if (page.layout === "text_products") {
            const ids = page.productIds || [];
            await supabase
              .from("banner_page_products")
              .delete()
              .eq("page_id", pageId);
            if (ids.length) {
              const rowsIns = ids.map((pid, i) => ({
                page_id: pageId,
                product_id: pid,
                sort_order: i,
              }));
              const { error } = await supabase
                .from("banner_page_products")
                .insert(rowsIns);
              if (error) throw error;
            }
          } else if (page.layout === "text_looksets") {
            // limpa looks existentes
            const { data: oldLooksRaw } = await supabase
              .from("banner_page_looks")
              .select("id")
              .eq("page_id", pageId);
            const oldLooks = (oldLooksRaw ?? []) as Array<{ id: number }>;
            if (oldLooks.length) {
              const ids = oldLooks.map((l) => l.id);
              if (ids.length)
                await supabase
                  .from("banner_look_products")
                  .delete()
                  .in("look_id", ids);
              await supabase
                .from("banner_page_looks")
                .delete()
                .eq("page_id", pageId);
            }
            const looks = page.looks || [];
            for (let i = 0; i < looks.length && i < 5; i++) {
              const lk = looks[i];
              const { data: insLook, error: lErr } = await supabase
                .from("banner_page_looks")
                .insert({
                  page_id: pageId,
                  title: lk.title?.trim() || `Look ${i + 1}`,
                  sort_order: i,
                })
                .select("id")
                .single();
              if (lErr) throw lErr;
              const lId = (insLook as { id: number } | null)?.id ?? null;
              if (lId) {
                const prods = lk.productIds || [];
                if (prods.length) {
                  const rowsIns = prods.map((pid, j) => ({
                    look_id: lId,
                    product_id: pid,
                    sort_order: j,
                  }));
                  const { error } = await supabase
                    .from("banner_look_products")
                    .insert(rowsIns);
                  if (error) throw error;
                }
              }
            }
          } else {
            // layout "text": remove quaisquer relações antigas
            await supabase
              .from("banner_page_products")
              .delete()
              .eq("page_id", pageId);
            const { data: oldLooksRaw } = await supabase
              .from("banner_page_looks")
              .select("id")
              .eq("page_id", pageId);
            const oldLooks = (oldLooksRaw ?? []) as Array<{ id: number }>;
            if (oldLooks.length) {
              const ids = oldLooks.map((l) => l.id);
              if (ids.length)
                await supabase
                  .from("banner_look_products")
                  .delete()
                  .in("look_id", ids);
              await supabase
                .from("banner_page_looks")
                .delete()
                .eq("page_id", pageId);
            }
          }
        }

        const { error: upB } = await supabase
          .from("home_banners")
          .update({ page_slug: cleanSlug, href: "" })
          .eq("id", row.id);
        if (upB) throw upB;

        patchRow(row, "href", "");
        patchRow(row, "page_slug", cleanSlug);
        patchPage(row.id, "hero_url", nextHero);
        patchPage(row.id, "slug", cleanSlug);
      } else {
        const prevSlug = asStr(row.page_slug);
        if (prevSlug && hasBannerPagesTable) {
          await supabase
            .from("banner_pages")
            .update({ is_active: false })
            .eq("slug", prevSlug);
        }
        if (hasPageSlugColumn) {
          const { error: upB } = await supabase
            .from("home_banners")
            .update({ page_slug: null })
            .eq("id", row.id);
          if (upB) throw upB;
        }
        patchRow(row, "page_slug", null);
      }

      const { id, ...rest } = row;
      const payload = {
        ...rest,
        href: pages[row.id]?.enabled ? "" : asStr(rest.href),
        subtitle_lines: row.subtitle_lines ?? null,
      };
      const { error: saveErr } = await supabase
        .from("home_banners")
        .update(payload)
        .eq("id", id);
      if (saveErr) throw saveErr;
    } catch (e: unknown) {
      // eslint-disable-next-line no-console
      console.error(e);
      const msg = e instanceof Error ? e.message : "Falha ao salvar.";
      setNotice(msg);
    } finally {
      setSavingIds((s) => {
        const n = new Set(s);
        n.delete(row.id);
        return n;
      });
    }
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
                Banners (developer)
              </span>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-3xl px-8 py-16">
          <h1 className="text-xl font-semibold mb-2">Acesso restrito</h1>
          <p className="text-sm text-neutral-600">
            Você precisa estar na whitelist de developers.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      <header className="w-full border-b border-[#E5E0DA]/80 bg-[#F7F4EF]/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/developer")}
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
                Gerenciar Home (Banners)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {userEmail ? (
              <span className="hidden sm:inline px-3 py-1 rounded-full bg-white/70 border border-neutral-200 text-[11px] text-neutral-700">
                {userEmail}
              </span>
            ) : null}
            <button
              onClick={async () => {
                await supabase.auth.signOut({ scope: "local" });
                router.replace("/");
              }}
              className="h-9 rounded-full px-4 text-xs font-medium text-neutral-700 hover:text-black transition border border-neutral-300/70 bg-white/70"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-8 pt-10">
        <h1 className="text-[30px] font-semibold text-black tracking-tight">
          Banners por cidade
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Edite carrossel, editorial tall e selection hero. A seção de Página do
          banner está sempre visível.
        </p>
        {notice && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {notice}
          </p>
        )}
      </div>

      <div className="mx-auto max-w-6xl px-8 mt-6 flex flex-wrap items-center gap-3">
        <div className="relative">
          <button
            ref={cityBtnRef}
            onClick={() => setDropdownOpen((v) => !v)}
            className="h-10 inline-flex items-center gap-2 rounded-full bg-white/80 border border-neutral-200/80 px-4 text-sm text-neutral-900 shadow-sm hover:bg-white"
          >
            {city || "Selecionar cidade"}{" "}
            <span className="text-[11px] opacity-60">▼</span>
          </button>
          {dropdownOpen ? (
            <div className="absolute z-50 mt-2 min-w-[220px] rounded-2xl bg-white/95 border border-neutral-200/80 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.25)] backdrop-blur-sm overflow-hidden">
              {[...new Set([city, ...cities])].map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCity(c);
                    setDropdownOpen(false);
                  }}
                  className={cx(
                    "w-full text-left px-4 py-2 text-sm",
                    c === city
                      ? "bg-black text-white"
                      : "text-neutral-700 hover:bg-neutral-50"
                  )}
                >
                  {c}
                </button>
              ))}
              <div className="border-t border-neutral-200/70" />
              <button
                onClick={() => {
                  const name = prompt("Nova cidade:");
                  if (!name) return;
                  if (!cities.includes(name))
                    setCities((prev) => [...prev, name]);
                  setCity(name);
                  setDropdownOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
              >
                + Adicionar cidade
              </button>
            </div>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <PillButton onClick={() => addBanner("carousel")}>
            Novo carousel
          </PillButton>
          <PillButton onClick={() => addBanner("editorial_tall")}>
            Novo editorial
          </PillButton>
          <PillButton onClick={() => addBanner("selection_hero")}>
            Novo selection
          </PillButton>
          <PillButton onClick={() => loadRows(city)}>Recarregar</PillButton>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-8 pb-24 mt-6 grid grid-cols-1 gap-8">
        {SLOTS.map((slot) => (
          <Card key={slot}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-[20px] font-semibold text-black">
                  {slot === "carousel"
                    ? "Carousel"
                    : slot === "editorial_tall"
                    ? "Editorial Tall"
                    : "Selection Hero"}
                </h2>
                <p className="text-sm text-neutral-600 mt-1">
                  {slot === "carousel"
                    ? "A ordem define a sequência do carrossel."
                    : "Apenas um ativo por cidade é recomendado."}
                </p>
              </div>
              <PillButton onClick={() => addBanner(slot)}>Adicionar</PillButton>
            </div>

            {loading ? (
              <div className="mt-6 text-sm text-neutral-500">Carregando…</div>
            ) : grouped[slot]?.length ? (
              <div className="mt-6 space-y-6">
                {grouped[slot]
                  .slice()
                  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                  .map((r) => {
                    const pg = pages[r.id];

                    return (
                      <div
                        key={r.id}
                        className="rounded-2xl border border-neutral-200/80 bg-white/60 p-4"
                      >
                        <div className="grid grid-cols-12 gap-4">
                          <div className="col-span-12 md:col-span-3 lg:col-span-2">
                            <div className="relative w-full max-w-[220px] aspect-[3/2] rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200/70">
                              {asStr(r.image_url) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={asStr(r.image_url)}
                                  alt={asStr(r.alt)}
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                              ) : null}
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              <Field
                                label="Sort"
                                type="number"
                                value={String(r.sort_order ?? 0)}
                                onChange={(v) =>
                                  patchRow(r, "sort_order", Number(v))
                                }
                              />
                              <button
                                className="col-span-1 h-10 mt-5 rounded-full border border-neutral-300/70 bg-white/70 text-sm"
                                onClick={() => moveRow(r, -1)}
                                title="Subir"
                              >
                                ↑
                              </button>
                              <button
                                className="col-span-1 h-10 mt-5 rounded-full border border-neutral-300/70 bg-white/70 text-sm"
                                onClick={() => moveRow(r, 1)}
                                title="Descer"
                              >
                                ↓
                              </button>
                            </div>
                            <div className="mt-3">
                              <Toggle
                                checked={!!r.is_active}
                                onChange={(v) => patchRow(r, "is_active", v)}
                              />
                            </div>
                          </div>

                          <div className="col-span-12 md:col-span-9 lg:col-span-10">
                            <div className="grid grid-cols-12 gap-4">
                              <div className="col-span-12 lg:col-span-6">
                                <Field
                                  label="Image URL"
                                  value={asStr(r.image_url)}
                                  onChange={(v) => patchRow(r, "image_url", v)}
                                  placeholder="https://SUPABASE_URL/storage/v1/object/public/home_banners/…"
                                />
                              </div>
                              <div className="col-span-12 lg:col-span-6">
                                <Field
                                  label="Href"
                                  value={asStr(r.href)}
                                  onChange={(v) => patchRow(r, "href", v)}
                                  placeholder="https://wearalook.com/editorial/…"
                                  disabled={!!pg?.enabled}
                                />
                              </div>
                              <div className="col-span-12 md:col-span-6">
                                <Field
                                  label="Título"
                                  value={asStr(r.title)}
                                  onChange={(v) => patchRow(r, "title", v)}
                                />
                              </div>
                              <div className="col-span-12 md:col-span-6">
                                <Field
                                  label="Subtítulo simples"
                                  value={asStr(r.subtitle_text)}
                                  onChange={(v) =>
                                    patchRow(r, "subtitle_text", v)
                                  }
                                  placeholder="Ex.: Entregas em até 90 min"
                                />
                              </div>

                              <div className="col-span-12">
                                <Field
                                  label="Subtítulo por linhas 1 por linha"
                                  value={asArr(r.subtitle_lines).join("\n")}
                                  onChange={(v) =>
                                    patchRow(
                                      r,
                                      "subtitle_lines",
                                      v
                                        .split("\n")
                                        .map((s) => s.trim())
                                        .filter(Boolean)
                                    )
                                  }
                                  textarea
                                  placeholder={"linha 1\nlinha 2\nlinha 3"}
                                />
                              </div>

                              <div className="col-span-12 md:col-span-8">
                                <Field
                                  label="Alt"
                                  value={asStr(r.alt)}
                                  onChange={(v) => patchRow(r, "alt", v)}
                                />
                              </div>

                              <div className="col-span-12 md:col-span-4 flex items-end justify-end gap-2">
                                <PillButton
                                  onClick={() => saveRow(r)}
                                  tone="primary"
                                  disabled={savingIds.has(r.id)}
                                >
                                  {savingIds.has(r.id) ? "Salvando…" : "Salvar"}
                                </PillButton>
                                <PillButton
                                  onClick={() => deleteRow(r.id)}
                                  tone="danger"
                                >
                                  Remover
                                </PillButton>
                              </div>
                            </div>

                            {/* Página do banner sempre visível */}
                            <div className="mt-6 rounded-2xl border border-neutral-200 bg-white/60">
                              <div className="p-4 flex items-center justify-between">
                                <div className="font-medium">
                                  Página do banner
                                </div>
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={!!pg?.enabled}
                                    onChange={(e) => {
                                      const enabled = e.target.checked;
                                      setPages((prev) => {
                                        const curr = prev[r.id];
                                        if (curr)
                                          return {
                                            ...prev,
                                            [r.id]: { ...curr, enabled },
                                          };
                                        const defaultTitle =
                                          asStr(r.title).trim() ||
                                          "Novo editorial";
                                        const defaultSlug = slugify(
                                          asStr(r.page_slug) ||
                                            defaultTitle ||
                                            `banner-${r.id}`
                                        );
                                        return {
                                          ...prev,
                                          [r.id]: {
                                            id: null,
                                            bannerId: r.id,
                                            enabled,
                                            slug: defaultSlug,
                                            layout: "text",
                                            title: defaultTitle,
                                            subtitle: "",
                                            body: "",
                                            hero_url: null,
                                            hero_file: null,
                                            productIds: [],
                                            looks: [],
                                          },
                                        };
                                      });
                                      if (enabled) patchRow(r, "href", "");
                                    }}
                                  />
                                  Ativar página
                                </label>
                              </div>

                              {(!hasBannerPagesTable || !hasPageSlugColumn) && (
                                <div className="px-4">
                                  <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2">
                                    Para salvar esta página, habilite no banco a
                                    coluna page_slug em home_banners e a tabela
                                    banner_pages.
                                  </div>
                                </div>
                              )}

                              {pg?.enabled && (
                                <div className="p-4 border-t border-neutral-200 space-y-5">
                                  <div className="grid md:grid-cols-2 gap-4">
                                    <Field
                                      label="Slug da página"
                                      value={pg.slug}
                                      onChange={(v) =>
                                        patchPage(
                                          r.id,
                                          "slug",
                                          slugify(v || pg.title || "")
                                        )
                                      }
                                      placeholder="ex.: novidades-da-semana"
                                    />
                                    <div>
                                      <div className="text-[11px] text-neutral-600 mb-1">
                                        Layout
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {LAYOUTS.map((opt) => (
                                          <PillButton
                                            key={opt.key}
                                            active={pg.layout === opt.key}
                                            onClick={() =>
                                              patchPage(r.id, "layout", opt.key)
                                            }
                                          >
                                            {opt.title}
                                          </PillButton>
                                        ))}
                                      </div>
                                      <div className="text-[11px] text-neutral-500 mt-1">
                                        {
                                          LAYOUTS.find(
                                            (l) => l.key === pg.layout
                                          )?.hint
                                        }
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid md:grid-cols-2 gap-4">
                                    <Field
                                      label="Título da página"
                                      value={pg.title}
                                      onChange={(v) => {
                                        patchPage(r.id, "title", v);
                                        if (!pg.slug?.trim())
                                          patchPage(r.id, "slug", slugify(v));
                                      }}
                                      placeholder="Ex.: SS/26 Editorial"
                                    />
                                    <Field
                                      label="Subtítulo opcional"
                                      value={pg.subtitle}
                                      onChange={(v) =>
                                        patchPage(r.id, "subtitle", v)
                                      }
                                      placeholder="Uma linha de apoio"
                                    />
                                  </div>

                                  <Field
                                    label="Texto Markdown simples"
                                    value={pg.body}
                                    onChange={(v) => patchPage(r.id, "body", v)}
                                    placeholder="Conteúdo introdutório…"
                                    textarea
                                  />

                                  <div>
                                    <div className="text-[11px] text-neutral-600 mb-1">
                                      Banner hero da página 16:9 recomendado
                                    </div>
                                    {pg.hero_url ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={pg.hero_url}
                                        alt="hero"
                                        className="w-full rounded-xl border border-neutral-200 mb-2"
                                        style={{
                                          aspectRatio: "16/9",
                                          objectFit: "cover",
                                        }}
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
                                        patchPage(
                                          r.id,
                                          "hero_file",
                                          e.target.files?.[0] || null
                                        )
                                      }
                                      className="block text-sm"
                                    />
                                  </div>

                                  {/* Curadoria por layout */}
                                  {pg.layout === "text_products" && (
                                    <div className="pt-2">
                                      <div className="text-[12px] font-medium text-neutral-700 mb-1.5">
                                        Peças selecionadas
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() =>
                                            setPickerOpen({
                                              bannerId: r.id,
                                              kind: "collection",
                                            })
                                          }
                                          className="h-10 px-4 rounded-full border border-neutral-300 hover:bg-neutral-50 text-sm"
                                        >
                                          Selecionar peças
                                        </button>
                                        <div className="text-[11px] text-neutral-500">
                                          {pg.productIds?.length || 0} peça(s)
                                          selecionadas
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {pg.layout === "text_looksets" && (
                                    <div className="pt-2 space-y-3">
                                      <div className="text-[12px] font-medium text-neutral-700">
                                        Looks por ocasião até 5
                                      </div>
                                      {(pg.looks || []).map((lk, idx) => (
                                        <div
                                          key={idx}
                                          className="rounded-xl border border-neutral-200 p-3 bg-white/70"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="text-sm font-medium">
                                              Ocasião #{idx + 1}
                                            </div>
                                            <button
                                              onClick={() => {
                                                const next = (
                                                  pg.looks || []
                                                ).filter((_, j) => j !== idx);
                                                patchPage(r.id, "looks", next);
                                              }}
                                              className="text-xs px-2 py-1 rounded-full border border-neutral-300 hover:bg-neutral-50"
                                            >
                                              Remover
                                            </button>
                                          </div>
                                          <div className="mt-2 grid md:grid-cols-2 gap-3">
                                            <div>
                                              <div className="text-[11px] text-neutral-600 mb-1">
                                                Subtítulo da ocasião
                                              </div>
                                              <input
                                                className="w-full rounded-xl border border-neutral-300 h-10 px-3 text-sm"
                                                value={lk.title}
                                                onChange={(e) => {
                                                  const next = [
                                                    ...(pg.looks || []),
                                                  ];
                                                  next[idx] = {
                                                    ...next[idx],
                                                    title: e.target.value,
                                                  };
                                                  patchPage(
                                                    r.id,
                                                    "looks",
                                                    next
                                                  );
                                                }}
                                                placeholder="Ex.: Red carpet"
                                              />
                                            </div>
                                            <div className="flex items-end">
                                              <button
                                                onClick={() =>
                                                  setPickerOpen({
                                                    bannerId: r.id,
                                                    kind: "look",
                                                    lookIndex: idx,
                                                  })
                                                }
                                                className="h-10 px-4 rounded-full border border-neutral-300 hover:bg-neutral-50 text-sm"
                                              >
                                                Selecionar peças do look
                                              </button>
                                            </div>
                                          </div>
                                          <div className="text-[11px] text-neutral-500 mt-2">
                                            {(lk.productIds || []).length}{" "}
                                            peça(s) nesse look
                                          </div>
                                        </div>
                                      ))}
                                      {((pg.looks || []).length || 0) < 5 && (
                                        <button
                                          onClick={() => {
                                            const next = [...(pg.looks || [])];
                                            next.push({
                                              title: "",
                                              productIds: [],
                                            });
                                            patchPage(r.id, "looks", next);
                                          }}
                                          className="h-10 px-4 rounded-full border border-neutral-300 hover:bg-neutral-50 text-sm"
                                        >
                                          Adicionar look
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  <div className="text-[11px] text-neutral-600">
                                    Ao salvar, criamos ou atualizamos
                                    banner_pages, gravamos o slug em
                                    home_banners.page_slug, limpamos href e
                                    persistimos a curadoria quando aplicável.
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {hasBannerPagesTable && hasPageSlugColumn && (
                          <div className="mt-4 text-[11px] text-neutral-500">
                            {pages[r.id]?.enabled ? (
                              <>
                                Página ativa em:{" "}
                                <code>/p/{pages[r.id].slug}</code>
                              </>
                            ) : (
                              <>Sem página ativa</>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="mt-6 text-sm text-neutral-500">
                Nenhum banner neste slot. Adicione acima.
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Modal único para todas as páginas */}
      <ProductPickerModal
        open={!!pickerOpen}
        onClose={() => setPickerOpen(null)}
        selected={(() => {
          if (!pickerOpen) return [];
          const pg = pages[pickerOpen.bannerId];
          if (!pg) return [];
          if (pickerOpen.kind === "collection") return pg.productIds || [];
          if (pickerOpen.kind === "look") {
            const idx = pickerOpen.lookIndex ?? 0;
            return pg.looks?.[idx]?.productIds || [];
          }
          return [];
        })()}
        onChange={(ids) => {
          if (!pickerOpen) return;
          const { bannerId, kind, lookIndex } = pickerOpen;
          const pg = pages[bannerId];
          if (!pg) return;
          if (kind === "collection") {
            patchPage(bannerId, "productIds", ids);
          } else {
            const next = [...(pg.looks || [])];
            const idx = lookIndex ?? 0;
            const base = next[idx] || { title: "", productIds: [] };
            next[idx] = { ...base, productIds: ids };
            patchPage(bannerId, "looks", next);
          }
        }}
      />
    </main>
  );
}
