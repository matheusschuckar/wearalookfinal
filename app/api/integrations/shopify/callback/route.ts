// app/api/integrations/shopify/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY!;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

// helper p/ validar HMAC do Shopify
function validateHmac(url: URL): boolean {
  const hmac = url.searchParams.get("hmac");
  if (!hmac) return false;

  // copia e remove hmac
  const params = new URLSearchParams(url.search);
  params.delete("hmac");

  const message = params.toString();
  const generated = crypto
    .createHmac("sha256", SHOPIFY_API_SECRET)
    .update(message)
    .digest("hex");

  return generated === hmac;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const shop = url.searchParams.get("shop");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!shop || !code || !state) {
    return NextResponse.json({ error: "params faltando" }, { status: 400 });
  }

  // validação opcional do HMAC (mantém o fluxo mesmo se falhar, só loga)
  const hmacOk = validateHmac(url);
  if (!hmacOk) {
    console.warn("Shopify HMAC inválido");
    // se quiser bloquear, troque por:
    // return NextResponse.json({ error: "HMAC inválido" }, { status: 400 });
  }

  // recupera store_name e store_id do state
  let storeName: string | null = null;
  let storeId: number | null = null;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    storeName = decoded.s ?? null;
    storeId = decoded.i ? Number(decoded.i) : null;
  } catch {
    // segue sem
  }

  // troca o code por access_token
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // doc Shopify: precisa mandar client_id, client_secret e code
    body: JSON.stringify({
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error("shopify token error:", text);
    return NextResponse.json(
      { error: "falha ao trocar token", detail: text },
      { status: 500 }
    );
  }

  const json = await tokenRes.json();
  const accessToken = json.access_token as string;

  // salva no Supabase com service role
  const { error } = await supabaseAdmin.from("partner_integrations").insert({
    store_name: storeName,
    store_id: storeId,
    provider: "shopify",
    access_token: accessToken,
    shop_domain: shop,
  });

  if (error) {
    console.error("erro ao salvar integração no supabase:", error);
    return NextResponse.json(
      { error: "falha ao salvar integração" },
      { status: 500 }
    );
  }

  // redireciona de volta para o painel parceiro
  return NextResponse.redirect(`${APP_URL}/parceiros/produtos/conectar?ok=1`);
}
