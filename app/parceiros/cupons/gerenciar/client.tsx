
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* Tipagem do cupom */
type CouponRow = {
  id: string;
  code: string;
  description?: string | null;
  discount_type: "percent" | "fixed" | string;
  discount_value: number;
  coupon_kind: "A" | "B" | "C" | "D" | string;
  created_by?: string | null;
  active: boolean;
  max_uses?: number | null;
  expires_at?: string | null;
  created_at?: string | null;
};

/* Tipagens auxiliares para normalizar respostas do supabase sem usar `any` */
type SupabaseMaybeSingle<T> = { data: T | null; error: unknown } | { data: null; error: unknown };
type SupabaseSelectCountResp = { data: unknown[] | null; error: unknown | null; count?: number | null };
type SupabaseResp = { data: unknown | null; error: unknown | null };

export default function ManageCouponsClient() {
  const router = useRouter();
  const search = useSearchParams();
  const qStoreId = search?.get("storeId");

  const [loading, setLoading] = useState<boolean>(true);
  const [storeId, setStoreId] = useState<number | null>(
    qStoreId ? Number(qStoreId) || null : null
  );
  const [storeName, setStoreName] = useState<string>("");
  const [notice, setNotice] = useState<string | null>(null);

  const [rows, setRows] = useState<CouponRow[]>([]);
  const [page, setPage] = useState<number>(0);
  const PAGE_SIZE = 20;
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // --- init: autentica parceiro e resolve storeId/storeName
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const sess = await supabase.auth.getSession();
        // supabase-js v2 retorna { data: { session }, error } - garantimos leitura segura
        const user = (sess as any)?.data?.session?.user ?? (sess as any)?.session?.user ?? null;
        if (!user?.email) {
          router.replace("/parceiros/login");
          return;
        }
        const userEmail = String(user.email).toLowerCase();

        // rpc partner_email_allowed
        const rpcRaw = await supabase.rpc("partner_email_allowed", { p_email: userEmail });
        const rpcObj = rpcRaw as unknown as { data?: boolean; error?: unknown };
        if (rpcObj.error) throw rpcObj.error;
        if (!rpcObj.data) {
          await supabase.auth.signOut({ scope: "local" });
          router.replace("/parceiros/login");
          return;
        }

        // pega store_name do partner_emails
        const peRaw = await supabase
          .from("partner_emails")
          .select("store_name")
          .eq("email", userEmail)
          .eq("active", true)
          .maybeSingle();

        const pe = peRaw as unknown as SupabaseMaybeSingle<{ store_name?: string }>;
        if ((pe as any)?.error) throw (pe as any).error;
        const sname = (pe as any)?.data?.store_name ?? "";

        if (!cancelled) setStoreName(String(sname ?? ""));

        if (sname) {
          const srowRaw = await supabase
            .from("stores")
            .select("id,store_name")
            .eq("store_name", sname)
            .maybeSingle();

          const srow = srowRaw as unknown as SupabaseMaybeSingle<{ id?: number; store_name?: string }>;
          if ((srow as any)?.error) {
            if (!cancelled) setStoreId(null);
          } else {
            const sid = (srow as any)?.data?.id ?? null;
            if (!cancelled) setStoreId(typeof sid === "number" ? sid : null);
          }
        } else if (!cancelled) {
          setStoreId(null);
        }
      } catch (err) {
        console.error("[parceiros/cupons/gerenciar] init err:", err);
        if (!cancelled) setNotice("Erro ao inicializar. Recarregue a página.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, qStoreId]);

  // --- fetch paginado de cupons
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!storeId) {
        setRows([]);
        setTotalCount(null);
        return;
      }
      setLoading(true);
      setNotice(null);

      try {
        // 1) count total
        const countRaw = await supabase
          .from("coupons")
          .select("id", { count: "exact", head: false })
          .eq("created_by", `brand:${storeId}`)
          .neq("created_by", "look");

        const countResp = countRaw as unknown as SupabaseSelectCountResp;
        if (countResp.error) {
          console.warn("count err", countResp.error);
          if (!cancelled) setTotalCount(null);
        } else {
          if (!cancelled) setTotalCount(typeof countResp.count === "number" ? countResp.count : null);
        }

        // 2) pagina de dados
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const pageResp = await supabase
          .from("coupons")
          .select(
            [
              "id",
              "code",
              "description",
              "discount_type",
              "discount_value",
              "coupon_kind",
              "created_by",
              "active",
              "max_uses",
              "expires_at",
              "created_at",
            ].join(",")
          )
          .eq("created_by", `brand:${storeId}`)
          .neq("created_by", "look")
          .order("created_at", { ascending: false })
          .range(from, to);

        const pageData = pageResp as unknown as { data: unknown[] | null; error: unknown | null };
        if (pageData.error) throw pageData.error;

        const arr = Array.isArray(pageData.data) ? pageData.data : [];
        const mapped: CouponRow[] = arr.map((it) => {
          const obj = it as Record<string, unknown>;
          return {
            id: String(obj["id"] ?? ""),
            code: String(obj["code"] ?? ""),
            description: obj["description"] == null ? null : String(obj["description"]),
            discount_type: String(obj["discount_type"] ?? ""),
            discount_value:
              typeof obj["discount_value"] === "number"
                ? (obj["discount_value"] as number)
                : Number(obj["discount_value"] ?? 0),
            coupon_kind: String(obj["coupon_kind"] ?? ""),
            created_by: obj["created_by"] == null ? null : String(obj["created_by"]),
            active: Boolean(obj["active"]),
            max_uses:
              obj["max_uses"] == null
                ? null
                : typeof obj["max_uses"] === "number"
                ? (obj["max_uses"] as number)
                : Number(obj["max_uses"] ?? 0),
            expires_at: obj["expires_at"] == null ? null : String(obj["expires_at"]),
            created_at: obj["created_at"] == null ? null : String(obj["created_at"]),
          };
        });

        if (!cancelled) setRows(mapped);
      } catch (err) {
        console.error("[parceiros/cupons/gerenciar] fetch err:", err);
        if (!cancelled) setNotice("Erro ao buscar cupons.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storeId, page]);

  const totalPages = useMemo(() => {
    if (totalCount == null) return null;
    return Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  }, [totalCount]);

  // excluir cupom
  async function handleDelete(id: string) {
    setActionLoading(true);
    try {
      // delete applicabilities (best-effort)
      const delAppRaw = await supabase.from("coupon_applicabilities").delete().eq("coupon_id", id);
      const delApp = delAppRaw as unknown as SupabaseResp;
      if (delApp.error) {
        console.warn("failed to delete applicabilities:", delApp.error);
      }

      // delete coupon row (só se for created_by brand:<storeId>)
      const delCouponRaw = await supabase
        .from("coupons")
        .delete()
        .eq("id", id)
        .eq("created_by", `brand:${storeId}`);
      const delCoupon = delCouponRaw as unknown as SupabaseResp;
      if (delCoupon.error) {
        throw delCoupon.error;
      }

      setNotice("Cupom excluído com sucesso.");
      const remaining = rows.length - 1;
      if (remaining <= 0 && page > 0) {
        setPage((p) => p - 1);
      } else {
        setPage((p) => p);
      }
    } catch (err) {
      console.error("delete err:", err);
      setNotice("Falha ao excluir cupom. Tente novamente.");
    } finally {
      setActionLoading(false);
      setConfirmOpen(false);
      setDeletingId(null);
    }
  }

  function openConfirm(id: string) {
    setDeletingId(id);
    setConfirmOpen(true);
  }
  function closeConfirm() {
    setDeletingId(null);
    setConfirmOpen(false);
  }

  // --- UI ---
  return (
    <main className="min-h-screen p-8" style={{ backgroundColor: "#F7F4EF" }}>
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">Gerenciar cupons</h1>
            <div className="text-sm text-neutral-600 mt-1">
              Cupons criados pela sua marca {storeName ? <strong>{storeName}</strong> : null}
            </div>
          </div>

          <div className="flex gap-3 items-center">
            <button
              onClick={() => router.push("/parceiros/cupons")}
              className="inline-flex h-10 items-center justify-center rounded-full bg-black px-4 text-sm font-medium text-white shadow-sm hover:opacity-90"
            >
              Criar cupom
            </button>
            <button
              onClick={() => router.push("/parceiros")}
              className="inline-flex h-10 items-center justify-center rounded-full border border-neutral-300 px-4 text-sm font-medium bg-white/90"
            >
              Voltar
            </button>
          </div>
        </div>

        {notice ? (
          <div className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-amber-900">{notice}</div>
        ) : null}

        <div className="rounded-2xl bg-white p-4 border" style={{ borderColor: "#E5E0DA" }}>
          {loading ? (
            <div className="py-12 text-center text-neutral-500">Carregando…</div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-neutral-500">Nenhum cupom encontrado.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-neutral-600">
                      <th className="px-3 py-2">Código</th>
                      <th className="px-3 py-2">Desconto</th>
                      <th className="px-3 py-2">Kind</th>
                      <th className="px-3 py-2">Validade</th>
                      <th className="px-3 py-2">Ativo</th>
                      <th className="px-3 py-2">Criado em</th>
                      <th className="px-3 py-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="px-3 py-3 font-medium">{r.code}</td>
                        <td className="px-3 py-3">
                          {r.discount_type === "percent"
                            ? `${r.discount_value}%`
                            : `R$ ${r.discount_value.toFixed(2)}`}
                        </td>
                        <td className="px-3 py-3">{r.coupon_kind}</td>
                        <td className="px-3 py-3">
                          {r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-3 py-3">{r.active ? "Sim" : "Não"}</td>
                        <td className="px-3 py-3">{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openConfirm(r.id)}
                              className="px-3 py-1 rounded-full border border-red-200 text-red-600 text-sm hover:bg-red-50"
                              disabled={actionLoading}
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-neutral-600">
                  {totalCount != null ? `Total: ${totalCount}` : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 rounded-full border bg-white/90 text-sm"
                  >
                    ← Anterior
                  </button>
                  <div className="text-sm px-2">
                    {totalPages ? `${page + 1} / ${totalPages}` : `Página ${page + 1}`}
                  </div>
                  <button
                    onClick={() => {
                      if (totalPages && page + 1 >= totalPages) return;
                      setPage((p) => p + 1);
                    }}
                    disabled={totalPages != null && page + 1 >= totalPages}
                    className="px-3 py-1 rounded-full border bg-white/90 text-sm"
                  >
                    Próxima →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Confirm modal */}
        {confirmOpen && deletingId ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30" onClick={closeConfirm} />
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold mb-2">Confirmar exclusão</h3>
              <p className="text-sm text-neutral-600 mb-4">Deseja realmente excluir este cupom? Esta ação não pode ser desfeita.</p>

              <div className="flex gap-3 justify-end">
                <button onClick={closeConfirm} className="px-4 py-2 rounded-full border bg-white/90">Cancelar</button>
                <button
                  onClick={() => deletingId && handleDelete(deletingId)}
                  className="px-4 py-2 rounded-full bg-red-600 text-white"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Excluindo…" : "Excluir cupom"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
