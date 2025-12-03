// app/parceiros/cupons/gerenciar/client.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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

// tipos locais para normalizar respostas do supabase sem usar `any`
type MaybeSingleResp<T> = { data: T | null; error: unknown } | { data: null; error: unknown };
type SelectCountResp = { data: unknown[] | null; error: unknown | null; count?: number | null };
type GenericResp = { data: unknown | null; error: unknown | null };

// formato de retorno de getSession (só pegamos email)
type SessionResp = { data?: { session?: { user?: { email?: string } } } ; error?: unknown };

export default function ManageCouponsPage() {
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

  // Authenticate partner and resolve storeId/storeName if missing
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const sessRaw = await supabase.auth.getSession();
        const sess = sessRaw as unknown as SessionResp;
        const userEmail = sess?.data?.session?.user?.email;
        if (!userEmail) {
          router.replace("/parceiros/login");
          return;
        }
        const emailLower = userEmail.toLowerCase();

        // verify partner allowed (rpc)
        const rpcRaw = await supabase.rpc("partner_email_allowed", { p_email: emailLower });
        const rpc = rpcRaw as unknown as { data?: boolean; error?: unknown };
        if (rpc.error) throw rpc.error;
        if (!rpc.data) {
          await supabase.auth.signOut({ scope: "local" });
          router.replace("/parceiros/login");
          return;
        }

        // resolve store_name from partner_emails (maybeSingle)
        const peRaw = await supabase
          .from("partner_emails")
          .select("store_name")
          .eq("email", emailLower)
          .eq("active", true)
          .maybeSingle();

        const pe = peRaw as unknown as MaybeSingleResp<{ store_name?: string }>;
        if (pe.error) throw pe.error;
        const sname = pe.data?.store_name ?? "";

        if (!cancelled) setStoreName(sname);

        if (sname) {
          const srowRaw = await supabase
            .from("stores")
            .select("id,store_name")
            .eq("store_name", sname)
            .maybeSingle();

          const srow = srowRaw as unknown as MaybeSingleResp<{ id?: number; store_name?: string }>;
          if (srow.error) {
            if (!cancelled) setStoreId(null);
          } else {
            const sid = srow.data?.id ?? null;
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

  // Fetch paginated coupons for this brand
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

        const countResp = countRaw as unknown as SelectCountResp;
        if (countResp.error) {
          console.warn("count err", countResp.error);
          if (!cancelled) setTotalCount(null);
        } else {
          if (!cancelled) setTotalCount(typeof countResp.count === "number" ? countResp.count : null);
        }

        // 2) page data
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const pageRaw = await supabase
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

        const pageResp = pageRaw as unknown as { data: unknown[] | null; error: unknown | null };
        if (pageResp.error) throw pageResp.error;

        const arr = Array.isArray(pageResp.data) ? pageResp.data : [];
        // map the unknown elements to CouponRow conservatively
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
                : Number(obj["max_uses"]),
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

  async function handleDelete(id: string) {
    setActionLoading(true);
    try {
      // 1) delete coupon_applicabilities for coupon_id (best-effort)
      const delAppRaw = await supabase.from("coupon_applicabilities").delete().eq("coupon_id", id);
      const delApp = delAppRaw as unknown as GenericResp;
      if (delApp.error) {
        console.warn("failed to delete applicabilities:", delApp.error);
      }

      // 2) delete coupon row (only if created_by brand:<storeId>)
      const delCouponRaw = await supabase
        .from("coupons")
        .delete()
        .eq("id", id)
        .eq("created_by", `brand:${storeId}`);
      const delCoupon = delCouponRaw as unknown as GenericResp;
      if (delCoupon.error) {
        throw delCoupon.error;
      }

      setNotice("Cupom excluído com sucesso.");
      // refresh: if last item on page removed go back a page
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
