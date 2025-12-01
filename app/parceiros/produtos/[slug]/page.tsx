// app/parceiros/produtos/[slug]/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const SURFACE = "#F7F4EF";

// helper: normaliza gender vindo do banco (string ou array) para a UI ("female" | "male" | "both" | "")
function normalizeGenderForUI(g: unknown): "" | "female" | "male" | "both" {
  const mapToUI = (v: string): "" | "female" | "male" | "both" => {
    const s = v.trim().toLowerCase();
    if (!s) return "";
    if (s === "female" || s === "feminino") return "female";
    if (s === "male" || s === "masculino") return "male";
    if (
      s === "female,male" ||
      s === "male,female" ||
      s === "unisex" ||
      s === "both"
    )
      return "both";
    return "";
  };

  if (Array.isArray(g)) {
    if (!g.length) return "";
    const lower = g.map((x) => String(x).toLowerCase());
    const hasMale = lower.includes("male") || lower.includes("masculino");
    const hasFemale = lower.includes("female") || lower.includes("feminino");
    if (hasMale && hasFemale) return "both";
    if (hasMale) return "male";
    if (hasFemale) return "female";
    return mapToUI(String(lower[0] ?? ""));
  }
  if (typeof g === "string" && g.trim()) {
    return mapToUI(g);
  }
  return "";
}

// helper: converte UI -> formato do banco (array)
function genderUIToDb(g: string): string[] {
  if (g === "female") return ["female"];
  if (g === "male") return ["male"];
  if (g === "both") return ["male", "female"];
  return [];
}

type Product = {
  id: string | number;
  slug: string | null;
  name: string | null;
  price_tag: string | number | null;
  photo_url: string[] | string | null;
  sizes: string[] | string | null;
  size_stocks: number[] | null;
  category: string | null;
  gender: string | string[] | null;
  categories: string[] | string | null;
  store_name: string | null;
  bio?: string | null;
};

export const dynamic = "force-dynamic";

function slugify(s: string) {
  const a = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return a
    .toLowerCase()
    .replace(/&/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// Tipo local para gerenciar thumbs (remoto vs local)
type ImgEntry =
  | { id: string; src: string; kind: "remote" }
  | { id: string; file: File; src: string; kind: "local" };

export default function PartnerProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slugParam = Array.isArray(params.slug)
    ? params.slug[0]
    : (params.slug as string);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loggedEmail, setLoggedEmail] = useState<string>("");
  const [storeName, setStoreName] = useState<string>("");

  const [productId, setProductId] = useState<string | number | null>(null);
  const [slug, setSlug] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [priceTag, setPriceTag] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [categories, setCategories] = useState<string>("");

  // imagem: mantemos um array de ImgEntry para controlar ordem/remoção/upload
  const [images, setImages] = useState<ImgEntry[]>([]);

  // NOVO: lista de tamanhos com estoque
  const [sizeEntries, setSizeEntries] = useState<
    Array<{ size: string; stock: string }>
  >([]);
  const [newSize, setNewSize] = useState<string>("");

  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryBoxRef = useRef<HTMLDivElement | null>(null);

  const toStr = (v: unknown) => (v ?? "").toString().trim();

  function toCommaString(v: string[] | string | null): string {
    if (!v) return "";
    if (Array.isArray(v)) return v.join(", ");
    return v;
  }
  function toArray(v: string): string[] {
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Upload helpers: compatíveis com RLS (users/<uid>/...)
  async function uploadFileToStoreImages(
    file: File,
    storeSlugLocal: string,
    prefix: string
  ): Promise<string> {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) throw new Error("não autenticado");

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const key = `users/${uid}/${storeSlugLocal}/${prefix}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("store_images")
      .upload(key, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "image/jpeg",
      });

    if (error) throw error;

    const { data } = supabase.storage.from("store_images").getPublicUrl(key);
    return data.publicUrl;
  }

  async function uploadFilesToStoreImages(
    files: File[],
    storeSlugLocal: string,
    prefixBase = "product"
  ): Promise<string[]> {
    const out: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        const url = await uploadFileToStoreImages(
          f,
          storeSlugLocal,
          `${prefixBase}-${i}`
        );
        out.push(url);
      } catch (e) {
        console.error("Erro ao subir arquivo:", e);
        // continua com os demais
      }
    }
    return out;
  }

  // auth
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

        setStoreName(row?.store_name || "");
      } catch (err) {
        console.error(err);
        setNotice("Não foi possível carregar seus dados.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // produto
  useEffect(() => {
    if (!slugParam || !storeName) return;
    (async () => {
      setLoading(true);
      try {
        const { data: p1 } = await supabase
          .from("products")
          .select(
            "id, slug, name, price_tag, photo_url, sizes, size_stocks, category, gender, categories, store_name, bio"
          )
          .eq("store_name", storeName)
          .eq("slug", slugParam)
          .maybeSingle();

        let prod: Product | null = (p1 as Product | null) ?? null;

        if (!prod) {
          const { data: p2 } = await supabase
            .from("products")
            .select(
              "id, slug, name, price_tag, photo_url, sizes, size_stocks, category, gender, categories, store_name, bio"
            )
            .eq("store_name", storeName)
            .eq("id", slugParam)
            .maybeSingle();
          prod = (p2 as Product | null) ?? null;
        }

        if (!prod) {
          setNotice("Produto não encontrado.");
          return;
        }

        setProductId(prod.id);
        setSlug(prod.slug || "");
        setName(prod.name || "");
        setPriceTag(prod.price_tag != null ? prod.price_tag.toString() : "");
        setCategory(prod.category || "");
        setBio(prod.bio || "");

        const uiGender = normalizeGenderForUI(prod.gender);
        setGender(uiGender);

        setCategories(toCommaString(prod.categories));

        // NOVO: montar lista de tamanhos com estoque
        const rawSizes = Array.isArray(prod.sizes)
          ? (prod.sizes as string[])
          : typeof prod.sizes === "string"
          ? prod.sizes
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
        const rawStocks = Array.isArray(prod.size_stocks)
          ? prod.size_stocks
          : [];

        const pairs: Array<{ size: string; stock: string }> = [];
        const count = rawSizes.length;
        for (let i = 0; i < count; i++) {
          const s = rawSizes[i] ?? "";
          const st = rawStocks[i] ?? 0;
          if (s.trim()) {
            pairs.push({ size: s.trim(), stock: st.toString() });
          }
        }
        setSizeEntries(pairs);

        // NOVO: inicializar imagens (remote)
        const remoteUrls: string[] = Array.isArray(prod.photo_url)
          ? prod.photo_url
          : typeof prod.photo_url === "string" && prod.photo_url.trim()
          ? prod.photo_url.split(",").map((s) => s.trim()).filter(Boolean)
          : [];
        const remoteEntries: ImgEntry[] = remoteUrls.map((u, i) => ({
          id: `r-${i}-${btoa(u).slice(0, 6)}`,
          src: u,
          kind: "remote" as const,
        }));
        setImages(remoteEntries);
      } catch (err) {
        console.error(err);
        setNotice("Erro ao carregar produto.");
      } finally {
        setLoading(false);
      }
    })();
  }, [slugParam, storeName]);

  // buscar todas as categorias
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("category");
        if (error) throw error;

        const all = (data || [])
          .map((r: { category?: string | null }) =>
            r.category ? r.category.trim() : ""
          )
          .filter(Boolean);

        const uniq = Array.from(new Set(all)).sort((a, b) =>
          a.localeCompare(b, "pt-BR")
        );
        setAllCategories(uniq);

        if (category && !uniq.includes(category)) {
          setIsCustomCategory(true);
        }
      } catch (err) {
        console.error("erro ao buscar categorias globais:", err);
      }
    })();
  }, [category]);

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

  // adicionar um tamanho novo
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

  // ================ Imagens: handlers ================
  // input file mudou -> adiciona entradas locais
  function handleFilesSelected(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files);
    const newEntries: ImgEntry[] = arr.map((f, i) => ({
      id: `l-${Date.now()}-${i}-${f.name}`,
      file: f,
      src: URL.createObjectURL(f),
      kind: "local" as const,
    }));
    setImages((old) => [...old, ...newEntries]);
  }

  // remover imagem (local: revokeObjectURL)
  function handleRemoveImage(id: string) {
    setImages((old) => {
      const next = old.filter((it) => {
        if (it.id === id && it.kind === "local") {
          try {
            URL.revokeObjectURL(it.src);
          } catch (e) {}
        }
        return it.id !== id;
      });
      return next;
    });
  }

  // mover imagem (dir: -1 left, +1 right)
  function moveImage(id: string, dir: -1 | 1) {
    setImages((old) => {
      const idx = old.findIndex((it) => it.id === id);
      if (idx === -1) return old;
      const to = idx + dir;
      if (to < 0 || to >= old.length) return old;
      const copy = old.slice();
      const [item] = copy.splice(idx, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  }

  // salvar
  async function handleSave() {
    if (!productId) return;
    setSaving(true);
    setNotice(null);
    try {
      const priceNum = priceTag.trim()
        ? Number(priceTag.toString().replace(",", "."))
        : null;

      const genderArr = genderUIToDb(gender);

      // monta arrays paralelos
      const cleanEntries = sizeEntries.filter((e) => e.size.trim());
      const sizesArray = cleanEntries.map((e) => e.size.trim());
      const stocksArray = cleanEntries.map((e) => {
        const n = Number(e.stock);
        return Number.isFinite(n) ? n : 0;
      });

      // 1) se houver imagens locais, faz upload mantendo ordem
      const localEntries = images.filter((it) => it.kind === "local") as {
        id: string;
        file: File;
        src: string;
        kind: "local";
      }[];

      let uploadedUrlsMap = new Map<string, string>(); // id -> uploaded url

      if (localEntries.length > 0) {
        const storeSlugLocal = slugify(storeName || String(productId || ""));
        const files = localEntries.map((l) => l.file);
        const uploaded = await uploadFilesToStoreImages(files, storeSlugLocal, "product");
        // uploaded order matches localEntries order
        for (let i = 0; i < localEntries.length; i++) {
          if (uploaded[i]) uploadedUrlsMap.set(localEntries[i].id, uploaded[i]);
        }
      }

      // 2) monta lista final de urls na ordem atual das imagens
      const finalUrls: string[] = images
        .map((it) =>
          it.kind === "remote" ? it.src : uploadedUrlsMap.get(it.id) ?? null
        )
        .filter((u): u is string => !!u);

      // 3) atualiza produto com os campos
      const { error } = await supabase
        .from("products")
        .update({
          name: toStr(name),
          slug: toStr(slug) || null,
          price_tag: priceNum,
          photo_url: finalUrls,
          sizes: sizesArray,
          size_stocks: stocksArray,
          category: toStr(category) || null,
          gender: genderArr,
          categories: toArray(categories),
          bio: toStr(bio) || null,
        })
        .eq("id", productId)
        .eq("store_name", storeName);

      if (error) {
        console.error(error);
        setNotice("Não foi possível salvar no Supabase.");
      } else {
        setNotice("Salvo com sucesso.");
        // opcional: atualizar estado images para remote-only com as urls retornadas
        const remoteEntries: ImgEntry[] = finalUrls.map((u, i) => ({
          id: `r-${i}-${btoa(u).slice(0, 6)}`,
          src: u,
          kind: "remote" as const,
        }));
        setImages(remoteEntries);
      }
    } catch (err) {
      console.error(err);
      setNotice("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const firstPhoto = images.length ? images[0].src : "";

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

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      <header className="w-full border-b border-[#E5E0DA]/80 bg-[#F7F4EF]/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/parceiros/produtos")}
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
              <span className="text-[11px] text-neutral-500">
                Editar produto
              </span>
            </div>
            {storeName ? (
              <span className="ml-2 text-[11px] px-3 py-1 rounded-full bg-white/60 border border-neutral-200/60 text-neutral-700">
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
              onClick={async () => {
                await supabase.auth.signOut({ scope: "local" });
                router.replace("/parceiros/login");
              }}
              className="h-9 rounded-full px-4 text-xs font-medium text-neutral-700 hover:text-black transition border border-neutral-300/70 bg-white/70"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-8 pt-10 pb-20">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-7 w-60 bg-neutral-200/50 rounded" />
            <div className="h-44 w-full bg-white/60 rounded-3xl" />
          </div>
        ) : (
          <>
            <h1 className="text-[30px] font-semibold text-black tracking-tight mb-2 max-w-3xl leading-tight">
              {name || "Produto sem nome"}
            </h1>
            <p className="text-sm text-neutral-600 mb-6">
              Edite as informações do produto. As alterações são salvas no
              Supabase.
            </p>
            {notice && (
              <p className="mb-6 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {notice}
              </p>
            )}

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

                    {images.length > 1 ? (
                      <div className="absolute bottom-3 right-3 flex gap-1">
                        {images.slice(1, 5).map((it, idx) => (
                          <div
                            key={it.id}
                            className="w-8 h-8 rounded-xl bg-[#F1EAE3] overflow-hidden border border-white/60 shadow-sm"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={it.src} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
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
                        <span className="px-2 py-[3px] rounded-full bg-white text-[10px] text-neutral-700">
                          {gender === "both" ? "female,male" : gender}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* formulário */}
                <div className="flex-1">
                  <div className="flex flex-col gap-5">
                    {/* nome */}
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

                    {/* Previews + controle de imagens */}
                    <div className={fieldRoot}>
                      <label className={fieldLabel}>Imagens do produto</label>

                      <div className="flex gap-2 items-center mb-2">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleFilesSelected(e.target.files)}
                          className="block text-sm"
                        />
                        <div className="text-[11px] text-neutral-500">
                          Faça upload direto do computador ou use as URLs abaixo.
                        </div>
                      </div>

                      {/* lista de thumbs com ações */}
                      <div className="flex gap-2 flex-wrap">
                        {images.length === 0 ? (
                          <div className="text-[11px] text-neutral-400 bg-white/60 border border-dashed border-neutral-200 rounded-2xl px-4 py-3">
                            Nenhuma imagem adicionada.
                          </div>
                        ) : (
                          images.map((it, idx) => (
                            <div
                              key={it.id}
                              className="relative w-28 p-1 rounded-xl bg-white border border-neutral-200"
                            >
                              <div className="aspect-[4/5] bg-neutral-100 overflow-hidden rounded-lg">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={it.src} alt={`img-${idx}`} className="w-full h-full object-cover" />
                              </div>

                              <div className="mt-2 flex items-center justify-between gap-1">
                                <div className="text-[11px] truncate mr-1">
                                  {it.kind === "remote" ? "URL" : "Upload"}
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    title="Mover para esquerda"
                                    onClick={() => moveImage(it.id, -1)}
                                    className="text-xs px-2 py-1 rounded-full border hover:bg-neutral-50"
                                  >
                                    ◀
                                  </button>
                                  <button
                                    title="Mover para direita"
                                    onClick={() => moveImage(it.id, 1)}
                                    className="text-xs px-2 py-1 rounded-full border hover:bg-neutral-50"
                                  >
                                    ▶
                                  </button>
                                  <button
                                    title="Remover"
                                    onClick={() => handleRemoveImage(it.id)}
                                    className="text-xs px-2 py-1 rounded-full border text-red-500 hover:bg-red-50"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <p className="text-[10px] text-neutral-400 mt-[2px]">
                        A ordem aqui define a ordem salva no produto. Capa = primeira imagem.
                      </p>
                    </div>

                    {/* preço */}
                    <div className={fieldRoot}>
                      <label className={fieldLabel}>Preço (price_tag)</label>
                      <input
                        value={priceTag}
                        onChange={(e) => setPriceTag(e.target.value)}
                        className={fieldInput}
                        placeholder="398"
                      />
                    </div>

                    {/* tamanhos com estoque */}
                    <div className={fieldRoot}>
                      <label className={fieldLabel}>Tamanhos e estoque</label>

                      {/* adicionar novo tamanho */}
                      <div className="flex gap-2">
                        <input
                          value={newSize}
                          onChange={(e) =>
                            setNewSize(e.target.value.toUpperCase())
                          }
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
                        Adicione tamanho por tamanho. Cada um terá o seu
                        estoque.
                      </p>

                      {/* lista de tamanhos já inseridos */}
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
                                          ? {
                                              ...it,
                                              stock: v.replace(",", "."),
                                            }
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
                    </div>
                  </div>

                  <div className="pt-6 flex gap-3">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-full bg-black text-white px-6 py-2.5 text-sm font-medium hover:opacity-95 active:scale-[0.995] disabled:opacity-50"
                    >
                      {saving ? "Salvando..." : "Salvar alterações"}
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
          </>
        )}
      </div>
    </main>
  );
}
