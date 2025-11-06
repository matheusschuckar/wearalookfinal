// app/api/integrations/tiny/staging/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

// -------------------------
// Tipos utilitários
// -------------------------
type StagingRow = {
  id?: number | string;
  created_at?: string;
  store_id: number;
  store_name?: string | null;
  provider?: string | null;
  external_id?: string | null;
  name?: string | null;
  mapped_name?: string | null;
  price_tag?: number | null;
  mapped_price?: number | null;
  mapped_stock?: number | null;
  stock_total?: number | null;
  sizes?: string[] | string | null;
  size_stocks?: number[] | null;
  photo_url?: string[] | string | null;
  mapped_image_url?: string | null;
  eta_text?: string | null;
  is_active?: boolean | null;
  category?: string | null;
  categories?: string[] | string | null;
  gender?: string[] | string | null;
  status?: string | null;
  raw_json?: unknown;
};

type Grouped = {
  staging_ids: (number | string)[];
  id: number | string;
  store_id: number;
  store_name: string | null;
  provider: string | null;
  external_id: string | null;
  name: string | null;
  mapped_name: string | null;
  price_tag: number | null;
  mapped_price: number | null;
  mapped_stock: number;
  stock_total: number;
  sizes: string[] | null;
  size_stocks: number[] | null;
  size_entries: Array<{ size: string; stock: number }> | null;
  photo_url: string[] | null;
  mapped_image_url: string | null;
  eta_text: string | null;
  is_active: boolean;
  category: string | null;
  categories: string[] | null;
  gender: string[] | null;
  status: string;
  raw_json?: unknown[];
};

type InputItem = {
  store_id?: number;
  store_name?: string | null;
  name?: string | null;
  mapped_name?: string | null;
  stock_total?: number;
  mapped_stock?: number;
  price_tag?: number | null;
  mapped_price?: number | null;
  eta_text?: string | null;
  is_active?: boolean;
  category?: string | null;
  gender?: string[] | string;
  categories?: string[] | string;
  photo_url?: string[] | string | null;
  sizes?: string[] | string | null;
  size_stocks?: number[] | null;
  size_entries?: Array<{ size: string | number; stock: number | string }>;
  staging_ids?: Array<string | number>;
  staging_id?: string | number;
};

// helpers
function normalizeNameForGroup(name: string): string {
  if (!name) return "";
  let n = name.trim();
  // remove sufixo de tamanho
  n = n.replace(/\s*-\s*(PP|P|M|G|GG|XG|XGG|U|UNICO|ÚNICO)$/i, "");
  n = n.replace(/\s*\/\s*(PP|P|M|G|GG|XG|XGG|U|UNICO|ÚNICO)$/i, "");
  return n.trim();
}

function inferSizeFromName(name: string): string | null {
  if (!name) return null;
  const m = name.match(/[-/]\s*(PP|P|M|G|GG|XG|XGG|U|UNICO|ÚNICO)$/i);
  if (!m) return null;
  const sz = m[1].toUpperCase();
  if (sz === "UNICO" || sz === "ÚNICO" || sz === "U") return "U";
  return sz;
}

// GET agrupando por nome e já trazendo tamanhos com estoque
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const storeId = Number(searchParams.get("store_id"));

  if (!storeId) {
    return NextResponse.json(
      { ok: false, error: "missing-store" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("product_import_staging")
    .select("*")
    .eq("store_id", storeId)
    .eq("status", "draft")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("staging GET error", error);
    return NextResponse.json(
      { ok: false, error: "db-error", detail: error.message },
      { status: 500 }
    );
  }

  if (!data || !data.length) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const buckets: Record<string, Grouped> = {};

  for (const rowRaw of data as StagingRow[]) {
    const row = rowRaw as StagingRow;

    const baseName = normalizeNameForGroup(
      row.mapped_name || row.name || ""
    );

    // chave de agrupamento
    let bucketKey: string;
    if (baseName) {
      bucketKey = `name:${baseName.toLowerCase()}`;
    } else if (row.external_id && row.external_id.toString().trim() !== "") {
      bucketKey = `ext:${row.external_id.toString().trim()}`;
    } else {
      bucketKey = `row:${row.id}`;
    }

    // descobrir tamanho que está nessa linha
    let sizesFromRow: string[] = [];
    if (Array.isArray(row.sizes) && row.sizes.length) {
      sizesFromRow = (row.sizes as string[]).map((s) => String(s));
    } else if (typeof row.sizes === "string" && row.sizes.trim()) {
      sizesFromRow = row.sizes
        .split(/[,/]/g)
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      const inf = inferSizeFromName(row.mapped_name || row.name || "");
      if (inf) sizesFromRow = [inf];
    }

    const stockFromRow =
      typeof row.mapped_stock === "number"
        ? row.mapped_stock
        : typeof row.stock_total === "number"
        ? row.stock_total
        : 0;

    // foto
    let photoUrl: string[] | null = null;
    if (Array.isArray(row.photo_url)) {
      photoUrl = row.photo_url as string[];
    } else if (typeof row.photo_url === "string" && row.photo_url.trim()) {
      photoUrl = [row.photo_url.trim()];
    }

    // id local p/ agrupar
    const rowId =
      row.id ??
      globalThis.crypto?.randomUUID?.() ??
      Math.random().toString(36);

    if (!buckets[bucketKey]) {
      // criar bucket novo
      const sizeMap: Record<string, number> = {};
      if (sizesFromRow.length >= 1) {
        // caso com 1+ tamanhos, joga o estoque todo no primeiro
        sizeMap[sizesFromRow[0]] = stockFromRow;
      }

      buckets[bucketKey] = {
        staging_ids: [rowId as number | string],
        id: rowId as number | string,
        store_id: row.store_id,
        store_name: row.store_name ?? null,
        provider: row.provider ?? null,
        external_id: row.external_id ?? null,
        name: baseName || row.name || null,
        mapped_name: baseName || row.mapped_name || null,
        price_tag:
          typeof row.price_tag === "number"
            ? row.price_tag
            : typeof row.mapped_price === "number"
            ? row.mapped_price
            : null,
        mapped_price:
          typeof row.mapped_price === "number" ? row.mapped_price : null,
        mapped_stock: stockFromRow,
        stock_total: stockFromRow,
        sizes: Object.keys(sizeMap).length ? Object.keys(sizeMap) : null,
        size_stocks: Object.keys(sizeMap).length
          ? Object.keys(sizeMap).map((k) => sizeMap[k])
          : null,
        size_entries: Object.keys(sizeMap).length
          ? Object.keys(sizeMap).map((k) => ({
              size: k,
              stock: sizeMap[k],
            }))
          : null,
        photo_url: photoUrl,
        mapped_image_url: row.mapped_image_url ?? null,
        eta_text: row.eta_text ?? "30 - 60 min",
        is_active: typeof row.is_active === "boolean" ? row.is_active : true,
        category: row.category ?? null,
        categories: Array.isArray(row.categories)
          ? (row.categories as string[])
          : typeof row.categories === "string"
          ? row.categories
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : null,
        gender: Array.isArray(row.gender)
          ? (row.gender as string[])
          : typeof row.gender === "string" && row.gender.trim()
          ? row.gender
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : null,
        status: "draft",
        raw_json: row.raw_json != null ? [row.raw_json] : [],
      };
    } else {
      // já existe bucket, vamos somando
      const b = buckets[bucketKey];
      b.staging_ids.push(rowId as number | string);

      b.mapped_stock = (b.mapped_stock || 0) + stockFromRow;
      b.stock_total = (b.stock_total || 0) + stockFromRow;

      // montagem do mapa de tamanhos
      const currentMap: Record<string, number> = {};
      if (b.size_entries && b.size_entries.length) {
        for (const ent of b.size_entries) {
          currentMap[ent.size] = ent.stock;
        }
      }

      if (sizesFromRow.length >= 1) {
        const sz = sizesFromRow[0];
        currentMap[sz] = (currentMap[sz] || 0) + stockFromRow;
      }

      const finalSizes = Object.keys(currentMap);
      b.sizes = finalSizes.length ? finalSizes : null;
      b.size_stocks = finalSizes.length
        ? finalSizes.map((k) => currentMap[k])
        : null;
      b.size_entries = finalSizes.length
        ? finalSizes.map((k) => ({ size: k, stock: currentMap[k] }))
        : null;

      if (
        (!b.photo_url || b.photo_url.length === 0) &&
        photoUrl &&
        photoUrl.length
      ) {
        b.photo_url = photoUrl;
      }
      if (!b.mapped_image_url && row.mapped_image_url) {
        b.mapped_image_url = row.mapped_image_url;
      }
      if (row.raw_json != null) {
        b.raw_json = b.raw_json || [];
        b.raw_json.push(row.raw_json as unknown);
      }
    }
  }

  const groupedItems = Object.values(buckets);

  return NextResponse.json({
    ok: true,
    items: groupedItems,
  });
}

// POST
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action?: string;
      store_id?: number;
      items?: InputItem[];
    };

    const action = body?.action;
    const storeIdFromBody = body?.store_id;
    const itemsFromBody = body?.items;

    if (action === "commit_to_products") {
      if (!storeIdFromBody) {
        return NextResponse.json(
          { ok: false, error: "missing-store" },
          { status: 400 }
        );
      }

      if (!Array.isArray(itemsFromBody) || itemsFromBody.length === 0) {
        return NextResponse.json(
          { ok: false, error: "no-items" },
          { status: 400 }
        );
      }

      const { data: storeRow } = await supabase
        .from("stores")
        .select("id, store_name")
        .eq("id", storeIdFromBody)
        .maybeSingle();

      const fallbackStoreName = (storeRow as { store_name?: string | null } | null)?.store_name ?? null;

      type ProductInsertRow = {
        store_id: number;
        store_name: string | null;
        name: string | null;
        stock_total: number;
        price_tag: number | null;
        eta_text: string;
        is_active: boolean;
        category: string | null;
        gender: string[];
        categories: string[];
        photo_url: string[] | null;
        sizes: string[] | null;
        size_stocks: number[] | null;
      };

      const productsToInsert: ProductInsertRow[] = itemsFromBody.map((it) => {
        // photo_url
        let photo_url: string[] | null = null;
        if (Array.isArray(it.photo_url)) {
          photo_url = it.photo_url as string[];
        } else if (typeof it.photo_url === "string" && it.photo_url.trim()) {
          photo_url = [it.photo_url.trim()];
        }

        // sizes / size_stocks
        let sizes: string[] | null = null;
        let size_stocks: number[] | null = null;

        if (Array.isArray(it.size_entries) && it.size_entries.length) {
          sizes = it.size_entries.map((e) => String(e.size));
          size_stocks = it.size_entries.map((e) =>
            Number.isFinite(Number(e.stock)) ? Number(e.stock) : 0
          );
        } else if (Array.isArray(it.sizes) && it.sizes.length) {
          sizes = it.sizes as string[];
        } else if (typeof it.sizes === "string" && it.sizes.trim()) {
          sizes = it.sizes
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }

        // gender
        let gender: string[] = [];
        if (Array.isArray(it.gender) && it.gender.length) {
          gender = it.gender as string[];
        } else if (typeof it.gender === "string" && it.gender.trim()) {
          const g = it.gender.trim().toLowerCase();
          gender = g === "unisex" ? ["male", "female"] : [g];
        }

        // categories
        let categories: string[] = [];
        if (Array.isArray(it.categories)) {
          categories = it.categories as string[];
        } else if (typeof it.categories === "string" && it.categories.trim()) {
          categories = it.categories
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }

        // stock_total
        let stock_total = 0;
        if (Array.isArray(size_stocks) && size_stocks.length) {
          stock_total = size_stocks.reduce((acc, n) => acc + n, 0);
        } else if (typeof it.stock_total === "number") {
          stock_total = it.stock_total;
        } else if (typeof it.mapped_stock === "number") {
          stock_total = it.mapped_stock;
        }

        const row: ProductInsertRow = {
          store_id: it.store_id ?? storeIdFromBody,
          store_name: it.store_name ?? fallbackStoreName,
          name: it.name ?? it.mapped_name ?? null,
          stock_total,
          price_tag:
            typeof it.price_tag === "number"
              ? it.price_tag
              : typeof it.mapped_price === "number"
              ? it.mapped_price
              : null,
          eta_text: it.eta_text ?? "30 - 60 min",
          is_active: typeof it.is_active === "boolean" ? it.is_active : true,
          category: it.category ?? null,
          gender,
          categories,
          photo_url,
          sizes,
          size_stocks,
        };

        return row;
      });

      const { error: prodErr } = await supabase
        .from("products")
        .insert(productsToInsert);

      if (prodErr) {
        console.error("staging POST products insert error", prodErr);
        return NextResponse.json(
          {
            ok: false,
            error: "products-insert-failed",
            detail: prodErr.message,
          },
          { status: 500 }
        );
      }

      // marcar staging como imported
      const allStagingIds: (number | string)[] = [];
      for (const it of itemsFromBody) {
        if (Array.isArray(it.staging_ids)) {
          it.staging_ids.forEach((id) => allStagingIds.push(id));
        } else if (it.staging_id != null) {
          allStagingIds.push(it.staging_id);
        }
      }
      if (allStagingIds.length > 0) {
        await supabase
          .from("product_import_staging")
          .update({ status: "imported" })
          .in("id", allStagingIds as (number | string)[]);
      }

      return NextResponse.json({
        ok: true,
        imported: itemsFromBody.length,
      });
    }

    // fluxo antigo
    const storeId = storeIdFromBody;
    const items = (itemsFromBody || []) as Array<{
      external_id: string;
      mapped_name: string | null;
      price_tag: number | null;
      mapped_stock: number | null;
      sizes: string[] | null;
    }>;

    if (!storeId) {
      return NextResponse.json(
        { ok: false, error: "missing-store" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "no-items" },
        { status: 400 }
      );
    }

    const { data: storeRow2 } = await supabase
      .from("stores")
      .select("id, store_name")
      .eq("id", storeId)
      .maybeSingle();

    const storeName = (storeRow2 as { store_name?: string | null } | null)?.store_name ?? null;

    const productsToInsertOld = items.map((it) => {
      return {
        store_id: storeId,
        store_name: storeName,
        name: it.mapped_name,
        stock_total: it.mapped_stock ?? 0,
        price_tag: it.price_tag,
        eta_text: "30-60 min",
        is_active: true,
        category: null,
        gender: [] as string[],
        categories: [] as string[],
        photo_url: null as string[] | null,
        sizes: it.sizes ?? null,
      };
    });

    const { error: prodErr2 } = await supabase
      .from("products")
      .insert(productsToInsertOld);

    if (prodErr2) {
      console.error("staging POST products insert error", prodErr2);
      return NextResponse.json(
        {
          ok: false,
          error: "products-insert-failed",
          detail: prodErr2.message,
        },
        { status: 500 }
      );
    }

    const externalIds = items.map((it) => it.external_id);
    await supabase
      .from("product_import_staging")
      .update({ status: "imported" })
      .eq("store_id", storeId)
      .in("external_id", externalIds);

    return NextResponse.json({
      ok: true,
      imported: items.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "server error";
    console.error("staging POST unexpected", err);
    return NextResponse.json(
      { ok: false, error: "server-error", detail: message },
      { status: 500 }
    );
  }
}
