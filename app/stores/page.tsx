"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type StoreCard = {
  id: number; // obrigatório
  name: string;
  slug: string; // slug + id, garantidamente único
};

type RpcStoreRow = {
  store_id: number | null;
  store_name?: string | null;
  brand_name?: string | null;
  city?: string | null;
};

type StoresTableRow = {
  id: number;
  store_name: string | null;
  slug: string | null;
  city: string | null;
};

type ProductStoreProbe = {
  store_id: number | null;
  store_name: string | null;
  stores: { id: number | null; city: string | null } | null;
};

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function stripAccents(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function citiesEqual(a: string, b: string) {
  const A = stripAccents(a.trim().toLowerCase());
  const B = stripAccents(b.trim().toLowerCase());
  return A === B;
}

// extrai "São Paulo" de "São Paulo, SP"
function extractCity(label: string) {
  const i = label.indexOf(",");
  const c = (i >= 0 ? label.slice(0, i) : label).trim();
  return c || "São Paulo";
}

/** Monta nome exibido combinando brand + store quando fizer sentido (para RPC). */
function displayStoreName(row: {
  store_name?: string | null;
  brand_name?: string | null;
  city?: string | null;
}) {
  const store = (row.store_name ?? "").trim();
  const brand = (row.brand_name ?? "").trim();

  if (brand && store) {
    const starts = store.toLowerCase().startsWith(brand.toLowerCase());
    return starts ? store : `${brand} ${store}`;
  }
  if (!store && brand && row.city) return `${brand} ${row.city}`;
  return store || brand || "Loja";
}

/** Resolve o label de cidade atual.
 * Regra: se não estiver logado, força "São Paulo, SP" e sobrescreve localStorage.
 * Se estiver logado, busca em user_profiles (city,state) e persiste em localStorage.
 */
async function resolveCityLabel(): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  const user = u?.user;
  if (!user) {
    if (typeof window !== "undefined") {
      localStorage.setItem("home.lastCityLabel", "São Paulo, SP");
    }
    return "São Paulo, SP";
  }

  // usuário logado → tenta perfil
  let lbl = "São Paulo, SP";
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("city,state")
      .eq("id", user.id)
      .single();

    if (!error && data) {
      const c = String(data.city ?? "").trim();
      const s = String(data.state ?? "").trim();
      if (c) lbl = s ? `${c}, ${s}` : c;
    } else {
      // fallback para o que tiver salvo
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("home.lastCityLabel");
        if (saved && saved.trim()) lbl = saved;
      }
    }
  } catch {
    // mantém lbl
  }

  if (typeof window !== "undefined") {
    localStorage.setItem("home.lastCityLabel", lbl);
  }
  return lbl;
}

/** Busca lojas via RPC all_stores_for_user e FILTRA por cidade. */
async function fetchUserStoresByCity(city: string): Promise<StoreCard[]> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) return [];

  const { data, error } = await supabase.rpc("all_stores_for_user", {
    p_user_id: uid,
  });
  if (error) {
    console.warn("[stores] all_stores_for_user error:", error.message);
    return [];
  }

  const wanted = extractCity(city);
  const list: StoreCard[] = (data as unknown as RpcStoreRow[] | null ?? [])
    .filter((r) => r && r.store_id) // precisa de id válido
    .filter((r) => {
      const rowCity = (r.city ?? "").trim();
      if (!rowCity) return false;
      return citiesEqual(extractCity(rowCity), wanted);
    })
    .map((r) => {
      const id = Number(r.store_id);
      const name = displayStoreName({
        store_name: r.store_name,
        brand_name: r.brand_name,
        city: r.city,
      });
      const base = slugify(name || `store-${id}`);
      return { id, name, slug: `${base}-${id}` };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return list;
}

/** Lojas direto da tabela stores, filtrando por cidade (igual iOS). */
async function fetchStoresTableByCity(city: string): Promise<StoreCard[]> {
  const { data, error } = await supabase
    .from("stores")
    .select("id,store_name,slug,city")
    .eq("city", city);

  if (error) {
    console.warn("[stores] stores table error:", error.message);
    return [];
  }

  const rows = (data as unknown as StoresTableRow[] | null) ?? [];
  return rows
    .map((r) => {
      const id = Number(r.id);
      const name = String(r.store_name ?? "").trim();
      if (!id || !name) return null;
      const base = slugify(name);
      const rawSlug = String(r.slug ?? "").trim();
      const finalSlug = `${(rawSlug ? rawSlug : base)}-${id}`;
      return { id, name, slug: finalSlug };
    })
    .filter((x): x is StoreCard => !!x)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Fallback: nomes únicos vindos de products ATIVOS, com join em stores.city. */
async function fetchStoresFromProductsByCity(city: string): Promise<StoreCard[]> {
  const { data, error } = await supabase
    .from("products")
    .select("store_id,store_name,stores!inner(id,city)")
    .eq("is_active", true)
    // A LINHA @ts-expect-error FOI REMOVIDA DAQUI
    .eq("stores.city", city);

  if (error) {
    console.warn("[stores] products fallback error:", error.message);
    return [];
  }

  const rows = (data as unknown as ProductStoreProbe[] | null) ?? [];
  const seenById = new Set<number>();
  const seenByName = new Set<string>();
  const out: StoreCard[] = [];

  for (const r of rows) {
    const name = String(r.store_name ?? "").trim();
    if (!name) continue;

    const sid = typeof r.store_id === "number" ? r.store_id : null;
    if (sid && sid > 0) {
      if (seenById.has(sid)) continue;
      seenById.add(sid);
      out.push({ id: sid, name, slug: `${slugify(name)}-${sid}` });
    } else {
      const base = slugify(name);
      if (seenByName.has(base)) continue;
      seenByName.add(base);
      const fakeId = Math.abs(
        base.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
      );
      out.push({ id: fakeId, name, slug: `${base}-${fakeId}` });
    }
  }

  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export default function StoresPage() {
  const [stores, setStores] = useState<StoreCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // label exibido no chip de cidade
  const [cityLabel, setCityLabel] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("home.lastCityLabel");
      if (saved && saved.trim()) return saved;
    }
    return "São Paulo, SP";
  });

  // função única para carregar por um label específico
  async function loadFor(label: string) {
    try {
      setLoading(true);
      setErr(null);
      const city = extractCity(label);

      // 1) Tenta RPC por cidade
      const fromRpc = await fetchUserStoresByCity(city);
      if (fromRpc.length > 0) {
        setStores(fromRpc);
        return;
      }

      // 2) Tabela stores por cidade
      const fromStoresTbl = await fetchStoresTableByCity(city);
      if (fromStoresTbl.length > 0) {
        setStores(fromStoresTbl);
        return;
      }

      // 3) Fallback via products ativos + join stores.city
      const fallback = await fetchStoresFromProductsByCity(city);
      setStores(fallback);
    } catch (e: unknown) {
      setErr(
        e instanceof Error ? e.message : "Não foi possível carregar as lojas"
      );
      setStores([]);
    } finally {
      setLoading(false);
    }
  }

  // bootstrap inicial: resolve label e carrega
  useEffect(() => {
    (async () => {
      const label = await resolveCityLabel();
      setCityLabel(label);
      await loadFor(label);
    })();
  }, []);

  // escuta alterações de cidade gravadas por outras páginas
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "home.lastCityLabel" && e.newValue && e.newValue.trim()) {
        setCityLabel(e.newValue);
        loadFor(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <main className="bg-white text-black max-w-md mx-auto min-h-[100dvh] px-5 pb-28">
      <div className="pt-6 flex items-center justify-between">
        <h1 className="text-[28px] leading-7 font-bold tracking-tight">
          Lojas
        </h1>
        <Link
          href="/"
          className="inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm transition
                     bg-transparent text-[#141414] border-[#141414] hover:bg-[#141414]/10"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            stroke="currentColor"
            fill="none"
          >
            <path
              d="M15 18l-6-6 6-6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Voltar
        </Link>
      </div>

      {/* Barra de cidade: mostra o label atual e abre /profile para trocar */}
      <div className="mt-3 flex items-center">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 rounded-[22px] border border-warm chip px-3 h-11 text-[12px] text-gray-700"
          title="Alterar cidade"
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
          <span className="whitespace-nowrap max-w-[220px] truncate">
            {cityLabel}
          </span>
        </Link>
      </div>

      {err && <p className="mt-4 text-sm text-red-600">Erro: {err}</p>}
      {loading && <p className="mt-4 text-sm text-gray-600">Carregando…</p>}
      {!loading && stores.length === 0 && (
        <p className="mt-8 text-sm text-gray-600">
          Nenhuma loja encontrada na sua cidade.
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-4">
        {stores.map((s) => (
          <Link
            key={s.slug}
            href={`/stores/${s.slug}?n=${encodeURIComponent(s.name)}&sid=${s.id}`}
            title={s.name}
            className="group rounded-2xl border h-28 transition
                       bg-[#141414] border-[#141414]
                       hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center px-3"
          >
            <div className="text-center text-white">
              <div className="text-[15px] font-semibold line-clamp-2">
                {s.name}
              </div>
              <div
                className="mt-2 inline-flex items-center gap-1 px-3 h-7 rounded-full border text-[11px] font-medium transition"
                style={{
                  backgroundColor: "transparent",
                  borderColor: "white",
                  color: "white",
                }}
              >
                Ver peças
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  style={{ stroke: "white" }}
                >
                  <path
                    d="M9 18l6-6-6-6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
