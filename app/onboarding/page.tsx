"use client";

import { Suspense, useEffect, useState } from "react";
import type React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

function OnboardingInner() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        await supabase.auth.signOut({ scope: "local" });
        setNotice(
          "Você estava logado. Saímos da sua sessão para iniciar o onboarding."
        );
      }
    })();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSuccess(false);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return setErr("Informe um e-mail válido.");
    if (!password || password.length < 6)
      return setErr("A senha deve ter pelo menos 6 caracteres.");
    if (password !== password2) return setErr("As senhas não conferem.");

    setLoading(true);
    try {
      // whitelist
      const { data: allowed, error: allowErr } = await supabase.rpc(
        "partner_email_allowed",
        { p_email: cleanEmail }
      );
      if (allowErr) throw allowErr;
      if (!allowed)
        throw new Error("Este e-mail não está autorizado como parceiro.");

      // cria a conta com senha (se já existir, tratamos como sucesso também)
      const { error: suErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/parceiros/login`
              : undefined,
        },
      });

      if (suErr) {
        // se já existe usuário, consideramos “ok, senha cadastrada”
        if (/already|exists|duplicate/i.test(suErr.message)) {
          setSuccess(true);
        } else {
          throw suErr;
        }
      } else {
        setSuccess(true);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e) || "Não foi possível criar sua conta agora.");
      console.error("onboarding:create", e);
    } finally {
      setLoading(false);
    }
  }

  // Look palette
  const SURFACE = "#F9F7F5";
  const BORDER = "#E6E1DB";

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      <div className="mx-auto max-w-3xl px-10 pt-16">
        <h1 className="text-[44px] leading-tight font-semibold tracking-tight text-black">
          Onboarding de Parceiros
        </h1>
        <p className="mt-2 text-[15px] text-neutral-700">
          Crie sua senha para acessar o painel de parceiros da Look.
        </p>
        {notice && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {notice}
          </p>
        )}
      </div>

      <div className="mx-auto mt-8 max-w-3xl px-10">
        <div
          className="rounded-2xl p-8 shadow-[0_6px_24px_-10px_rgba(0,0,0,0.18)] ring-1 ring-black/5"
          style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}
        >
          {/* estado de sucesso: só a mensagem e o botão */}
          {success ? (
            <div className="space-y-5">
              <div className="rounded-xl bg-green-50 px-4 py-3 text-green-800">
                Senha cadastrada. Faça login para continuar.
              </div>
              <button
                onClick={() =>
                  router.replace(
                    `/parceiros/login?email=${encodeURIComponent(
                      email.trim().toLowerCase()
                    )}`
                  )
                }
                className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99]"
              >
                Ir para login de parceiros
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-5">
              {/* Email */}
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-900">
                  E-mail da marca
                </label>
                <input
                  type="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-[520px] rounded-xl px-3 py-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-black/10"
                  style={{
                    backgroundColor: SURFACE,
                    border: `1px solid ${BORDER}`,
                  }}
                  placeholder="parceiro@sualoja.com"
                  autoComplete="email"
                />
                <p className="mt-2 text-[12px] text-neutral-500">
                  Só funciona se seu e-mail estiver autorizado pela Look.
                </p>
              </div>

              {/* Senhas */}
              <div className="grid grid-cols-2 gap-4 max-[860px]:grid-cols-1">
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-900">
                    Criar senha
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl px-3 py-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-black/10"
                    style={{
                      backgroundColor: SURFACE,
                      border: `1px solid ${BORDER}`,
                    }}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-900">
                    Confirmar senha
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    required
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    className="w-full rounded-xl px-3 py-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-black/10"
                    style={{
                      backgroundColor: SURFACE,
                      border: `1px solid ${BORDER}`,
                    }}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {err && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {err}
                </p>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60"
                >
                  {loading ? "Criando…" : "Criar senha"}
                </button>

                <button
                  type="button"
                  onClick={() => router.replace("/parceiros/login")}
                  className="text-sm text-neutral-600 underline"
                >
                  Já tenho senha — ir para login
                </button>
              </div>

              <p className="pt-2 text-[12px] leading-5 text-neutral-500">
                Ao continuar, você concorda com os{" "}
                <span className="underline">Termos</span> e a{" "}
                <span className="underline">Privacidade</span> da Look.
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-neutral-50" />}>
      <OnboardingInner />
    </Suspense>
  );
}
