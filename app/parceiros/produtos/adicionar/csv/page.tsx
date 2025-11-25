"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const SURFACE = "#F7F4EF";

type StoreRow = {
  id: number;
  name: string;
};

export const dynamic = "force-dynamic";

export default function PartnerProductImportCsvPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loggedEmail, setLoggedEmail] = useState<string>("");
  const [storeName, setStoreName] = useState<string>("");
  const [storeId, setStoreId] = useState<number | null>(null);

  const [fileContent, setFileContent] = useState<string>("");
  const [rowsPreview, setRowsPreview] = useState<
    Array<Record<string, string>>
  >([]);
  const [parsedOk, setParsedOk] = useState(false);

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

  // ---------- PARSER ROBUSTO (substitui split+detect simples) ----------

  // Divide um texto CSV em linhas/células respeitando aspas e quebras internas
  function parseCsv(text: string): Array<Record<string, string>> {
    if (!text || !text.toString().trim()) return [];

    // Remove BOM inicial se houver
    if (text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1);
    }

    // Não "splitar" por \n imediatamente — precisamos achar o fim do header que NÃO esteja dentro de aspas.
    // Encontrar índice do fim do header (primeiro newline que não esteja dentro de aspas)
    let inQuotes = false;
    let headerEndIdx = -1;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          i++; // pula a aspa escapada
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
        headerEndIdx = i;
        break;
      }
    }

    if (headerEndIdx === -1) {
      const quickLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean);
      if (!quickLines.length) return [];
      const headerRow = quickLines[0];
      const sep = detectSeparatorFromHeader(headerRow);
      const header = splitRespectingQuotes(headerRow, sep).map(h => normalizeHeader(h));
      const data = quickLines.slice(1).map(l => splitRespectingQuotes(l, sep));
      return mapRows(header, data);
    }

    const headerRaw = text.slice(0, headerEndIdx);
    let restStart = headerEndIdx;
    while (restStart < text.length && (text[restStart] === '\r' || text[restStart] === '\n')) restStart++;
    const bodyRaw = text.slice(restStart);

    const sep = detectSeparatorFromHeader(headerRaw);
    const header = splitRespectingQuotes(headerRaw, sep).map(h => normalizeHeader(h));

    const rows: string[][] = [];
    let curCell = "";
    let curRow: string[] = [];
    inQuotes = false;

    for (let i = 0; i < bodyRaw.length; i++) {
      const ch = bodyRaw[i];

      if (ch === '"') {
        const next = bodyRaw[i + 1];
        if (next === '"') {
          curCell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === sep && !inQuotes) {
        curRow.push(curCell);
        curCell = "";
      } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
        curRow.push(curCell);
        curCell = "";
        if (ch === '\r' && bodyRaw[i + 1] === '\n') {
          i++;
        } else if (ch === '\n' && bodyRaw[i + 1] === '\r') {
          i++;
        }
        rows.push(curRow);
        curRow = [];
      } else {
        curCell += ch;
      }
    }

    if (inQuotes) {
      curRow.push(curCell);
      rows.push(curRow);
    } else {
      if (curCell !== "" || curRow.length > 0) {
        curRow.push(curCell);
        rows.push(curRow);
      }
    }

    return mapRows(header, rows);
  }

  function detectSeparatorFromHeader(headerRaw: string): string {
    const candidates = [",", ";", "\t", "|"];
    let best = ",";
    let bestCount = -1;
    for (const c of candidates) {
      const cnt = headerRaw.split(c).length - 1;
      if (cnt > bestCount) {
        bestCount = cnt;
        best = c;
      }
    }
    return best;
  }

  function splitRespectingQuotes(line: string, sep: string): string[] {
    const res: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        const next = line[i + 1];
        if (next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === sep && !inQuotes) {
        res.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    res.push(cur);
    return res.map(s => s.replace(/^"(.*)"$/,'$1').trim());
  }

  function normalizeHeader(h: string): string {
    return h
      .trim()
      .replace(/^"(.*)"$/, "$1")
      .replace(/^\uFEFF/, "")
      .toLowerCase()
      .replace(/\s+/g, "_");
  }

  function mapRows(header: string[], rowsArr: string[][]): Array<Record<string, string>> {
    const out: Array<Record<string, string>> = [];
    for (const r of rowsArr) {
      const obj: Record<string, string> = {};
      for (let i = 0; i < header.length; i++) {
        obj[header[i]] = (r[i] ?? "").toString().trim();
      }
      out.push(obj);
    }
    return out;
  }

  // quebra campos tipo photo_url ou categories em array
  function toArray(v: string): string[] {
    if (!v || !v.toString().trim()) return [];
    return v
      .toString()
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // ---------- fim parser ----------

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) || "";
      setFileContent(text);
      const rows = parseCsv(text);
      setRowsPreview(rows.slice(0, 30));
      setParsedOk(rows.length > 0);
      setNotice(
        rows.length
          ? `Arquivo lido com ${rows.length} linha(s). Confira abaixo antes de importar.`
          : "Arquivo vazio ou cabeçalho inválido."
      );
    };
    reader.readAsText(file, "utf-8");
  }

  async function handleImport() {
    if (!fileContent.trim()) {
      setNotice("Selecione um arquivo CSV antes.");
      return;
    }
    if (!storeName) {
      setNotice("Loja não identificada.");
      return;
    }

    const rows = parseCsv(fileContent);
    if (!rows.length) {
      setNotice("CSV sem linhas válidas.");
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const payloads = rows.map((r) => {
        const mainCat = (r["category"] || "").toString().trim();
        const extraCatsStr = (r["categories"] || "").toString().trim();
        const extraCats = toArray(extraCatsStr);
        const allCats = Array.from(
          new Set([mainCat, ...extraCats].filter((x) => x && x.length > 0))
        );

        // gender como array, igual ao formulário manual
        const rawGender = (r["gender"] || "").toString().trim().toLowerCase();
        let genderArr: string[] = [];
        if (rawGender === "female" || rawGender === "feminino") {
          genderArr = ["female"];
        } else if (rawGender === "male" || rawGender === "masculino") {
          genderArr = ["male"];
        } else if (
          rawGender === "both" ||
          rawGender === "unissex" ||
          rawGender === "unisex"
        ) {
          genderArr = ["male", "female"];
        }

        const photoStr = (r["photo_url"] || "").toString();
        const sizesStr = (r["sizes"] || "").toString();
        const sizeStocksStr = (r["size_stocks"] || "").toString();

        const rawSizes = toArray(sizesStr);
        const rawStocksStr = toArray(sizeStocksStr);

        const len = Math.min(rawSizes.length, rawStocksStr.length);
        const sizesArray: string[] = [];
        const sizeStocksArray: number[] = [];

        for (let i = 0; i < len; i++) {
          const size = rawSizes[i]?.trim();
          if (!size) continue;
          const num = Number(rawStocksStr[i].toString().replace(",", "."));
          sizesArray.push(size);
          sizeStocksArray.push(Number.isFinite(num) ? num : 0);
        }

        // photo array e capa (image_url) = primeira foto
        const photoArr = toArray(photoStr);

        return {
          name: (r["name"] || "").toString().trim() || null,
          bio: (r["bio"] || "").toString().trim() || null,
          price_tag: (r["price_tag"] || "").toString().trim() || null,
          photo_url: photoArr,
          sizes: sizesArray,
          size_stocks: sizeStocksArray,
          category: mainCat || null,
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
          image_url: photoArr.length > 0 ? photoArr[0] : null,
          price_cents: null,
          store_id: storeId ?? null,
        };
      });

      const chunkSize = 50;
      let imported = 0;
      for (let i = 0; i < payloads.length; i += chunkSize) {
        const slice = payloads.slice(i, i + chunkSize);
        const { error } = await supabase.from("products").insert(slice);
        if (error) {
          console.error("erro ao inserir slice", i, error);
          setNotice(
            `Importação parcialmente concluída. Inseridos ${imported} itens. Erro em uma das partes.`
          );
          setSaving(false);
          return;
        }
        imported += slice.length;
      }

      setNotice(
        `Importação concluída com sucesso. ${imported} produto(s) criado(s).`
      );
    } catch (err) {
      console.error(err);
      setNotice("Erro ao importar CSV.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/parceiros/login");
  }

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
                  Importar CSV
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
      {/* topbar */}
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
              <span className="text-[11px] text-neutral-500">
                Importar produtos via CSV
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
              onClick={handleSignOut}
              className="h-9 rounded-full px-4 text-xs font-medium text-neutral-700 hover:text-black transition border border-neutral-300/70 bg-white/70"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* conteúdo */}
      <div className="mx-auto max-w-6xl px-8 pt-10 pb-20 space-y-6">
        <div>
          <h1 className="text-[30px] font-semibold text-black tracking-tight">
            Importar produtos por CSV
          </h1>
          <p className="text-sm text-neutral-600 mt-1 max-w-2xl">
            Envie um arquivo CSV com as colunas{" "}
            <code className="bg-white/60 px-2 py-1 rounded text-[11px]">
              name, bio, price_tag, photo_url, sizes, size_stocks, category,
              categories, gender
            </code>
            . Os demais campos serão preenchidos automaticamente.
          </p>
        </div>

        {notice ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {notice}
          </p>
        ) : null}

        <div className="rounded-3xl bg-[#F6F2EC]/80 border border-[#E5E0DA]/80 p-6">
          <div className="flex flex-col gap-4">
            <label className="text-sm text-neutral-700 font-medium">
              Arquivo CSV
            </label>

            <div className="mt-1 flex items-center gap-3 flex-wrap">
              <a
                href="https://docs.google.com/spreadsheets/d/1BoH2GJ9QObyPrNYG5jQW8x_aaMF6wSQM/export?format=xlsx"
                className="text-[11px] px-3 py-1 rounded-full bg-white/70 border border-neutral-200 text-neutral-700 hover:bg-white transition"
              >
                Baixar modelo (.xlsx)
              </a>
              <span className="text-[11px] text-neutral-500">
                Baixe, preencha no Excel ou Numbers e exporte em CSV para enviar
                abaixo.
              </span>
            </div>

            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="mt-4 block w-full text-sm text-neutral-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-black file:text-white hover:file:opacity-90"
            />

            {parsedOk ? (
              <div className="text-[11px] text-neutral-500">
                Pré visualização das primeiras linhas
              </div>
            ) : null}

            {parsedOk ? (
              <div className="max-h-64 overflow-auto rounded-2xl bg:white/80 bg-white/80 border border-[#e6ddd3]">
                <table className="w-full text-left text-[11px] text-neutral-700">
                  <thead className="sticky top-0 bg-white/90">
                    <tr>
                      <th className="px-3 py-2">name</th>
                      <th className="px-3 py-2">price_tag</th>
                      <th className="px-3 py-2">category</th>
                      <th className="px-3 py-2">categories</th>
                      <th className="px-3 py-2">gender</th>
                      <th className="px-3 py-2">sizes</th>
                      <th className="px-3 py-2">size_stocks</th>
                      <th className="px-3 py-2">photo_url</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowsPreview.map((r, idx) => {
                      const firstPhoto = (r["photo_url"] || "")
                        .toString()
                        .split(/[,;|]/)
                        .map((s) => s.trim())
                        .filter(Boolean)[0];
                      return (
                        <tr key={idx} className="odd:bg-white/0 even:bg-white/30">
                          <td className="px-3 py-2">{r["name"]}</td>
                          <td className="px-3 py-2">{r["price_tag"]}</td>
                          <td className="px-3 py-2">{r["category"]}</td>
                          <td className="px-3 py-2">{r["categories"]}</td>
                          <td className="px-3 py-2">{r["gender"]}</td>
                          <td className="px-3 py-2">{r["sizes"]}</td>
                          <td className="px-3 py-2">{r["size_stocks"]}</td>
                          <td className="px-3 py-2">
                            {firstPhoto ? (
                              <div className="flex items-center gap-2">
                                <img
                                  src={firstPhoto}
                                  alt="thumb"
                                  className="h-12 w-12 object-cover rounded"
                                  onError={(e) => {
                                    // evitar erro visual se url inválida
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                                <span className="text-[11px] break-all max-w-[36ch]">
                                  {firstPhoto}
                                </span>
                              </div>
                            ) : (
                              <span className="text-neutral-400 text-[11px]">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className="pt-4 flex gap-3">
              <button
                onClick={handleImport}
                disabled={saving || !parsedOk}
                className="inline-flex items-center gap-2 rounded-full bg-black text-white px-6 py-2.5 text-sm font-medium hover:opacity-95 active:scale-[0.995] disabled:opacity-50"
              >
                {saving ? "Importando..." : "Importar CSV"}
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

        <div className="rounded-2xl bg-white/40 border border-[#E5E0DA]/60 p-4 text-[11px] text-neutral-500">
          <p className="mb-2 font-medium text-neutral-700 text-sm">
            Observações
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Se o CSV usar ponto e vírgula, detectamos automaticamente.</li>
            <li>O gênero pode ser female, male ou both.</li>
            <li>
              As categorias extras serão somadas à categoria principal e salvas
              em
              <code className="ml-1 px-2 py-[2px] bg-white/70 rounded">
                categories
              </code>
              .
            </li>
            <li>O tempo de entrega vai ser salvo como 30  60 min.</li>
            <li>Todos os produtos entram ativos.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
