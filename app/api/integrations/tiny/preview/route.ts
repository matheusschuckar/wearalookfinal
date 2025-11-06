// app/api/integrations/tiny/preview/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

// -----------------------------
// Tipos utilitários (mínimos)
// -----------------------------
type TinyDeposito = { deposito?: { desconsiderar?: string; saldo?: unknown } };
type TinyVariation = Record<string, unknown>;

type TinyDetail = {
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
  estoque?: unknown;
  saldo?: unknown;
  quantidade?: unknown;
  saldo_estoque?: unknown;
  saldoReservado?: unknown;
};

type TinyListWrap = { produto: TinyListProduct } | TinyListProduct;

type DebugEntry = { endpoint: string; text?: string; error?: string };

function unwrapTinyWrap(w: TinyListWrap): TinyListProduct {
  return "produto" in w && w.produto ? w.produto : (w as TinyListProduct);
}

// ------------------------------------------------------------
// tenta pegar detalhe de 1 produto no Tiny (GET)
// ------------------------------------------------------------
type TinyDetailResp =
  | { ok: true; raw_text: null; data: TinyDetail }
  | { ok: false; raw_text: string };

async function tinyGetDetailGET(token: string, id: string | number): Promise<TinyDetailResp> {
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
      // o Tiny às vezes retorna "File not found.\n" cru
      return { ok: false, raw_text: text };
    }

    const j = json as { retorno?: { status?: string; produto?: TinyDetail } };
    if (j?.retorno?.status === "OK" && j.retorno.produto) {
      return { ok: true, raw_text: null, data: j.retorno.produto };
    }

    return { ok: false, raw_text: JSON.stringify(json) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "detail error";
    return { ok: false, raw_text: message };
  }
}

// ------------------------------------------------------------
// tenta pegar fila de estoque em tempo real (sem esvaziar tudo)
// ------------------------------------------------------------
async function tinyGetStockRealtime(token: string): Promise<{
  byId: Record<string, number>;
  byCode: Record<string, number>;
  debug: DebugEntry[];
}> {
  const debug: DebugEntry[] = [];

  // endpoint sem .php
  try {
    const url = "https://api.tiny.com.br/api2/lista.atualizacoes.estoque";
    const params = new URLSearchParams();
    const agora = new Date();
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

    const text = await res.text();
    debug.push({ endpoint: "estoque", text });

    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      // cairá no fallback abaixo
    }

    const root = json as { retorno?: { status?: string; produtos?: TinyListWrap[] } };
    if (root?.retorno?.status === "OK") {
      const produtos = root.retorno?.produtos || [];
      const byId: Record<string, number> = {};
      const byCode: Record<string, number> = {};

      for (const wrap of produtos) {
        const p = unwrapTinyWrap(wrap);
        if (!p) continue;

        // soma depósitos quando existir
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

        if (p.id != null) byId[String(p.id)] = final;
        if (p.codigo != null) byCode[String(p.codigo)] = final;
      }

      return { byId, byCode, debug };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "err";
    debug.push({ endpoint: "estoque", error: message });
  }

  // fallback com .php
  try {
    const url = "https://api.tiny.com.br/api2/lista.atualizacoes.estoque.php";
    const params = new URLSearchParams();
    const agora = new Date();
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

    const text = await res.text();
    debug.push({ endpoint: "estoque.php", text });

    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      return { byId: {}, byCode: {}, debug };
    }

    const root = json as { retorno?: { status?: string; produtos?: TinyListWrap[] } };
    if (root?.retorno?.status === "OK") {
      const produtos = root.retorno?.produtos || [];
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

        if (p.id != null) byId[String(p.id)] = final;
        if (p.codigo != null) byCode[String(p.codigo)] = final;
      }
      return { byId, byCode, debug };
    }

    return { byId: {}, byCode: {}, debug };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : undefined;
    return { byId: {}, byCode: {}, debug: [{ endpoint: "estoque.php", error: message }] };
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const token = typeof body?.token === "string" ? body.token.trim() : undefined;
    const storeName = (body?.store_name as string | null) ?? null;
    const storeIdRaw = (body?.store_id as number | string | null) ?? null;

    if (!token) {
      return NextResponse.json({ ok: false, error: "missing-token" }, { status: 400 });
    }

    // descobrir store_id
    let finalStoreId: number | null = null;
    if (typeof storeIdRaw === "number" || typeof storeIdRaw === "string") {
      const n = Number(storeIdRaw);
      if (!Number.isNaN(n)) finalStoreId = n;
    }
    if (!finalStoreId && storeName) {
      const { data: storeRow } = await supabase
        .from("stores")
        .select("id")
        .eq("store_name", storeName)
        .maybeSingle();
      if (storeRow?.id) finalStoreId = storeRow.id as number;
    }
    if (!finalStoreId) {
      return NextResponse.json({ ok: false, error: "store-not-found" }, { status: 400 });
    }

    // salva integração
    await supabase.from("partner_integrations").upsert(
      {
        store_id: finalStoreId,
        store_name: storeName,
        provider: "tiny",
        token,
        access_token: token,
        integration_data: { token, step: "preview" },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id,provider" }
    );

    // 1) pegar uma página de produtos
    const pesquisaUrl = "https://api.tiny.com.br/api2/produtos.pesquisa.php";
    const params = new URLSearchParams();
    params.append("token", token);
    params.append("formato", "json");
    params.append("pesquisa", "");
    params.append("pagina", "1");

    const pesquisaRes = await fetch(pesquisaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const pesquisaText = await pesquisaRes.text();
    let pesquisaJson: unknown = null;
    try {
      pesquisaJson = JSON.parse(pesquisaText);
    } catch {
      pesquisaJson = null;
    }

    type PesquisaRoot = { retorno?: { status?: string; produtos?: TinyListWrap[] } };
    const pr = pesquisaJson as PesquisaRoot | null;

    let products_sample: TinyListProduct[] = [];
    let tiny_fields: string[] = [];

    if (pr?.retorno?.status === "OK" && Array.isArray(pr.retorno.produtos)) {
      products_sample = pr.retorno.produtos.slice(0, 5).map((w) => unwrapTinyWrap(w));
      if (products_sample.length) {
        tiny_fields = Object.keys(products_sample[0] as Record<string, unknown>);
      }
    }

    // 2) estoque realtime (pode vir vazio)
    const stockRealtime = await tinyGetStockRealtime(token);

    // 3) detalhe via GET para cada um
    type EnrichedPreview =
      TinyListProduct & {
        estoque: number;
        __estoque_fonte: string;
        __detail: TinyDetail | { raw_text: string; parsed: null } | null;
      };

    const enriched: EnrichedPreview[] = [];
    for (const prod of products_sample) {
      const id = prod?.id ?? prod?.codigo_produto ?? prod?.codigo ?? null;
      const idStr = id ? String(id) : "";
      const codigoStr =
        prod?.codigo && String(prod.codigo).trim().length
          ? String(prod.codigo).trim()
          : "";

      // tenta detalhe via GET
      const detail = id ? await tinyGetDetailGET(token, id as string | number) : null;

      // de onde vem o estoque?
      let estoque = 0;
      let estoque_fonte = "none";

      // prioridade 1: realtime
      if (idStr && stockRealtime.byId[idStr] != null) {
        estoque = stockRealtime.byId[idStr];
        estoque_fonte = "realtime-id";
      } else if (codigoStr && stockRealtime.byCode[codigoStr] != null) {
        estoque = stockRealtime.byCode[codigoStr];
        estoque_fonte = "realtime-code";
      } else if (detail?.ok && detail.data) {
        const d = detail.data;
        if (Array.isArray(d.depositos) && d.depositos.length) {
          let tot = 0;
          for (const dd of d.depositos) {
            const dep = dd?.deposito;
            if (!dep) continue;
            if (dep.desconsiderar === "S") continue;
            const n = dep.saldo != null ? Number(dep.saldo) : 0;
            if (!Number.isNaN(n)) tot += n;
          }
          estoque = tot;
          estoque_fonte = "detail-depositos";
        } else {
          const cand = d.saldo_estoque ?? d.estoque_atual ?? d.estoque ?? d.saldo ?? 0;
          estoque = Number(cand) || 0;
          estoque_fonte = "detail-campos";
        }
      } else {
        // último fallback é o que veio na lista
        const cand = prod?.estoque ?? prod?.saldo ?? prod?.quantidade ?? 0;
        estoque = Number(cand) || 0;
        estoque_fonte = "lista";
      }

      enriched.push({
        ...prod,
        estoque,
        __estoque_fonte: estoque_fonte,
        __detail: detail
          ? detail.ok
            ? detail.data
            : { raw_text: detail.raw_text, parsed: null }
          : null,
      });
    }

    // garantir que existe "estoque" no select
    if (!tiny_fields.includes("estoque")) {
      tiny_fields.push("estoque");
    }

    return NextResponse.json({
      ok: true,
      store_id: finalStoreId,
      tiny_fields,
      products_sample: enriched,
      __tiny_debug: {
        pesquisa: pesquisaJson,
        estoque: stockRealtime.debug,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "erro inesperado";
    return NextResponse.json(
      { ok: false, error: "server-error", detail: message },
      { status: 500 }
    );
  }
}
