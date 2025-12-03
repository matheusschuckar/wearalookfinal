"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type CouponRow = {
  id: string;
  code: string;
  description?: string | null;
  discount_type: "percent" | "fixed" | string;
  discount_value: number;
  coupon_kind?: string | null;
  created_by?: string | null;
  active: boolean;
  max_uses?: number | null;
  expires_at?: string | null;
  created_at?: string | null;
};

export default function DeveloperCouponsManagePage() {
  const router = useRouter();

  const [rows, setRows] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // fetch all coupons (developer view)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotice(null);
      try {
        const resp = await supabase
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
          .order("created_at", { ascending: false });

        // supabase-js returns shape unknown; normalize safely
        const data = (resp as unknown as { data: unknown[] | null; error: unknown | null }).data;
        const error = (resp as unknown as { data: unknown[] | null; error: unknown | null }).error;
        if (error) {
          throw error;
        }

        const arr = Array.isArray(data) ? data : [];
        const mapped: CouponRow[] = arr.map((it) => {
          const obj = it as Record<string, unknown>;
          return {
            id: String(obj["id"] ?? ""),
            code: String(obj["code"] ?? ""),
            description: obj["description"] == null ? null : String(obj["description"]),
            discount_type: String(obj["discount_type"] ?? "percent"),
            discount_value:
              typeof obj["discount_value"] === "number"
                ? (obj["discount_value"] as number)
                : Number(obj["discount_value"] ?? 0),
            coupon_kind: obj["coupon_kind"] == null ? null : String(obj["coupon_kind"]),
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
        console.error("[developer/cupons/gerenciar] fetch err:", err);
        if (!cancelled) setNotice("Erro ao buscar cupons.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalCount = useMemo(() => rows.length, [rows]);

  async function handleDelete(id: string) {
    setActionLoading(true);
    setNotice(null);
    try {
      // delete applicabilities (best-effort)
      const delApp = await supabase.from("coupon_applicabilities").delete().eq("coupon_id", id);
      if ((delApp as unknown as { error?: unknown }).error) {
        console.warn("Failed deleting applicabilities", (delApp as unknown as { error?: unknown }).error);
      }

      // delete coupon row
      const delCoupon = await supabase.from("coupons").delete().eq("id", id);
      const delErr = (delCoupon as unknown as { error?: unknown }).error;
      if (delErr) throw delErr;

      setNotice("Cupom excluído com sucesso.");
      // remove from UI
      setRows((prev) => prev.filter((r) => r.id !== id));
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
            <h1 className="text-2xl font-semibold">Lista de cupons</h1>
            <div className="text-sm text-neutral-600 mt-1">
              Todos os cupons ({totalCount}) — developer view
            </div>
          </div>

          <div className="flex gap-3 items-center">
            <button
              onClick={() => router.push("/developer/cupom")}
              className="inline-flex h-10 items-center justify-center rounded-full bg-black px-4 text-sm font-medium text-white shadow-sm hover:opacity-90"
            >
              Criar cupom
            </button>
            <button
              onClick={() => router.push("/developer")}
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
                      <th className="px-3 py-2">Criado por</th>
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
                        <td className="px-3 py-3">{r.coupon_kind ?? "—"}</td>
                        <td className="px-3 py-3">{r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—"}</td>
                        <td className="px-3 py-3">{r.active ? "Sim" : "Não"}</td>
                        <td className="px-3 py-3">{r.created_by ?? "—"}</td>
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
            </>
          )}
        </div>

        {/* confirm modal */}
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
