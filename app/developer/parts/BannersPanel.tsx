"use client";

import { useEffect, useMemo, useState } from "react";
import type React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

type BannerRow = {
  id: number;
  city: string;
  slot: "carousel" | "editorial_tall" | "selection_hero" | string;
  sort_order: number;
  image_url: string;
  href: string;
  title: string | null;
  subtitle_text: string | null;
  subtitle_lines: string[] | null;
  alt: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export default function BannersPanel({
  supabase,
}: {
  supabase: SupabaseClient;
}) {
  const [cities, setCities] = useState<string[]>([]);
  const [city, setCity] = useState<string>("São Paulo");
  const [rows, setRows] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // carrega cidades
  useEffect(() => {
    let mounted = true;
    async function loadCities() {
      const { data, error } = await supabase
        .from("home_banners")
        .select("city")
        .order("city", { ascending: true });
      if (!mounted) return;
      if (error) {
        setError(error.message);
        return;
      }
      const list = Array.from(
        new Set((data ?? []).map((r) => r.city).filter(Boolean))
      );
      setCities(list.length ? list : ["São Paulo"]);
      // removido uso de `city` aqui para não exigir dependência
    }
    loadCities();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  // carrega banners da cidade
  useEffect(() => {
    if (!city) return;
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("home_banners")
        .select(
          "id,city,slot,sort_order,image_url,href,title,subtitle_text,subtitle_lines,alt,is_active,updated_at,created_at"
        )
        .eq("city", city)
        .order("slot", { ascending: true })
        .order("sort_order", { ascending: true });
      if (!mounted) return;
      if (error) setError(error.message);
      setRows((data as BannerRow[]) ?? []);
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [supabase, city]);

  const grouped = useMemo(() => {
    const bySlot: Record<string, BannerRow[]> = {
      carousel: [],
      editorial_tall: [],
      selection_hero: [],
    };
    for (const r of rows) {
      if (!bySlot[r.slot]) bySlot[r.slot] = [];
      bySlot[r.slot].push(r);
    }
    return bySlot;
  }, [rows]);

  async function addBanner(slot: BannerRow["slot"]) {
    const payload: Partial<BannerRow> = {
      city,
      slot,
      sort_order: slot === "carousel" ? nextSort(grouped.carousel) : 0,
      image_url: "",
      href: "",
      title: "",
      subtitle_text: "",
      subtitle_lines: [],
      alt: "",
      is_active: true,
    };
    const { data, error } = await supabase
      .from("home_banners")
      .insert(payload)
      .select()
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setRows((prev) => [...prev, data as BannerRow]);
  }

  async function saveRow(r: BannerRow) {
    setSaving(true);
    setError(null);
    const { id, ...rest } = r;
    const payload = { ...rest, subtitle_lines: r.subtitle_lines ?? null };
    const { error } = await supabase
      .from("home_banners")
      .update(payload)
      .eq("id", id);
    if (error) setError(error.message);
    setSaving(false);
  }

  async function deleteRow(id: number) {
    const ok = confirm("Remover banner?");
    if (!ok) return;
    const { error } = await supabase.from("home_banners").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setRows((prev) => prev.filter((x) => x.id !== id));
  }

  function nextSort(arr: BannerRow[]) {
    return arr.length ? Math.max(...arr.map((x) => x.sort_order ?? 0)) + 1 : 0;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Banners</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Cidade</label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          >
            {[...new Set([city, ...cities])].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            className="ml-2 px-3 py-1.5 rounded-md border border-gray-300 text-sm"
            onClick={() => addBanner("carousel")}
          >
            Novo carousel
          </button>
          <button
            className="px-3 py-1.5 rounded-md border border-gray-300 text-sm"
            onClick={() => addBanner("editorial_tall")}
          >
            Novo editorial
          </button>
          <button
            className="px-3 py-1.5 rounded-md border border-gray-300 text-sm"
            onClick={() => addBanner("selection_hero")}
          >
            Novo selection
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {loading ? <p>Carregando…</p> : null}

      <SlotSection
        title="Carousel"
        hint="Ordem afeta o carrossel"
        rows={grouped.carousel}
        onChange={setRows}
      >
        {grouped.carousel.map((r) => (
          <BannerRowEditor
            key={r.id}
            row={r}
            onChange={setRows}
            onSave={saveRow}
            onDelete={deleteRow}
          />
        ))}
      </SlotSection>

      <SlotSection
        title="Editorial Tall"
        hint="Apenas um ativo por cidade"
        rows={grouped["editorial_tall"]}
        onChange={setRows}
      >
        {grouped["editorial_tall"]?.map((r) => (
          <BannerRowEditor
            key={r.id}
            row={r}
            onChange={setRows}
            onSave={saveRow}
            onDelete={deleteRow}
          />
        ))}
      </SlotSection>

      <SlotSection
        title="Selection Hero"
        hint="Apenas um ativo por cidade"
        rows={grouped["selection_hero"]}
        onChange={setRows}
      >
        {grouped["selection_hero"]?.map((r) => (
          <BannerRowEditor
            key={r.id}
            row={r}
            onChange={setRows}
            onSave={saveRow}
            onDelete={deleteRow}
          />
        ))}
      </SlotSection>

      {saving ? <p className="text-sm text-gray-500 mt-2">Salvando…</p> : null}
    </div>
  );
}

function SlotSection({
  title,
  hint,
  rows: _rows,            // alias para evitar no-unused-vars
  onChange: _onChange,     // alias para evitar no-unused-vars
  children,
}: {
  title: string;
  hint?: string;
  rows: BannerRow[];
  onChange: (updater: (prev: BannerRow[]) => BannerRow[]) => void;
  children: React.ReactNode;
}) {
  // referenciar explicitamente para evitar erro de "defined but never used"
  void _rows;
  void _onChange;

  return (
    <div className="mb-8">
      <div className="flex items-end gap-3 mb-2">
        <h3 className="text-base font-semibold">{title}</h3>
        {hint && <span className="text-xs text-gray-500">{hint}</span>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function BannerRowEditor({
  row,
  onChange,
  onSave,
  onDelete,
}: {
  row: BannerRow;
  onChange: React.Dispatch<React.SetStateAction<BannerRow[]>>;
  onSave: (r: BannerRow) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  function set<K extends keyof BannerRow>(key: K, val: BannerRow[K]) {
    onChange((prev) =>
      prev.map((x) => (x.id === row.id ? { ...x, [key]: val } : x))
    );
  }
  function setSubtitleLinesFromCsv(csv: string) {
    const arr = csv
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    set("subtitle_lines", arr.length ? arr : []);
  }

  return (
    <div className="border border-gray-200 rounded-xl p-3">
      <div className="grid md:grid-cols-12 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs text-gray-600">Slot</label>
          <input
            className="w-full border rounded-md px-2 py-1.5 text-sm bg-gray-50"
            value={row.slot}
            readOnly
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-gray-600">Sort</label>
          <input
            type="number"
            className="w-full border rounded-md px-2 py-1.5 text-sm"
            value={row.sort_order ?? 0}
            onChange={(e) => set("sort_order", Number(e.target.value))}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-gray-600">Ativo</label>
          <div className="flex items-center h-9">
            <input
              type="checkbox"
              checked={row.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
            />
          </div>
        </div>
        <div className="md:col-span-6">
          <label className="text-xs text-gray-600">Href</label>
          <input
            className="w-full border rounded-md px-2 py-1.5 text-sm"
            value={row.href ?? ""}
            onChange={(e) => set("href", e.target.value)}
            placeholder="https://wearalook.com/editorial/..."
          />
        </div>

        <div className="md:col-span-12">
          <label className="text-xs text-gray-600">Image URL</label>
          <input
            className="w-full border rounded-md px-2 py-1.5 text-sm"
            value={row.image_url ?? ""}
            onChange={(e) => set("image_url", e.target.value)}
            placeholder="https://SUPABASE_URL/storage/v1/object/public/home_banners/…"
          />
        </div>

        <div className="md:col-span-6">
          <label className="text-xs text-gray-600">Título</label>
          <input
            className="w-full border rounded-md px-2 py-1.5 text-sm"
            value={row.title ?? ""}
            onChange={(e) => set("title", e.target.value)}
          />
        </div>

        <div className="md:col-span-6">
          <label className="text-xs text-gray-600">Subtítulo simples</label>
          <input
            className="w-full border rounded-md px-2 py-1.5 text-sm"
            value={row.subtitle_text ?? ""}
            onChange={(e) => set("subtitle_text", e.target.value)}
            placeholder="Exemplo: Entregas em até 90 min"
          />
        </div>

        <div className="md:col-span-12">
          <label className="text-xs text-gray-600">Subtítulo por linhas</label>
          <textarea
            className="w-full border rounded-md px-2 py-1.5 text-sm"
            rows={3}
            value={(row.subtitle_lines ?? []).join("\n")}
            onChange={(e) => setSubtitleLinesFromCsv(e.target.value)}
            placeholder="Digite cada linha em uma nova linha"
          />
        </div>

        <div className="md:col-span-8">
          <label className="text-xs text-gray-600">Alt</label>
          <input
            className="w-full border rounded-md px-2 py-1.5 text-sm"
            value={row.alt ?? ""}
            onChange={(e) => set("alt", e.target.value)}
          />
        </div>

        <div className="md:col-span-4 flex items-end justify-end gap-2">
          <button
            className="px-3 py-2 rounded-md border border-gray-300 text-sm"
            onClick={() => onSave({ ...row })}
          >
            Salvar
          </button>
          <button
            className="px-3 py-2 rounded-md bg-red-600 text-white text-sm rounded"
            onClick={() => onDelete(row.id)}
          >
            Remover
          </button>
        </div>
      </div>
    </div>
  );
}
