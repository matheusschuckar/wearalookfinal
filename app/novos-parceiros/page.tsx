// app/novos-parceiros/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const SURFACE = "#F7F4EF";
const BORDER = "#E5E0DA";

const CATEGORY_OPTIONS = [
  "Roupas",
  "Calçados",
  "Acessórios",
  "Casa",
  "Viagem",
  "Bodycare",
] as const;

type Category = typeof CATEGORY_OPTIONS[number];

const COUNTRY_OPTIONS = [
  { code: "BR", label: "Brazil" },
  { code: "FR", label: "France" },
  { code: "IT", label: "Italy" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "ES", label: "Spain" },
  { code: "PT", label: "Portugal" },
  { code: "OTHER", label: "Other" },
];

function getStatesForCountry(code: string) {
  switch (code) {
    case "BR":
      return [
        "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
      ].map((s) => ({ value: s, label: s }));
    case "US":
      return [
        "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
      ].map((s) => ({ value: s, label: s }));
    case "FR":
      return [
        "Auvergne-Rhône-Alpes","Bourgogne-Franche-Comté","Brittany","Centre-Val de Loire","Corsica","Grand Est","Hauts-de-France","Île-de-France","Normandy","Nouvelle-Aquitaine","Occitanie","Pays de la Loire","Provence-Alpes-Côte d'Azur"
      ].map((s) => ({ value: s, label: s }));
    case "IT":
      return [
        "Abruzzo","Aosta Valley","Apulia","Basilicata","Calabria","Campania","Emilia-Romagna","Friuli Venezia Giulia","Lazio","Liguria","Lombardy","Marche","Molise","Piedmont","Sardinia","Sicily","Trentino-Alto Adige","Tuscany","Umbria","Veneto"
      ].map((s) => ({ value: s, label: s }));
    case "ES":
      return [
        "Andalusia","Aragon","Asturias","Balearic Islands","Basque Country","Canary Islands","Cantabria","Castile and León","Castilla-La Mancha","Catalonia","Extremadura","Galicia","La Rioja","Madrid","Murcia","Navarre","Valencian Community"
      ].map((s) => ({ value: s, label: s }));
    case "PT":
      return [
        "Açores","Alentejo","Algarve","Centro","Lisboa","Madeira","Norte"
      ].map((s) => ({ value: s, label: s }));
    default:
      return [];
  }
}

export default function NovoParceiroPage() {
  const router = useRouter();

  const [brandName, setBrandName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [country, setCountry] = useState<string>("BR");
  const [stateCode, setStateCode] = useState<string>("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [stockReady, setStockReady] = useState<"yes" | "no" | "on_demand" | "">("");
  const [yearsActive, setYearsActive] = useState<number | "">("");
  const [howFound, setHowFound] = useState("");
  const [consent, setConsent] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [successProtocol, setSuccessProtocol] = useState<string | null>(null);

  const stateOptions = useMemo(() => getStatesForCountry(country), [country]);

  // ----- Small UI helpers (styled inputs/selects) -----
  function SelectField({
    label,
    value,
    onChange,
    options,
    disabled,
    id,
  }: {
    label?: string;
    value: string | number;
    onChange: (v: string) => void;
    options: { value: string | number; label: string }[];
    disabled?: boolean;
    id?: string;
  }) {
    return (
      <div>
        {label ? <label className="text-xs font-medium text-neutral-700">{label}</label> : null}
        <div className="relative mt-2">
          <select
            id={id}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={`appearance-none w-full rounded-xl border px-3 py-2 pr-10 text-sm bg-white ${disabled ? "opacity-60 cursor-not-allowed" : "hover:border-neutral-400"} `}
          >
            {options.map((o) => (
              <option key={String(o.value)} value={String(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 9l6 6 6-6" stroke="#7C6E61" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  function TextField({
    label,
    value,
    onChange,
    placeholder,
    id,
    required,
  }: {
    label?: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    id?: string;
    required?: boolean;
  }) {
    return (
      <div>
        {label ? <label className="text-xs font-medium text-neutral-700">{label}{required ? " *" : ""}</label> : null}
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-2 w-full rounded-xl border px-3 py-2 text-sm bg-white"
        />
      </div>
    );
  }

  // ----- rest unchanged logic -----
  function toggleCategory(cat: Category) {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  function validate(): string | null {
    if (!brandName.trim()) return "Preencha o nome da marca.";
    if (!contactName.trim()) return "Preencha o nome do contato.";
    if (!contactEmail.trim()) return "Preencha o e-mail de contato.";
    // simple email regex
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) return "E-mail inválido.";
    if (!contactPhone.trim()) return "Preencha o telefone/WhatsApp.";
    if (!instagram.trim()) return "Precisamos do perfil no Instagram para avaliação.";
    if (categories.length === 0) return "Selecione pelo menos um tipo de produto.";
    if (!stockReady) return "Informe disponibilidade de estoque.";
    // country/state/city validations
    if (!country) return "Selecione um país.";
    if (stateOptions.length > 0 && !stateCode) return "Selecione o estado.";
    if (!city.trim()) return "Preencha a cidade.";
    if (!consent) return "É necessário concordar com a política para prosseguir.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    setSuccessProtocol(null);

    const err = validate();
    if (err) {
      setNotice(err);
      return;
    }

    setSubmitting(true);

    try {
      const cityToSave = stateCode ? `${city.trim()}, ${stateCode}` : city.trim();

      const payload = {
        brand_name: brandName.trim(),
        contact_name: contactName.trim(),
        contact_role: contactRole.trim() || null,
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        country: country || "BR",
        city: cityToSave || null,
        website: website.trim() || null,
        instagram: instagram.trim().replace(/^@/, ""),
        product_categories: categories,
        stock_ready: stockReady || null,
        years_active: typeof yearsActive === "number" && yearsActive > 0 ? yearsActive : null,
        how_found: howFound.trim() || null,
        consent: true,
      };

      const { data, error } = await supabase.from("brand_applications").insert(payload).select().single();

      if (error || !data) {
        console.error("insert error", error);
        setNotice("Ocorreu um erro ao enviar. Tente novamente mais tarde.");
        setSubmitting(false);
        return;
      }

      const proto = `BLK-${String(data.id).padStart(6, "0")}`;
      setSuccessProtocol(proto);

      // limpar formulário parcialmente e exibir confirmação elegante
      setBrandName("");
      setContactName("");
      setContactRole("");
      setContactEmail("");
      setContactPhone("");
      setCountry("BR");
      setStateCode("");
      setCity("");
      setWebsite("");
      setInstagram("");
      setCategories([]);
      setStockReady("");
      setYearsActive("");
      setHowFound("");
      setConsent(false);

      setNotice(null);
    } catch (err) {
      console.error(err);
      setNotice("Falha inesperada. Verifique a conexão.");
    } finally {
      setSubmitting(false);
    }
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
          <div />
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-3xl p-10" style={{ background: "rgba(255,255,255,0.75)", border: `1px solid ${BORDER}`, backdropFilter: "blur(6px)" }}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-[28px] font-semibold text-black leading-tight">
                Candidate sua marca à curadoria Look
              </h1>
              <p className="mt-2 text-neutral-600 max-w-xl">
                Envie as informações essenciais e nosso time editorial fará uma avaliação criteriosa. Você recebe resposta personalizada em até 5 dias úteis.
              </p>
            </div>

            <div className="text-right">
              <div className="text-sm text-neutral-500">Tempo médio de resposta</div>
              <div className="mt-1 text-lg font-semibold">Até 5 dias úteis</div>
            </div>
          </div>

          <hr className="my-6 border-t" style={{ borderColor: BORDER }} />

          {notice ? (
            <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-amber-900 text-sm">
              {notice}
            </div>
          ) : null}

          {successProtocol ? (
            <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-900">
              Inscrição recebida • protocolo <span className="font-medium">{successProtocol}</span>. Em breve enviaremos um e-mail com o parecer.
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-neutral-700">Marca *</label>
                <input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                  placeholder="Ex.: Valentino"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700">Pessoa de contato *</label>
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700">Cargo (opcional)</label>
                <input
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                  className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                  placeholder="Founder, Head of Brand..."
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700">E-mail *</label>
                <input
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                  type="email"
                  placeholder="contato@marca.com"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700">Telefone / WhatsApp *</label>
                <input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                  placeholder="+55 11 9xxxx-xxxx"
                />
              </div>

              <div>
                <SelectField
                  label="País *"
                  value={country}
                  onChange={(v) => { setCountry(v); setStateCode(""); }}
                  options={COUNTRY_OPTIONS.map((c) => ({ value: c.code, label: c.label }))}
                />
              </div>

              <div>
                <SelectField
                  label="Estado *"
                  value={stateCode}
                  onChange={(v) => setStateCode(v)}
                  options={stateOptions.length ? [{ value: "", label: "Selecione o estado" }, ...stateOptions] : [{ value: "", label: "—" }]}
                  disabled={stateOptions.length === 0}
                />
              </div>

              <div>
                <TextField
                  label="Cidade *"
                  value={city}
                  onChange={(v) => setCity(v)}
                  placeholder="Cidade"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700">Site oficial (opcional)</label>
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                  placeholder="https://"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700">Instagram *</label>
                <div className="mt-2 flex">
                  <input
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="w-full rounded-l-xl border border-r-0 px-3 py-2 text-sm"
                    placeholder="handle (sem @)"
                  />
                  <a
                    href={instagram ? `https://instagram.com/${instagram.replace(/^@/, "")}` : "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-r-xl border border-l-0 px-3 py-2 text-sm bg-white/80"
                  >
                    Abrir
                  </a>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700">Tipo(s) de produto (selecione) *</label>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORY_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCategory(c)}
                    className={`text-sm px-3 py-2 rounded-xl border transition ${categories.includes(c) ? "bg-black text-white border-black" : "bg-white border-neutral-300 hover:bg-neutral-50"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-neutral-700">Estoque pronto para envio *</label>
                <div className="mt-2 flex gap-2">
                  <label className={`px-3 py-2 rounded-xl border ${stockReady === "yes" ? "bg-black text-white border-black" : "bg-white border-neutral-300"}`}>
                    <input className="hidden" type="radio" name="stock" checked={stockReady === "yes"} onChange={() => setStockReady("yes")} />
                    Sim
                  </label>
                  <label className={`px-3 py-2 rounded-xl border ${stockReady === "no" ? "bg-black text-white border-black" : "bg-white border-neutral-300"}`}>
                    <input className="hidden" type="radio" name="stock" checked={stockReady === "no"} onChange={() => setStockReady("no")} />
                    Não
                  </label>
                  <label className={`px-3 py-2 rounded-xl border ${stockReady === "on_demand" ? "bg-black text-white border-black" : "bg-white border-neutral-300"}`}>
                    <input className="hidden" type="radio" name="stock" checked={stockReady === "on_demand"} onChange={() => setStockReady("on_demand")} />
                    Produção sob demanda
                  </label>
                </div>
              </div>

              <div>
                <SelectField
                  label="Anos de operação (opcional)"
                  value={yearsActive === "" ? "" : String(yearsActive)}
                  onChange={(v) => setYearsActive(v ? Number(v) : "")}
                  options={[
                    { value: "", label: "—" },
                    { value: "0", label: "Emerging — menos de 1 ano" },
                    { value: "1", label: "Established — 1–2 anos" },
                    { value: "3", label: "Recognized — 3–5 anos" },
                    { value: "6", label: "Legacy — 5+ anos" },
                  ]}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700">Como nos encontrou (opcional)</label>
                <input value={howFound} onChange={(e) => setHowFound(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" placeholder="Ex.: Instagram / Indicação" />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <input id="consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
              <label htmlFor="consent" className="text-sm text-neutral-700">
                Eu autorizo o envio destas informações para análise editorial e confirmo que represento esta marca. Li a{" "}
                <a href="/privacy" className="underline">política de privacidade</a>.
              </label>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-neutral-500">
                <div>Submissões passam por curadoria.</div>
                <div>Resposta em até 5 dias úteis.</div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="h-11 px-6 rounded-full border border-neutral-300 bg-white/70 text-sm"
                >
                  Voltar
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`h-11 px-6 rounded-full text-sm font-medium text-white ${submitting ? "bg-neutral-600" : "bg-black hover:opacity-90"}`}
                >
                  {submitting ? "Enviando..." : "Enviar inscrição"}
                </button>
              </div>
            </div>
          </form>
        </div>

        <p className="mt-6 text-xs text-neutral-500 max-w-2xl">
          Nota: mantemos curadoria de excelência. A inscrição não garante listagem imediata; avaliaremos identidade, qualidade de produção e fit estético.
        </p>
      </div>
    </main>
  );
}
