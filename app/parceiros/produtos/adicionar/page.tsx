// app/parceiros/produtos/adicionar/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const SURFACE = "#F7F4EF";

export const dynamic = "force-dynamic";

export default function PartnerAddProductEntryPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [loggedEmail, setLoggedEmail] = useState<string>("");
  const [storeName, setStoreName] = useState<string>("");

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
        setNotice("Não foi possível carregar seus dados no momento.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/parceiros/login");
  }

  function CardOption(props: {
    title: string;
    desc: string;
    onClick: () => void;
  }) {
    return (
      <button
        onClick={props.onClick}
        className="w-full rounded-3xl bg-white/70 border border-[#E5E0DA]/80 p-6 text-left hover:bg-white transition shadow-[0_12px_30px_-24px_rgba(0,0,0,0.3)]"
      >
        <h2 className="text-[17px] font-semibold text-black tracking-tight">
          {props.title}
        </h2>
        <p className="mt-2 text-[13px] text-neutral-600 leading-relaxed">
          {props.desc}
        </p>
        <span className="inline-flex items-center gap-1 mt-4 text-[12px] text-neutral-800 font-medium">
          Continuar
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            stroke="currentColor"
            fill="none"
          >
            <path
              d="M9 6l6 6-6 6"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
    );
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
                  Adicionar produtos
                </span>
              </div>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-6xl px-8 pt-12 animate-pulse">
          <div className="h-7 w-64 bg-neutral-300/30 rounded-lg" />
          <div className="mt-3 h-4 w-80 bg-neutral-300/20 rounded-lg" />
          <div className="mt-8 h-40 bg-white/60 rounded-3xl" />
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
              onClick={() => router.push("/parceiros/produtos")}
              className="h-8 w-8 rounded-full bg-white/70 border border-neutral-200/70 flex items-center justify-center text-neutral-700 hover:text-black hover:bg-white transition"
              aria-label="Voltar para produtos"
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
              <span className="text-sm font-semibold tracking-tight text-black">
                Look
              </span>
              <span className="text-[11px] text-neutral-500">
                Adicionar produtos
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

      <div className="mx-auto max-w-6xl px-8 pt-10 pb-20 space-y-8">
        <div>
          <h1 className="text-[30px] font-semibold text-black tracking-tight">
            Como você quer adicionar seus produtos?
          </h1>
          <p className="text-sm text-neutral-600 mt-2 max-w-2xl leading-relaxed">
            Você pode cadastrar um item de cada vez, importar tudo de uma vez
            por CSV ou integrar com a sua plataforma para manter o estoque
            sincronizado.
          </p>
          {notice ? (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {notice}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardOption
            title="Adicionar um único produto"
            desc="Use este modo para cadastrar manualmente cada item, com fotos, preço, tamanhos e categorias."
            onClick={() => router.push("/parceiros/produtos/adicionar/manual")}
          />

          <CardOption
            title="Importar com CSV"
            desc="Suba uma planilha com todos os produtos de uma vez, seguindo o modelo da Look."
            onClick={() => router.push("/parceiros/produtos/adicionar/csv")}
          />
        </div>
      </div>
    </main>
  );
}
