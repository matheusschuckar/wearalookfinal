// app/developer/novos-parceiros/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type BrandApplicationRow = {
  id: number;
  brand_name: string | null;
  contact_name: string | null;
  contact_role: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  country: string | null;
  city: string | null;
  website: string | null;
  instagram: string | null;
  product_categories: string[] | null;
  stock_ready: string | null;
  years_active: number | null;
  how_found: string | null;
  consent: boolean | null;
  created_at: string | null;
  review_status?: string | null;
};

const SURFACE = "#F7F4EF";
const BORDER = "#E5E0DA";

function StatusBadge({ s }: { s?: string | null }) {
  const status = s ?? "new";
  if (status === "new") return <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] bg-amber-50 text-amber-800 border border-amber-100">Não visto</span>;
  if (status === "approved") return <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-100">Aprovado</span>;
  if (status === "rejected") return <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] bg-red-50 text-red-800 border border-red-100">Não aprovado</span>;
  return <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] bg-neutral-100 text-neutral-700 border border-neutral-200">{status}</span>;
}

export default function PartnerApplicationDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const id = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<BrandApplicationRow | null>(null);
  const [mutating, setMutating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("brand_applications").select("*").eq("id", id).single();
        if (error) {
          console.error("fetch single error", error);
          setNotice("Não foi possível carregar a inscrição.");
          return;
        }
        if (mounted) setRow((data as unknown) as BrandApplicationRow);
      } catch (err) {
        console.error(err);
        setNotice("Erro ao carregar inscrição.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  async function updateStatus(newStatus: "new" | "approved" | "rejected") {
    if (!row) return;
    setNotice(null);
    setMutating(true);
    const prev = row.review_status ?? null;
    setRow({ ...row, review_status: newStatus });
    try {
      const { data, error } = await supabase.from("brand_applications").update({ review_status: newStatus }).eq("id", id).select().single();
      if (error) {
        console.error("update error", error);
        setNotice("Não foi possível atualizar status. Verifique se a coluna review_status existe.");
        // rollback
        setRow({ ...row, review_status: prev });
        return;
      }
      const returned = (data as unknown) as BrandApplicationRow;
      setRow((rPrev) => {
        return {
          ...(rPrev ?? {}),
          ...returned,
        } as BrandApplicationRow;
      });
    } catch (err) {
      console.error(err);
      setNotice("Erro ao atualizar status.");
      setRow({ ...row, review_status: prev });
    } finally {
      setMutating(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
        <div className="mx-auto max-w-4xl px-8 pt-20 animate-pulse">
          <div className="h-8 w-64 rounded-lg bg-neutral-300/30" />
        </div>
      </main>
    );
  }

  if (!row) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
        <div className="mx-auto max-w-4xl px-8 pt-20">
          <div className="text-center text-neutral-600">Inscrição não encontrada.</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      <header className="w-full border-b" style={{ borderColor: BORDER }}>
        <div className="mx-auto max-w-6xl px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
              <span className="text-[13px] font-semibold text-white">L</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-black">Look</span>
              <span className="text-[11px] text-neutral-500">Novos parceiros</span>
            </div>
          </div>

          <div>
            <button onClick={() => router.back()} className="h-9 px-3 rounded-full border border-neutral-300 bg-white/80 text-sm">Voltar</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-8 py-12">
        {notice ? (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-amber-900 text-sm">{notice}</div>
        ) : null}

        <div className="rounded-3xl p-8" style={{ background: "rgba(255,255,255,0.95)", border: `1px solid ${BORDER}`, backdropFilter: "blur(6px)" }}>
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-[24px] font-semibold">{row.brand_name || "—"}</h1>
              <div className="mt-2 text-sm text-neutral-600">{row.instagram ? `@${row.instagram}` : ""}</div>
            </div>

            <div className="text-right">
              <div className="text-sm text-neutral-500">Protocolo</div>
              <div className="mt-1 font-semibold">BLK-{String(row.id).padStart(6, "0")}</div>
              <div className="mt-2"><StatusBadge s={row.review_status} /></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-neutral-500">Contato</div>
              <div className="mt-1 text-sm">{row.contact_name || "—"} {row.contact_role ? `• ${row.contact_role}` : ""}</div>

              <div className="mt-4 text-xs text-neutral-500">E-mail</div>
              <div className="mt-1 text-sm">{row.contact_email || "—"}</div>

              <div className="mt-4 text-xs text-neutral-500">Telefone</div>
              <div className="mt-1 text-sm">{row.contact_phone || "—"}</div>

              <div className="mt-4 text-xs text-neutral-500">Localização</div>
              <div className="mt-1 text-sm">{[row.city, row.country].filter(Boolean).join(" • ") || "—"}</div>
            </div>

            <div>
              <div className="text-xs text-neutral-500">Categorias</div>
              <div className="mt-1 text-sm">{(row.product_categories || []).join(", ") || "—"}</div>

              <div className="mt-4 text-xs text-neutral-500">Estoque</div>
              <div className="mt-1 text-sm">{row.stock_ready || "—"}</div>

              <div className="mt-4 text-xs text-neutral-500">Anos de operação</div>
              <div className="mt-1 text-sm">{row.years_active ?? "—"}</div>

              <div className="mt-4 text-xs text-neutral-500">Como nos encontrou</div>
              <div className="mt-1 text-sm">{row.how_found || "—"}</div>
            </div>
          </div>

          <div className="mt-6 text-xs text-neutral-500">Site</div>
          <div className="mt-1 text-sm">
            {row.website ? (
              <a href={row.website} target="_blank" rel="noreferrer" className="underline">{row.website}</a>
            ) : "—"}
          </div>

          <div className="mt-6 text-xs text-neutral-500">Criado em</div>
          <div className="mt-1 text-sm">{row.created_at ? new Date(row.created_at).toLocaleString() : "—"}</div>

          <div className="mt-8 flex items-center gap-3">
            <button
              onClick={() => updateStatus("approved")}
              disabled={mutating}
              className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-600 px-6 text-sm text-white hover:opacity-90"
            >
              Aprovar
            </button>

            <button
              onClick={() => updateStatus("rejected")}
              disabled={mutating}
              className="inline-flex h-11 items-center justify-center rounded-full bg-red-600 px-6 text-sm text-white hover:opacity-90"
            >
              Reprovar
            </button>

            <button
              onClick={() => updateStatus("new")}
              disabled={mutating}
              className="inline-flex h-11 items-center justify-center rounded-full border border-neutral-300 bg-white/80 px-6 text-sm"
            >
              Marcar não visto
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
