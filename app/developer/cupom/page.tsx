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

  // -------------------- Render --------------------

  return (
    <main className="p-10 max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Criar cupom (Developer)</h1>

      {notice && (
        <div className="p-3 rounded bg-amber-100 border border-amber-300 text-amber-900 text-sm">
          {notice}
        </div>
      )}

      {/* Código */}
      <section className="space-y-2">
        <label className="text-sm font-medium">Código</label>
        <input
          className="border rounded px-3 h-10 w-full"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </section>

      {/* Descrição */}
      <section className="space-y-2">
        <label className="text-sm font-medium">Descrição</label>
        <input
          className="border rounded px-3 h-10 w-full"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </section>

      {/* Tipo de desconto */}
      <section className="space-y-2">
        <label className="text-sm font-medium">Desconto</label>

        <div className="flex gap-3 items-center">
          <select
            className="border rounded px-3 h-10"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as DiscountType)}
          >
            <option value="percent">% (percentual)</option>
            <option value="fixed">R$ (fixo)</option>
          </select>

          <input
            className="border rounded px-3 h-10 w-32"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
          />
        </div>
      </section>

      {/* Kind */}
      <section className="space-y-2">
        <label className="text-sm font-medium">Uso</label>
        <select
          className="border rounded px-3 h-10 w-full"
          value={couponKind}
          onChange={(e) => setCouponKind(e.target.value as CouponKind)}
        >
          <option value="A">A — uso único por CPF</option>
          <option value="B">B — válido apenas no primeiro pedido</option>
          <option value="C">C — ilimitado (qualquer número de usos)</option>
        </select>
      </section>

      {/* Escopo */}
      <section className="space-y-2">
        <label className="text-sm font-medium">Escopo do cupom</label>

        <select
          className="border rounded px-3 h-10 w-full"
          value={scope}
          onChange={(e) =>
            setScope(e.target.value as "global" | "brands" | "products")
          }
        >
          <option value="global">Global — todas as marcas e produtos</option>
          <option value="brands">Marcas específicas</option>
          <option value="products">Produtos específicos</option>
        </select>

        {scope === "brands" && (
          <div className="space-y-2 bg-white rounded border p-3">
            <div className="text-xs mb-2">Selecione as marcas:</div>

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
                          checked
                            ? prev.filter((x) => x !== b.id)
                            : [...prev, b.id]
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
          <div className="space-y-2 bg-white rounded border p-3">
            <div className="text-xs mb-2">Selecione produtos:</div>

            <div className="grid grid-cols-2 gap-2 max-h-[260px] overflow-auto">
              {products.map((p) => {
                const checked = selectedProducts.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 text-sm truncate"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedProducts((prev) =>
                          checked
                            ? prev.filter((x) => x !== p.id)
                            : [...prev, p.id]
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
      </section>

      {/* validade */}
      <section className="space-y-2">
        <label className="text-sm font-medium">Validade (opcional)</label>
        <input
          type="date"
          className="border rounded px-3 h-10 w-full"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </section>

      {/* max uses */}
      <section className="space-y-2">
        <label className="text-sm font-medium">Máximo de usos (opcional)</label>
        <input
          className="border rounded px-3 h-10 w-full"
          value={maxUses}
          onChange={(e) => setMaxUses(e.target.value)}
        />
      </section>

      {/* ativo */}
      <section className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        <span className="text-sm">Ativo</span>
      </section>

      <button
        onClick={handleSave}
        disabled={loading}
        className={`h-12 rounded-full px-6 text-white text-sm font-medium ${
          loading ? "bg-neutral-600" : "bg-black hover:opacity-90"
        }`}
      >
        {loading ? "Salvando…" : "Criar cupom"}
      </button>
    </main>
  );
}
