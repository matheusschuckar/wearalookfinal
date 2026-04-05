"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import ProductCard from "../components/ProductCard";
import FiltersModal from "../components/FiltersModal";
import ChipsRow from "../components/ChipsRow";
import { BannersCarousel, type Banner } from "../components/BannersCarousel";
import {
  EditorialTallBanner,
  SelectionHeroBanner,
} from "../components/HomeBanners";

import HeaderBar from "../components/HeaderBar";
import AppDrawer from "../components/AppDrawer";
import type { Product, Profile } from "@/lib/data/types";

import {
  getPrefs,
  getPrefsV2,
  bumpCategory,
  bumpStore,
  bumpGender,
  bumpSize,
  bumpPriceBucket,
  bumpEtaBucket,
  bumpProduct,
  decayAll,
} from "@/lib/prefs";
import { getViewsMap } from "@/lib/metrics";
import {
  hasAddressBasics,
  hasContact,
  inCoverage,
  intersects,
  categoriesOf,
  priceBucket,
  etaBucket,
} from "@/lib/ui/helpers";
import { useInfiniteProducts } from "@/hooks/useInfiniteProducts";
import { dedupeProducts } from "@/lib/data/dedupe";

// CHANGED: sem `any`, retornos estritos
function normalizeGender(g: unknown): "" | "male" | "female" | "unisex" {
  const normOne = (s: string): "" | "male" | "female" | "unisex" => {
    const v = s.trim().toLowerCase();
    if (!v) return "";
    if (v === "unisex") return "unisex";
    if (v === "male" || v === "masculino") return "male";
    if (v === "female" || v === "feminino") return "female";
    return "";
  };

  if (Array.isArray(g)) {
    if (!g.length) return "";
    const lower = g.map((x) => String(x).toLowerCase());
    const hasMale = lower.includes("male") || lower.includes("masculino");
    const hasFemale = lower.includes("female") || lower.includes("feminino");
    if (hasMale && hasFemale) return "unisex";
    if (hasMale) return "male";
    if (hasFemale) return "female";
    return normOne(String(lower[0] ?? ""));
  }

  if (typeof g === "string") return normOne(g);
  return "";
}

type KeyStat = { w: number; t: number };

// ruído determinístico por produto + seed da sessão
function noiseFor(id: number, seed: number) {
  let x = (id ^ seed) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5; // xorshift32
  return (x >>> 0) / 4294967295; // 0..1
}

// NEW: banners por cidade
type BannerRow = {
  id: number;
  city: string;
  slot: "carousel" | "editorial_tall" | "selection_hero";
  sort_order: number | null;
  image_url: string;
  href: string | null;
  title: string | null;
  subtitle_text: string | null;
  subtitle_lines: string[] | null;
  alt: string | null;
  page_slug?: string | null; // pode não existir na instância
  is_active?: boolean | null; // precisa estar true para exibir
};

// util: remover acentos para comparar "Sao Paulo" ~ "São Paulo"
function stripAccents(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// converte row → Banner do web
function mapRowToBanner(row: BannerRow): Banner {
  return {
    title: row.title ?? "",
    subtitle: row.subtitle_text ?? row.subtitle_lines ?? undefined,
    image: row.image_url,
    href: row.href ?? undefined,
    pageSlug: row.page_slug ?? undefined,
    alt: row.alt ?? row.title ?? undefined,
  };
}

// match de cidade: aceita globais e tolera acentos/prefixo
function matchesCity(rowCity: string | null | undefined, wanted: string) {
  const isGlobal = (c: string | null | undefined) => {
    if (!c) return false;
    const v = c.trim().toLowerCase();
    return v === "all" || v === "global" || v === "*" || v === "geral";
  };

  if (isGlobal(rowCity)) return true;
  if (!rowCity) return false;

  const wantedLC = wanted.trim().toLowerCase();
  const wantedNo = stripAccents(wantedLC);
  const lc = rowCity.toLowerCase();
  const no = stripAccents(lc);

  return (
    lc.startsWith(wantedLC) ||
    lc.includes(wantedLC) ||
    no.startsWith(wantedNo) ||
    no.includes(wantedNo)
  );
}

// select estrito: exibe SOMENTE se is_active === true e imagem válida
async function selectHomeBanners(params: {
  city: string;
  slot: BannerRow["slot"];
  limit?: number;
  orderBySort?: boolean;
}): Promise<Banner[]> {
  const { city, slot, limit, orderBySort = true } = params;

  const baseFields = [
    "id",
    "city",
    "slot",
    "sort_order",
    "image_url",
    "href",
    "title",
    "subtitle_text",
    "subtitle_lines",
    "alt",
  ];

  // tentamos trazer page_slug + is_active; se page_slug não existir, rebaixa, mas
  // se is_active não existir, NÃO renderizamos nada (regra: só aparece se ativo).
  const fetchWith = async (fields: string[]) => {
    let q = supabase.from("home_banners").select(fields.join(",")).eq("slot", slot);
    if (orderBySort) q = q.order("sort_order", { ascending: true });
    if (typeof limit === "number") q = q.limit(limit);
    return q;
  };

  // 1) tentar com page_slug + is_active
  {
    const fields = [...baseFields, "page_slug", "is_active"];
    const { data, error } = await fetchWith(fields);
    if (!error && data) {
      const rows = data as unknown as BannerRow[];
      const filtered = rows.filter(
        (r) =>
          r.is_active === true &&
          typeof r.image_url === "string" &&
          r.image_url.trim().length > 0 &&
          matchesCity(r.city, city)
      );
      return filtered.map(mapRowToBanner);
    }
    if (error) {
      const msg = String(error.message || "").toLowerCase();
      // se is_active não existe, não mostramos banners (não dá para validar ativo)
      if (msg.includes("is_active")) return [];
      // se page_slug não existe, rebaixa e tenta sem ela
      if (msg.includes("page_slug")) {
        const fields2 = [...baseFields, "is_active"];
        const { data: d2, error: e2 } = await fetchWith(fields2);
        if (!e2 && d2) {
          const rows2 = d2 as unknown as BannerRow[];
          const filtered2 = rows2.filter(
            (r) =>
              r.is_active === true &&
              typeof r.image_url === "string" &&
              r.image_url.trim().length > 0 &&
              matchesCity(r.city, city)
          );
          return filtered2.map(mapRowToBanner);
        }
        if (e2) {
          const m2 = String(e2.message || "").toLowerCase();
          // novamente, sem is_active não renderiza nada
          if (m2.includes("is_active")) return [];
          // erro genérico: não mostra nada
          return [];
        }
      }
      // erro genérico: não mostra nada
      return [];
    }
  }
  // fallback defensivo (não deve chegar aqui)
  return [];
}

// util para extrair "São Paulo" de "São Paulo, SP"
function extractCity(label: string): string {
  const i = label.indexOf(",");
  const c = (i >= 0 ? label.slice(0, i) : label).trim();
  return c || "São Paulo";
}

export default function Home() {
  const router = useRouter();

  // seed do ranking
  const [rankSeed] = useState(() => Math.floor(Math.random() * 1e9));

  // carregamento e erros gerais da tela
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // perfil do usuário
  const [profile, setProfile] = useState<Profile | null>(null);

  // cidade atual (rótulo)
  const [cityLabel, setCityLabel] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("home.lastCityLabel");
      if (saved && saved.trim()) return saved;
    }
    return "São Paulo, SP";
  });

  // estados de banners (somente ativos)
  const [carouselBanners, setCarouselBanners] = useState<Banner[] | null>(null);
  const [editorialTallBanner, setEditorialTallBanner] = useState<Banner | null>(
    null
  );
  const [selectionHeroBanner, setSelectionHeroBanner] = useState<Banner | null>(
    null
  );

  // métricas locais de views
  const [views, setViews] = useState<Record<string, number>>({});

  // busca local
  const [query, setQuery] = useState("");

  // drawer e filtros
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // sentinel para o IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // cidade efetiva vinda do perfil (estrita)
  const effectiveCity: string | null =
    profile?.city && profile.city.trim() ? profile.city.trim() : null;

  // NEW: fallback para produtos — usa cidade do perfil OU a cidade do rótulo (São Paulo ex. anônimo)
  const currentCity = effectiveCity ?? extractCity(cityLabel); // NEW

  // CHANGED: passa currentCity para carregar produtos mesmo sem login
  const {
    items: infiniteItems,
    hasMore,
    loading: loadingMore,
    error: loadMoreError,
    loadMore,
  } = useInfiniteProducts({ city: currentCity }); // CHANGED

  // observa mudanças de views entre abas
  useEffect(() => {
    setViews(getViewsMap());
    function onStorage(e: StorageEvent) {
      if (e.key === "look.metrics.v1.views" && e.newValue) {
        try {
          setViews(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === "home.lastCityLabel" && e.newValue) {
        setCityLabel(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // bloqueia scroll quando drawer ou modal estiverem abertos
  useEffect(() => {
    const anyOverlay = drawerOpen || filterOpen;
    const prev = document.documentElement.style.overflow;
    if (anyOverlay) document.documentElement.style.overflow = "hidden";
    else document.documentElement.style.overflow = prev || "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [drawerOpen, filterOpen]);

  // auth, perfil e cidade inicial
  useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();

        if (!u.user) {
          // SEM LOGIN: força São Paulo
          setProfile(null);
          setCityLabel("São Paulo, SP");
          if (typeof window !== "undefined") {
            localStorage.setItem("home.lastCityLabel", "São Paulo, SP");
          }
        } else {
          let profResp = await supabase
            .from("user_profiles")
            .select(
              "id,name,whatsapp,street,number,complement,city,state,cep,status"
            )
            .eq("id", u.user.id)
            .single();

          if (profResp.error && /state/i.test(String(profResp.error.message))) {
            profResp = await supabase
              .from("user_profiles")
              .select("id,name,whatsapp,street,number,complement,city,cep,status")
              .eq("id", u.user.id)
              .single();
            if (profResp.data)
              (profResp.data as { state?: string | null }).state = null;
          }
          if (profResp.error) throw profResp.error;

          const prof = profResp.data as Profile;
          setProfile(prof);

          const lbl = prof.city
            ? `${prof.city}${prof.state ? `, ${prof.state}` : ""}`
            : cityLabel;
          setCityLabel(lbl);
          if (typeof window !== "undefined") {
            localStorage.setItem("home.lastCityLabel", lbl);
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "";
        console.error("[Home] load error:", msg);
        setErr(msg || "Erro inesperado");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NEW: reage a login/logout para atualizar cidade automaticamente
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        try {
          const { data: u } = await supabase.auth.getUser();
          if (u.user) {
            let profResp = await supabase
              .from("user_profiles")
              .select("id,name,whatsapp,street,number,complement,city,state,cep,status")
              .eq("id", u.user.id)
              .single();

            if (profResp.error && /state/i.test(String(profResp.error.message))) {
              profResp = await supabase
                .from("user_profiles")
                .select("id,name,whatsapp,street,number,complement,city,cep,status")
                .eq("id", u.user.id)
                .single();
              if (profResp.data)
                (profResp.data as { state?: string | null }).state = null;
            }

            if (!profResp.error && profResp.data) {
              const prof = profResp.data as Profile;
              setProfile(prof);
              const lbl = prof.city
                ? `${prof.city}${prof.state ? `, ${prof.state}` : ""}`
                : "São Paulo, SP";
              setCityLabel(lbl);
              if (typeof window !== "undefined") {
                localStorage.setItem("home.lastCityLabel", lbl);
              }
            }
          }
        } catch {}
      }
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setCityLabel("São Paulo, SP");
        if (typeof window !== "undefined") {
          localStorage.setItem("home.lastCityLabel", "São Paulo, SP");
        }
      }
    });
    return () => {
      try {
        sub.subscription?.unsubscribe?.();
      } catch {}
    };
  }, []);

  // busca banners (apenas ativos) quando a cidade muda
  useEffect(() => {
    const city = extractCity(cityLabel);
    let cancelled = false;

    async function loadBanners() {
      try {
        const [car, ed, sel] = await Promise.all([
          selectHomeBanners({ city, slot: "carousel", orderBySort: true }),
          selectHomeBanners({
            city,
            slot: "editorial_tall",
            limit: 1,
            orderBySort: false,
          }),
          selectHomeBanners({
            city,
            slot: "selection_hero",
            limit: 1,
            orderBySort: false,
          }),
        ]);

        if (cancelled) return;

        setCarouselBanners(car.length ? car : []);
        setEditorialTallBanner(ed[0] ?? null);
        setSelectionHeroBanner(sel[0] ?? null);

        if (typeof window !== "undefined") {
          localStorage.setItem("home.lastCityLabel", cityLabel);
        }
      } catch {
        if (cancelled) return;
        // mantém o que já estava na tela; não força fallback
      }
    }

    loadBanners();

    return () => {
      cancelled = true;
    };
  }, [cityLabel]);

  // categorias dinâmicas com base no infinito
  const dynamicCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of infiniteItems) categoriesOf(p).forEach((c) => set.add(c));
    return Array.from(set).sort();
  }, [infiniteItems]);

  const allCategories = dynamicCategories;
  const [chipCategory, setChipCategory] = useState<string>("Tudo");
  const [activeTab, setActiveTab] = useState<
    "genero" | "tamanho" | "categorias"
  >("genero");
  const [selectedGenders, setSelectedGenders] = useState<
    Set<"male" | "female">
  >(new Set());
  const [selectedSizes, setSelectedSizes] = useState<
    Set<"PP" | "P" | "M" | "G" | "GG">
  >(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set()
  );

  const clearFilters = () => {
    setSelectedGenders(new Set());
    setSelectedSizes(new Set());
    setSelectedCategories(new Set());
    setChipCategory("Tudo");
  };

  const anyActiveFilter =
    selectedGenders.size > 0 ||
    selectedSizes.size > 0 ||
    selectedCategories.size > 0 ||
    chipCategory !== "Tudo";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const afterFilters = infiniteItems.filter((p) => {
      if (q) {
        const cats = categoriesOf(p);
        const matchText =
          p.name.toLowerCase().includes(q) ||
          p.store_name.toLowerCase().includes(q) ||
          cats.some((c) => c.includes(q));
        if (!matchText) return false;
      }

      const cats = categoriesOf(p);

      if (selectedCategories.size > 0) {
        const hit = cats.some((c) => selectedCategories.has(c));
        if (!hit) return false;
      } else if (chipCategory !== "Tudo") {
        if (!cats.includes(chipCategory.toLowerCase())) return false;
      }

      if (selectedGenders.size > 0) {
        const pg = normalizeGender(p.gender);
        if (!pg || !selectedGenders.has(pg as "male" | "female")) return false;
      }

      if (selectedSizes.size > 0) {
        const raw = Array.isArray(p.sizes)
          ? (p.sizes as string[]).join(",")
          : p.sizes ?? "";
        const list = String(raw)
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean) as Array<"PP" | "P" | "M" | "G" | "GG">;
        if (!list.length || !intersects(selectedSizes, list)) return false;
      }

      return true;
    });

    return dedupeProducts(afterFilters, { preferCheapest: true });
  }, [
    infiniteItems,
    query,
    chipCategory,
    selectedCategories,
    selectedGenders,
    selectedSizes,
  ]);

  // ranking multi sinal
  const EPSILON = 0.08;
  const JITTER = 0.08;
  const HF_DAYS = 14;

  useEffect(() => {
    try {
      decayAll(HF_DAYS);
    } catch {}
  }, []);

  const W = {
    CAT: 1.0,
    STORE: 0.65,
    GENDER: 0.45,
    SIZE: 0.35,
    PRICE: 0.3,
    ETA: 0.25,
    PRODUCT: 0.2,
    TREND: 0.15,
  } as const;

  const filteredRanked = useMemo<Product[]>(() => {
    const p2 = getPrefsV2();
    const p1 = getPrefs();

    function norm(map: Record<string, KeyStat> | Record<string, number>) {
      const vals = Object.values(map).map((v) =>
        typeof v === "number" ? v : (v as KeyStat).w ?? 0
      );
      const max = vals.length ? Math.max(1, ...vals) : 1;
      return { map, max };
    }

    const nCat = norm(p2.cat);
    const nStore = norm(p2.store);
    const nGender = norm(p2.gender);
    const nPrice = norm(p2.price);
    const nEta = norm(p2.eta);
    const nProd = norm(p2.product);

    const localViews = views || {};
    const trendingMax = Object.values(localViews).length
      ? Math.max(1, ...Object.values(localViews))
      : 1;

    const explore = Math.random() < EPSILON;

    const scored = filtered.map((p) => {
      const cats = categoriesOf(p);
      const mainCat =
        cats[0] || (p as unknown as { category?: string }).category || "";
      const etaDict = p as unknown as {
        eta_text_runtime?: string | null;
        eta_text?: string | null;
      };
      const etaTxt = etaDict.eta_text_runtime ?? etaDict.eta_text ?? null;
      const storeKey = (p.store_name || "").toLowerCase();
      const genderKey = normalizeGender(p.gender);
      const priceKey = priceBucket(p.price_tag);
      const etaKey = etaBucket(etaTxt);
      const prodKey = String(p.id);

      const fromMap = (
        nm: ReturnType<typeof norm>,
        key: string,
        alsoV1?: Record<string, number>
      ) => {
        const k = (key || "").toLowerCase();
        const v2 = (nm.map as Record<string, number | KeyStat>)[k];
        const raw = typeof v2 === "number" ? v2 : (v2?.w ?? 0);
        const legacy = alsoV1 ? alsoV1[k] || 0 : 0;
        const v = Math.max(raw, legacy);
        return v / Math.max(1, nm.max);
      };

      const fCat = fromMap(nCat, mainCat, p1.cat);
      const fStore = fromMap(nStore, storeKey, p1.store);
      const fGender = fromMap(nGender, genderKey);
      const fSize = 0;
      const fPrice = fromMap(nPrice, priceKey);
      const fEta = fromMap(nEta, etaKey);
      const fProd = fromMap(nProd, prodKey);

      const local = (localViews[String(p.id)] || 0) / trendingMax;
      const remote = typeof p.view_count === "number" ? p.view_count : 0;
      const trend = Math.max(local, remote > 0 ? Math.min(remote / 50, 1) : 0);

      const noise = noiseFor(p.id, rankSeed) * JITTER;
      const weightTrend = explore ? W.TREND * 2.2 : W.TREND;

      const score =
        W.CAT * fCat +
        W.STORE * fStore +
        W.GENDER * fGender +
        W.SIZE * fSize +
        W.PRICE * fPrice +
        W.ETA * fEta +
        W.PRODUCT * fProd +
        weightTrend * trend +
        noise;

      return { p, score };
    });

    scored.sort((a, b) => b.score - a.score);

    if (explore && scored.length > 8) {
      const injected = [...scored];
      for (let k = 0; k < Math.min(6, Math.floor(scored.length / 8)); k++) {
        const idx =
          4 + Math.floor(Math.random() * Math.min(24, injected.length - 5));
        const [item] = injected.splice(idx, 1);
        injected.splice(2 * k + 1, 0, item);
      }
      return injected.map((x) => x.p);
    }

    return scored.map((x) => x.p);
  }, [filtered, views, rankSeed]);

  // exibe sempre o rótulo atual (editável no /profile)
  const locationLabel = cityLabel;

  async function handleLogout() {
    try {
      setDrawerOpen(false);
      await supabase.auth.signOut();
      setProfile(null);
      // APÓS LOGOUT: força São Paulo imediatamente e persiste no localStorage
      setCityLabel("São Paulo, SP");
      if (typeof window !== "undefined") {
        localStorage.setItem("home.lastCityLabel", "São Paulo, SP");
      }
    } finally {
      router.replace("/");
    }
  }

  function recordInteraction(p: Product) {
    try {
      const cats = categoriesOf(p);
      const mainCat = cats[0] || "";
      if (mainCat) bumpCategory(mainCat, 1.2);
      bumpStore(p.store_name || "", 1);
      const g = normalizeGender(p.gender);
      if (g) bumpGender(g, 0.8);
      bumpPriceBucket(priceBucket(p.price_tag), 0.6);
      const etaInfo = p as unknown as {
        eta_text_runtime?: string | null;
        eta_text?: string | null;
      };
      const etaTxt = etaInfo.eta_text_runtime ?? etaInfo.eta_text ?? null;
      bumpEtaBucket(etaBucket(etaTxt), 0.5);
      bumpProduct(p.id, 0.25);

      const KEY = "look.metrics.v1.views";
      const raw = localStorage.getItem(KEY);
      const map: Record<string, number> = raw ? JSON.parse(raw) : {};
      const k = String(p.id);
      map[k] = (map[k] || 0) + 1;
      localStorage.setItem(KEY, JSON.stringify(map));
    } catch {}
  }

  // observa o sentinel para pedir mais páginas
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: "1200px 0px 0px 0px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  // ------------------------------
  // Aqui movi o bloco complexo para uma variável `bodyToRender`
  // ------------------------------
  const bodyToRender = !loading ? (
    <>
      <div className="mt-5 grid grid-cols-2 gap-4 pb-6">
        {(() => {
          const items: React.ReactNode[] = [];
          const list = filteredRanked;
          let i = 0;

          type RequestIdleCallback = (
            cb: (deadline: {
              didTimeout: boolean;
              timeRemaining: () => number;
            }) => void,
            opts?: { timeout: number }
          ) => number;

          const idleLocal = (cb: () => void) => {
            const w =
              typeof window !== "undefined"
                ? (window as Window & {
                    requestIdleCallback?: RequestIdleCallback;
                  })
                : undefined;
            const ric = w?.requestIdleCallback ?? null;
            if (ric) ric(cb, { timeout: 500 });
            else setTimeout(cb, 0);
          };

          const pushProducts = (count: number) => {
            for (let k = 0; k < count && i < list.length; k++, i++) {
              items.push(
                <ProductCard
                  key={`p-${list[i].id}`}
                  p={list[i]}
                  onTap={(p) => idleLocal(() => recordInteraction(p))}
                />
              );
            }
          };

          // roteiro editorial
          pushProducts(4);

          if (editorialTallBanner && editorialTallBanner.image) {
            items.push(
              <EditorialTallBanner
                key="banner-editorialTall"
                banner={editorialTallBanner}
              />
            );
          }

          pushProducts(4);

          if (selectionHeroBanner && selectionHeroBanner.image) {
            items.push(
              <SelectionHeroBanner
                key="banner-selectionHero"
                banner={selectionHeroBanner}
              />
            );
          }

          // restante do que já carregou
          pushProducts(Number.MAX_SAFE_INTEGER);

          if (items.length === 0) {
            items.push(
              <p
                key="empty"
                className="col-span-2 mt-4 text-sm text-gray-600"
              >
                Nenhum produto encontrado com os filtros atuais.
              </p>
            );
          }

          return items;
        })()}
      </div>

      {loadingMore && (
        <div className="mt-2 space-y-6 px-1">
          <div className="h-[220px] w-full animate-pulse rounded-2xl bg-neutral-200" />
          <div className="h-[220px] w-full animate-pulse rounded-2xl bg-neutral-200" />
        </div>
      )}

      {loadMoreError && (
        <p className="mt-3 text-center text-sm text-red-600">
          Erro ao carregar mais itens
        </p>
      )}

      {hasMore && <div ref={sentinelRef} className="h-8" />}

      {!hasMore && filteredRanked.length > 0 && (
        <p className="py-8 text-center text-sm text-neutral-500">
          Fim do catálogo
        </p>
      )}
    </>
  ) : null;

  // ------------------------------
  // Fim do bloco movido
  // ------------------------------

  return (
    <main
      className="canvas text-black max-w-md mx-auto min-h-screen px-5 with-bottom-nav !bg-[var(--background)]"
      style={{ backgroundColor: "var(--background)" }}
    >
      <HeaderBar
        loading={loading}
        profile={profile}
        onOpenMenu={() => setDrawerOpen(true)}
      />

      <AppDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLogout={handleLogout}
      />

      {profile && !hasAddressBasics(profile) && (
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900">
          <div className="text-sm font-medium">Complete seu endereço</div>
          <p className="mt-1 text-xs text-neutral-700 leading-5">
            Precisamos do CEP, rua e número para mostrar as opções da sua
            região.
          </p>
          <div className="mt-3">
            <Link
              href="/profile"
              className="inline-flex items-center justify-center rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white"
            >
              Atualizar endereço
            </Link>
          </div>
        </div>
      )}

      {profile && hasAddressBasics(profile) && !hasContact(profile) && (
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900">
          <div className="text-sm font-medium">Finalize seu cadastro</div>
          <p className="mt-1 text-xs text-neutral-700 leading-5">
            Adicione seu nome e WhatsApp para facilitar o atendimento.
          </p>
          <div className="mt-3">
            <Link
              href="/profile"
              className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800"
            >
              Completar dados
            </Link>
          </div>
        </div>
      )}

      {profile && hasAddressBasics(profile) && !inCoverage(profile) && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <div className="text-sm font-medium">
            Ainda não atendemos sua região
          </div>
          <p className="mt-1 text-xs text-amber-800/90 leading-5">
            Por enquanto entregamos somente na cidade de São Paulo. Se você
            tiver um endereço em São Paulo, pode cadastrá-lo para visualizar os
            produtos.
          </p>
          <div className="mt-3 flex gap-2">
            <Link
              href="/profile"
              className="inline-flex items-center justify-center rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white"
            >
              Trocar endereço
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800"
            >
              Meu cadastro
            </Link>
          </div>
        </div>
      )}

      {/* Carrossel só aparece se houver banners ATIVOS */}
      {!loading && carouselBanners && carouselBanners.length > 0 && (
        <BannersCarousel banners={carouselBanners} />
      )}

      {!loading && (
        <div className="mt-4 flex gap-2">
          <div className="flex-1 relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="11" cy="11" r="7" strokeWidth="2" />
                <path d="M20 20l-3.5-3.5" strokeWidth="2" />
              </svg>
            </span>
            <input
              aria-label="Search products"
              type="search"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-[22px] border border-warm chip pl-9 pr-3 h-11 text-[14px] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div className="shrink-0">
            {/* botão que leva para /profile para alterar cidade */}
            <Link
              href="/profile"
              className="inline-flex items-center gap-1 rounded-[22px] border border-warm chip px-3 h-11 text-[12px] text-gray-700"
              onClick={() => setDrawerOpen(false)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M12 21s7-4.35 7-10a7 7 0 10-14 0c0 5.65 7 10 7 10z"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="11" r="3" strokeWidth="2" />
              </svg>
              <span className="whitespace-nowrap max-w-[140px] truncate">
                {locationLabel}
              </span>
            </Link>
          </div>
        </div>
      )}

      {loading && <p className="mt-6 text-sm text-gray-600">Carregando…</p>}
      {err && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-900">
          <div className="text-sm font-medium">
            Não foi possível carregar seus dados
          </div>
          <p className="mt-1 text-xs text-red-800/90 leading-5">{String(err)}</p>
        </div>
      )}

      {/* CHANGED: só mostra “Defina sua cidade” para usuário logado sem cidade */}
      {!loading && profile && !effectiveCity && (
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900">
          <div className="text-sm font-medium">Defina sua cidade</div>
          <p className="mt-1 text-xs text-neutral-700 leading-5">
            Selecione a cidade no seu perfil para ver os produtos disponíveis.
          </p>
          <div className="mt-3">
            <Link
              href="/profile"
              className="inline-flex items-center justify-center rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white"
            >
              Alterar cidade
            </Link>
          </div>
        </div>
      )}

      {!loading && (
        <ChipsRow
          anyActiveFilter={anyActiveFilter}
          chipCategory={chipCategory}
          setChipCategory={setChipCategory}
          selectedCategories={selectedCategories}
          selectedGenders={selectedGenders}
          selectedSizes={selectedSizes}
          allCategories={allCategories}
          clearFilters={() => {
            clearFilters();
            setChipCategory("Tudo");
          }}
          openFilter={() => setFilterOpen(true)}
          onBumpCategory={(c, w) => bumpCategory(c, w)}
          onToggleGender={(g) =>
            setSelectedGenders((prev) => {
              const wasActive = prev.has(g);
              const next = new Set(prev);
              if (wasActive) next.delete(g);
              else {
                next.add(g);
                bumpGender(g, 1.0);
              }
              return next;
            })
          }
        />
      )}

      <FiltersModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        allCategories={allCategories}
        selectedGenders={selectedGenders}
        setSelectedGenders={setSelectedGenders}
        selectedSizes={selectedSizes}
        setSelectedSizes={setSelectedSizes}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        clearAll={() => {
          clearFilters();
          setChipCategory("Tudo");
        }}
        onApply={() => {
          selectedCategories.forEach((c) => bumpCategory(c, 0.5));
          selectedGenders.forEach((g) => bumpGender(g, 0.5));
          selectedSizes.forEach((s) => bumpSize(s, 0.3));
          setFilterOpen(false);
        }}
      />

      {/* substituí o bloco complexo por esta variável */}
      {bodyToRender}

      <div className="h-4" />
    </main>
  );
}
