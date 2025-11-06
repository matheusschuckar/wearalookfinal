// app/api/integrations/tiny/commit/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

// ------------------------------------------------------------
// Tipos utilitários (apenas campos que usamos)
// ------------------------------------------------------------
type TinyDeposito = { deposito?: { desconsiderar?: string; saldo?: unknown } };
type TinyVariation = Record<string, unknown>;

type TinyDetail = {
  preco?: unknown;
  preco_venda?: unknown;
  imagem?: unknown;
  variacoes?: TinyVariation[];
  depositos?: TinyDeposito[];
  saldo_estoque?: unknown;
  estoque_atual?: unknown;
  estoque?: unknown;
  saldo?: unknown;
};

type TinyListProduct = {
  id?: unknown;
  codigo_produto?: unknown;
  codigo?: unknown;
  descricao?: unknown;
  nome?: unknown;
  grade?: unknown;
  imagem?: unknown;
  image?: unknown;
  foto?: unknown;
  foto_principal?: unknown;
  variacoes?: TinyVariation[];
  depositos?: TinyDeposito[];
  saldo?: unknown;
  saldo_estoque?: unknown;
  estoque?: unknown;
  saldoReservado?: unknown;
  preco?: unknown;
  preco_venda?: unknown;
  quantidade?: unknown;
};

type TinyListWrap = { produto: TinyListProduct } | TinyListProduct;

type TinyItem = TinyListProduct & {
  __detail?: TinyDetail | null;
  __estoque_final?: number;
  __estoque_fonte?: string;
};

type GroupedItem = {
  store_id: number;
  store_name: string | null;
  provider: "tiny";
  external_id: string;
  raw_json: TinyItem[];
  mapped_name: string | null;
  mapped_price: number | null;
  price_tag: number | null;
  mapped_stock: number;
  sizes: string[];
  mapped_image_url: string | null;
  photo_url: string[];
  eta_text: string;
  is_active: boolean;
  status: string;
};

type StagingRow = {
  store_id: number;
  store_name: string | null;
  provider: "tiny";
  external_id: string;
  raw_json: TinyItem[];
  mapped_name: string | null;
  mapped_price: number | null;
  price_tag: number | null;
  mapped_stock: number;
  sizes: string[] | null;
  mapped_image_url: string | null;
  photo_url: string[];
  eta_text: string;
  is_active: boolean;
  status: string;
};

// ------------------------------------------------------------
// utils
// ------------------------------------------------------------
function looksLikeProductType(val: string) {
  const v = val.trim().toLowerCase();
  return (
    v === "p" ||
    v === "v" ||
    v === "prod" ||
    v === "produto" ||
    v === "variacao" ||
    v === "variação" ||
    v === "variation" ||
    v === "var" ||
    v === "1"
  );
}

function inferSizeFromNameTiny(name?: string | null): string | null {
  if (!name) return null;
  const m = name.match(/[-/]\s*(PP|P|M|G|GG|XG|XGG|U|UNICO|ÚNICO)$/i);
  if (!m) return null;
  const sz = m[1].toUpperCase();
  if (sz === "UNICO" || sz === "ÚNICO") return "U";
  return sz;
}

function getString(
  o: Record<string, unknown> | undefined,
  key: string
): string | null {
  if (!o) return null;
  const v = o[key];
  return v == null ? null : String(v);
}

function getNumber(v: unknown): number | null {
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function unwrapTinyWrap(w: TinyListWrap): TinyListProduct {
  return "produto" in w && w.produto ? w.produto : (w as TinyListProduct);
}

// ------------------------------------------------------------
// GET detalhe do Tiny
// ------------------------------------------------------------
type TinyDetailResp =
  | { ok: true; data: TinyDetail }
  | { ok: false; raw_text: string };

async function tinyGetDetailGET(
  token: string,
  id: string | number
): Promise<TinyDetailResp> {
  const url = `https://api.tiny.com.br/api2/produtos.obter.php?token=${encodeURIComponent(
    token
  )}&formato=json&id=${encodeURIComponent(String(id))}`;
  try {
    const res = await fetch(url, { method: "GET" });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, raw_text: text };
    }
    const j = json as { retorno?: { status?: string; produto?: TinyDetail } };
    if (j?.retorno?.status === "OK" && j.retorno.produto) {
      return { ok: true, data: j.retorno.produto };
    }
    return { ok: false, raw_text: JSON.stringify(json) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "detail error";
    return { ok: false, raw_text: message };
  }
}

// ------------------------------------------------------------
// estoque realtime
// ------------------------------------------------------------
async function fetchTinyStockUpdates(token: string) {
  try {
    const url = "https://api.tiny.com.br/api2/lista.atualizacoes.estoque";
    const params = new URLSearchParams();
    const agora = new Date();
    // hoje de manhã
    const dataStr = `01/${String(agora.getMonth() + 1).padStart(
      2,
      "0"
    )}/${agora.getFullYear()} 00:00:00`;
    params.append("token", token);
    params.append("dataAlteracao", dataStr);
    params.append("formato", "json");

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      return {
        byId: {} as Record<string, number>,
        byCode: {} as Record<string, number>,
      };
    }

    const json: unknown = await res.json();
    const root = json as {
      retorno?: { status?: string; produtos?: TinyListWrap[] };
    };
    if (root?.retorno?.status !== "OK") {
      return {
        byId: {} as Record<string, number>,
        byCode: {} as Record<string, number>,
      };
    }

    const produtos = root.retorno?.produtos ?? [];
    const byId: Record<string, number> = {};
    const byCode: Record<string, number> = {};

    for (const wrap of produtos) {
      const p = unwrapTinyWrap(wrap);
      if (!p) continue;

      let final = 0;
      if (Array.isArray(p.depositos) && p.depositos.length) {
        let tot = 0;
        for (const d of p.depositos) {
          const dep = d?.deposito;
          if (!dep) continue;
          if (dep.desconsiderar === "S") continue;
          const n = dep.saldo != null ? Number(dep.saldo) : 0;
          if (!Number.isNaN(n)) tot += n;
        }
        final = tot;
      } else {
        const cand =
          p.saldo ?? p.saldo_estoque ?? p.estoque ?? p.saldoReservado ?? 0;
        final = Number(cand) || 0;
      }

      const id = p.id;
      if (id != null) byId[String(id)] = final;

      const codigo = p.codigo;
      if (codigo != null) byCode[String(codigo)] = final;
    }

    return { byId, byCode };
  } catch {
    return {
      byId: {} as Record<string, number>,
      byCode: {} as Record<string, number>,
    };
  }
}

// ------------------------------------------------------------
// baixa TODAS as páginas do Tiny
// ------------------------------------------------------------
async function fetchAllTinyProducts(token: string): Promise<TinyItem[]> {
  const all: TinyItem[] = [];
  let pagina = 1;
  const MAX_PAGES = 50;

  while (pagina <= MAX_PAGES) {
    const url = `https://api.tiny.com.br/api2/produtos.pesquisa.php`;
    const params = new URLSearchParams();
    params.append("token", token);
    params.append("formato", "json");
    params.append("pesquisa", "");
    params.append("pagina", String(pagina));

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) break;

    const json: unknown = await res.json();

    const status = (json as { retorno?: { status?: string } })?.retorno?.status;
    const produtos =
      (json as { retorno?: { produtos?: TinyListWrap[] } })?.retorno
        ?.produtos || [];

    if (status !== "OK" || !Array.isArray(produtos) || produtos.length === 0) {
      break;
    }

    for (const wrap of produtos) {
      const p = unwrapTinyWrap(wrap);
      if (p) all.push(p as TinyItem);
    }

    if (produtos.length === 0) break;

    pagina += 1;
  }

  return all;
}

// ------------------------------------------------------------
// agrupa
// ------------------------------------------------------------
function groupTinyProducts(
  rawProducts: TinyItem[],
  mapping: Record<string, string>,
  storeId: number,
  storeName: string | null
): GroupedItem[] {
  const byKey: Record<string, GroupedItem> = {};

  for (const prod of rawProducts) {
    const p = prod as TinyItem;
    const detail = (p.__detail ?? null) as TinyDetail | null;

    const nameVal =
      mapping.name &&
      getString(p as Record<string, unknown>, mapping.name) != null
        ? getString(p as Record<string, unknown>, mapping.name)
        : getString(p as Record<string, unknown>, "descricao") ??
          getString(p as Record<string, unknown>, "nome") ??
          null;

    const priceRaw = (
      mapping.price && (p as Record<string, unknown>)[mapping.price] != null
        ? (p as Record<string, unknown>)[mapping.price]
        : (p as TinyListProduct).preco ??
          (p as TinyListProduct).preco_venda ??
          detail?.preco ??
          detail?.preco_venda ??
          null
    ) as unknown;

    const priceNum = getNumber(priceRaw);

    // estoque final já foi calculado antes e jogado em p.__estoque_final
    const stockNum: number =
      typeof p.__estoque_final === "number" ? p.__estoque_final : 0;

    // tamanho
    let sizeFromRow: string | null = null;
    if (
      mapping.sizes &&
      (p as Record<string, unknown>)[mapping.sizes] != null
    ) {
      const candidate = String(
        (p as Record<string, unknown>)[mapping.sizes]
      ).trim();
      if (!looksLikeProductType(candidate)) {
        sizeFromRow = candidate;
      }
    } else if ((p as TinyListProduct).grade) {
      const candidate = String((p as TinyListProduct).grade).trim();
      if (!looksLikeProductType(candidate)) {
        sizeFromRow = candidate;
      }
    }
    if (!sizeFromRow) {
      // depois (seguro para tipos)
const baseName =
(typeof nameVal === "string" && nameVal) ||
(typeof (p as TinyListProduct).descricao === "string" ? String((p as TinyListProduct).descricao) : null) ||
(typeof (p as TinyListProduct).nome === "string" ? String((p as TinyListProduct).nome) : null);

const inferred = inferSizeFromNameTiny(baseName);

      if (inferred) sizeFromRow = inferred;
    }

    // variações
    const detailVariacoes: TinyVariation[] =
      Array.isArray(detail?.variacoes) && detail!.variacoes!.length
        ? detail!.variacoes!
        : Array.isArray((p as TinyListProduct).variacoes) &&
          (p as TinyListProduct).variacoes!.length
        ? (p as TinyListProduct).variacoes!
        : [];

    const groupKey =
      getString(p as Record<string, unknown>, "codigo_produto") ||
      getString(p as Record<string, unknown>, "codigo") ||
      getString(p as Record<string, unknown>, "id");
    if (!groupKey) continue;

    if (!byKey[groupKey]) {
      // soma estoque de variações se tiver
      let baseVarStock = 0;
      if (detailVariacoes.length) {
        for (const vv of detailVariacoes) {
          const vEst =
            (vv as Record<string, unknown>)?.["estoque"] ??
            (vv as Record<string, unknown>)?.["saldo"] ??
            (vv as Record<string, unknown>)?.["quantidade"] ??
            (vv as Record<string, unknown>)?.["qtd"] ??
            (vv as Record<string, unknown>)?.["estoque_disponivel"] ??
            ((vv as Record<string, unknown>)?.["variacao"] &&
              (vv as Record<string, unknown>)?.["variacao"] instanceof Object)
              ? (
                  vv as Record<string, unknown> & {
                    variacao?: Record<string, unknown>;
                  }
                ).variacao?.estoque
              : 0;

          const num = Number(vEst);
          if (!Number.isNaN(num)) baseVarStock += num;
        }
      }

      const mappedImageCandidate =
        (p as TinyListProduct).imagem ??
        (p as TinyListProduct).image ??
        (p as TinyListProduct).foto ??
        (p as TinyListProduct).foto_principal ??
        detail?.imagem ??
        null;

      const photoArr: string[] = mappedImageCandidate
        ? [String(mappedImageCandidate)]
        : [];

      byKey[groupKey] = {
        store_id: storeId,
        store_name: storeName,
        provider: "tiny",
        external_id: groupKey,
        raw_json: [p],
        mapped_name: nameVal ? nameVal.toUpperCase() : null,
        mapped_price: priceNum ?? null,
        price_tag: priceNum ?? null,
        mapped_stock: baseVarStock > 0 ? baseVarStock : stockNum ?? 0,
        sizes: sizeFromRow ? [sizeFromRow] : [],
        mapped_image_url: mappedImageCandidate
          ? String(mappedImageCandidate)
          : null,
        photo_url: photoArr,
        eta_text: "30-60 min",
        is_active: true,
        status: "draft",
      };

      if (detailVariacoes.length) {
        for (const vv of detailVariacoes) {
          const v = vv as Record<string, unknown>;
          const label =
            (v["tamanho"] as unknown) ||
            (v["variacao"] as unknown) ||
            (v["descricao"] as unknown) ||
            (v["nome"] as unknown) ||
            (v["sku"] as unknown) ||
            ((v["grade"] as { Tamanho?: unknown } | undefined)
              ?.Tamanho as unknown) ||
            "U";
          const sizeNorm = String(label).toUpperCase();
          if (!byKey[groupKey].sizes.includes(sizeNorm)) {
            byKey[groupKey].sizes.push(sizeNorm);
          }
        }
      }
    } else {
      const base = byKey[groupKey];

      if (base.mapped_price == null && priceNum != null) {
        base.mapped_price = priceNum;
        base.price_tag = priceNum;
      }

      base.mapped_stock =
        Number(base.mapped_stock ?? 0) + Number(stockNum ?? 0);

      if (detailVariacoes.length) {
        for (const vv of detailVariacoes) {
          const v = vv as Record<string, unknown>;
          const vEst =
            v["estoque"] ??
            v["saldo"] ??
            v["quantidade"] ??
            v["qtd"] ??
            v["estoque_disponivel"] ??
            (typeof v["variacao"] === "object" && v["variacao"] != null
              ? (v["variacao"] as Record<string, unknown>)["estoque"]
              : 0);
          const num = Number(vEst);
          if (!Number.isNaN(num)) {
            base.mapped_stock =
              Number(base.mapped_stock ?? 0) + Number(num ?? 0);
          }

          const label =
            v["tamanho"] ??
            v["variacao"] ??
            v["descricao"] ??
            v["nome"] ??
            v["sku"] ??
            (v["grade"] as { Tamanho?: unknown } | undefined)?.Tamanho ??
            "U";
          const sizeNorm = String(label).toUpperCase();
          if (!base.sizes.includes(sizeNorm)) {
            base.sizes.push(sizeNorm);
          }
        }
      }

      const imgCandidate =
        (p as TinyListProduct).imagem ??
        (p as TinyListProduct).image ??
        (p as TinyListProduct).foto ??
        (p as TinyListProduct).foto_principal ??
        detail?.imagem ??
        null;

      if (
        (!base.mapped_image_url || base.photo_url.length === 0) &&
        imgCandidate
      ) {
        base.mapped_image_url = String(imgCandidate);
        base.photo_url = [String(imgCandidate)];
      }

      base.raw_json.push(p);
    }
  }

  return Object.values(byKey);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const token =
      typeof body?.token === "string" ? body.token.trim() : undefined;
    const storeId =
      typeof body?.store_id === "number" ? body.store_id : undefined;
    const mapping = (body?.mapping ?? {}) as Record<string, string>;

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing-token",
          detail: "Token do Tiny não foi enviado.",
        },
        { status: 400 }
      );
    }
    if (!storeId) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing-store",
          detail: "store_id não foi enviado no body.",
        },
        { status: 400 }
      );
    }

    const { data: storeRow, error: storeErr } = await supabase
      .from("stores")
      .select("id, store_name")
      .eq("id", storeId)
      .maybeSingle();

    if (storeErr) {
      return NextResponse.json(
        {
          ok: false,
          error: "store-query-failed",
          detail: storeErr.message,
        },
        { status: 500 }
      );
    }

    const storeName =
      (storeRow as { store_name?: string | null } | null)?.store_name ?? null;

    // salva integração
    const { error: integrationErr } = await supabase
      .from("partner_integrations")
      .upsert(
        {
          store_id: storeId,
          store_name: storeName,
          provider: "tiny",
          token,
          access_token: token,
          integration_data: {
            token,
            step: "commit",
            mapping,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id,provider" }
      );

    if (integrationErr) {
      return NextResponse.json(
        {
          ok: false,
          error: "integration-upsert-failed",
          detail: integrationErr.message,
        },
        { status: 500 }
      );
    }

    // 1) baixa tudo
    const allTinyProducts = await fetchAllTinyProducts(token);
    if (!allTinyProducts.length) {
      return NextResponse.json({
        ok: true,
        warning: "empty-tiny-products",
      });
    }

    // 2) baixa estoque realtime (pode vir vazio)
    const { byId, byCode } = await fetchTinyStockUpdates(token);

    // 3) enriquece cada produto
    const enriched: TinyItem[] = [];
    for (const p of allTinyProducts) {
      const id =
        (p.id as unknown) ??
        (p.codigo_produto as unknown) ??
        (p.codigo as unknown) ??
        null;
      const idStr = id ? String(id) : "";
      const codeStr =
        p.codigo && String(p.codigo).trim().length
          ? String(p.codigo).trim()
          : "";

      let finalStock = 0;
      let fonte = "none";

      // prioridade 1: realtime
      if (idStr && byId[idStr] != null) {
        finalStock = byId[idStr];
        fonte = "realtime-id";
      } else if (codeStr && byCode[codeStr] != null) {
        finalStock = byCode[codeStr];
        fonte = "realtime-code";
      } else {
        // tenta detalhe via GET
        let detailRes: TinyDetailResp | null = null;
        if (id) {
          detailRes = await tinyGetDetailGET(token, id as string | number);
        }
        if (detailRes?.ok && detailRes.data) {
          const d = detailRes.data;
          if (Array.isArray(d.depositos) && d.depositos.length) {
            let tot = 0;
            for (const dd of d.depositos) {
              const dep = dd?.deposito;
              if (!dep) continue;
              if (dep.desconsiderar === "S") continue;
              const n = dep.saldo != null ? Number(dep.saldo) : 0;
              if (!Number.isNaN(n)) tot += n;
            }
            finalStock = tot;
            fonte = "detail-depositos";
          } else {
            const cand =
              d.saldo_estoque ?? d.estoque_atual ?? d.estoque ?? d.saldo ?? 0;
            finalStock = Number(cand) || 0;
            fonte = "detail-campos";
          }

          enriched.push({
            ...(p as TinyItem),
            __detail: detailRes.data,
            __estoque_final: finalStock,
            __estoque_fonte: fonte,
          });
          continue;
        }

        // último fallback: o que veio na lista
        const cand = p?.estoque ?? p?.saldo ?? p?.quantidade ?? 0;
        finalStock = Number(cand) || 0;
        fonte = "lista";

        enriched.push({
          ...(p as TinyItem),
          __detail: detailRes && !detailRes.ok ? null : null,
          __estoque_final: finalStock,
          __estoque_fonte: fonte,
        });
        continue;
      }

      enriched.push({
        ...(p as TinyItem),
        __detail: null,
        __estoque_final: finalStock,
        __estoque_fonte: fonte,
      });
    }

    // 4) agrupa
    const grouped = groupTinyProducts(enriched, mapping, storeId, storeName);

    // 5) grava na staging
    const rows: StagingRow[] = grouped.map(
      (g): StagingRow => ({
        store_id: g.store_id,
        store_name: g.store_name,
        provider: "tiny",
        external_id: g.external_id,
        raw_json: g.raw_json,
        mapped_name: g.mapped_name,
        mapped_price: g.mapped_price,
        price_tag: g.price_tag,
        mapped_stock: g.mapped_stock,
        sizes: g.sizes && g.sizes.length ? g.sizes : null,
        mapped_image_url: g.mapped_image_url,
        photo_url: g.photo_url,
        eta_text: g.eta_text,
        is_active: g.is_active,
        status: g.status,
      })
    );

    const { error: stagingErr } = await supabase
      .from("product_import_staging")
      .upsert(rows, {
        onConflict: "store_id,provider,external_id",
      });

    if (stagingErr) {
      return NextResponse.json(
        {
          ok: true,
          warning: "staging-upsert-failed",
          detail: stagingErr.message,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      ok: true,
      imported_to_staging: rows.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro inesperado.";
    console.error("tiny commit unexpected:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "server-error",
        detail: message,
      },
      { status: 500 }
    );
  }
}
