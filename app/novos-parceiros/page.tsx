// app/novos-parceiros/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// Cores do Ecossistema Brutalista
const SURFACE = "#F6F3ED";
const BORDER = "rgba(0,0,0,0.15)";

const CATEGORY_OPTIONS = [
  "Roupas",
  "Calçados",
  "Acessórios",
  "Casa e Arte", // 🔥 Atualizado
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

  // ----- UI HELPERS (BRUTALISTAS) -----

  // 🔥 CUSTOM SELECT (Adeus Safari/Chrome feio)
  function CustomSelectField({
    label,
    value,
    onChange,
    options,
    disabled,
    placeholder = "Selecione..."
  }: {
    label?: string;
    value: string | number;
    onChange: (v: string) => void;
    options: { value: string | number; label: string }[];
    disabled?: boolean;
    placeholder?: string;
  }) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find((o) => String(o.value) === String(value));

    return (
      <div className="flex flex-col relative">
        {label && <label className="text-[10px] font-bold uppercase tracking-[1px] text-black/60 mb-2">{label}</label>}
        
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-between w-full rounded-none border border-black/20 px-4 py-3 text-sm bg-white focus:outline-none transition-colors ${disabled ? "opacity-50 cursor-not-allowed bg-black/5" : "cursor-pointer hover:border-black/50"}`}
        >
          <span className={selectedOption && selectedOption.value !== "" ? "text-black" : "text-black/40"}>
            {selectedOption && selectedOption.value !== "" ? selectedOption.label : placeholder}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <path d="M6 9l6 6 6-6" stroke="#000" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" />
          </svg>
        </button>

        {isOpen && !disabled && (
          <>
            {/* Overlay invisível para fechar ao clicar fora */}
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            
            <div className="absolute top-full mt-[-1px] left-0 w-full bg-white border border-black/20 z-20 max-h-64 overflow-y-auto shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
              {options.map((o) => (
                <button
                  key={String(o.value)}
                  type="button"
                  onClick={() => { onChange(String(o.value)); setIsOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-sm border-b border-black/5 transition-colors ${
                    String(value) === String(o.value) 
                    ? "bg-black/5 font-bold text-black" 
                    : "text-black/70 hover:bg-black hover:text-white"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </>
        )}
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
    type = "text"
  }: {
    label?: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    id?: string;
    required?: boolean;
    type?: string;
  }) {
    return (
      <div className="flex flex-col">
        {label ? <label className="text-[10px] font-bold uppercase tracking-[1px] text-black/60 mb-2">{label}{required ? " *" : ""}</label> : null}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-none border border-black/20 px-4 py-3 text-sm bg-white placeholder:text-black/30 focus:outline-none focus:border-black transition-colors"
        />
      </div>
    );
  }

  // ----- LOGIC -----
  function toggleCategory(cat: Category) {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  function validate(): string | null {
    if (!brandName.trim()) return "Preencha o nome da marca.";
    if (!contactName.trim()) return "Preencha o nome do contato.";
    if (!contactEmail.trim()) return "Preencha o e-mail de contato.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) return "E-mail inválido.";
    if (!contactPhone.trim()) return "Preencha o telefone/WhatsApp.";
    if (!instagram.trim()) return "Precisamos do perfil no Instagram para avaliação.";
    if (categories.length === 0) return "Selecione pelo menos um tipo de produto.";
    if (!stockReady) return "Informe disponibilidade de estoque.";
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Limpar formulário
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
    <main className="min-h-screen" style={{ backgroundColor: SURFACE, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      
      {/* HEADER EDITORIAL */}
      <header className="w-full border-b" style={{ borderColor: BORDER }}>
        <div className="mx-auto max-w-6xl px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push("/")}>
            <span className="text-[20px] font-black tracking-tighter uppercase text-black">Look</span>
            <div className="h-4 w-[1px] bg-black/20" />
            <span className="text-[11px] font-bold uppercase tracking-[2px] text-black/60 hidden sm:inline-block">Brand Curation</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-16">
        
        {/* HEADER DO FORMULÁRIO */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-12">
          <div>
            <h1 className="text-4xl md:text-[44px] font-bold text-black leading-[1.05] tracking-tighter uppercase">
              Application<br/>Dossier.
            </h1>
            <p className="mt-4 text-sm font-medium text-black/60 max-w-xl leading-relaxed">
              Submeta sua marca para a curadoria Look. Nosso comitê editorial avaliará identidade, qualidade de produção e fit estético em até 5 dias úteis.
            </p>
          </div>
          <div className="md:text-right border-l-2 md:border-l-0 md:border-r-2 border-black pl-4 md:pl-0 md:pr-4 py-1">
            <div className="text-[10px] font-bold uppercase tracking-[1px] text-black/50">Tempo estimado</div>
            <div className="mt-1 text-sm font-bold uppercase tracking-wide text-black">Até 5 dias úteis</div>
          </div>
        </div>

        {/* NOTICES BRUTALISTAS */}
        {notice && (
          <div className="mb-8 p-4 bg-red-600 text-white text-[11px] font-bold uppercase tracking-[1px]">
            {notice}
          </div>
        )}

        {successProtocol && (
          <div className="mb-8 p-6 bg-black text-white flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[2px] text-white/60">Status: Recebido</span>
            <span className="text-lg font-medium leading-tight">
              Sua inscrição foi registrada com o protocolo <span className="font-bold">{successProtocol}</span>.
            </span>
            <span className="text-sm text-white/70 mt-2">Nossa equipe de curadoria entrará em contato em breve.</span>
          </div>
        )}

        {/* FORMULÁRIO */}
        <form onSubmit={handleSubmit} className="space-y-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
            <TextField label="Marca" value={brandName} onChange={setBrandName} placeholder="Ex.: Valentino" required />
            <TextField label="Pessoa de Contato" value={contactName} onChange={setContactName} placeholder="Nome completo" required />
            <TextField label="Cargo (Opcional)" value={contactRole} onChange={setContactRole} placeholder="Ex.: Founder, Head of Brand" />
            <TextField label="E-mail" value={contactEmail} onChange={setContactEmail} placeholder="contato@marca.com" type="email" required />
            <TextField label="Telefone / WhatsApp" value={contactPhone} onChange={setContactPhone} placeholder="+55 11 9xxxx-xxxx" required />
            
            <CustomSelectField label="País *" value={country} onChange={(v) => { setCountry(v); setStateCode(""); }} options={COUNTRY_OPTIONS.map((c) => ({ value: c.code, label: c.label }))} />
            <CustomSelectField label="Estado *" value={stateCode} onChange={(v) => setStateCode(v)} options={stateOptions.length ? [{ value: "", label: "Selecione..." }, ...stateOptions] : [{ value: "", label: "—" }]} disabled={stateOptions.length === 0} placeholder="Selecione o estado" />
            <TextField label="Cidade *" value={city} onChange={setCity} placeholder="Nome da cidade" required />
            
            <TextField label="Site Oficial (Opcional)" value={website} onChange={setWebsite} placeholder="https://" />
            
            {/* Input Composto Brutalista */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold uppercase tracking-[1px] text-black/60 mb-2">Instagram *</label>
              <div className="flex">
                <input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full rounded-none border border-black/20 border-r-0 px-4 py-3 text-sm bg-white placeholder:text-black/30 focus:outline-none focus:border-black transition-colors"
                  placeholder="handle (sem @)"
                />
                <a
                  href={instagram ? `https://instagram.com/${instagram.replace(/^@/, "")}` : "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center px-6 bg-black text-white text-[10px] font-bold uppercase tracking-[1px] whitespace-nowrap hover:bg-neutral-800 transition-colors"
                >
                  Testar
                </a>
              </div>
            </div>
          </div>

          <hr className="border-t border-black/10" />

          {/* CATEGORIAS */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[1px] text-black/60 mb-4 block">
              Tipo(s) de Produto *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORY_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCategory(c)}
                  className={`text-[11px] font-bold uppercase tracking-[1px] py-4 border transition-colors ${categories.includes(c) ? "bg-black text-white border-black" : "bg-white text-black border-black/20 hover:border-black/50"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* ESTOQUE */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[1px] text-black/60 mb-4 block">
                Disponibilidade de Estoque *
              </label>
              <div className="flex flex-col gap-3">
                {[
                  { value: "yes", label: "Estoque Pronto" },
                  { value: "no", label: "Sem Estoque Imediato" },
                  { value: "on_demand", label: "Produção sob Demanda" }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStockReady(opt.value as any)}
                    className={`text-left text-xs font-bold uppercase tracking-[1px] px-4 py-3 border transition-colors ${stockReady === opt.value ? "bg-black text-white border-black" : "bg-white text-black border-black/20 hover:border-black/50"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* OUTROS */}
            <div className="flex flex-col gap-8">
              <CustomSelectField
                label="Anos de Operação (Opcional)"
                value={yearsActive === "" ? "" : String(yearsActive)}
                onChange={(v) => setYearsActive(v ? Number(v) : "")}
                placeholder="Selecione..."
                options={[
                  { value: "", label: "Selecione..." },
                  { value: "0", label: "Emerging — menos de 1 ano" },
                  { value: "1", label: "Established — 1 a 2 anos" },
                  { value: "3", label: "Recognized — 3 a 5 anos" },
                  { value: "6", label: "Legacy — mais de 5 anos" },
                ]}
              />
              <TextField label="Como nos encontrou? (Opcional)" value={howFound} onChange={setHowFound} placeholder="Ex.: Instagram, Indicação..." />
            </div>
          </div>

          <hr className="border-t border-black/10" />

          {/* CONSENTIMENTO E AÇÕES */}
          <div className="flex flex-col gap-8 pb-12">
            
            {/* 🔥 CHECKBOX CUSTOMIZADO E SEGURO */}
            <label className="flex items-start gap-4 cursor-pointer group">
              <div className="relative flex items-center justify-center mt-[2px] w-5 h-5 flex-shrink-0">
                {/* Escondemos o input nativo visualmente, mas deixamos ele funcional para acessibilidade/forms */}
                <input 
                  type="checkbox" 
                  checked={consent} 
                  onChange={(e) => setConsent(e.target.checked)} 
                  className="absolute opacity-0 w-0 h-0"
                />
                
                {/* O desenho brutalista do Checkbox */}
                <div className={`w-5 h-5 border flex items-center justify-center transition-colors ${consent ? 'bg-black border-black' : 'bg-white border-black/30 group-hover:border-black'}`}>
                  {consent && (
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7L5.5 10.5L12 3" stroke="white" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter"/>
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-black/70 leading-relaxed font-medium">
                Autorizo o envio destas informações para o comitê editorial da Look. Confirmo que sou representante legal desta marca e li os <a href="/terms" className="text-black underline underline-offset-4 decoration-black/30 hover:decoration-black">Termos</a> e a <a href="/privacy" className="text-black underline underline-offset-4 decoration-black/30 hover:decoration-black">Política de Privacidade</a>.
              </span>
            </label>

            <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center justify-end gap-4 mt-4">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="h-14 px-8 border border-black/20 bg-transparent text-black text-[11px] font-bold uppercase tracking-[2px] hover:bg-black/5 transition-colors"
              >
                Voltar
              </button>

              <button
                type="submit"
                disabled={submitting}
                className={`h-14 px-8 text-[11px] font-bold uppercase tracking-[2px] text-white transition-colors ${submitting ? "bg-neutral-400 cursor-not-allowed" : "bg-black hover:bg-neutral-800"}`}
              >
                {submitting ? "Processando..." : "Submeter Aplicação"}
              </button>
            </div>
          </div>

        </form>
      </div>
    </main>
  );
}
