"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const SURFACE = "#F7F4EF";

type StoreRow = {
  id: number;
  name: string;
};

export const dynamic = "force-dynamic";

export default function PartnerProductCreateManualPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loggedEmail, setLoggedEmail] = useState<string>("");
  const [storeName, setStoreName] = useState<string>("");
  const [storeId, setStoreId] = useState<number | null>(null);

  const [name, setName] = useState<string>("");
  const [priceTag, setPriceTag] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [categories, setCategories] = useState<string>("");

  // NOVO: tamanhos com estoque
  const [sizeEntries, setSizeEntries] = useState<
    Array<{ size: string; stock: string }>
  >([]);
  const [newSize, setNewSize] = useState<string>("");

  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryBoxRef = useRef<HTMLDivElement | null>(null);

  const toStr = (v: unknown) => (v ?? "").toString().trim();

  function toArray(v: string): string[] {
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // auth + loja
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
        setLoggedEmail(email);

        const { data: allowed, error: allowErr } = await supabase.rpc(
          "partner_email_allowed",
          { p_email: email }
        );
        if (allowErr) throw allowErr;
        if (!allowed) {
          await supabase.auth.signOut({ scope: "local" });
          router.replace("/parceiros/login");
          return;
        }

        const { data: row, error: sErr } = await supabase
          .from("partner_emails")
          .select("store_name")
          .eq("email", email)
          .eq("active", true)
          .maybeSingle();
        if (sErr) throw sErr;

        const sName = row?.store_name || "";
        setStoreName(sName);

        if (sName) {
          const { data: storeRow } = await supabase
            .from("stores")
            .select("id,name")
            .eq("name", sName)
            .maybeSingle<StoreRow>();
          if (storeRow?.id) {
            setStoreId(storeRow.id);
          }
        }
      } catch (err) {
        console.error(err);
        setNotice("Não foi possível carregar seus dados.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // categorias globais
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("category");
        if (error) throw error;

        const all = (data || [])
          .map((r) => (r.category ? r.category.trim() : ""))
          .filter(Boolean);

        const uniq = Array.from(new Set(all)).sort((a, b) =>
          a.localeCompare(b, "pt-BR")
        );
        setAllCategories(uniq);
      } catch (err) {
        console.error("erro ao buscar categorias globais:", err);
      }
    })();
  }, []);

  // fechar dropdown
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!categoryBoxRef.current) return;
      if (!categoryBoxRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // adicionar tamanho
  function handleAddSize() {
    const v = newSize.trim().toUpperCase();
    if (!v) return;
    // evita duplicado
    if (sizeEntries.some((e) => e.size === v)) {
      setNewSize("");
      return;
    }
    setSizeEntries((old) => [...old, { size: v, stock: "0" }]);
    setNewSize("");
  }

  // salvar
  async function handleSave() {
    if (!storeName) {
      setNotice("Loja não identificada.");
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      // gênero como array, igual à tela de editar
      let genderArr: string[] = [];
      if (gender === "female") genderArr = ["female"];
      else if (gender === "male") genderArr = ["male"];
      else if (gender === "both") genderArr = ["male", "female"];

      const primaryCategory = toStr(category);
      const extraCats = toArray(categories);
      const allCats = Array.from(
        new Set(
          [primaryCategory, ...extraCats].filter((x) => x && x.length > 0)
        )
      );

      // monta arrays paralelos de tamanho/estoque
      const cleanEntries = sizeEntries.filter((e) => e.size.trim());
      const sizesArray = cleanEntries.map((e) => e.size.trim());
      const sizeStocksArray = cleanEntries.map((e) => {
        const n = Number(e.stock);
        return Number.isFinite(n) ? n : 0;
      });

      // se a pessoa não preencheu estoque total, soma dos tamanhos
      const totalFromSizes = sizeStocksArray.reduce((acc, n) => acc + n, 0);
      const stockTotalToSave =
        stockTotal.trim() !== "" ? Number(stockTotal) : totalFromSizes || null;

      const insertPayload: Record<string, unknown> = {
        name: toStr(name) || null,
        price_tag: toStr(priceTag) || null,
        photo_url: toArray(photoUrl),
        sizes: sizesArray,
        size_stocks: sizeStocksArray,
        category: primaryCategory || null,
        gender: genderArr,
        categories: allCats,
        store_name: storeName,
        eta_text: "30 - 60 min",
        is_active: true,
        view_count: 0,
        view_count_today: 0,
        featured: false,
        code: null,
        slug: null,
        image_url: null,
        price_cents: null,
        store_id: storeId ?? null,
        bio: toStr(bio) || null,
      };

      const { data, error } = await supabase
        .from("products")
        .insert([insertPayload])
        .select("id")
        .maybeSingle<{ id?: number }>();

      if (error) {
        console.error(error);
        setNotice("Não foi possível salvar no Supabase.");
      } else {
        const newId = data?.id;
        if (newId) {
          router.replace(`/parceiros/produtos/${newId}`);
        } else {
          router.replace("/parceiros/produtos");
        }
      }
    } catch (err) {
      console.error(err);
      setNotice("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/parceiros/login");
  }

  const photoUrls = toArray(photoUrl);
  const firstPhoto = photoUrls[0] || "";

  const fieldRoot = "flex flex-col gap-1";
  const fieldLabel = "text-[11px] text-neutral-500 tracking-tight";
  const fieldInput =
    "h-10 rounded-2xl bg-white shadow-[0_2px_18px_rgba(0,0,0,0.02)] border border-transparent focus:border-black/40 px-4 text-sm outline-none transition";
  const fieldTextarea =
    "rounded-2xl bg-white shadow-[0_2px_18px_rgba(0,0,0,0.02)] border border-transparent focus:border-black/40 px-4 py-2.5 text-sm outline-none transition resize-none";

  const genderOptions = [
    { key: "female", label: "Feminino" },
    { key: "male", label: "Masculino" },
    { key: "both", label: "Ambos" },
  ];

  if (loading) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
        <header className="w-full border-b border-[#E5E0DA]/80 bg-[#F7F4EF]/80 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-8 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
                <span className="text-[13px] font-semibold tracking-tight text-white leading-none">
                  L
                </span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold tracking-tight text-black">
                  Look
                </span>
                <span className="text-[11px] text-neutral-500">
                  Novo produto
                </span>
              </div>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-6xl px-8 pt-12 animate-pulse space-y-4">
          <div className="h-7 w-64 bg-neutral-300/30 rounded-lg" />
          <div className="h-4 w-80 bg-neutral-300/20 rounded-lg" />
          <div className="h-44 w-full bg-white/60 rounded-3xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      <header className="w-full border-b border-[#E5E0DA]/80 bg-[#F7F4EF]/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/parceiros/produtos/adicionar")}
              className="h-8 w-8 rounded-full bg-white/70 border border-neutral-200/70 flex items-center justify-center text-neutral-700 hover:text-black hover:bg-white transition"
              aria-label="Voltar"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                stroke="currentColor"
                fill="none"
              >
                <path
                  d="M15 6l-6 6 6 6"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
              <span className="text-[13px] font-semibold tracking-tight text-white leading-none">
                L
              </span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-black">Look</span>
              <span className="text-[11px] text-neutral-500">Novo produto</span>
            </div>
            {storeName ? (
              <span className="ml-2 text-[11px] px-3 py-1 rounded-full bgWHITE/60 border border-neutral-200/60 text-neutral-700">
                {storeName}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {loggedEmail ? (
              <span className="px-3 py-1 rounded-full bg-white/70 border border-neutral-200 text-[11px] text-neutral-700">
                {loggedEmail}
              </span>
            ) : null}
            <button
              onClick={handleSignOut}
              className="h-9 rounded-full px-4 text-xs font-medium text-neutral-700 hover:text-black transition border border-neutral-300/70 bg-white/70"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-8 pt-10 pb-20">
        <h1 className="text-[30px] font-semibold text-black tracking-tight mb-2 max-w-3xl leading-tight">
          Novo produto
        </h1>
        <p className="text-sm text-neutral-600 mb-6">
          Preencha as informações do produto e salve para adicionar na Look.
        </p>
        {notice ? (
          <p className="mb-6 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {notice}
          </p>
        ) : null}

        <div className="max-w-5xl rounded-3xl bg-[#F6F2EC]/80 border border-[#E5E0DA]/75 backdrop-blur-sm shadow-[0_16px_35px_-32px_rgba(0,0,0,0.3)] p-6 md:p-8">
          <div className="flex flex-col gap-8 md:flex-row">
            {/* imagem */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div
                  style={{
                    width: 220,
                    height: 275,
                    borderRadius: 28,
                    backgroundColor: firstPhoto ? "transparent" : "#F1EAE3",
                    backgroundImage: firstPhoto
                      ? `url(${firstPhoto})`
                      : undefined,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "contain",
                    backgroundPosition: "center",
                  }}
                >
                  {!firstPhoto ? (
                    <div className="w-full h-full flex items-center justify-center text-[11px] text-neutral-400 text-center px-2">
                      sem imagem
                    </div>
                  ) : null}
                </div>

                {photoUrls.length > 1 ? (
                  <div className="absolute bottom-3 right-3 flex gap-1">
                    {photoUrls.slice(1, 5).map((url, idx) => (
                      <div
                        key={idx}
                        className="w-8 h-8 rounded-xl bg-[#F1EAE3] overflow-hidden border border-white/60 shadow-sm"
                      >
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            backgroundImage: `url(${url})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

                {priceTag ? (
                  <div className="absolute -bottom-4 left-3 bg-black text-white text-[11px] px-4 py-[5px] rounded-full shadow-sm">
                    {priceTag}
                  </div>
                ) : null}
              </div>

              <div className="mt-7 space-y-1">
                <p className="text-[11px] text-neutral-400 uppercase tracking-wide">
                  {storeName || "sua marca"}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {category ? (
                    <span className="px-2 py-[3px] rounded-full bg-white text-[10px] text-neutral-700 border border-white/0">
                      {category}
                    </span>
                  ) : null}
                  {gender ? (
                    <span className="px-2 py-[3px] rounded-full bgWHITE text-[10px] text-neutral-700">
                      {gender === "both" ? "female,male" : gender}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* formulário */}
            <div className="flex-1">
              <div className="flex flex-col gap-5">
                <div className={fieldRoot}>
                  <label className={fieldLabel}>Nome do produto</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={fieldInput}
                    placeholder="Ex: Sandália tira dupla..."
                  />
                </div>

                <div className={fieldRoot}>
                  <label className={fieldLabel}>
                    Descrição do produto (bio)
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className={fieldTextarea}
                    placeholder="Conte um pouco sobre o produto, materiais, caimento..."
                  />
                </div>

                <div className={fieldRoot}>
                  <label className={fieldLabel}>Preço (price_tag)</label>
                  <input
                    value={priceTag}
                    onChange={(e) => setPriceTag(e.target.value)}
                    className={fieldInput}
                    placeholder="R$ 398"
                  />
                </div>

                {/* tamanhos com estoque */}
                <div className={fieldRoot}>
                  <label className={fieldLabel}>Tamanhos e estoque</label>

                  {/* adicionar novo tamanho */}
                  <div className="flex gap-2">
                    <input
                      value={newSize}
                      onChange={(e) => setNewSize(e.target.value.toUpperCase())}
                      className={fieldInput + " flex-1"}
                      placeholder="Ex: 36, P, M..."
                    />
                    <button
                      type="button"
                      onClick={handleAddSize}
                      className="h-10 px-4 rounded-2xl bg-black text-white text-xs font-medium hover:opacity-95 transition"
                    >
                      adicionar
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-[2px]">
                    Adicione tamanho por tamanho. Cada um terá o seu estoque.
                  </p>

                  {/* lista de tamanhos */}
                  <div className="mt-3 flex flex-col gap-2">
                    {sizeEntries.length === 0 ? (
                      <div className="text-[11px] text-neutral-400 bg-white/60 border border-dashed border-neutral-200 rounded-2xl px-4 py-3">
                        Nenhum tamanho adicionado.
                      </div>
                    ) : (
                      sizeEntries.map((entry, idx) => (
                        <div
                          key={entry.size}
                          className="flex items-center gap-3 bg-white rounded-2xl px-4 py-2.5 border border-transparent"
                        >
                          <div className="w-16 h-8 bg-black text-white text-xs rounded-full flex items-center justify-center font-medium">
                            {entry.size}
                          </div>
                          <div className="flex flex-col gap-1 flex-1">
                            <span className="text-[10px] text-neutral-400 leading-none">
                              Estoque
                            </span>
                            <input
                              value={entry.stock}
                              onChange={(e) => {
                                const v = e.target.value;
                                setSizeEntries((old) =>
                                  old.map((it, i) =>
                                    i === idx
                                      ? { ...it, stock: v.replace(",", ".") }
                                      : it
                                  )
                                );
                              }}
                              className="h-8 rounded-xl bg-[#F6F2EC] px-3 text-sm outline-none border border-transparent focus:border-black/30 w-28"
                              placeholder="0"
                              inputMode="numeric"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setSizeEntries((old) =>
                                old.filter((_, i) => i !== idx)
                              )
                            }
                            className="text-[11px] text-neutral-500 hover:text-red-500"
                          >
                            remover
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* gênero */}
                <div className={fieldRoot}>
                  <label className={fieldLabel}>Gênero</label>
                  <div className="flex gap-2 flex-wrap">
                    {genderOptions.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setGender(opt.key)}
                        className={`px-4 py-2 rounded-full text-[11px] border transition leading-none ${
                          gender === opt.key
                            ? "bg-black text-white border-black"
                            : "bg-white text-neutral-700 border-transparent hover:border-neutral-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setGender("")}
                      className={`px-4 py-2 rounded-full text-[11px] border transition leading-none ${
                        gender === ""
                          ? "bg-black text-white border-black"
                          : "bg-white text-neutral-700 border-transparent hover:border-neutral-200"
                      }`}
                    >
                      limpar
                    </button>
                  </div>
                </div>

                {/* categoria principal */}
                <div className={fieldRoot} ref={categoryBoxRef}>
                  <label className={fieldLabel}>Categoria principal</label>

                  {!isCustomCategory ? (
                    <button
                      type="button"
                      onClick={() => setCategoryOpen((prev) => !prev)}
                      className="h-10 rounded-2xl bg-white shadow-[0_2px_18px_rgba(0,0,0,0.02)] px-4 text-sm flex items-center justify-between gap-2 border border-transparent hover:border-black/10"
                    >
                      <span className="truncate">
                        {category || "Selecione…"}
                      </span>
                      <span className="text-neutral-400 text-xs">▼</span>
                    </button>
                  ) : (
                    <input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={fieldInput}
                      placeholder="Digite a categoria…"
                    />
                  )}

                  {categoryOpen && !isCustomCategory ? (
                    <div className="mt-2 max-h-48 overflow-auto rounded-2xl bg-white shadow-[0_12px_24px_rgba(0,0,0,0.06)] border border-[#e9dfd6] text-sm z-20">
                      {allCategories.length === 0 ? (
                        <div className="px-4 py-2 text-neutral-400 text-xs">
                          Nenhuma categoria encontrada
                        </div>
                      ) : (
                        allCategories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setCategory(cat);
                              setCategoryOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-[#F7F4EF] ${
                              cat === category ? "bg-[#F7F4EF]" : ""
                            }`}
                          >
                            {cat}
                          </button>
                        ))
                      )}
                      <div className="border-t border-[#eee3d8]" />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCategory(true);
                          setCategoryOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-neutral-500 hover:bg-[#F7F4EF]"
                      >
                        + Adicionar nova…
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* categorias extras */}
                <div className={fieldRoot}>
                  <label className={fieldLabel}>Categorias extras</label>
                  <input
                    value={categories}
                    onChange={(e) => setCategories(e.target.value)}
                    className={fieldInput}
                    placeholder="sapato, sapatilha..."
                  />
                  <p className="text-[10px] text-neutral-400 mt-[2px]">
                    Vamos juntar esta lista com a categoria principal.
                  </p>
                </div>

                {/* urls */}
                <div className={fieldRoot}>
                  <label className={fieldLabel}>
                    URLs de imagem (separe por vírgula)
                  </label>
                  <textarea
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    rows={2}
                    className={fieldTextarea}
                    placeholder="https://..., https://..."
                  />
                  <p className="text-[10px] text-neutral-400 mt-[2px]">
                    A primeira URL será usada como capa na listagem.
                  </p>
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-black text-white px-6 py-2.5 text-sm font-medium hover:opacity-95 active:scale-[0.995] disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar produto"}
                </button>
                <button
                  onClick={() => router.push("/parceiros/produtos")}
                  className="text-sm text-neutral-500 hover:text-neutral-800"
                >
                  cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
