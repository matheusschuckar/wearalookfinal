// app/api/integrations/tiny/save/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// client com service role para poder fazer select/insert sem RLS travar
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, store_id, store_name } = body as {
      token?: string;
      store_id?: number | string | null;
      store_name?: string | null;
    };

    // 1) validar token
    if (!token || !token.toString().trim()) {
      return NextResponse.json(
        { ok: false, error: "missing-token" },
        { status: 400 }
      );
    }

    // 2) tentar descobrir o ID da loja
    let finalStoreId: number | null = null;

    // se veio id direto do front, usa
    if (store_id !== undefined && store_id !== null && store_id !== "") {
      finalStoreId = Number(store_id);
    }

    // se não veio id, mas veio nome, tenta achar por nome
    if (!finalStoreId && store_name && store_name.trim()) {
      const cleanName = store_name.trim();

      // 2.a) tenta achar por nome exato
      const { data: exactStore, error: exactErr } = await supabase
        .from("stores")
        .select("id, name")
        .eq("name", cleanName)
        .maybeSingle();

      if (exactErr) {
        console.error("supabase exact store error:", exactErr);
      }

      if (exactStore?.id) {
        finalStoreId = exactStore.id;
      } else {
        // 2.b) tenta achar por case-insensitive (ilike)
        const { data: ilikeStores, error: ilikeErr } = await supabase
          .from("stores")
          .select("id, name")
          .ilike("name", cleanName)
          .limit(1);

        if (ilikeErr) {
          console.error("supabase ilike store error:", ilikeErr);
        }

        if (ilikeStores && ilikeStores.length > 0) {
          finalStoreId = ilikeStores[0].id;
        } else {
          // 2.c) se ainda não achou, vamos criar a loja na tabela stores
          const { data: inserted, error: insertErr } = await supabase
            .from("stores")
            .insert({ name: cleanName })
            .select("id")
            .maybeSingle();

          if (insertErr) {
            console.error("supabase insert store error:", insertErr);
            return NextResponse.json(
              { ok: false, error: "cannot-create-store" },
              { status: 500 }
            );
          }

          if (inserted?.id) {
            finalStoreId = inserted.id;
          }
        }
      }
    }

    // se mesmo assim não temos store, não tem o que fazer
    if (!finalStoreId) {
      return NextResponse.json(
        { ok: false, error: "missing-store" },
        { status: 400 }
      );
    }

    // 3) agora upsert na partner_integrations
    const payload = {
      store_id: finalStoreId,
      provider: "tiny",
      token,
    };

    const { error: upsertErr } = await supabase
      .from("partner_integrations")
      .upsert(payload, {
        onConflict: "store_id,provider",
      });

    if (upsertErr) {
      console.error("supabase tiny upsert error:", upsertErr);
      return NextResponse.json(
        { ok: false, error: "db-error", detail: upsertErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("tiny save err:", err);
    return NextResponse.json(
      { ok: false, error: "server-error", detail: message },
      { status: 500 }
    );
  }
}
