// app/api/catalog/categories/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

type CategoryRow = { category: string | null };

export async function GET() {
  try {
    const { data: prodCats, error: prodErr } = await supabase
      .from("products")
      .select("category")
      .not("category", "is", null)
      .returns<CategoryRow[]>();

    const { data: stagingCats, error: stagErr } = await supabase
      .from("product_import_staging")
      .select("category")
      .not("category", "is", null)
      .returns<CategoryRow[]>();

    if (prodErr) console.warn("categories products err", prodErr.message);
    if (stagErr) console.warn("categories staging err", stagErr.message);

    const set = new Set<string>();

    for (const r of prodCats ?? []) {
      if (r.category) set.add(r.category.trim());
    }
    for (const r of stagingCats ?? []) {
      if (r.category) set.add(r.category.trim());
    }

    const list = Array.from(set).sort((a, b) =>
      a.localeCompare(b, "pt-BR", { sensitivity: "base" })
    );

    return NextResponse.json({ ok: true, categories: list });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err);
    console.error("categories GET", err);
    return NextResponse.json(
      { ok: false, error: "server-error", detail: message },
      { status: 500 }
    );
  }
}
