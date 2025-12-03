"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// -------------------- Tipos --------------------

type DiscountType = "percent" | "fixed";

type CouponKind =
  | "A" // uso único por CPF
  | "B" // primeiro pedido
  | "C"; // ilimitado

type StoreRow = {
  id: number;
  store_name: string;
};

type ProductRow = {
  id: number;
  name: string;
  store_name: string;
  photo_url: string | null;
};

type NewCouponRow = {
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  coupon_kind: CouponKind;
  active: boolean;
  max_uses: number | null;
  expires_at: string | null;
  created_by: string; // look ou brand:<id>
};

type CouponApplicabilityInsert = {
  coupon_id: string;
  brand_id?: number | null;
  product_id?: number | null;
};

// -------------------- Component --------------------

export default function DeveloperCouponPage() {
  // basic info
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  const [discountType, setDiscountType] = useState<DiscountType>("percent");
  const [discountValue, setDiscountValue] = useState("10");

  const [couponKind, setCouponKind] = useState<CouponKind>("A");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState("");

  const [active, setActive] = useState(true);

  // scope
  const [scope, setScope] = useState<"global" | "brands" | "products">("global");
  const [brands, setBrands] = useState<StoreRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);

  const [selectedBrands, setSelectedBrands] = useState<number[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Load brands + products
  useEffect(() => {
    const fetchData = async () => {
      const { data: brandsData } = await supabase
        .from("stores")
        .select("id,store_name")
        .order("store_name");

      if (Array.isArray(brandsData)) {
        setBrands(brandsData as StoreRow[]);
      }

      const { data: productsData } = await supabase
        .from("products")
        .select("id,name,store_name,photo_url")
        .order("id", { ascending: false });

      if (Array.isArray(productsData)) {
        setProducts(productsData as ProductRow[]);
      }
    };

    fetchData();
  }, []);

  // -------------------- Save --------------------

  const handleSave = async () => {
    setNotice(null);

    if (!code.trim()) {
      setNotice("Insira um código.");
      return;
    }

    const discountNumeric = Number(discountValue);
    if (!isFinite(discountNumeric) || discountNumeric <= 0) {
      setNotice("Valor de desconto inválido.");
      return;
    }

    setLoading(true);

    try {
      const payload: NewCouponRow = {
        code: code.trim().toUpperCase(),
        description: description.trim() || null,
        discount_type: discountType,
        discount_value: Math.round(discountNumeric * 100) / 100,
        coupon_kind: couponKind,
        active,
        max_uses: maxUses.trim() ? Number(maxUses) : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        created_by: "look", // aqui developer cria como LOOK, se quiser mudar me fale
      };

      // insert coupon
      const { data: cupData, error: cupErr } = await supabase
        .from("coupons")
        .insert(payload)
        .select();

      if (cupErr) throw cupErr;

      const inserted = Array.isArray(cupData) ? cupData[0] : null;
      if (!inserted || !inserted.id) {
        throw new Error("Falha ao obter ID do cupom.");
      }

      const couponId = inserted.id as string;

      // build applicabilities
      const rows: CouponApplicabilityInsert[] = [];

      if (scope === "brands") {
        for (const id of selectedBrands) {
          rows.push({ coupon_id: couponId, brand_id: id });
        }
      }

      if (scope === "products") {
        for (const id of selectedProducts) {
          rows.push({ coupon_id: couponId, product_id: id });
        }
      }

      if (rows.length > 0) {
        const { error: apErr } = await supabase
          .from("coupon_applicabilities")
          .insert(rows);

        if (apErr) throw apErr;
      }

      setNotice("Cupom criado com sucesso!");
      setCode("");
      setDescription("");
      setDiscountValue("10");
      setMaxUses("");
      setExpiresAt("");
      setSelectedBrands([]);
      setSelectedProducts([]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro desconhecido ao salvar.";
      setNotice(message);
    } finally {
      setLoading(false);
    }
  };

  // -------------------- Render (LAYOUT APENAS) --------------------

  return (
    <main className="min-h-screen bg-[#F7F4EF]">
      <header className="w-full border-b border-[#E5E0DA]/80 bg-[#F7F4EF]/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
              <span className="text-[13px] font-semibold tracking-tight text-white leading-none">L</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-black">Cupons — Developer</span>
              <span className="text-[11px] text-neutral-500">Crie cupons com escopo avançado</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={loading}
              className={`h-10 px-6 rounded-full text-sm font-medium text-white ${loading ? "bg-neutral-600" : "bg-black hover:opacity-90"}`}
            >
              {loading ? "Salvando…" : "Criar cupom"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-8 py-10">
        <div className="rounded-3xl p-6 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.18)] bg-white/60 border" style={{ borderColor: "#E5E0DA", backdropFilter: "blur(6px)" }}>
          <h1 className="text-xl font-semibold mb-4">Criar cupom (Developer)</h1>

          {notice && (
            <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-amber-900 border border-amber-200">
              {notice}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Código */}
            <div>
              <label className="text-[12px] font-medium text-neutral-700 block mb-2">Código</label>
              <input
                className="w-full rounded-xl border border-neutral-300 h-10 px-3 text-sm"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="EX: LOOK10"
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="text-[12px] font-medium text-neutral-700 block mb-2">Descrição (opcional)</label>
              <input
                className="w-full rounded-xl border border-neutral-300 h-10 px-3 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve descrição para controle interno"
              />
            </div>

            {/* Desconto */}
            <div>
              <label className="text-[12px] font-medium text-neutral-700 block mb-2">Desconto</label>
              <div className="flex items-center gap-3">
                <select
                  className="rounded-xl border border-neutral-300 h-10 px-3 text-sm"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                >
                  <option value="percent">% (percentual)</option>
                  <option value="fixed">R$ (fixo)</option>
                </select>
                <input
                  className="rounded-xl border border-neutral-300 h-10 px-3 text-sm w-32"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </div>
            </div>

            {/* Kind */}
            <div>
              <label className="text-[12px] font-medium text-neutral-700 block mb-2">Uso (Kind)</label>
              <select
                className="w-full rounded-xl border border-neutral-300 h-10 px-3 text-sm"
                value={couponKind}
                onChange={(e) => setCouponKind(e.target.value as CouponKind)}
              >
                <option value="A">A — uso único por CPF</option>
                <option value="B">B — válido apenas no primeiro pedido</option>
                <option value="C">C — ilimitado (qualquer número de usos)</option>
              </select>
            </div>

            {/* Validade */}
            <div>
              <label className="text-[12px] font-medium text-neutral-700 block mb-2">Validade (opcional)</label>
              <input
                type="date"
                className="w-full rounded-xl border border-neutral-300 h-10 px-3 text-sm"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            {/* Max uses */}
            <div>
              <label className="text-[12px] font-medium text-neutral-700 block mb-2">Máximo de usos (opcional)</label>
              <input
                className="w-full rounded-xl border border-neutral-300 h-10 px-3 text-sm"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Ex.: 100"
              />
              <div className="text-[11px] text-neutral-500 mt-1">
                Para kind A (uso único por CPF) este campo será ignorado.
              </div>
            </div>

            {/* Ativo */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                <span className="text-sm">Ativo</span>
              </label>
            </div>
          </div>

          {/* Escopo */}
          <div className="mt-6">
            <label className="text-sm font-medium block mb-2">Escopo do cupom</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => setScope("global")}
                className={`text-left px-4 h-10 rounded-xl border text-sm ${scope === "global" ? "bg-black text-white border-black" : "bg-white border-neutral-300"}`}
              >
                Global — todas as marcas e produtos
              </button>
              <button
                onClick={() => setScope("brands")}
                className={`text-left px-4 h-10 rounded-xl border text-sm ${scope === "brands" ? "bg-black text-white border-black" : "bg-white border-neutral-300"}`}
              >
                Marcas específicas
              </button>
              <button
                onClick={() => setScope("products")}
                className={`text-left px-4 h-10 rounded-xl border text-sm ${scope === "products" ? "bg-black text-white border-black" : "bg-white border-neutral-300"}`}
              >
                Produtos específicos
              </button>
            </div>

            {scope === "brands" && (
              <div className="mt-4 bg-white rounded border p-4">
                <div className="text-xs mb-2">Selecione as marcas</div>
                <div className="grid grid-cols-2 gap-2">
                  {brands.map((b) => {
                    const checked = selectedBrands.includes(b.id);
                    return (
                      <label key={b.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setSelectedBrands((prev) =>
                              checked ? prev.filter((x) => x !== b.id) : [...prev, b.id]
                            );
                          }}
                        />
                        {b.store_name}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {scope === "products" && (
              <div className="mt-4 bg-white rounded border p-4">
                <div className="text-xs mb-2">Selecione produtos</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[260px] overflow-auto">
                  {products.map((p) => {
                    const checked = selectedProducts.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 text-sm truncate">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setSelectedProducts((prev) =>
                              checked ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                            );
                          }}
                        />
                        {p.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => {
                // reset small form (visual convenience)
                setCode("");
                setDescription("");
                setDiscountValue("10");
                setCouponKind("A");
                setExpiresAt("");
                setMaxUses("");
                setSelectedBrands([]);
                setSelectedProducts([]);
              }}
              className="h-10 px-4 rounded-full border bg-white/90 text-sm"
            >
              Limpar
            </button>

            <button
              onClick={handleSave}
              disabled={loading}
              className={`h-10 px-6 rounded-full text-sm font-medium text-white ${loading ? "bg-neutral-600" : "bg-black hover:opacity-90"}`}
            >
              {loading ? "Salvando…" : "Criar cupom"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
