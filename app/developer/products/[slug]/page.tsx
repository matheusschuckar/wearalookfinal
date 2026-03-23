// app/developer/products/[slug]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const SURFACE = "#F7F4EF";

function slugify(s: string) {
  const a = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return a
    .toLowerCase()
    .replace(/&/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

type Product = {
  id: number;
  slug: string | null;
  name: string | null;
  price_tag: string | null;
  bio: string | null;
};

export default function DevProductPage() {
  const router = useRouter();
  const params = useParams();

  const slugParam = Array.isArray(params.slug)
    ? params.slug[0]
    : (params.slug as string);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [productId, setProductId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [priceTag, setPriceTag] = useState("");
  const [bio, setBio] = useState("");

  const toStr = (v: unknown) => (v ?? "").toString().trim();

  // ================= LOAD PRODUCT =================
  useEffect(() => {
    if (!slugParam) return;

    (async () => {
      setLoading(true);

      // tenta por slug
      let { data } = await supabase
        .from("products")
        .select("id, slug, name, price_tag, bio")
        .eq("slug", slugParam)
        .maybeSingle();

      // fallback por ID (caso slug não exista)
      if (!data) {
        const res = await supabase
          .from("products")
          .select("id, slug, name, price_tag, bio")
          .eq("id", slugParam)
          .maybeSingle();

        data = res.data;
      }

      if (!data) {
        setNotice("Produto não encontrado");
        setLoading(false);
        return;
      }

      const p = data as Product;

      setProductId(p.id);
      setName(p.name || "");
      setSlug(p.slug || "");
      setPriceTag(p.price_tag || "");
      setBio(p.bio || "");

      setLoading(false);
    })();
  }, [slugParam]);

  // ================= AUTO SLUG =================
  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(name));
    }
  }, [name]);

  // ================= SAVE =================
  async function handleSave() {
    if (!productId) return;

    setSaving(true);
    setNotice(null);

    try {
      const finalSlug = toStr(slug) || slugify(name);

      const { error } = await supabase
        .from("products")
        .update({
          name: toStr(name),
          slug: finalSlug,
          price_tag: toStr(priceTag),
          bio: toStr(bio),
        })
        .eq("id", productId);

      if (error) {
        console.error(error);
        setNotice("Erro ao salvar");
      } else {
        setNotice("Salvo com sucesso");

        // 🔥 atualiza URL se slug mudou
        if (finalSlug !== slugParam) {
          router.replace(`/developer/products/${finalSlug}`);
        }
      }
    } catch (e) {
      console.error(e);
      setNotice("Erro inesperado");
    }

    setSaving(false);
  }

  // ================= UI =================
  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      <div className="mx-auto max-w-3xl px-6 py-10">

        {loading ? (
          <p>Carregando...</p>
        ) : (
          <>
            <h1 className="text-2xl font-semibold mb-6">
              Developer · Produto
            </h1>

            {notice && (
              <p className="mb-4 text-sm text-amber-700">
                {notice}
              </p>
            )}

            {/* NAME */}
            <div className="mb-4">
              <label className="text-xs text-neutral-500">
                Nome
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-4 rounded-xl border"
              />
            </div>

            {/* SLUG */}
            <div className="mb-4">
              <label className="text-xs text-neutral-500">
                Slug
              </label>
              <input
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugEdited(true);
                }}
                className="w-full h-10 px-4 rounded-xl border"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                URL do produto: /developer/products/{slug}
              </p>
            </div>

            {/* PRICE */}
            <div className="mb-4">
              <label className="text-xs text-neutral-500">
                Preço
              </label>
              <input
                value={priceTag}
                onChange={(e) => setPriceTag(e.target.value)}
                className="w-full h-10 px-4 rounded-xl border"
              />
            </div>

            {/* BIO */}
            <div className="mb-6">
              <label className="text-xs text-neutral-500">
                Descrição
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full p-4 rounded-xl border"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-black text-white px-6 py-2 rounded-full"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
