// app/parceiros/cupons/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// ---------- Tipos ----------
type ProductLite = {
  id: number;
  name: string;
  photo_url: string | string[] | null;
  price_tag: number | null;
};

type StoreRow = {
  id: number;
  store_name: string;
  slug: string | null;
};

type CouponKind = "A" | "B" | "C" | "D";
type DiscountType = "percent" | "fixed";

type NewCouponRow = {
  code: string;
  description?: string | null;
  discount_type: DiscountType;
  discount_value: number;
  coupon_kind: CouponKind;
  created_by: string;
  active: boolean;
  max_uses?: number | null;
  expires_at?: string | null;
};

// ---------- Helpers ----------
function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}
function firstImageUrl(photo: string | string[] | null | undefined): string {
  if (!photo) return "";
  if (Array.isArray(photo)) return photo[0] ?? "";
  return photo;
}

function generateRandomCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// ---------- ProductPickerModal (adaptado) ----------
function ProductPickerModal({
  open,
  onClose,
  storeName,
  selected,
  onChange,
  title = "Selecione as peças",
  maxSelect,
}: {
  open: boolean;
  onClose: () => void;
  storeName: string;
  selected: number[];
  onChange: (ids: number[]) => void;
  title?: string;
  maxSelect?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ProductLite[]>([]);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const from = page * 60;
        const to = from + 59;
        let query = supabase
          .from("products")
          .select("id,name,photo_url,price_tag")
          .eq("store_name", storeName)
          .order("id", { ascending: false })
          .range(from, to);

        if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);

        const { data, error } = await query;
        if (error) throw error;
        if (cancelled) return;
        setRows((data as ProductLite[]) || []);
      } catch (err) {
        console.error(err);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, page, q, storeName]);

  const toggle = (id: number) => {
    const exists = selected.includes(id);
    const next = exists ? selected.filter((x) => x !== id) : [...selected, id];
    if (typeof maxSelect === "number" && next.length > maxSelect) return;
    onChange(next);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl rounded-3xl bg-white border border-neutral-200 shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: "calc(100vh - 32px)" }}>
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="font-semibold">{title}</div>
          <button onClick={onClose} className="text-sm px-3 py-1 rounded-full border border-neutral-300 hover:bg-neutral-50">Fechar</button>
        </div>

        <div className="p-4 flex items-center gap-3">
          <input placeholder="Buscar por nome…" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 px-3 rounded-xl border border-neutral-300 w-full" />
          <div className="text-xs text-neutral-500 whitespace-nowrap">Selecionados {selected.length}{maxSelect ? ` / ${maxSelect}` : ""}</div>
        </div>

        <div className="p-4 overflow-auto">
          {loading ? (
            <div className="text-sm text-neutral-600">Carregando…</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {rows.map((r) => {
                const url = firstImageUrl(r.photo_url);
                const active = selected.includes(r.id);
                return (
                  <button key={r.id} onClick={() => toggle(r.id)} className={classNames("group text-left rounded-xl border overflow-hidden", active ? "border-black ring-2 ring-black/20" : "border-neutral-200 hover:border-neutral-300")}>
                    <div className="aspect-[4/5] bg-neutral-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {url ? <img src={url} alt={r.name} className="w-full h-full object-cover" /> : null}
                    </div>
                    <div className="p-2">
                      <div className="text-[12px] line-clamp-2">{r.name}</div>
                      <div className="mt-1 text-[11px] text-neutral-500">#{r.id}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} className="text-sm px-3 py-1 rounded-full border border-neutral-300 hover:bg-neutral-50">◀</button>
            <div className="text-sm">Página {page + 1}</div>
            <button onClick={() => setPage((p) => p + 1)} className="text-sm px-3 py-1 rounded-full border border-neutral-300 hover:bg-neutral-50">▶</button>
          </div>
          <button onClick={onClose} className="h-10 px-6 rounded-full bg-black text-white text-sm">Concluir</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Página principal ----------
export default function CouponsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [store, setStore] = useState<StoreRow | null>(null);

  // form
  const [code, setCode] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [discountType, setDiscountType] = useState<DiscountType>("percent");
  const [discountValue, setDiscountValue] = useState<string>("10"); // string para input
  const [couponKind, setCouponKind] = useState<CouponKind>("A");
  const [maxUses, setMaxUses] = useState<string>(""); // número opcional
  const [expiresAt, setExpiresAt] = useState<string>(""); // ISO date string from input type=date
  const [active, setActive] = useState<boolean>(true);

  // applicability
  const [applyToAll, setApplyToAll] = useState<boolean>(true);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: sess } = await supabase.auth.getSession();
        const user = sess?.session?.user;
        if (!user?.email) {
          router.replace("/parceiros/login");
          return;
        }
        const email = user.email.toLowerCase();

        // valida partner
        const { data: allowed } = await supabase.rpc("partner_email_allowed", { p_email: email });
        if (!allowed) {
          await supabase.auth.signOut({ scope: "local" });
          router.replace("/parceiros/login");
          return;
        }

        // resolve store
        const { data: pe } = await supabase.from("partner_emails").select("store_name").eq("email", email).eq("active", true).maybeSingle<{ store_name: string }>();
        const sname = pe?.store_name || "";

        const { data: srow } = await supabase.from("stores").select("id,store_name,slug").eq("store_name", sname).maybeSingle<StoreRow>();
        if (!srow) throw new Error("Loja não encontrada.");
        setStore(srow);
      } catch (e: unknown) {
        console.error(e);
        const msg = e instanceof Error ? e.message : String(e);
        setNotice(msg || "Erro ao carregar.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // Valida e salva coupon
  const handleSave = async () => {
    setNotice(null);
    if (!store) return setNotice("Loja não carregada.");
    const trimmed = (code || "").trim().toUpperCase();
    if (!trimmed) return setNotice("Insira um código para o cupom.");
    const valNum = Number(discountValue);
    if (!isFinite(valNum) || valNum <= 0) return setNotice("Insira um valor de desconto válido.");
    if (!["percent", "fixed"].includes(discountType)) return setNotice("Tipo de desconto inválido.");

    setSaving(true);
    try {
      // prepara payload com tipo explícito
      const couponRow: NewCouponRow = {
        code: trimmed,
        description: description || null,
        discount_type: discountType,
        discount_value: Math.round(valNum * 100) / 100,
        coupon_kind: couponKind,
        created_by: `brand:${store.id}`,
        active,
        max_uses: maxUses.trim() ? Number(maxUses) : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };

      // inserir cupom (sem generic) e extrair o registro inserido de forma segura
      const { data: insData, error: insErr } = await supabase
        .from("coupons")
        .insert([couponRow])
        .select();

      if (insErr) throw insErr;

      // insData pode ser um array; pega o primeiro elemento (registro criado)
      const inserted = (Array.isArray(insData) ? insData[0] : insData) as { id?: string } | null;
      const couponId = inserted?.id;
      if (!couponId) throw new Error("ID do cupom não retornado.");

      // se aplicável: gravar coupon_applicabilities (produto por produto)
      if (!applyToAll) {
        // limpa antigas (se houver)
        await supabase.from("coupon_applicabilities").delete().eq("coupon_id", couponId);

        if (selectedProductIds.length) {
          const rows = selectedProductIds.map((pid, i) => ({
            coupon_id: couponId,
            product_id: pid,
            sort_order: i,
          }));
          const { error: apErr } = await supabase.from("coupon_applicabilities").insert(rows);
          if (apErr) throw apErr;
        }
      } else {
        // se applyToAll, garantimos que não existam linhas antigas
        await supabase.from("coupon_applicabilities").delete().eq("coupon_id", couponId);
      }

      setNotice("Cupom criado com sucesso.");
      // limpa form
      setCode("");
      setDescription("");
      setDiscountValue("10");
      setCouponKind("A");
      setApplyToAll(true);
      setSelectedProductIds([]);
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      setNotice(msg || "Erro ao salvar cupom.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <main className="min-h-screen p-8">Carregando…</main>;
  }

  if (!store) {
    return <main className="min-h-screen p-8">Loja não encontrada.</main>;
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#F7F4EF" }}>
      <header className="w-full border-b border-[#E5E0DA]/80 bg-[#F7F4EF]/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/parceiros")} className="inline-flex items-center gap-2 text-sm px-3 py-1 rounded-full border border-neutral-300 bg-white/70 hover:bg-white">
              <span aria-hidden>←</span>
              <span>Painel</span>
            </button>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-black">Cupons — {store.store_name}</span>
              <span className="text-[11px] text-neutral-500">Crie descontos para sua loja</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={saving} className={classNames("h-10 px-6 rounded-full text-sm font-medium text-white", saving ? "bg-neutral-600" : "bg-black hover:opacity-90")}>
              {saving ? "Salvando…" : "Salvar cupom"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-8 py-10 space-y-6">
        {notice && <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 text-sm">{notice}</div>}

        <div className="rounded-3xl p-6 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.18)] bg-white/60 border" style={{ borderColor: "#E5E0DA", backdropFilter: "blur(6px)" }}>
          <div className="text-lg font-semibold mb-4">Novo cupom</div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-medium text-neutral-700 mb-1.5 block">Código</label>
              <div className="flex gap-2">
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="w-full rounded-xl border border-neutral-300 h-10 px-3 text-sm" placeholder="EX: PRETO10" />
                <button onClick={() => setCode(generateRandomCode(6))} className="h-10 px-4 rounded-full border border-neutral-300 hover:bg-neutral-50 text-sm">Gerar</button>
              </div>
            </div>

            <div>
              <label className="text-[12px] font-medium text-neutral-700 mb-1.5 block">Descrição (opcional)</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-xl border border-neutral-300 h-10 px-3 text-sm" placeholder="Descrição curta exibida para a cliente" />
            </div>

            <div>
              <label className="text-[12px] font-medium text-neutral-700 mb-1.5 block">Tipo de desconto</label>
              <div className="flex gap-2">
                <button onClick={() => setDiscountType("percent")} className={classNames("px-4 h-10 rounded-xl border text-sm", discountType === "percent" ? "bg-black text-white border-black" : "bg-white border-neutral-300")}>%</button>
                <button onClick={() => setDiscountType("fixed")} className={classNames("px-4 h-10 rounded-xl border text-sm", discountType === "fixed" ? "bg-black text-white border-black" : "bg-white border-neutral-300")}>R$</button>
                <input value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className="ml-2 rounded-xl border border-neutral-300 h-10 px-3 text-sm w-32" />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-medium text-neutral-700 mb-1.5 block">Kind</label>
              <select value={couponKind} onChange={(e) => setCouponKind(e.target.value as CouponKind)} className="w-full rounded-xl border border-neutral-300 h-10 px-3 text-sm">
                <option value="A">A — uso único por CPF</option>
                <option value="B">B — global / primeiro pedido</option>
                <option value="C">C — brand-specific</option>
                <option value="D">D — produto específico</option>
              </select>
            </div>

            <div>
              <label className="text-[12px] font-medium text-neutral-700 mb-1.5 block">Máximo de usos (opcional)</label>
              <input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className="w-full rounded-xl border border-neutral-300 h-10 px-3 text-sm" placeholder="Ex.: 100" />
            </div>

            <div>
              <label className="text-[12px] font-medium text-neutral-700 mb-1.5 block">Validade (opcional)</label>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="w-full rounded-xl border border-neutral-300 h-10 px-3 text-sm" />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                <span className="text-sm">Ativo</span>
              </label>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-sm font-medium mb-2">Aplicabilidade</div>
            <div className="flex gap-3 items-center">
              <label className={classNames("px-4 h-10 rounded-xl border text-sm", applyToAll ? "bg-black text-white border-black" : "bg-white border-neutral-300")}>
                <input type="radio" name="apply" checked={applyToAll} onChange={() => setApplyToAll(true)} className="mr-2" /> Todos os produtos
              </label>
              <label className={classNames("px-4 h-10 rounded-xl border text-sm", !applyToAll ? "bg-black text-white border-black" : "bg-white border-neutral-300")}>
                <input type="radio" name="apply" checked={!applyToAll} onChange={() => setApplyToAll(false)} className="mr-2" /> Produtos selecionados
              </label>
              {!applyToAll && (
                <>
                  <button onClick={() => setPickerOpen(true)} className="ml-4 h-10 px-4 rounded-full border border-neutral-300 hover:bg-neutral-50 text-sm">Selecionar peças</button>
                  <div className="text-[12px] text-neutral-500">Selecionados: {selectedProductIds.length}</div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className={classNames("h-10 px-6 rounded-full text-sm font-medium text-white", saving ? "bg-neutral-600" : "bg-black hover:opacity-90")}>
            {saving ? "Salvando…" : "Salvar cupom"}
          </button>
        </div>
      </div>

      <ProductPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        storeName={store.store_name}
        selected={selectedProductIds}
        onChange={(ids) => setSelectedProductIds(ids)}
        title="Escolha os produtos que o cupom deve cobrir"
      />
    </main>
  );
}
