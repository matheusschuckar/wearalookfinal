// app/api/integrations/shopify/install/route.ts
import { NextRequest, NextResponse } from "next/server";

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY!;
const SHOPIFY_SCOPES =
  process.env.SHOPIFY_SCOPES ||
  "read_products,write_products,read_inventory,write_inventory,read_locations";

// ⚠️ HARD-CODE porque o Shopify reclamou
const SHOPIFY_REDIRECT_URI =
  process.env.SHOPIFY_REDIRECT_URI ||
  "https://wearalook.com/api/integrations/shopify/callback";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // o front deve mandar ?shop=loja.myshopify.com
  let shop = searchParams.get("shop") || "";

  // fallback: às vezes você mandou só o nome da loja (TATIANA LOUREIRO)
  if (shop && !shop.includes(".myshopify.com")) {
    // normaliza
    const normalized = shop.trim().toLowerCase().replace(/\s+/g, "-");
    shop = `${normalized}.myshopify.com`;
  }

  if (!shop) {
    return NextResponse.json({ error: "shop ausente" }, { status: 400 });
  }

  // você pode querer guardar isso depois no supabase
  const storeName = searchParams.get("store") || null;
  const storeId = searchParams.get("store_id") || null;

  // state para saber quem é no callback
  const statePayload = {
    s: storeName,
    i: storeId,
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

  // AQUI é o ponto que tava dando erro: vamos mandar exatamente o mesmo redirect
  const installUrl =
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${encodeURIComponent(SHOPIFY_API_KEY)}` +
    `&scope=${encodeURIComponent(SHOPIFY_SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(SHOPIFY_REDIRECT_URI)}` +
    `&state=${encodeURIComponent(state)}`;

  return NextResponse.redirect(installUrl);
}
