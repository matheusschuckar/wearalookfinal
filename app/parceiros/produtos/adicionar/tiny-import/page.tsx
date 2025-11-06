"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const SURFACE = "#F7F4EF";

const FALLBACK_CATEGORIES = [
  "vestidos",
  "camisas",
  "calças",
  "sapatos",
  "acessórios",
];

type SizeEntry = {
  size: string;
  stock: number;
};

type StagingItem = {
  id: number;
  external_id: string;
  store_id: number;
  store_name: string | null;
  mapped_name: string | null;
  mapped_stock: number | null;
  mapped_price?: number | null;
  price_tag: number | null;
  eta_text: string | null;
  is_active: boolean | null;
  sizes: string[] | null;
  size_entries?: SizeEntry[] | null;
  ui_size_entries?: SizeEntry[];
  mapped_sku: string | null;
  mapped_description: string | null;
  mapped_image_url: string | null;
  photo_url: string[] | null;
  category: string | null;
  gender: string[] | null;
  categories: string[] | null;
  raw_json?: unknown;
};

type Dict = Record<string, unknown>;

function getProp<T = unknown>(obj: unknown, key: string): T | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  return (obj as Dict)[key] as T | undefined;
}

export default function TinyImportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeIdParam = searchParams.get("store_id");
  const storeId = storeIdParam ? Number(storeIdParam) : null;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<StagingItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [allCategories, setAllCategories] =
    useState<string[]>(FALLBACK_CATEGORIES);

  function extractNameFromRaw(raw: unknown): string {
    if (!raw) return "";
    return (
      (getProp<string>(raw, "nome") as string) ||
      (getProp<string>(raw, "descricao") as string) ||
      (getProp<string>(raw, "produto") as string) ||
      (getProp<string>(raw, "titulo") as string) ||
      ""
    );
  }

  function extractPriceFromRaw(raw: unknown): number | null {
    if (!raw) return null;
    const cands = [
      getProp<unknown>(raw, "preco"),
      getProp<unknown>(raw, "preco_venda"),
      getProp<unknown>(raw, "preco_promocional"),
      getProp<unknown>(raw, "valor"),
    ];
    for (const c of cands) {
      if (c == null) continue;
      const n = Number(c as unknown);
      if (!Number.isNaN(n)) return n;
    }
    return null;
  }

  // tenta pegar estoque tanto do produto raiz quanto das variações dentro do detalhe
  function extractStockFromRaw(raw: unknown): number | null {
    if (!raw) return null;

    const cands = [
      getProp<unknown>(raw, "estoque"),
      getProp<unknown>(raw, "saldo"),
      getProp<unknown>(raw, "quantidade"),
      getProp<unknown>(raw, "qtd"),
      getProp<unknown>(raw, "saldo_estoque"),
      getProp<unknown>(raw, "estoque_atual"),
      getProp<unknown>(raw, "estoqueatual"),
      getProp<unknown>(raw, "estoque_disponivel"),
    ];
    for (const c of cands) {
      if (c == null) continue;
      const n = Number(c as unknown);
      if (!Number.isNaN(n)) return n;
    }

    // se veio array de detalhes (a gente salvou assim no commit)
    if (Array.isArray(raw)) {
      // tenta achar o que tem variacoes
      let bestTotal = 0;
      for (const part of raw) {
        const n1 = extractStockFromRaw(part);
        if (n1 != null && n1 > bestTotal) bestTotal = n1;

        const variacoes = getProp<unknown[]>(part, "variacoes");
        if (Array.isArray(variacoes) && variacoes.length) {
          let tot = 0;
          for (const v of variacoes) {
            const vn =
              getProp<unknown>(v, "saldo") ??
              getProp<unknown>(v, "estoque") ??
              getProp<unknown>(v, "quantidade") ??
              getProp<unknown>(v, "qtd") ??
              getProp<unknown>(v, "estoque_disponivel") ??
              0;
            const num = Number(vn as unknown);
            if (!Number.isNaN(num)) tot += num;
          }
          if (tot > bestTotal) bestTotal = tot;
        }
      }
      return bestTotal > 0 ? bestTotal : null;
    }

    // se veio do detalhe com variacoes
    const variacoesRoot = getProp<unknown[]>(raw, "variacoes");
    if (Array.isArray(variacoesRoot) && variacoesRoot.length) {
      let total = 0;
      for (const v of variacoesRoot) {
        const vn =
          getProp<unknown>(v, "saldo") ??
          getProp<unknown>(v, "estoque") ??
          getProp<unknown>(v, "quantidade") ??
          getProp<unknown>(v, "qtd") ??
          getProp<unknown>(v, "estoque_disponivel") ??
          0;
        const num = Number(vn as unknown);
        if (!Number.isNaN(num)) total += num;
      }
      return total;
    }

    return null;
  }

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      setNotice("Loja não encontrada.");
      return;
    }

    (async () => {
      setLoading(true);

      const [stagingRes, catsRes] = await Promise.all([
        fetch(`/api/integrations/tiny/staging?store_id=${storeId}`),
        fetch(`/api/catalog/categories`).catch(() => null),
      ]);

      const stagingData = await stagingRes.json();

      if (catsRes && catsRes.ok) {
        const catsData = await catsRes.json();
        if (
          catsData?.ok &&
          Array.isArray(catsData.categories) &&
          catsData.categories.length
        ) {
          setAllCategories(catsData.categories);
        }
      }

      setLoading(false);

      if (!stagingRes.ok || !stagingData?.ok) {
        setNotice("Não foi possível carregar os produtos importados.");
        return;
      }

      const normalized = (stagingData.items || []).map((itRaw: unknown) => {
        const it = itRaw as Dict;
        const raw = (getProp<unknown>(it, "raw_json") ?? {}) as unknown;

        const autoName =
          (getProp<string>(it, "mapped_name") as string) ||
          extractNameFromRaw(raw) ||
          "";
        const finalName = autoName ? autoName.toUpperCase() : "";

        const mapped_price = getProp<number>(it, "mapped_price");
        const price_tag_prop = getProp<number>(it, "price_tag");
        const autoPrice =
          price_tag_prop != null
            ? price_tag_prop
            : mapped_price != null
            ? mapped_price
            : extractPriceFromRaw(raw);

        const mapped_stock_prop = getProp<number>(it, "mapped_stock");
        const autoStock =
          mapped_stock_prop != null && !Number.isNaN(Number(mapped_stock_prop))
            ? Number(mapped_stock_prop)
            : extractStockFromRaw(raw);

        let ui_size_entries: SizeEntry[] = [];

        // 1. se a rota de staging já mandou size_entries
        const sizeEntriesRaw = getProp<unknown[]>(it, "size_entries");
        if (Array.isArray(sizeEntriesRaw) && sizeEntriesRaw.length > 0) {
          ui_size_entries = sizeEntriesRaw.map((e) => {
            const dict = e as Dict;
            return {
              size: String(getProp<string>(dict, "size") ?? "").toUpperCase(),
              stock: Number.isFinite(Number(getProp<unknown>(dict, "stock")))
                ? Number(getProp<unknown>(dict, "stock"))
                : 0,
            };
          });
        }
        // 2. se o bruto trouxe variações
        else if (Array.isArray(raw) && (raw as unknown[]).length) {
          // raw é um array de partes do produto, cada uma pode ter variacoes
          const collected: SizeEntry[] = [];
          for (const part of raw as unknown[]) {
            const partDict = part as Dict;
            const variacoes = getProp<unknown[]>(partDict, "variacoes");
            if (Array.isArray(variacoes) && variacoes.length) {
              for (const v of variacoes) {
                const vdict = v as Dict;
                const label =
                  (getProp<string>(vdict, "tamanho") as string) ||
                  (getProp<string>(vdict, "variacao") as string) ||
                  (getProp<string>(vdict, "descricao") as string) ||
                  (getProp<string>(vdict, "nome") as string) ||
                  (getProp<string>(vdict, "sku") as string) ||
                  "U";
                const stockRaw =
                  getProp<unknown>(vdict, "saldo") ??
                  getProp<unknown>(vdict, "estoque") ??
                  getProp<unknown>(vdict, "quantidade") ??
                  getProp<unknown>(vdict, "qtd") ??
                  getProp<unknown>(vdict, "estoque_disponivel") ??
                  0;
                collected.push({
                  size: String(label).toUpperCase(),
                  stock: Number.isFinite(Number(stockRaw))
                    ? Number(stockRaw)
                    : 0,
                });
              }
            }
          }
          ui_size_entries =
            collected.length > 0
              ? collected
              : [
                  {
                    size: "U",
                    stock: autoStock != null ? autoStock : 0,
                  },
                ];
        }
        // 3. se o bruto for um objeto com variacoes
        else {
          const rawVariacoes = getProp<unknown[]>(raw, "variacoes");
          if (Array.isArray(rawVariacoes) && rawVariacoes.length > 0) {
            ui_size_entries = rawVariacoes.map((v) => {
              const vdict = v as Dict;
              const label =
                (getProp<string>(vdict, "tamanho") as string) ||
                (getProp<string>(vdict, "variacao") as string) ||
                (getProp<string>(vdict, "descricao") as string) ||
                (getProp<string>(vdict, "nome") as string) ||
                (getProp<string>(vdict, "sku") as string) ||
                "U";
              const stockRaw =
                getProp<unknown>(vdict, "saldo") ??
                getProp<unknown>(vdict, "estoque") ??
                getProp<unknown>(vdict, "quantidade") ??
                getProp<unknown>(vdict, "qtd") ??
                getProp<unknown>(vdict, "estoque_disponivel") ??
                0;
              return {
                size: String(label).toUpperCase(),
                stock: Number.isFinite(Number(stockRaw)) ? Number(stockRaw) : 0,
              };
            });
          }
          // 4. se veio apenas sizes: ["P","M","G"]
          else if (Array.isArray(getProp<unknown[]>(it, "sizes"))) {
            const sizesArr = getProp<unknown[]>(it, "sizes") || [];
            ui_size_entries = (sizesArr as unknown[]).map((s) => ({
              size: String(s).toUpperCase(),
              stock: 0,
            }));
          }
          // 5. caso contrário, tamanho único
          else {
            ui_size_entries = [
              {
                size: "U",
                stock: autoStock != null ? autoStock : 0,
              },
            ];
          }
        }

        return {
          id: (getProp<number>(it, "id") as number) || 0,
          external_id: String(getProp<unknown>(it, "external_id") ?? ""),
          store_id: (getProp<number>(it, "store_id") as number) || 0,
          store_name: (getProp<string>(it, "store_name") as string) || null,
          mapped_name: finalName || null,
          mapped_stock: autoStock != null ? autoStock : getProp<number>(it, "mapped_stock") ?? null,
          mapped_price: mapped_price ?? autoPrice ?? null,
          price_tag: price_tag_prop ?? mapped_price ?? autoPrice ?? null,
          eta_text: (getProp<string>(it, "eta_text") as string) ?? null,
          is_active: typeof getProp<boolean>(it, "is_active") === "boolean" ? (getProp<boolean>(it, "is_active") as boolean) : true,
          sizes: (getProp<unknown[]>(it, "sizes") as string[]) || null,
          size_entries: undefined,
          ui_size_entries,
          mapped_sku: (getProp<string>(it, "mapped_sku") as string) || null,
          mapped_description: (getProp<string>(it, "mapped_description") as string) || null,
          mapped_image_url: (getProp<string>(it, "mapped_image_url") as string) || null,
          photo_url:
            (getProp<unknown[]>(it, "photo_url") as string[]) && Array.isArray(getProp<unknown[]>(it, "photo_url"))
              ? (getProp<unknown[]>(it, "photo_url") as string[])
              : getProp<string>(it, "mapped_image_url")
              ? [getProp<string>(it, "mapped_image_url") as string]
              : [],
          category: (getProp<string>(it, "category") as string) || null,
          gender: (getProp<unknown[]>(it, "gender") as string[]) || [],
          categories: (getProp<unknown[]>(it, "categories") as string[]) || [],
          raw_json: raw,
        } as StagingItem;
      });

      setItems(normalized);
    })();
  }, [storeId]);

  function updateItem(idx: number, patch: Partial<StagingItem>) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    );
  }

  function handleAddSize(idx: number) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const next = Array.isArray(it.ui_size_entries) ? [...it.ui_size_entries] : [];
        next.push({ size: "", stock: 0 });
        return { ...it, ui_size_entries: next };
      })
    );
  }

  function handleUpdateSize(idx: number, sIdx: number, value: string) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const next = (it.ui_size_entries || []).map((se, j) =>
          j === sIdx ? { ...se, size: value.toUpperCase() } : se
        );
        return { ...it, ui_size_entries: next };
      })
    );
  }

  function handleUpdateSizeStock(idx: number, sIdx: number, value: string) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const n = Number(value);
        const next = (it.ui_size_entries || []).map((se, j) =>
          j === sIdx ? { ...se, stock: Number.isFinite(n) ? n : 0 } : se
        );
        return { ...it, ui_size_entries: next };
      })
    );
  }

  function handleRemoveSize(idx: number, sIdx: number) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const next = (it.ui_size_entries || []).filter((_, j) => j !== sIdx);
        return { ...it, ui_size_entries: next };
      })
    );
  }

  async function handleSaveToProducts() {
    if (!storeId) return;
    setSaving(true);

    const productsPayload = items.map((it) => {
      const photo = it.photo_url && it.photo_url.length > 0 ? it.photo_url[0] : null;

      const cleanSizeEntries = (it.ui_size_entries || [])
        .filter((se) => se.size.trim())
        .map((se) => {
          const rawSize = se.size.trim().toUpperCase();
          const normalized =
            rawSize === "TAMANHO ÚNICO" ||
            rawSize === "TAMANHO UNICO" ||
            rawSize === "ÚNICO" ||
            rawSize === "UNICO"
              ? "U"
              : rawSize;
          return {
            size: normalized,
            stock: Number.isFinite(Number(se.stock)) ? Number(se.stock) : 0,
          };
        });

      const stockFromSizes = cleanSizeEntries.reduce(
        (acc, cur) => acc + (Number.isFinite(cur.stock) ? cur.stock : 0),
        0
      );

      const sizesArray =
        cleanSizeEntries.length > 0
          ? cleanSizeEntries.map((se) => se.size)
          : it.sizes && it.sizes.length
          ? it.sizes
          : null;

      return {
        staging_id: it.id,
        id: it.external_id,
        store_id: it.store_id ?? storeId,
        store_name: it.store_name ?? null,
        name: it.mapped_name ?? "",
        stock_total:
          stockFromSizes > 0
            ? stockFromSizes
            : it.mapped_stock != null
            ? it.mapped_stock
            : 0,
        price_tag: it.price_tag != null ? it.price_tag : it.mapped_price ?? null,
        eta_text: it.eta_text ?? null,
        is_active: typeof it.is_active === "boolean" ? it.is_active : true,
        category: it.category && it.category !== "__custom__" ? it.category : null,
        gender: it.gender && it.gender.length ? it.gender : null,
        categories: it.categories && it.categories.length ? it.categories : [],
        photo_url: photo,
        sizes: sizesArray,
        // aqui você já está mandando size_entries alinhado
        size_entries: cleanSizeEntries,
      };
    });

    const res = await fetch("/api/integrations/tiny/staging", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store_id: storeId,
        action: "commit_to_products",
        items: productsPayload,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok || !data?.ok) {
      console.error("Erro ao enviar para o catálogo:", data);
      setNotice(data?.detail || "Não foi possível enviar para o catálogo.");
      return;
    }

    router.replace("/parceiros/produtos/adicionar");
  }

  function isOtherCategory(val: string | null, all: string[]): boolean {
    if (!val) return false;
    if (val === "__custom__") return true;
    return !all.includes(val);
  }

  function isSingleSizeUnique(entries: SizeEntry[] | undefined): boolean {
    if (!entries || entries.length !== 1) return false;
    const s = (entries[0].size || "").trim().toUpperCase();
    if (!s) return true;
    if (s === "U") return true;
    if (s === "ÚNICO" || s === "UNICO") return true;
    return false;
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
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
                Completar produtos do Tiny
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-8 pt-10 pb-20 space-y-6">
        <div>
          <h1 className="text-[26px] font-semibold text-black tracking-tight mb-1">
            Produtos importados do Tiny
          </h1>
          <p className="text-sm text-neutral-600 max-w-2xl">
            Preencha as informações que o Tiny não tem. Depois disso vamos
            colocar na sua tabela de produtos.
          </p>
          {notice ? (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {notice}
            </p>
          ) : null}
        </div>

        {loading ? (
          <p className="text-sm text-neutral-500">Carregando...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhum produto em rascunho.</p>
        ) : (
          <div className="space-y-4">
            {items.map((it, idx) => {
              const otherSelected = isOtherCategory(it.category || "", allCategories);
              const uniqueSize = isSingleSizeUnique(it.ui_size_entries);

              return (
                <div
                  key={it.id ?? it.external_id}
                  className="bg-white/80 border border-[#E5E0DA]/70 rounded-3xl p-4 flex gap-4"
                >
                  <div className="w-24 h-24 bg-neutral-100 rounded-2xl overflow-hidden flex items-center justify-center">
                    {it.photo_url && it.photo_url[0] ? (
                      <img
                        src={it.photo_url[0]}
                        alt={it.mapped_name || "produto"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-neutral-400 text-center px-2">sem imagem</span>
                    )}
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-neutral-500 mb-1 block">Nome (do Tiny)</label>
                      <input
                        value={it.mapped_name || ""}
                        readOnly
                        className="w-full h-9 rounded-2xl border border-neutral-200 px-3 text-sm outline-none bg-neutral-50 text-neutral-700 uppercase"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-neutral-500 mb-1 block">Categoria (Look)</label>
                      <select
                        value={otherSelected ? "__other__" : it.category || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "__other__") {
                            updateItem(idx, { category: "__custom__" });
                          } else {
                            updateItem(idx, { category: val });
                          }
                        }}
                        className="w-full h-9 rounded-2xl border border-neutral-200 px-3 text-sm outline-none focus:border-black/60 bg-white"
                      >
                        <option value="">Selecione</option>
                        {allCategories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="__other__">Outra…</option>
                      </select>

                      {otherSelected ? (
                        <input
                          value={it.category === "__custom__" ? "" : it.category || ""}
                          onChange={(e) => updateItem(idx, { category: e.target.value })}
                          className="mt-2 w-full h-9 rounded-2xl border border-neutral-200 px-3 text-sm outline-none focus:border-black/60"
                          placeholder="Digite a categoria"
                        />
                      ) : null}
                    </div>

                    <div>
                      <label className="text-[11px] text-neutral-500 mb-1 block">Gênero</label>
                      <select
                        value={it.gender && it.gender[0] ? it.gender[0] : ""}
                        onChange={(e) => updateItem(idx, { gender: e.target.value ? [e.target.value] : [] })}
                        className="w-full h-9 rounded-2xl border border-neutral-200 px-3 text-sm outline-none focus:border-black/60 bg-white"
                      >
                        <option value="">Selecione</option>
                        <option value="male">masculino</option>
                        <option value="female">feminino</option>
                        <option value="unisex">unissex</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-neutral-500 mb-1 block">Outras categorias</label>
                      <input
                        value={it.categories?.join(", ") || ""}
                        onChange={(e) =>
                          updateItem(idx, {
                            categories: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                          })
                        }
                        className="w-full h-9 rounded-2xl border border-neutral-200 px-3 text-sm outline-none focus:border-black/60"
                        placeholder="ex: festa, verão"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-neutral-500 mb-1 block">Imagem</label>
                      <input
                        value={it.photo_url && it.photo_url[0] ? it.photo_url[0] : ""}
                        onChange={(e) => updateItem(idx, { photo_url: e.target.value ? [e.target.value] : [] })}
                        className="w-full h-9 rounded-2xl border border-neutral-200 px-3 text-sm outline-none focus:border-black/60"
                        placeholder="https://..."
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-neutral-500 mb-1 block">Preço</label>
                      <input
                        type="number"
                        value={it.price_tag ?? ""}
                        onChange={(e) => updateItem(idx, { price_tag: e.target.value ? Number(e.target.value) : null })}
                        className="w-full h-9 rounded-2xl border border-neutral-200 px-3 text-sm outline-none focus:border-black/60"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="text-[11px] text-neutral-500 mb-2 block">Tamanhos e estoque</label>
                      {uniqueSize ? (
                        <div className="flex items-center gap-2 bg-[#F7F4EF] rounded-2xl px-3 py-2">
                          <div className="px-4 h-8 rounded-full bg-black text-white text-xs flex items-center justify-center">Tamanho único</div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-neutral-400 leading-none">Estoque</span>
                            <input
                              value={it.ui_size_entries?.[0]?.stock ?? 0}
                              onChange={(e) => handleUpdateSizeStock(idx, 0, e.target.value)}
                              className="h-7 w-16 rounded-xl bg-white px-2 text-sm outline-none border border-transparent focus:border-black/30"
                              inputMode="numeric"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddSize(idx)}
                            className="h-8 px-4 rounded-full bg-white/50 border border-dashed border-neutral-300 text-[11px] text-neutral-600 hover:border-neutral-500"
                          >
                            + tamanho
                          </button>
                        </div>
                      ) : it.ui_size_entries && it.ui_size_entries.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {it.ui_size_entries.map((se, sIdx) => (
                            <div key={sIdx} className="flex items-center gap-2 bg-[#F7F4EF] rounded-2xl px-3 py-2">
                              <input value={se.size} onChange={(e) => handleUpdateSize(idx, sIdx, e.target.value)} className="w-12 h-8 rounded-full bg-black text-white text-xs text-center outline-none" />
                              <div className="flex flex-col gap-1">
                                <span className="text-[9px] text-neutral-400 leading-none">Estoque</span>
                                <input value={se.stock} onChange={(e) => handleUpdateSizeStock(idx, sIdx, e.target.value)} className="h-7 w-16 rounded-xl bg-white px-2 text-sm outline-none border border-transparent focus:border-black/30" inputMode="numeric" />
                              </div>
                              <button type="button" onClick={() => handleRemoveSize(idx, sIdx)} className="text-[10px] text-neutral-400 hover:text-red-500">remover</button>
                            </div>
                          ))}
                          <button type="button" onClick={() => handleAddSize(idx)} className="h-8 px-4 rounded-full bg-white/50 border border-dashed border-neutral-300 text-[11px] text-neutral-600 hover:border-neutral-500">+ tamanho</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => handleAddSize(idx)} className="h-8 px-4 rounded-full bg-white/50 border border-dashed border-neutral-300 text-[11px] text-neutral-600 hover:border-neutral-500">+ adicionar tamanho</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSaveToProducts}
            disabled={saving || items.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-black text-white px-6 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-40"
          >
            {saving ? "Enviando..." : "Enviar para o catálogo"}
          </button>
        </div>
      </div>
    </main>
  );
}
